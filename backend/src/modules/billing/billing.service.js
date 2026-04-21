import { pool } from "../../utils/db.js";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    })
  : null;

const plans = {
  basico: { name: "Basico", monthlyPrice: 39, tokenLimit: 25000 },
  intermediario: { name: "Intermediario", monthlyPrice: 79, tokenLimit: 90000 },
  avancado: { name: "Avancado", monthlyPrice: 149, tokenLimit: 250000 },
};

function requireStripe() {
  if (!stripe) {
    const error = new Error("Stripe nao configurado no backend.");
    error.status = 500;
    throw error;
  }

  return stripe;
}

function getPlan(planId) {
  return plans[planId] || plans.intermediario;
}

function getPlanAmount(planId, billingCycle) {
  const plan = getPlan(planId);
  const amount = billingCycle === "annual" ? plan.monthlyPrice * 12 * 0.8 : plan.monthlyPrice;

  return Math.round(amount * 100);
}

export async function ensureLocalBillingTables() {
  await pool.query(`
    create table if not exists payment_profiles (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade,
      gateway text not null,
      gateway_customer_id text,
      default_payment_method_id text,
      card_brand text,
      card_last4 varchar(4),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(account_id, gateway)
    );

    create table if not exists subscriptions (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade,
      plan varchar(30) not null check (plan in ('basico', 'intermediario', 'avancado')),
      billing_cycle varchar(20) not null check (billing_cycle in ('monthly', 'annual')),
      status varchar(40) not null default 'active',
      token_limit integer not null default 90000,
      token_balance integer not null default 90000,
      current_period_start timestamptz,
      current_period_end timestamptz,
      gateway_subscription_id text unique,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists plan_change_acceptances (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade,
      previous_plan varchar(30) not null,
      previous_billing_cycle varchar(20) not null,
      next_plan varchar(30) not null,
      next_billing_cycle varchar(20) not null,
      payment_method_label text,
      payment_method_last4 varchar(4),
      accepted_terms_text text not null,
      metadata jsonb not null default '{}'::jsonb,
      accepted_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      check (previous_plan in ('basico', 'intermediario', 'avancado')),
      check (next_plan in ('basico', 'intermediario', 'avancado')),
      check (previous_billing_cycle in ('monthly', 'annual')),
      check (next_billing_cycle in ('monthly', 'annual'))
    );

    create index if not exists idx_plan_change_acceptances_account_date
      on plan_change_acceptances (account_id, accepted_at desc);

    create index if not exists idx_subscriptions_account_status
      on subscriptions (account_id, status);
  `);
}

function toPlanAcceptance(row) {
  return {
    id: String(row.id),
    account_id: String(row.account_id),
    previous_plan: row.previous_plan,
    previous_billing_cycle: row.previous_billing_cycle,
    next_plan: row.next_plan,
    next_billing_cycle: row.next_billing_cycle,
    payment_method_label: row.payment_method_label,
    payment_method_last4: row.payment_method_last4,
    accepted_terms_text: row.accepted_terms_text,
    metadata: row.metadata || {},
    accepted_at: row.accepted_at,
    created_at: row.created_at,
  };
}

export async function savePlanChangeAcceptance(accountId, record) {
  const result = await pool.query(
    `
      insert into plan_change_acceptances (
        account_id,
        previous_plan,
        previous_billing_cycle,
        next_plan,
        next_billing_cycle,
        payment_method_label,
        payment_method_last4,
        accepted_terms_text,
        metadata,
        accepted_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, coalesce($10::timestamptz, now()))
      returning *;
    `,
    [
      accountId,
      record.previousPlan,
      record.previousBillingCycle,
      record.nextPlan,
      record.nextBillingCycle,
      record.paymentMethodLabel || null,
      record.paymentMethodLast4 || null,
      record.acceptedTermsText,
      JSON.stringify(record.metadata || {}),
      record.acceptedAt || null,
    ]
  );

  return toPlanAcceptance(result.rows[0]);
}

export async function listPlanChangeAcceptances(accountId) {
  const result = await pool.query(
    `
      select *
      from plan_change_acceptances
      where account_id = $1
      order by accepted_at desc, id desc;
    `,
    [accountId]
  );

  return result.rows.map(toPlanAcceptance);
}

async function getAccount(accountId) {
  const result = await pool.query("select * from accounts where id = $1 limit 1;", [accountId]);

  if (!result.rows[0]) {
    const error = new Error("Conta nao encontrada.");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function getOrCreateStripeCustomer(accountId) {
  const existing = await pool.query(
    "select * from payment_profiles where account_id = $1 and gateway = 'stripe' limit 1;",
    [accountId]
  );

  if (existing.rows[0]?.gateway_customer_id) {
    return existing.rows[0].gateway_customer_id;
  }

  const account = await getAccount(accountId);
  const client = requireStripe();
  const customer = await client.customers.create({
    email: account.email,
    metadata: {
      accountId: String(accountId),
    },
  });

  await pool.query(
    `
      insert into payment_profiles (account_id, gateway, gateway_customer_id)
      values ($1, 'stripe', $2)
      on conflict (account_id, gateway)
      do update set gateway_customer_id = excluded.gateway_customer_id,
                    updated_at = current_timestamp;
    `,
    [accountId, customer.id]
  );

  return customer.id;
}

export async function createCheckoutSession(accountId, { planId, billingCycle, installments }) {
  const safePlanId = plans[planId] ? planId : "intermediario";
  const safeBillingCycle = billingCycle === "annual" ? "annual" : "monthly";
  const plan = getPlan(safePlanId);
  const customerId = await getOrCreateStripeCustomer(accountId);
  const client = requireStripe();
  const successUrl = process.env.STRIPE_SUCCESS_URL || "http://localhost:5173/dashboard";
  const cancelUrl = process.env.STRIPE_CANCEL_URL || "http://localhost:5173/checkout";
  const session = await client.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    success_url: `${successUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${cancelUrl}?checkout=cancelled&plan=${safePlanId}`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    payment_method_types: ["card"],
    metadata: {
      accountId: String(accountId),
      planId: safePlanId,
      billingCycle: safeBillingCycle,
      installments: String(installments || 1),
    },
    subscription_data: {
      metadata: {
        accountId: String(accountId),
        planId: safePlanId,
        billingCycle: safeBillingCycle,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: getPlanAmount(safePlanId, safeBillingCycle),
          product_data: {
            name: `Shape Certo ${plan.name}`,
            metadata: {
              planId: safePlanId,
            },
          },
          recurring: {
            interval: safeBillingCycle === "annual" ? "year" : "month",
          },
        },
      },
    ],
  });

  return { url: session.url, id: session.id };
}

export async function createPortalSession(accountId) {
  const customerId = await getOrCreateStripeCustomer(accountId);
  const client = requireStripe();
  const returnUrl = process.env.STRIPE_SUCCESS_URL || "http://localhost:5173/dashboard";
  const session = await client.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url, id: session.id };
}

export async function loadBillingSummary(accountId) {
  const [paymentResult, subscriptionResult] = await Promise.all([
    pool.query("select * from payment_profiles where account_id = $1 and gateway = 'stripe' limit 1;", [accountId]),
    pool.query(
      `
        select *
        from subscriptions
        where account_id = $1
        order by updated_at desc, id desc
        limit 1;
      `,
      [accountId]
    ),
  ]);

  return {
    paymentProfile: paymentResult.rows[0] || null,
    subscription: subscriptionResult.rows[0] || null,
  };
}

async function saveStripePaymentMethod(accountId, subscription) {
  const client = requireStripe();
  const paymentMethodId = subscription.default_payment_method;

  if (!paymentMethodId) {
    return;
  }

  const paymentMethod = await client.paymentMethods.retrieve(paymentMethodId);
  const card = paymentMethod.card;

  await pool.query(
    `
      insert into payment_profiles (
        account_id,
        gateway,
        gateway_customer_id,
        default_payment_method_id,
        card_brand,
        card_last4
      )
      values ($1, 'stripe', $2, $3, $4, $5)
      on conflict (account_id, gateway)
      do update set gateway_customer_id = excluded.gateway_customer_id,
                    default_payment_method_id = excluded.default_payment_method_id,
                    card_brand = excluded.card_brand,
                    card_last4 = excluded.card_last4,
                    updated_at = current_timestamp;
    `,
    [
      accountId,
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
      paymentMethodId,
      card?.brand || null,
      card?.last4 || null,
    ]
  );
}

export async function upsertSubscriptionFromStripe(subscription) {
  const accountId = Number(subscription.metadata?.accountId);

  if (!accountId) {
    return null;
  }

  const planId = plans[subscription.metadata?.planId] ? subscription.metadata.planId : "intermediario";
  const billingCycle = subscription.metadata?.billingCycle === "annual" ? "annual" : "monthly";
  const plan = getPlan(planId);

  const result = await pool.query(
    `
      insert into subscriptions (
        account_id,
        plan,
        billing_cycle,
        status,
        token_limit,
        token_balance,
        current_period_start,
        current_period_end,
        gateway_subscription_id
      )
      values ($1, $2, $3, $4, $5, $5, to_timestamp($6), to_timestamp($7), $8)
      on conflict (gateway_subscription_id)
      do update set plan = excluded.plan,
                    billing_cycle = excluded.billing_cycle,
                    status = excluded.status,
                    token_limit = excluded.token_limit,
                    current_period_start = excluded.current_period_start,
                    current_period_end = excluded.current_period_end,
                    updated_at = current_timestamp
      returning *;
    `,
    [
      accountId,
      planId,
      billingCycle,
      subscription.status,
      plan.tokenLimit,
      subscription.current_period_start || null,
      subscription.current_period_end || null,
      subscription.id,
    ]
  );

  await pool.query(
    `
      update accounts
      set plan_type = $2,
          billing_cycle = $3,
          updated_at = current_timestamp
      where id = $1;
    `,
    [accountId, planId, billingCycle]
  );

  await saveStripePaymentMethod(accountId, subscription);

  return result.rows[0];
}

export async function handleStripeEvent(event) {
  const client = requireStripe();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.subscription) {
      const subscription = await client.subscriptions.retrieve(session.subscription);
      return upsertSubscriptionFromStripe(subscription);
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    return upsertSubscriptionFromStripe(event.data.object);
  }

  return null;
}

export function constructStripeWebhookEvent(rawBody, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const client = requireStripe();

  if (!webhookSecret) {
    return JSON.parse(rawBody.toString("utf8"));
  }

  return client.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

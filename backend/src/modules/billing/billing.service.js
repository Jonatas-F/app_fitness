import { pool } from "../../utils/db.js";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    })
  : null;

const plans = {
  basico:        { name: "Basico",        monthlyPrice: 29.90, tokenLimit: 260_000   },
  intermediario: { name: "Intermediario", monthlyPrice: 59.90, tokenLimit: 1_500_000 },
  pro:           { name: "Pro",           monthlyPrice: 99.90, tokenLimit: 4_500_000 },
  // Alias para registros antigos que usam 'avancado' no banco
  avancado:      { name: "Pro",           monthlyPrice: 99.90, tokenLimit: 4_500_000 },
};

/** Normaliza 'avancado' → 'pro' para novas gravações no banco. */
function normalizePlanId(planId) {
  return planId === "avancado" ? "pro" : planId;
}

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

function resolveAppOrigin(origin) {
  return ["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin)
    ? origin
    : process.env.STRIPE_SUCCESS_URL?.replace(/\/dashboard$/, "") || "http://localhost:5173";
}

function normalizeStripeCardBrand(brand) {
  const normalized = String(brand || "").toLowerCase();

  if (normalized === "visa") {
    return "Visa";
  }

  if (normalized === "mastercard") {
    return "Mastercard";
  }

  return brand || "Stripe";
}

function toSafePaymentMethod(paymentMethod, defaultPaymentMethodId) {
  const card = paymentMethod.card || {};

  return {
    id: paymentMethod.id,
    brand: normalizeStripeCardBrand(card.brand),
    ending: card.last4 || "----",
    label: `${normalizeStripeCardBrand(card.brand)} final ${card.last4 || "----"}`,
    expires: card.exp_month && card.exp_year ? `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}` : "--/--",
    funding: card.funding || null,
    isDefault: paymentMethod.id === defaultPaymentMethodId,
    source: "stripe",
  };
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

  // Migration: expandir CHECK constraints para incluir 'pro' (idempotente)
  await pool.query(`
    DO $$
    BEGIN
      ALTER TABLE subscriptions
        DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
      ALTER TABLE subscriptions
        ADD CONSTRAINT subscriptions_plan_check
          CHECK (plan IN ('basico','intermediario','avancado','pro'));

      ALTER TABLE plan_change_acceptances
        DROP CONSTRAINT IF EXISTS plan_change_acceptances_previous_plan_check;
      ALTER TABLE plan_change_acceptances
        ADD CONSTRAINT plan_change_acceptances_previous_plan_check
          CHECK (previous_plan IN ('basico','intermediario','avancado','pro'));

      ALTER TABLE plan_change_acceptances
        DROP CONSTRAINT IF EXISTS plan_change_acceptances_next_plan_check;
      ALTER TABLE plan_change_acceptances
        ADD CONSTRAINT plan_change_acceptances_next_plan_check
          CHECK (next_plan IN ('basico','intermediario','avancado','pro'));
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
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

function appendPopupFlag(url, returnMode) {
  if (returnMode !== "popup") {
    return url;
  }

  const nextUrl = new URL(url);
  nextUrl.searchParams.set("stripe_popup", "1");
  return nextUrl.toString();
}

export async function createCheckoutSession(
  accountId,
  { planId, billingCycle, installments, appOrigin: requestedAppOrigin, returnMode }
) {
  const safePlanId = normalizePlanId(plans[planId] ? planId : "intermediario");
  const safeBillingCycle = billingCycle === "annual" ? "annual" : "monthly";

  // If an active subscription already exists, change the plan instead of creating a new one.
  // This prevents duplicate subscriptions on the same account.
  const existingSubscription = await getActiveLocalSubscription(accountId);
  if (existingSubscription?.gateway_subscription_id) {
    return createSubscriptionChangeSession(accountId, {
      planId: safePlanId,
      billingCycle: safeBillingCycle,
      appOrigin: requestedAppOrigin,
      returnMode,
    });
  }

  const plan = getPlan(safePlanId);
  const customerId = await getOrCreateStripeCustomer(accountId);
  const client = requireStripe();
  const appOrigin = resolveAppOrigin(requestedAppOrigin);
  const successUrl = appendPopupFlag(
    `${appOrigin}/checkout?checkout=success&plan=${safePlanId}&session_id={CHECKOUT_SESSION_ID}`,
    returnMode
  );
  const cancelUrl = appendPopupFlag(`${appOrigin}/checkout?checkout=cancelled&plan=${safePlanId}`, returnMode);
  const session = await client.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
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

export async function createPortalSession(accountId, { appOrigin: requestedAppOrigin, returnMode } = {}) {
  const customerId = await getOrCreateStripeCustomer(accountId);
  const client = requireStripe();
  const appOrigin = resolveAppOrigin(requestedAppOrigin);
  const returnUrl = appendPopupFlag(`${appOrigin}/perfil?stripe_portal=returned`, returnMode);
  const session = await client.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url, id: session.id };
}

export async function createPaymentMethodSession(accountId, { appOrigin: requestedAppOrigin, returnMode } = {}) {
  const customerId = await getOrCreateStripeCustomer(accountId);
  const client = requireStripe();
  const appOrigin = resolveAppOrigin(requestedAppOrigin);
  const successUrl = appendPopupFlag(
    `${appOrigin}/perfil?payment_method=success&session_id={CHECKOUT_SESSION_ID}`,
    returnMode
  );
  const cancelUrl = appendPopupFlag(`${appOrigin}/perfil?payment_method=cancelled`, returnMode);
  const session = await client.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_types: ["card"],
    metadata: {
      accountId: String(accountId),
      purpose: "payment_method_setup",
    },
  });

  return { url: session.url, id: session.id, mode: "payment_method_setup" };
}

export async function listStripePaymentMethods(accountId) {
  const customerId = await getOrCreateStripeCustomer(accountId);
  const client = requireStripe();
  const [customer, paymentMethods, profileResult] = await Promise.all([
    client.customers.retrieve(customerId),
    client.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 20,
    }),
    pool.query(
      "select default_payment_method_id from payment_profiles where account_id = $1 and gateway = 'stripe' limit 1;",
      [accountId]
    ),
  ]);
  const customerDefaultPaymentMethodId =
    typeof customer.invoice_settings?.default_payment_method === "string"
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings?.default_payment_method?.id;
  const defaultPaymentMethodId =
    customerDefaultPaymentMethodId || profileResult.rows[0]?.default_payment_method_id || null;

  return paymentMethods.data
    .map((paymentMethod) => toSafePaymentMethod(paymentMethod, defaultPaymentMethodId))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export async function setDefaultStripePaymentMethod(accountId, paymentMethodId) {
  if (!paymentMethodId) {
    const error = new Error("Informe o metodo de pagamento para selecionar.");
    error.status = 400;
    throw error;
  }

  const customerId = await getOrCreateStripeCustomer(accountId);
  const client = requireStripe();
  const paymentMethod = await client.paymentMethods.retrieve(paymentMethodId);
  const paymentMethodCustomerId =
    typeof paymentMethod.customer === "string" ? paymentMethod.customer : paymentMethod.customer?.id;

  if (paymentMethodCustomerId !== customerId) {
    const error = new Error("Metodo de pagamento nao pertence a esta conta.");
    error.status = 403;
    throw error;
  }

  await client.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

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
                    card_brand = null,
                    card_last4 = null,
                    updated_at = current_timestamp;
    `,
    [accountId, customerId, paymentMethodId, null, null]
  );

  const paymentMethods = await listStripePaymentMethods(accountId);

  return {
    paymentMethods,
    defaultPaymentMethodId: paymentMethodId,
  };
}

async function getActiveLocalSubscription(accountId) {
  const result = await pool.query(
    `
      select *
      from subscriptions
      where account_id = $1
        and gateway_subscription_id is not null
        and status in ('active', 'trialing', 'past_due', 'incomplete')
      order by updated_at desc, id desc
      limit 1;
    `,
    [accountId]
  );

  return result.rows[0] || null;
}

/**
 * Cancels every active Stripe subscription for this account EXCEPT the one
 * identified by `keepSubscriptionId`. Also marks them as "canceled" locally.
 * Called whenever a new subscription becomes active so only one can exist at a time.
 */
async function cancelOtherSubscriptions(accountId, keepSubscriptionId) {
  const oldRows = await pool.query(
    `
      select gateway_subscription_id
      from subscriptions
      where account_id = $1
        and status in ('active', 'trialing', 'past_due', 'incomplete')
        and gateway_subscription_id is not null
        and gateway_subscription_id != $2;
    `,
    [accountId, keepSubscriptionId]
  );

  if (!oldRows.rows.length) return;

  const client = stripe; // may be null in dev without Stripe key

  for (const row of oldRows.rows) {
    const gatewayId = row.gateway_subscription_id;

    if (client) {
      try {
        await client.subscriptions.cancel(gatewayId, { prorate: false });
      } catch {
        // Already canceled in Stripe or not found — continue to DB update.
      }
    }

    await pool.query(
      `
        update subscriptions
        set status = 'canceled', updated_at = current_timestamp
        where gateway_subscription_id = $1;
      `,
      [gatewayId]
    );
  }
}

async function createRecurringPrice(accountId, planId, billingCycle) {
  const client = requireStripe();
  const plan = getPlan(planId);

  return client.prices.create({
    currency: "brl",
    unit_amount: getPlanAmount(planId, billingCycle),
    recurring: {
      interval: billingCycle === "annual" ? "year" : "month",
    },
    product_data: {
      name: `Shape Certo ${plan.name}`,
      metadata: {
        planId,
      },
    },
    metadata: {
      accountId: String(accountId),
      planId,
      billingCycle,
    },
  });
}

export async function createSubscriptionChangeSession(
  accountId,
  { planId, billingCycle, appOrigin: requestedAppOrigin, returnMode }
) {
  const safePlanId = normalizePlanId(plans[planId] ? planId : "intermediario");
  const safeBillingCycle = billingCycle === "annual" ? "annual" : "monthly";
  const localSubscription = await getActiveLocalSubscription(accountId);

  if (!localSubscription?.gateway_subscription_id) {
    return createCheckoutSession(accountId, {
      planId: safePlanId,
      billingCycle: safeBillingCycle,
      installments: 1,
      appOrigin: requestedAppOrigin,
      returnMode,
    });
  }

  const client = requireStripe();
  const appOrigin = resolveAppOrigin(requestedAppOrigin);

  // Retrieve the current subscription with full price details.
  const subscription = await client.subscriptions.retrieve(
    localSubscription.gateway_subscription_id,
    { expand: ["items.data.price"] }
  );
  const item = subscription.items?.data?.[0];

  if (!item?.id) {
    return createPortalSession(accountId);
  }

  // Lock the proration date to the exact moment of the change request.
  // This guarantees the unused-time credit is calculated from right now,
  // not from whenever Stripe processes the request internally.
  const prorationDate = Math.floor(Date.now() / 1000);

  // Build (or reuse) the price object for the new plan/cycle.
  const price = await createRecurringPrice(accountId, safePlanId, safeBillingCycle);

  // ─── Preview the proration BEFORE applying the change ────────────────────
  // Stripe calculates:
  //   credit  = (unused days / total days) × price of current plan
  //   debit   = (remaining days / total days) × price of new plan
  //   net     = debit − credit  (positive = user pays; negative = user earns credit)
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  let prorationSummary = { creditAmountCents: 0, debitAmountCents: 0, netAmountCents: 0, currency: "brl" };

  try {
    const preview = await client.invoices.retrieveUpcoming({
      customer: customerId,
      subscription: subscription.id,
      subscription_items: [{ id: item.id, price: price.id }],
      subscription_proration_behavior: "always_invoice",
      subscription_proration_date: prorationDate,
    });

    prorationSummary.netAmountCents = preview.amount_due;
    prorationSummary.currency = preview.currency ?? "brl";

    for (const line of preview.lines?.data ?? []) {
      if (line.amount < 0) {
        // Negative line = credit for unused time on the old plan
        prorationSummary.creditAmountCents += Math.abs(line.amount);
      } else if (line.proration) {
        // Positive proration line = charge for remaining time on the new plan
        prorationSummary.debitAmountCents += line.amount;
      }
    }
  } catch {
    // Preview is best-effort; the update still proceeds if it fails.
  }

  // ─── Apply the subscription update with the locked proration date ─────────
  const updatedSubscription = await client.subscriptions.update(subscription.id, {
    items: [{ id: item.id, price: price.id }],
    proration_behavior: "always_invoice",
    proration_date: prorationDate,
    payment_behavior: "default_incomplete",
    metadata: {
      ...subscription.metadata,
      accountId: String(accountId),
      planId: safePlanId,
      billingCycle: safeBillingCycle,
      changeSource: "profile",
      prorationDate: String(prorationDate),
    },
    expand: ["latest_invoice"],
  });
  const latestInvoice = updatedSubscription.latest_invoice;

  // ─── Persist the change locally without waiting for the webhook ───────────
  await pool.query(
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
                    updated_at = current_timestamp;
    `,
    [
      accountId,
      safePlanId,
      safeBillingCycle,
      updatedSubscription.status,
      getPlan(safePlanId).tokenLimit,
      updatedSubscription.current_period_start || null,
      updatedSubscription.current_period_end || null,
      updatedSubscription.id,
    ]
  );

  // Also update the accounts table immediately so the UI reflects the new plan
  // before the webhook arrives.
  await pool.query(
    `
      update accounts
      set plan_type = $2,
          billing_cycle = $3,
          updated_at = current_timestamp
      where id = $1;
    `,
    [accountId, safePlanId, safeBillingCycle]
  );

  // ─── Resolve the invoice URL where the user pays the net proration ────────
  const resolveInvoiceUrl = async (invoice) => {
    if (!invoice) return null;
    if (typeof invoice === "string") {
      const fetched = await client.invoices.retrieve(invoice);
      return fetched.hosted_invoice_url ? { url: fetched.hosted_invoice_url, id: fetched.id } : null;
    }
    return invoice.hosted_invoice_url ? { url: invoice.hosted_invoice_url, id: invoice.id } : null;
  };

  const invoiceRef = await resolveInvoiceUrl(latestInvoice);

  if (invoiceRef) {
    return {
      url: invoiceRef.url,
      id: invoiceRef.id,
      mode: "subscription_update",
      proration: prorationSummary,
    };
  }

  // Fallback: send the user to the Stripe billing portal.
  const portal = await client.billingPortal.sessions.create({
    customer: customerId,
    return_url: appendPopupFlag(`${appOrigin}/perfil?stripe_portal=returned`, returnMode),
  });

  return { url: portal.url, id: portal.id, mode: "portal", proration: prorationSummary };
}

export async function loadBillingSummary(accountId) {
  const [paymentResult, subscriptionResult, paymentMethods] = await Promise.all([
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
    listStripePaymentMethods(accountId).catch(() => []),
  ]);

  return {
    paymentProfile: paymentResult.rows[0] || null,
    subscription: subscriptionResult.rows[0] || null,
    paymentMethods,
  };
}

async function saveStripePaymentMethod(accountId, subscription) {
  const paymentMethodId = subscription.default_payment_method;

  if (!paymentMethodId) {
    return;
  }

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
                    card_brand = null,
                    card_last4 = null,
                    updated_at = current_timestamp;
    `,
    [
      accountId,
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
      paymentMethodId,
      null,
      null,
    ]
  );
}

async function saveStripeCustomerPaymentMethod(customer) {
  const accountId = Number(customer.metadata?.accountId);
  const paymentMethodId = customer.invoice_settings?.default_payment_method;

  if (!accountId || !paymentMethodId) {
    return null;
  }

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
      values ($1, 'stripe', $2, $3, null, null)
      on conflict (account_id, gateway)
      do update set gateway_customer_id = excluded.gateway_customer_id,
                    default_payment_method_id = excluded.default_payment_method_id,
                    card_brand = null,
                    card_last4 = null,
                    updated_at = current_timestamp
      returning *;
    `,
    [accountId, customer.id, paymentMethodId]
  );

  return true;
}

async function saveStripePaymentMethodFromSetupSession(session) {
  const accountId = Number(session.metadata?.accountId);

  if (!accountId || !session.setup_intent) {
    return null;
  }

  const client = requireStripe();
  const setupIntent = await client.setupIntents.retrieve(session.setup_intent);
  const paymentMethodId = setupIntent.payment_method;

  if (!paymentMethodId) {
    return null;
  }

  await client.customers.update(session.customer, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

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
      values ($1, 'stripe', $2, $3, null, null)
      on conflict (account_id, gateway)
      do update set gateway_customer_id = excluded.gateway_customer_id,
                    default_payment_method_id = excluded.default_payment_method_id,
                    card_brand = null,
                    card_last4 = null,
                    updated_at = current_timestamp
      returning *;
    `,
    [accountId, session.customer, paymentMethodId]
  );

  return true;
}

export async function upsertSubscriptionFromStripe(subscription) {
  const accountId = Number(subscription.metadata?.accountId);

  if (!accountId) {
    return null;
  }

  // When a subscription becomes active or trialing, cancel every other subscription
  // on this account to ensure only one plan is active at a time.
  if (["active", "trialing"].includes(subscription.status)) {
    await cancelOtherSubscriptions(accountId, subscription.id);
  }

  const planId = normalizePlanId(plans[subscription.metadata?.planId] ? subscription.metadata.planId : "intermediario");
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

    if (session.mode === "setup") {
      return saveStripePaymentMethodFromSetupSession(session);
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    return upsertSubscriptionFromStripe(event.data.object);
  }

  if (event.type === "customer.updated") {
    return saveStripeCustomerPaymentMethod(event.data.object);
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

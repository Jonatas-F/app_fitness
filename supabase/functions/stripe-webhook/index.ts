import Stripe from "npm:stripe@18.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2026-02-25.clover",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

async function upsertSubscription(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const userId = metadata.supabase_user_id;

  if (!userId) {
    return;
  }

  const plan = metadata.plan || "intermediario";
  const billingCycle = metadata.billing_cycle || "monthly";
  const tokenLimit = Number(metadata.token_limit || 90000);
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  await supabase.from("payment_profiles").upsert(
    {
      user_id: userId,
      gateway: "stripe",
      gateway_customer_id: customerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,gateway" }
  );

  await supabase.from("profiles").upsert(
    {
      id: userId,
      active_plan: plan,
      billing_cycle: billingCycle,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      billing_cycle: billingCycle,
      status: subscription.status,
      token_limit: tokenLimit,
      token_balance: tokenLimit,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      gateway_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "gateway_subscription_id" }
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return jsonResponse({ error: "Webhook Stripe nao configurado." }, 400);
  }

  try {
    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await upsertSubscription(event.data.object as Stripe.Subscription);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro no webhook Stripe." },
      400
    );
  }
});

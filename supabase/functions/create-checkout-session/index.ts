import Stripe from "npm:stripe@18.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { BillingCycle, getCycleLabel, getPlanById, getStripeAmount } from "../_shared/plans.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2026-02-25.clover",
});

function getAppUrl() {
  return Deno.env.get("APP_URL") || Deno.env.get("VITE_APP_URL") || "http://localhost:5173";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authorization },
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "Usuario nao autenticado." }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const plan = getPlanById(String(body.planId || "intermediario"));
    const billingCycle: BillingCycle = body.billingCycle === "annual" ? "annual" : "monthly";
    const installments = Math.min(Math.max(Number(body.installments) || 1, 1), 12);
    const appUrl = getAppUrl();

    const customer = await stripe.customers.create({
      email: userData.user.email || undefined,
      metadata: {
        supabase_user_id: userData.user.id,
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      client_reference_id: userData.user.id,
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/checkout?plan=${plan.id}&checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_update: {
        address: "auto",
        name: "auto",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: getStripeAmount(plan, billingCycle),
            recurring: {
              interval: billingCycle === "annual" ? "year" : "month",
            },
            product_data: {
              name: `Shape Certo ${plan.name} - ${getCycleLabel(billingCycle)}`,
              metadata: {
                plan: plan.id,
                billing_cycle: billingCycle,
              },
            },
          },
        },
      ],
      subscription_data: {
        metadata: {
          supabase_user_id: userData.user.id,
          plan: plan.id,
          billing_cycle: billingCycle,
          token_limit: String(plan.tokenLimit),
          requested_installments: String(installments),
        },
      },
      metadata: {
        supabase_user_id: userData.user.id,
        plan: plan.id,
        billing_cycle: billingCycle,
        token_limit: String(plan.tokenLimit),
        requested_installments: String(installments),
      },
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro ao criar checkout." },
      500
    );
  }
});

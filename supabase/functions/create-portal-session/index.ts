import Stripe from "npm:stripe@18.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

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
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authorization },
      },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "Usuario nao autenticado." }, 401);
    }

    const { data: paymentProfile, error: profileError } = await adminClient
      .from("payment_profiles")
      .select("gateway_customer_id")
      .eq("user_id", userData.user.id)
      .eq("gateway", "stripe")
      .maybeSingle();

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 500);
    }

    if (!paymentProfile?.gateway_customer_id) {
      return jsonResponse(
        { error: "Nenhum cliente Stripe encontrado para esta conta." },
        404
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: paymentProfile.gateway_customer_id,
      return_url: `${getAppUrl()}/perfil`,
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro ao abrir portal Stripe." },
      500
    );
  }
});

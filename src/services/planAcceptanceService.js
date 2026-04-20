import { savePlanAcceptanceLocally } from "../data/planAcceptanceStorage";
import { getCurrentUser } from "./profileService";
import { isSupabaseConfigured, requireSupabase } from "./supabaseClient";

export async function savePlanChangeAcceptance(record) {
  const localRecord = savePlanAcceptanceLocally(record);

  if (!isSupabaseConfigured) {
    return { data: localRecord, error: null, skipped: true };
  }

  const { user, error: userError, skipped } = await getCurrentUser();

  if (skipped || userError || !user) {
    return { data: localRecord, error: userError, skipped };
  }

  const payload = {
    user_id: user.id,
    previous_plan: record.previousPlan,
    previous_billing_cycle: record.previousBillingCycle,
    next_plan: record.nextPlan,
    next_billing_cycle: record.nextBillingCycle,
    payment_method_label: record.paymentMethodLabel,
    payment_method_last4: record.paymentMethodLast4,
    accepted_terms_text: record.acceptedTermsText,
    accepted_at: record.acceptedAt,
    metadata: record.metadata || {},
  };

  const { data, error } = await requireSupabase()
    .from("plan_change_acceptances")
    .insert(payload)
    .select()
    .single();

  return { data: data || localRecord, error, skipped: false };
}

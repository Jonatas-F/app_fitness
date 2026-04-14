do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payment_profiles_user_gateway_key'
  ) then
    alter table public.payment_profiles
      add constraint payment_profiles_user_gateway_key unique (user_id, gateway);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_gateway_subscription_id_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_gateway_subscription_id_key unique (gateway_subscription_id);
  end if;
end $$;

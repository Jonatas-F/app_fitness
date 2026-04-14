# Stripe + Supabase

Este projeto usa Stripe Checkout para assinatura e Supabase Edge Functions para manter a chave secreta fora do frontend.

## Variaveis locais

O frontend usa apenas a chave publicavel:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Nunca coloque `STRIPE_SECRET_KEY` no codigo do React nem em arquivo versionado.

## Secrets das Edge Functions

Configure no Supabase:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set APP_URL=http://localhost:5173
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

Em producao, troque `APP_URL` pela URL publicada.

## Schema adicional

Se o schema principal ja foi executado antes, execute tambem:

```sql
-- database/stripe_constraints.sql
```

Essas constraints permitem que o webhook atualize o cliente e a assinatura existentes.

## Functions criadas

- `create-checkout-session`: cria a sessao de checkout para plano mensal ou anual.
- `create-portal-session`: abre o portal do cliente para trocar cartao, cancelar ou gerenciar cobranca.
- `stripe-webhook`: recebe eventos do Stripe e atualiza `profiles`, `payment_profiles` e `subscriptions`.

## Deploy

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

## Webhook no Stripe

Crie um endpoint no Stripe apontando para:

```text
https://wzvnqckiepapuznukqzt.supabase.co/functions/v1/stripe-webhook
```

Eventos recomendados:

```text
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

Copie o signing secret `whsec_...` gerado pelo Stripe e salve em `STRIPE_WEBHOOK_SECRET`.

## Observacao sobre anual parcelado

O checkout anual ja aplica 20% de desconto e cria assinatura anual. O campo de parcelamento fica salvo nos metadados como intencao comercial, mas parcelamento real depende das formas de pagamento e configuracoes disponiveis na sua conta Stripe.

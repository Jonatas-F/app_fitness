# Supabase e publicacao

## 1. Criar o projeto Supabase

1. Crie um projeto em Supabase.
2. Abra o SQL Editor.
3. Execute `database/supabase_schema.sql`.
4. Em Authentication > Providers, habilite Email e Google.
5. Em Authentication > URL Configuration, configure:
   - Site URL local: `http://localhost:5173`
   - Site URL producao: a URL publicada do app
   - Redirect URL: `https://sua-url-publicada.com/dashboard`

## 2. Configurar variaveis

Crie `.env.local` com:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
VITE_APP_URL=http://localhost:5173
```

Na publicacao, cadastre as mesmas variaveis no painel da plataforma.

## 3. Pagamentos

Nunca armazene numero completo do cartao, CVV ou senha no banco.

Use Stripe, Mercado Pago ou Pagar.me para tokenizar cartoes e assinaturas. No Supabase, salve apenas:

- `gateway_customer_id`
- `gateway_subscription_id`
- `default_payment_method_id`
- `card_brand`
- `card_last4`

As chaves secretas do gateway devem ficar em backend/serverless, nunca no Vite.

## 4. Publicacao

Para publicar em Vercel, Netlify ou similar:

1. Conecte o repositorio GitHub.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Configure as variaveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`.
5. Atualize as URLs liberadas no Supabase Auth.

# Guia de Publicação — shapecerto.com.br

Domínio: **shapecerto.com.br** (GoDaddy)  
Arquitetura: **VPS Ubuntu 22.04 + PostgreSQL + Node.js + Nginx + SSL**

```
Usuario  ──→  shapecerto.com.br       ──→  Nginx  ──→  dist/ (React build)
         ──→  api.shapecerto.com.br   ──→  Nginx  ──→  Node.js :3333
                                                   ──→  PostgreSQL :5432
```

---

## ETAPA 1 — Contratar o VPS

### Opção A — Oracle Cloud (GRÁTIS para sempre) ✅ Recomendada
1. Acesse https://cloud.oracle.com/free
2. Crie conta (cartão de crédito solicitado, não é cobrado)
3. No painel: **Compute → Instances → Create Instance**
   - Shape: `VM.Standard.E2.1.Micro` (Always Free)
   - OS: **Ubuntu 22.04**
   - Região: **Brazil East (São Paulo)**
   - SSH Key: crie um par ou faça upload da sua chave pública
4. Anote o **IP público** da instância

### Opção B — DigitalOcean (~R$ 30/mês)
1. Acesse https://digitalocean.com
2. **Create → Droplet**
   - Ubuntu 22.04 LTS
   - Plan: **Regular → $6/mês** (1 GB RAM, 25 GB SSD)
   - Datacenter: **São Paulo (BRA1)**
   - Authentication: SSH Key
3. Anote o **IP público** do Droplet

> **Dica:** Para Oracle Free, depois de criar abra as regras de firewall:  
> Networking → Virtual Cloud Networks → Security List → Add Ingress Rules  
> Adicione portas: 22 (SSH), 80 (HTTP), 443 (HTTPS)

---

## ETAPA 2 — Configurar DNS no GoDaddy

1. Acesse https://dcc.godaddy.com/manage/dns (shapecerto.com.br)
2. **Adicione/edite os seguintes registros:**

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | `@` | `SEU_IP_DO_VPS` | 600 |
| A | `www` | `SEU_IP_DO_VPS` | 600 |
| A | `api` | `SEU_IP_DO_VPS` | 600 |
| CNAME | `www` | `@` | 600 |

> Propagação do DNS leva de 5 min a 24h. Teste com: `nslookup shapecerto.com.br`

---

## ETAPA 3 — Configuração inicial do servidor

Conecte via SSH:
```bash
ssh ubuntu@SEU_IP_DO_VPS
# Se Oracle: ssh -i ~/.ssh/chave_privada ubuntu@SEU_IP
```

### 3.1 Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget unzip ufw fail2ban
```

### 3.2 Configurar firewall
```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 3333/tcp     # bloquear porta do Node externamente
sudo ufw deny 5432/tcp     # bloquear PostgreSQL externamente
sudo ufw enable
```

### 3.3 Criar usuário de deploy
```bash
sudo adduser shapecerto
sudo usermod -aG sudo shapecerto
sudo su - shapecerto
```

---

## ETAPA 4 — Instalar PostgreSQL

```bash
# Instalar PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar no boot
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Entrar no psql como superuser
sudo -u postgres psql
```

Dentro do psql, execute:
```sql
-- Criar banco e usuario dedicado
CREATE DATABASE shape_certo;
CREATE USER shapecerto_app WITH ENCRYPTED PASSWORD 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE shape_certo TO shapecerto_app;
\c shape_certo
GRANT ALL ON SCHEMA public TO shapecerto_app;
\q
```

> **IMPORTANTE:** Troque `SENHA_FORTE_AQUI` por uma senha longa e aleatória.
> Gere uma com: `openssl rand -base64 32`

---

## ETAPA 5 — Instalar Node.js 22 LTS

```bash
# Via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versão
node -v   # deve ser v22.x
npm -v

# Instalar PM2 (gerenciador de processo)
sudo npm install -g pm2
```

---

## ETAPA 6 — Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## ETAPA 7 — Deploy do código

### 7.1 Clonar o repositório
```bash
cd /home/shapecerto
git clone https://github.com/Jonatas-F/app_fitness.git app
cd app/keen-greider-d6ff33
```

### 7.2 Configurar variáveis do backend
```bash
nano backend/.env
```

Conteúdo do arquivo:
```env
NODE_ENV=production
PORT=3333
APP_ORIGIN=https://shapecerto.com.br
APP_PREVIEW_ORIGIN=https://www.shapecerto.com.br
APP_ALLOWED_ORIGINS=https://shapecerto.com.br,https://www.shapecerto.com.br

DATABASE_URL=postgresql://shapecerto_app:SENHA_FORTE_AQUI@localhost:5432/shape_certo
DATABASE_SSL=false

JWT_SECRET=COLE_AQUI_UMA_CHAVE_ALEATORIA_DE_64_CHARS
# Gere com: openssl rand -base64 64

GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=https://api.shapecerto.com.br/auth/google/callback
GOOGLE_RISC_CLIENT_IDS=seu-client-id.apps.googleusercontent.com

STRIPE_SECRET_KEY=sk_live_SUA_CHAVE_SECRETA_STRIPE
STRIPE_WEBHOOK_SECRET=whsec_SEU_WEBHOOK_SECRET
STRIPE_SUCCESS_URL=https://shapecerto.com.br/dashboard
STRIPE_CANCEL_URL=https://shapecerto.com.br/checkout

OPENAI_API_KEY=sk-proj_SUA_CHAVE_OPENAI
OPENAI_MODEL=gpt-4o
```

### 7.3 Instalar dependências do backend
```bash
cd backend
npm install --omit=dev
cd ..
```

### 7.4 Build do frontend (com a URL da API de produção)
```bash
# Criar .env.local para o build de produção
echo "VITE_APP_URL=https://shapecerto.com.br" > .env.local
echo "VITE_API_URL=https://api.shapecerto.com.br" >> .env.local

npm install
npm run build
```

Os arquivos estáticos ficam em `dist/`.

---

## ETAPA 8 — Iniciar o backend com PM2

```bash
cd /home/shapecerto/app/keen-greider-d6ff33

pm2 start backend/src/server.js \
  --name shape-certo-api \
  --interpreter node \
  --env production

# Salvar configuração para reiniciar no boot
pm2 save
pm2 startup
# Execute o comando que o PM2 mostrar (começa com "sudo env PATH=...")
```

Verificar se está rodando:
```bash
pm2 status
pm2 logs shape-certo-api --lines 50
```

---

## ETAPA 9 — Configurar Nginx

### 9.1 Frontend (shapecerto.com.br)
```bash
sudo nano /etc/nginx/sites-available/shapecerto-frontend
```

```nginx
server {
    listen 80;
    server_name shapecerto.com.br www.shapecerto.com.br;

    root /home/shapecerto/app/keen-greider-d6ff33/dist;
    index index.html;

    # Compressão gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1000;

    # Cache de assets com hash (1 ano)
    location ~* /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Service Worker — nunca cachear
    location /sw.js {
        expires off;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files $uri =404;
    }

    # Webmanifest — cache curto
    location /site.webmanifest {
        expires 1d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    # SPA — todas as rotas para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 9.2 Backend API (api.shapecerto.com.br)
```bash
sudo nano /etc/nginx/sites-available/shapecerto-api
```

```nginx
server {
    listen 80;
    server_name api.shapecerto.com.br;

    location / {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout para chamadas longas de IA
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;

        # Tamanho máximo de body (upload de fotos)
        client_max_body_size 10m;
    }
}
```

### 9.3 Ativar os sites
```bash
sudo ln -s /etc/nginx/sites-available/shapecerto-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/shapecerto-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t          # deve retornar "syntax is ok"
sudo systemctl reload nginx
```

---

## ETAPA 10 — SSL com Let's Encrypt (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx \
  -d shapecerto.com.br \
  -d www.shapecerto.com.br \
  -d api.shapecerto.com.br \
  --agree-tos \
  --non-interactive \
  --email seu@email.com.br

# Renovação automática (já configurada pelo certbot, verificar)
sudo systemctl status certbot.timer
```

Após isso o Nginx passa a servir HTTPS automaticamente.

---

## ETAPA 11 — Configurar Webhook do Stripe para produção

1. Acesse https://dashboard.stripe.com/webhooks
2. Clique **"Add endpoint"**
3. URL: `https://api.shapecerto.com.br/billing/stripe/webhook`
4. Eventos a ouvir:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.updated`
   - `checkout.session.completed`
5. Após criar, copie o **Webhook signing secret** (`whsec_...`)
6. Atualize o `backend/.env` com o novo `STRIPE_WEBHOOK_SECRET`
7. Reinicie: `pm2 restart shape-certo-api`

---

## ETAPA 12 — Configurar Google OAuth para produção

1. Acesse https://console.cloud.google.com → APIs & Services → Credentials
2. Edite seu OAuth 2.0 Client ID
3. **Authorized redirect URIs** — adicione:
   - `https://api.shapecerto.com.br/auth/google/callback`
4. **Authorized JavaScript origins** — adicione:
   - `https://shapecerto.com.br`
   - `https://www.shapecerto.com.br`

---

## ETAPA 13 — Verificação final

```bash
# Backend respondendo
curl https://api.shapecerto.com.br/health

# Frontend carregando
curl -I https://shapecerto.com.br

# PM2 rodando
pm2 status

# PostgreSQL conectado
sudo -u postgres psql -c "\l"

# Logs em tempo real
pm2 logs shape-certo-api
```

---

## Script de deploy contínuo (atualizar depois de cada commit)

Crie o arquivo `scripts/deploy.sh` no servidor:

```bash
#!/bin/bash
set -e

APP_DIR="/home/shapecerto/app/keen-greider-d6ff33"
cd "$APP_DIR"

echo "→ Atualizando código..."
git pull origin claude/keen-greider-d6ff33

echo "→ Instalando dependências do backend..."
cd backend && npm install --omit=dev && cd ..

echo "→ Fazendo build do frontend..."
npm run build

echo "→ Reiniciando API..."
pm2 restart shape-certo-api

echo "✓ Deploy concluído em $(date)"
```

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh   # para fazer deploy de uma atualização
```

---

## Resumo de custos estimados

| Serviço | Custo |
|---------|-------|
| Oracle Cloud VPS (Always Free) | **R$ 0/mês** |
| DigitalOcean Droplet São Paulo | ~R$ 30/mês |
| Domínio shapecerto.com.br (GoDaddy) | já comprado |
| SSL (Let's Encrypt) | **R$ 0** |
| Stripe | % sobre transações |
| OpenAI | conforme uso |

---

## Checklist antes de ir ao ar

- [ ] DNS propagado (teste: `nslookup shapecerto.com.br`)
- [ ] HTTPS funcionando nos 3 domínios
- [ ] `GET https://api.shapecerto.com.br/health` retorna `{"status":"ok"}`
- [ ] Login com email funcionando
- [ ] Login com Google funcionando
- [ ] Webhook do Stripe testado (modo live)
- [ ] `pm2 startup` configurado (reinicia automaticamente no reboot)
- [ ] Backup do banco configurado (ver seção abaixo)

## Backup automático do PostgreSQL

```bash
# Criar script de backup diário
sudo nano /etc/cron.daily/backup-shapecerto
```

```bash
#!/bin/bash
BACKUP_DIR="/home/shapecerto/backups"
DATE=$(date +%Y%m%d_%H%M)
mkdir -p "$BACKUP_DIR"

pg_dump -U shapecerto_app shape_certo | gzip > "$BACKUP_DIR/shape_certo_$DATE.sql.gz"

# Manter apenas os últimos 7 backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
```

```bash
sudo chmod +x /etc/cron.daily/backup-shapecerto
```

# AWS Deployment Guide

EC2 (t3.small) + RDS PostgreSQL + Nginx + DuckDNS + Certbot (free HTTPS).

---

## Architecture

```
Internet (HTTPS :443)
  └── Nginx (EC2)
        ├── /           → Next.js frontend  (localhost:3000)
        └── /api-backend/ → Express backend (localhost:3001)
                              ├── RDS PostgreSQL
                              ├── Inngest Cloud
                              ├── Stripe webhooks
                              └── Resend
```

Ports 3000 and 3001 are never exposed to the internet — only Nginx on 80/443.

---

## Prerequisites

- EC2 t3.small running Ubuntu, key pair downloaded
- Security group inbound rules: 22 (your IP), 80 (0.0.0.0/0), 443 (0.0.0.0/0)
- RDS PostgreSQL instance in same VPC as EC2
- DuckDNS subdomain pointing to your Elastic IP
- Inngest Cloud account (free tier)
- Stripe dashboard webhook endpoint created

**Important:** Allocate an Elastic IP and assign it to your EC2 instance before setting up DuckDNS. EC2 public IPs change on stop/start — Elastic IPs do not.

---

## Step 1 — SSH into EC2

If connection times out, your IP changed. Update the SSH inbound rule in the security group to "My IP" and retry.

```bash
ssh -i "Aws_learning_key_pair.pem" ubuntu@<your-elastic-ip>
```

---

## Step 2 — Install dependencies on EC2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git certbot python3-certbot-nginx
sudo npm install -g pm2
```

---

## Step 3 — DuckDNS + HTTPS

1. Go to duckdns.org → login with GitHub → create subdomain e.g. `sumitpayments`
2. Set IP to your Elastic IP
3. Configure Nginx:

```bash
sudo nano /etc/nginx/sites-available/default
```

```nginx
server {
    listen 80;
    server_name sumitpayments.duckdns.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api-backend/ {
        rewrite ^/api-backend/(.*) /$1 break;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t && sudo systemctl restart nginx
```

4. Get TLS certificate (Certbot auto-edits Nginx config for HTTPS + HTTP redirect):

```bash
sudo certbot --nginx -d sumitpayments.duckdns.org
```

---

## Step 4 — Clone and configure

```bash
git clone https://github.com/sumit298/Payment-Integrations.git
cd Payment-Integrations
```

**Backend `.env`** (`stripe-payment-integration/.env`):
```
DATABASE_URL=postgresql://sumitsinha:<password>@<rds-endpoint>:5432/payments
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx        # from Stripe dashboard webhook endpoint
STRIPE_PRO_PRICE_ID=price_xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_TOKEN=xxx
GITHUB_OWNER=sumit298
GITHUB_REPO=clothing_store
BETTER_AUTH_SECRET=<same-32-char-secret-as-frontend>
BETTER_AUTH_URL=https://sumitpayments.duckdns.org
RESEND_API_KEY=xxx
ADMIN_EMAIL=sumitgdsc@gmail.com
INNGEST_EVENT_KEY=xxx                  # from Inngest Cloud dashboard
INNGEST_SIGNING_KEY=xxx                # from Inngest Cloud dashboard
INNGEST_SERVE_ORIGIN=https://sumitpayments.duckdns.org
INNGEST_SERVE_PATH=/api-backend/api/inngest
# do NOT set INNGEST_DEV or EMAIL_FROM
```

**Frontend `.env.local`** (`stripe-payment-frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
DATABASE_URL=postgresql://sumitsinha:<password>@<rds-endpoint>:5432/payments
BETTER_AUTH_SECRET=<same-32-char-secret-as-backend>
BETTER_AUTH_URL=https://sumitpayments.duckdns.org
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```

---

## Step 5 — Database setup on RDS

```bash
cd stripe-payment-integration
npm ci
```

Run better-auth migration first (creates `user`, `session`, `account`, `verification`):
```bash
npx @better-auth/cli migrate
```

Then run the Drizzle migration (creates `purchases`, enums, FK to `user`):
```bash
npx drizzle-kit migrate
```

The generated migration (`drizzle/0000_init.sql`) already includes:
- `refund_pending` in the `purchase_status` enum
- `githubUsername` column on `user`
- FK referencing `user` (not `users`)

No manual `ALTER TABLE` needed.

---

## Step 6 — Build and start with PM2

```bash
# Backend
cd stripe-payment-integration
npm ci
npm run build
pm2 start dist/index.js --name backend

# Frontend
cd ../stripe-payment-frontend
npm ci
npm run build
pm2 start npm --name frontend -- start

# Persist across reboots
pm2 save
pm2 startup
```

---

## Step 7 — External service configuration

**Stripe dashboard** → Developers → Webhooks → Add endpoint:
- URL: `https://sumitpayments.duckdns.org/api-backend/api/payments/webhook`
- Events: `charge.refunded`, `checkout.session.expired`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET` in backend `.env`

**Inngest Cloud** → Apps → Add app:
- URL: `https://sumitpayments.duckdns.org/api-backend/api/inngest`
- Copy `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` → backend `.env`

**GitHub OAuth app** (github.com/settings/developers):
- Homepage URL: `https://sumitpayments.duckdns.org`
- Callback URL: `https://sumitpayments.duckdns.org/api/auth/callback/github`

---

## Step 8 — Verify everything is running

```bash
pm2 status                          # both backend and frontend should show "online"
sudo systemctl status nginx         # should be active
curl https://sumitpayments.duckdns.org/api-backend/api/inngest  # should return Inngest response
```

---

## Key differences from local dev

| Local | Production |
|---|---|
| `stripe listen` | Stripe dashboard webhook endpoint |
| `npx inngest-cli dev` | Inngest Cloud |
| `INNGEST_DEV=1` + `INNGEST_EVENT_KEY=local` | Real Inngest Cloud keys |
| `localhost:3000` / `localhost:3001` | `https://sumitpayments.duckdns.org` |
| Local PostgreSQL | RDS PostgreSQL |
| `npm run dev` (ts-node) | `npm run build` + `pm2 start dist/index.js` |
| Google Fonts at build time | Removed — uses system `font-sans` |

---

## Code fixes made before deploying

| File | Fix |
|---|---|
| `stripe-payment-integration/package.json` | Added `"build": "tsc"` and `"start": "node dist/index.js"` |
| `stripe-payment-frontend/app/layout.tsx` | Removed `next/font/google` (Geist) — caused build failure when Google Fonts unreachable |
| `stripe-payment-frontend/app/api/checkout/route.ts` | Forward browser cookie to backend — was returning 401 after checkout auth was added |
| `stripe-payment-integration/src/server/api.ts` | Checkout requires auth session; embeds `userId` in Stripe metadata; claim verifies `metadata.userId === session.user.id` |
| `stripe-payment-integration/src/server/api.ts` | Refund guard fixed: blocks second partial refund on `partially_refunded`, allows full refund |
| `stripe-payment-integration/drizzle/0000_init.sql` | Regenerated clean from schema — references `user` (not `users`), includes `refund_pending`, snapshot in sync |

---

## Common issues on EC2

| Problem | Fix |
|---|---|
| SSH times out | Your IP changed — update security group SSH rule to "My IP" |
| EC2 IP changed after reboot | Allocate and assign an Elastic IP |
| DuckDNS not resolving | Update DuckDNS IP to match current Elastic IP |
| Certbot renewal | Auto-renews via cron — verify with `sudo certbot renew --dry-run` |
| App not running after reboot | Run `pm2 startup` and `pm2 save` once |
| Inngest not syncing | Check `INNGEST_SERVE_ORIGIN` and `INNGEST_SERVE_PATH` are set correctly |
| Stripe webhook failing | Confirm signing secret matches dashboard endpoint, not `stripe listen` output |

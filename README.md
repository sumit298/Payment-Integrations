# Payment Integration — Learning Guide

A reference for building payment systems with Stripe, GitHub OAuth, background jobs, and transactional emails. Written after building and fully testing this integration end to end.

---

## Architecture Overview

```
Frontend (Next.js :3000)
  └── calls Backend API (:3001)
        ├── better-auth (session management)
        ├── Stripe (checkout + webhooks)
        ├── Inngest (background jobs)
        ├── GitHub API (repo access)
        └── Resend (emails)
```

Two separate services sharing one PostgreSQL database.

---

## Local Dev — All 4 Services

Always start all 4 terminals before testing anything.

```bash
# Terminal 1 — Backend
cd stripe-payment-integration && npm run dev

# Terminal 2 — Frontend
cd stripe-payment-frontend && npm run dev

# Terminal 3 — Inngest (must use --no-discovery, point directly to backend)
npx inngest-cli@latest dev -u http://localhost:3001/api/inngest --no-discovery

# Terminal 4 — Stripe webhook forwarding
stripe listen --forward-to http://localhost:3001/api/payments/webhook
```

- Inngest dashboard: http://localhost:8288
- Test card: `4242 4242 4242 4242` — any future expiry, any CVC

**Important:** If `stripe listen` is not running, refund webhooks will never arrive and `handleRefund` will never fire. Always confirm it's running before testing refunds.

---

## Key Concepts

### 1. Stripe Checkout Flow

The flow is always: **create session → redirect → webhook → fulfill**

```
User clicks Buy
  → POST /api/payments/checkout (backend creates Stripe session)
  → User redirected to Stripe hosted page
  → User pays
  → Stripe redirects to successUrl with ?session_id=cs_xxx
  → Frontend calls /api/purchases/claim with session_id
  → Backend verifies payment_status === "paid" via retrieveCheckoutSession()
  → Insert purchase into DB with status = "completed"
  → Send event to Inngest for background work
```

Never trust the redirect alone — always verify with `retrieveCheckoutSession()` before inserting into DB.

```ts
stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${baseUrl}/dashboard?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
  metadata: { tier: "pro" },
})

const session = await stripe.checkout.sessions.retrieve(sessionId)
if (session.payment_status !== "paid") // reject
```

---

### 2. Stripe Webhooks — Thin Handler Pattern

Webhooks must respond within ~20 seconds. Never do heavy work inside them.

```ts
// WRONG
app.post("/webhook", async (req, res) => {
  const event = constructWebhookEvent(req.body, signature)
  await sendEmail(...)        // risky
  await grantGithubAccess()  // risky
  await updateDatabase(...)   // risky
  res.json({ received: true })
})

// CORRECT — validate + forward to Inngest, done
app.post("/webhook", async (req, res) => {
  const event = constructWebhookEvent(req.body, signature)
  await inngest.send({ name: "stripe/charge.refunded", data: { ... } })
  res.json({ received: true }) // responds in milliseconds
})
```

**Always use raw body for webhook signature verification:**
```ts
app.post("/webhook", express.raw({ type: "application/json" }), handler)
// NOT express.json() — parsing the body breaks signature verification
```

**Webhook secret:** use `whsec_xxx` from `stripe listen` output locally. Real secret in production comes from Stripe dashboard.

---

### 3. Refund Flow — Frontend Triggered

Refunds are triggered from the frontend dashboard (not Stripe dashboard). The full flow:

```
User clicks Full Refund or Partial Refund
  → POST /api/payments/refund (backend)
  → DB status set to "refund_pending" immediately
  → createRefund() called on Stripe
  → Frontend starts polling /api/purchases every 2s
  → Stripe fires charge.refunded webhook
  → stripe listen forwards to localhost:3001
  → Backend sends stripe/charge.refunded event to Inngest
  → Inngest handleRefund:
      - looks up purchase by stripePaymentIntentId
      - full refund: removeCollaborator() + status = "refunded" + githubAccessGranted = false
      - partial refund: status = "partially_refunded"
      - sends email to customer and admin
  → Frontend poll detects status !== "refund_pending" → stops polling → UI updates
```

**refund_pending status** is the key — set it immediately when refund is initiated so the frontend knows to show "⏳ Refund Processing" and start polling. Stop polling when status changes.

```ts
// DB enum must include refund_pending
export const purchaseStatusEnum = pgEnum("purchase_status", [
  "completed",
  "refund_pending",
  "partially_refunded",
  "refunded",
]);
```

**If you add refund_pending to an existing DB, run:**
```sql
ALTER TYPE purchase_status ADD VALUE 'refund_pending';
```

---

### 4. Frontend Polling Pattern

Used in two places — after purchase (wait for GitHub access) and after refund (wait for status update). The pattern is the same:

```ts
// After claim — poll until githubAccessGranted flips to true
const poll = setInterval(async () => {
  const res = await fetch("/api/purchases");
  const data = await res.json();
  if (res.ok) {
    const updated = data.purchases ?? [];
    setPurchases(updated);
    const claimed = updated.find((p) => p.stripeCheckoutSessionId === sid);
    if (claimed?.githubAccessGranted) clearInterval(poll); // stop when done
  }
}, 2000);

// After refund — poll until status is no longer refund_pending
const poll = setInterval(async () => {
  const res = await fetch("/api/purchases");
  const data = await res.json();
  if (res.ok) {
    const updated = data.purchases ?? [];
    setPurchases(updated);
    const target = updated.find((p) => p.id === purchaseId);
    if (target?.status !== "refund_pending") clearInterval(poll); // stop when done
  }
}, 2000);
```

This demonstrates two useful concepts for a portfolio project:
- Asynchronous workflows (Stripe → Webhook → Inngest)
- Frontend synchronization (showing progress until background work completes)

---

### 5. Inngest — Background Jobs

Inngest runs functions in steps. Each step is retried independently on failure.

```ts
inngest.createFunction(
  { id: "purchase-completed", triggers: [{ event: "purchase/completed" }] },
  async ({ event, step }) => {
    const { user, purchase } = await step.run("lookup-user-and-purchase", async () => {
      // DB queries here
    })

    await step.run("send-purchase-confirmation", async () => sendEmail(...))
    await step.run("add-github-collaborator", async () => addCollaborator(username))
    await step.run("update-purchase-record", async () => {
      await db.update(purchases).set({ githubAccessGranted: true })
    })
    await step.run("send-repo-access-email", async () => sendEmail(...))

    await step.sleep("wait-7-days", "7d")
    await step.run("send-followup", async () => sendEmail(...))
  }
)
```

**Send an event from anywhere:**
```ts
await inngest.send({ name: "purchase/completed", data: { userId, tier, sessionId } })
```

**Must use `--no-discovery` flag:**
```bash
npx inngest-cli@latest dev -u http://localhost:3001/api/inngest --no-discovery
```
Without `--no-discovery`, Inngest scans all ports and spams 404s on the frontend.

**Required env vars:**
```
INNGEST_DEV=1
INNGEST_EVENT_KEY=local
```

---

### 6. better-auth Setup

**a) Tables are created by better-auth, not drizzle**

```bash
npx @better-auth/cli migrate
```

Creates `user`, `session`, `account`, `verification` — all singular. Don't create them manually with drizzle.

**b) Table is `user` (singular), not `users`**

If your app has a `users` table it will conflict. Remove it and update all FK references to point to `user`.

**c) Columns are camelCase**

better-auth creates camelCase columns (`userId`, `createdAt`, `expiresAt`). Your drizzle schema must match exactly:

```ts
// correct — matches what better-auth created
userId: text("userId").notNull()
createdAt: timestamp("createdAt").notNull()

// wrong — drizzle snake_case won't find the column
userId: text("user_id").notNull()
```

**d) additionalFields for custom columns**

Both frontend AND backend auth configs must match:

```ts
betterAuth({
  user: {
    additionalFields: {
      githubUsername: { type: "string", nullable: true }
    }
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      mapProfileToUser: (profile) => ({ githubUsername: profile.login }),
    }
  }
})
```

Add the column manually to DB:
```sql
ALTER TABLE "user" ADD COLUMN "githubUsername" text;
```

If a user signed up before `mapProfileToUser` was added, their `githubUsername` will be null. They need to sign out and sign back in.

**e) Getting session in Express**

```ts
const headers = new Headers()
for (const [key, value] of Object.entries(req.headers)) {
  if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
  else if (value !== undefined) headers.set(key, value)
}
const session = await auth.api.getSession({ headers })
if (!session) return res.status(401).json({ error: "Unauthorized" })
```

**f) Forwarding cookies from Next.js to backend**

```ts
const res = await fetch(`${apiUrl}/api/purchases/claim`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    cookie: req.headers.get("cookie") ?? "",
  },
  body: JSON.stringify(body),
})
```

---

### 7. GitHub OAuth vs GitHub PAT

| | GitHub OAuth | GitHub PAT |
|---|---|---|
| Purpose | User login ("Sign in with GitHub") | Server-to-server API calls |
| Where | Frontend + Backend auth config | Backend only |
| Env vars | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `GITHUB_TOKEN` |
| Created at | github.com/settings/developers → OAuth Apps | github.com/settings/tokens |

**Adding a collaborator:**
```ts
await octokit.rest.repos.addCollaborator({
  owner: "your-username",
  repo: "your-repo",
  username: githubUsername, // must be GitHub username (profile.login), NOT numeric ID
  permission: "pull",
})
```

- `account.accountId` stores GitHub's numeric user ID, not the username
- Use `mapProfileToUser` with `profile.login` to capture the actual username
- If you test with the repo owner account you'll get a 422 — use a different account

**addCollaborator is idempotent** — if the user is already a collaborator, GitHub returns 204 (not 201). Safe to call multiple times.

---

### 8. Resend Email Setup

Resend requires a verified domain to send from custom addresses. For local dev and testing, use their built-in test sender:

```ts
// brand.ts
emails: {
  from: "Clothing Store <onboarding@resend.dev>",
}
```

`onboarding@resend.dev` delivers only to the email address registered on your Resend account. Make sure `ADMIN_EMAIL` matches that email.

**Do not set `EMAIL_FROM` in `.env` to a Gmail address** — Resend will reject it with 403 (domain not verified). If `EMAIL_FROM` is set, it overrides `brand.emails.from`. Remove it and let the code fall back to `brand.ts`.

For production, verify a domain at resend.com/domains and update `brand.emails.from`.

---

### 9. Drizzle ORM Gotchas

**Column names must match exactly what's in the DB:**
```ts
createdAt: timestamp("createdAt")  // better-auth created this — camelCase
createdAt: timestamp("created_at") // drizzle migration created this — snake_case
```

**Foreign keys must reference the correct table:**
```ts
userId: text("user_id").references(() => user.id) // "user" not "users"
```

**Don't shadow imported table names with local variables:**
```ts
import { user } from "./schema"

// BAD — shadows the imported table
const { user, purchase } = await step.run(...)

// GOOD
const { user: foundUser, purchase } = await step.run(...)
```

**Explicit select vs select() — always use explicit for API responses:**
```ts
// explicit select — safe to serialize, only returns what you need
const result = await db.select({
  id: purchases.id,
  status: purchases.status,
}).from(purchases)

// select() with no args — returns full drizzle objects, can cause circular JSON errors
const result = await db.select().from(purchases) // avoid for res.json()
```

---

### 10. Environment Variables Checklist

**Backend (`stripe-payment-integration/.env`):**
```
DATABASE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=        # from stripe listen output
STRIPE_PRO_PRICE_ID=          # price_xxx from Stripe dashboard
GITHUB_CLIENT_ID=             # OAuth app
GITHUB_CLIENT_SECRET=         # OAuth app
GITHUB_TOKEN=                 # PAT with repo admin permissions
GITHUB_OWNER=                 # your GitHub username
GITHUB_REPO=                  # repo name to grant access to
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=
ADMIN_EMAIL=                  # must match your Resend account email for onboarding@resend.dev
INNGEST_DEV=1
INNGEST_EVENT_KEY=local
# do NOT set EMAIL_FROM — let it fall back to brand.ts
```

**Frontend (`stripe-payment-frontend/.env`):**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
DATABASE_URL=                 # same DB as backend
BETTER_AUTH_SECRET=           # same as backend
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=             # same OAuth app as backend
GITHUB_CLIENT_SECRET=         # same OAuth app as backend
```

---

### 11. Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `relation "verification" does not exist` | better-auth tables not created | Run `npx @better-auth/cli migrate` |
| `column "user_id" does not exist` | Schema column name mismatch | Match column names to what's actually in DB |
| `No such price` | Wrong price ID in env | Copy `price_xxx` from Stripe dashboard |
| `Repository owner cannot be a collaborator` | Testing with repo owner account | Use a different GitHub account to test |
| `INNGEST_EVENT_KEY not found` | Missing env var | Add `INNGEST_DEV=1` and `INNGEST_EVENT_KEY=local` |
| `Failed to get session` | better-auth drizzle adapter missing tables | Pass all 4 tables: user, session, account, verification |
| `githubUsername is null` | User signed up before mapProfileToUser was added | Sign out and sign back in |
| Webhook signature fails | Body was parsed before verification | Use `express.raw()` not `express.json()` for webhook route |
| `charge_already_refunded` | Trying to refund an already refunded Stripe charge | Check DB status, clean up test data |
| `Converting circular structure to JSON` | Passing drizzle table/column object to res.json() | Use explicit select with named fields |
| Resend 403 domain not verified | EMAIL_FROM set to Gmail address | Remove EMAIL_FROM from .env |
| Refund webhook never fires | stripe listen not running | Restart `stripe listen --forward-to ...` |
| Inngest 404 spam on frontend port | Inngest auto-discovery scanning all ports | Always use `--no-discovery` flag |
| Purchase history shows duplicates | Multiple test purchases on same account | Clean with `DELETE FROM purchases WHERE user_id = ...` |

---

### 12. DB Migrations — Manual Steps

Some things drizzle push won't handle automatically:

```sql
-- add githubUsername after better-auth created the user table
ALTER TABLE "user" ADD COLUMN "githubUsername" text;

-- add a new enum value (drizzle can't do this with push)
ALTER TYPE purchase_status ADD VALUE 'refund_pending';

-- verify enum values
SELECT enum_range(NULL::purchase_status);
```

---

### 13. Next Step — AWS Deployment

Deploying to AWS in test mode to learn how payments work in production environment.

**Services needed:**
- Frontend → AWS Amplify or EC2
- Backend → EC2 or ECS (Fargate)
- Database → RDS PostgreSQL
- Inngest → Inngest Cloud (free tier, replaces local CLI)
- Stripe webhooks → real webhook endpoint in Stripe dashboard (not stripe listen)

**Key differences from local dev:**
- `INNGEST_DEV=1` and `INNGEST_EVENT_KEY=local` are removed — use real Inngest Cloud keys
- `STRIPE_WEBHOOK_SECRET` comes from Stripe dashboard webhook endpoint, not `stripe listen`
- `BETTER_AUTH_URL` points to real frontend domain
- `NEXT_PUBLIC_API_URL` points to real backend URL
- Resend needs a verified domain for real email delivery
- GitHub OAuth app callback URL must be updated to production domain

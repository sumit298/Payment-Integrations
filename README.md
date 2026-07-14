# Payment Integration — Learning Guide

A reference for building payment systems with Stripe, GitHub OAuth, background jobs, and transactional emails. Written to jog memory during the next integration.

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
  → Insert purchase into DB
  → Send event to Inngest for background work
```

Never trust the redirect alone — always verify with `retrieveCheckoutSession()` before granting access.

**One-time checkout session:**
```ts
stripe.checkout.sessions.create({
  mode: "payment",           // "subscription" for recurring
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
  metadata: { tier: "pro" }, // pass custom data through
})
```

**Retrieve and verify:**
```ts
const session = await stripe.checkout.sessions.retrieve(sessionId)
if (session.payment_status !== "paid") // reject
```

---

### 2. Stripe Webhooks — Thin Handler Pattern

Webhooks must respond within ~20 seconds. Never do heavy work inside them.

```ts
// WRONG — too much work in webhook
app.post("/webhook", async (req, res) => {
  const event = constructWebhookEvent(req.body, signature)
  await sendEmail(...)       // risky
  await grantGithubAccess() // risky
  await updateDatabase(...)  // risky
  res.json({ received: true })
})

// CORRECT — just validate + forward to background job
app.post("/webhook", async (req, res) => {
  const event = constructWebhookEvent(req.body, signature)
  await inngest.send({ name: "stripe/charge.refunded", data: {...} })
  res.json({ received: true }) // responds in milliseconds
})
```

**Always use raw body for webhook signature verification:**
```ts
app.post("/webhook", express.raw({ type: "application/json" }), handler)
// NOT express.json() — that parses the body and breaks signature verification
```

**Webhook secret:** use `whsec_xxx` from `stripe listen` locally, real one in production.

---

### 3. Inngest — Background Jobs

Inngest runs functions in steps. Each step is retried independently on failure.

```ts
inngest.createFunction(
  { id: "purchase-completed", triggers: [{ event: "purchase/completed" }] },
  async ({ event, step }) => {
    // Each step.run() is independently retried
    const user = await step.run("fetch-user", async () => {
      return db.select().from(users).where(eq(users.id, event.data.userId))
    })

    await step.run("send-email", async () => sendEmail(...))
    await step.run("grant-github-access", async () => addCollaborator(...))

    // Sleep between steps — Inngest handles this without blocking a server thread
    await step.sleep("wait-7-days", "7d")
    await step.run("send-followup", async () => sendEmail(...))
  }
)
```

**Send an event from anywhere:**
```ts
await inngest.send({ name: "purchase/completed", data: { userId, tier, sessionId } })
```

**Local dev:** run `npx inngest-cli@latest dev -u http://localhost:3001/api/inngest --no-discovery`

**Required env vars:**
```
INNGEST_DEV=1          # local dev mode
INNGEST_EVENT_KEY=local # local dev key
```

---

### 4. better-auth Setup

Two things that always trip you up:

**a) The DB tables are created by better-auth, not drizzle**

Run `npx @better-auth/cli migrate` to create `user`, `session`, `account`, `verification` tables. Don't try to create them manually with drizzle.

**b) The table is called `user` (singular), not `users`**

better-auth creates `user`, `session`, `account`, `verification` — all singular. If your app has a `users` table, they conflict.

**c) additionalFields for custom columns**

To store extra data like `githubUsername` on the user:
```ts
// auth config (both frontend AND backend must match)
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

Then add the column to DB manually:
```sql
ALTER TABLE "user" ADD COLUMN "githubUsername" text;
```

**d) Getting session in Express (backend)**

```ts
const headers = new Headers()
for (const [key, value] of Object.entries(req.headers)) {
  if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
  else if (value !== undefined) headers.set(key, value)
}
const session = await auth.api.getSession({ headers })
if (!session) return res.status(401).json({ error: "Unauthorized" })
```

**e) Forwarding cookies from Next.js to backend**

```ts
// Next.js API route proxying to backend
const res = await fetch(`${apiUrl}/api/purchases/claim`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    cookie: req.headers.get("cookie") ?? "", // forward the session cookie
  },
  body: JSON.stringify(body),
})
```

---

### 5. GitHub OAuth vs GitHub PAT — Two Different Things

| | GitHub OAuth | GitHub PAT |
|---|---|---|
| Purpose | User login ("Sign in with GitHub") | Server-to-server API calls |
| Where | Frontend + Backend auth config | Backend only |
| Env vars | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `GITHUB_TOKEN` |
| Created at | github.com/settings/developers → OAuth Apps | github.com/settings/tokens |

**Adding a collaborator (PAT):**
```ts
await octokit.rest.repos.addCollaborator({
  owner: "your-username",
  repo: "your-repo",
  username: githubUsername, // must be the GitHub username, NOT numeric ID
  permission: "pull",
})
```

The `account` table stores GitHub's numeric user ID in `accountId`, not the username. Use `mapProfileToUser` with `profile.login` to get the actual username.

---

### 6. Drizzle ORM Gotchas

**Column names must match exactly what's in the DB:**
```ts
// If DB has camelCase columns (created by better-auth):
createdAt: timestamp("createdAt")  // ✓

// If DB has snake_case columns (created by drizzle):
createdAt: timestamp("created_at") // ✓
```

**Foreign keys must reference the correct table:**
```ts
// purchases.userId references "user" table, not "users"
userId: text("user_id").references(() => user.id)
```

**Don't shadow imported table names with local variables:**
```ts
import { user } from "./schema"

// BAD — 'user' variable shadows the imported 'user' table
const { user, purchase } = await step.run(...)

// GOOD — rename the destructured variable
const { user: foundUser, purchase } = await step.run(...)
```

---

### 7. Environment Variables Checklist

**Backend:**
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
ADMIN_EMAIL=
INNGEST_DEV=1
INNGEST_EVENT_KEY=local
```

**Frontend:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
DATABASE_URL=                 # same DB as backend
BETTER_AUTH_SECRET=           # same as backend
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=             # same OAuth app as backend
GITHUB_CLIENT_SECRET=         # same OAuth app as backend
```

---

### 8. Local Dev — All 4 Services

```bash
# Terminal 1 — Backend
cd stripe-payment-integration && npm run dev

# Terminal 2 — Frontend
cd stripe-payment-frontend && npm run dev

# Terminal 3 — Inngest (points to backend, no auto-discovery)
npx inngest-cli@latest dev -u http://localhost:3001/api/inngest --no-discovery

# Terminal 4 — Stripe webhook forwarding
stripe listen --forward-to http://localhost:3001/api/payments/webhook
```

Inngest dashboard: http://localhost:8288

**Test card:** `4242 4242 4242 4242` — any future expiry, any CVC

---

### 9. Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `relation "verification" does not exist` | better-auth tables not created | Run `npx @better-auth/cli migrate` |
| `column "user_id" does not exist` | Schema column name mismatch | Match column names to what's actually in DB |
| `No such price` | Wrong price ID in env | Copy `price_xxx` from Stripe dashboard |
| `Repository owner cannot be a collaborator` | Testing with repo owner account | Use a different GitHub account to test |
| `INNGEST_EVENT_KEY not found` | Missing env var | Add `INNGEST_DEV=1` and `INNGEST_EVENT_KEY=local` |
| `Failed to get session` | better-auth drizzle adapter missing tables | Pass all 4 tables: user, session, account, verification |
| `githubUsername is null` | User signed up before mapProfileToUser was added | Sign out and sign back in, or update DB manually |
| Webhook signature fails | Body was parsed before verification | Use `express.raw()` not `express.json()` for webhook route |

---

### 10. Refund Flow

Refunds are triggered from the Stripe dashboard, not the app. The flow:

```
Stripe dashboard → issue refund
  → Stripe fires charge.refunded webhook
  → Backend receives webhook, sends event to Inngest
  → Inngest handleRefund function:
      - looks up purchase by payment_intent_id
      - if full refund: removes GitHub collaborator, sets status = "refunded"
      - if partial: sets status = "partially_refunded"
      - sends email to customer and admin
```

Full refund = revoke GitHub access. Partial refund = keep access, just notify.

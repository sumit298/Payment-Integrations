import express, { Request, Response } from "express";
import {
  createOneTimeCheckoutSession,
  retrieveCheckoutSession,
  constructWebhookEvent,
  createRefund,
} from "../lib/payments";
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { purchases } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "../lib/job/client";

const app = express();

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Cookie");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use((req, _res, next) => {
  if (req.path === "/api/payments/webhook") return next();
  express.json()(req, _res, next);
});

app.post("/api/payments/checkout", async (req, res) => {
  const priceId = process.env.STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    res.status(500).json({ error: "Price not configured" });
    return;
  }

  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const tier = "pro";

  const checkoutSession = await createOneTimeCheckoutSession({
    priceId,
    successUrl: `${baseUrl}/dashboard?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/pricing`,
    metaData: { tier },
  });

  res.json({ url: checkoutSession.url });
});

app.post("/api/purchases/claim", async (req, res) => {
  try {
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else if (value !== undefined) {
        headers.set(key, value);
      }
    }

    const session = await auth.api.getSession({
      headers,
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId } = req.body;

    const existing = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeCheckoutSessionId, sessionId))
      .limit(1);
    if (existing[0]) {
      return res.json({
        success: true,
        alreadyClaimed: true,
        tier: existing[0].tier,
      });
    }

    const stripeSession = await retrieveCheckoutSession(sessionId);

    if (stripeSession.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not received" });
    }

    const tier = (stripeSession.metadata?.tier ?? "pro") as "pro";

    await db.insert(purchases).values({
      userId: session.user.id,
      stripeCheckoutSessionId: sessionId,
      stripeCustomerId:
        typeof stripeSession.customer === "string"
          ? stripeSession.customer
          : (stripeSession.customer?.id ?? null),
      stripePaymentIntentId:
        typeof stripeSession.payment_intent === "string"
          ? stripeSession.payment_intent
          : (stripeSession.payment_intent?.id ?? null),
      tier,
      status: "completed",
      amount: stripeSession.amount_total ?? 0,
      currency: stripeSession.currency ?? "usd",
    });

    // Trigger background processing
    await inngest.send({
      name: "purchase/completed",
      data: {
        userId: session.user.id,
        tier,
        sessionId,
      },
    });

    return res.json({ success: true, tier });
  } catch (error) {
    console.error("Error claiming purchase:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/purchases", async (req: Request, res: Response) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
      else if (value !== undefined) headers.set(key, value);
    }

    const session = await auth.api.getSession({ headers });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const userPurchases = await db
      .select({
        id: purchases.id,
        tier: purchases.tier,
        status: purchases.status,
        amount: purchases.amount,
        currency: purchases.currency,
        githubAccessGranted: purchases.githubAccessGranted,
        purchasedAt: purchases.purchasedAt,
        stripeCheckoutSessionId: purchases.stripeCheckoutSessionId,
      })
      .from(purchases)
      .where(eq(purchases.userId, session.user.id))
      .orderBy(purchases.purchasedAt);

    return res.json({ purchases: userPurchases });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/payments/refund", async (req, res) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
      else if (value !== undefined) headers.set(key, value);
    }

    const session = await auth.api.getSession({ headers });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const { purchaseId, amount } = req.body;

    const purchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1);

    if (!purchase[0])
      return res.status(404).json({ error: "Purchase not found" });
    if (purchase[0].userId !== session.user.id)
      return res.status(403).json({ error: "Forbidden" });
    if (!purchase[0].stripePaymentIntentId)
      return res.status(400).json({ error: "No payment intent found" });
    if (purchase[0].status === "refunded")
      return res.status(400).json({ error: "Already refunded" });
    if (purchase[0].status === "refund_pending")
      return res.status(400).json({ error: "Refund already in progress" });

    await db
      .update(purchases)
      .set({ status: "refund_pending", updatedAt: new Date() })
      .where(eq(purchases.id, purchaseId));

    await createRefund({
      paymentIntentId: purchase[0].stripePaymentIntentId,
      ...(amount && { amount }),
    });

    return res.json({ success: true });
  } catch (error: any) {
    if (error?.code === "charge_already_refunded") {
      return res
        .status(400)
        .json({ error: "This purchase has already been refunded" });
    }
    console.error("Error processing refund:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature || typeof signature !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or invalid Stripe signature" });
    }

    try {
      const event = await constructWebhookEvent(req.body, signature);

      console.log(`[Webhook] Received event: ${event.type}`);

      if (event.type === "charge.refunded") {
        const charge = event.data.object;

        await inngest.send({
          name: "stripe/charge.refunded",
          data: {
            chargeId: charge.id,
            paymentIntentId: charge.payment_intent,
            amountRefunded: charge.amount_refunded,
            originalAmount: charge.amount,
            currency: charge.currency,
          },
        });
      }

      if (event.type === "checkout.session.expired") {
        const session = event.data.object;

        await inngest.send({
          name: "stripe/checkout.session.expired",
          data: {
            sessionId: session.id,
            customerEmail: session.customer_email,
          },
        });
      }

      return res.json({
        received: true,
      });
    } catch (err) {
      console.error("[Webhook] Verification failed:", err);

      return res.status(400).json({
        error: "Webhook verification failed",
      });
    }
  },
);

// This is the "thin webhook handler" pattern. Notice what it does not do: it does not query the database, send emails, grant access, or call any external service. It validates the signature, extracts the fields it needs, and sends a typed event to Inngest.

// The entire handler completes in milliseconds.

// Why does this matter? Stripe expects your webhook to return a 2xx response within about 20 seconds. If your handler tries to do too much work (database queries, email sends, API calls), it risks timing out.

// Stripe marks it as failed and retries the entire event

export default app;

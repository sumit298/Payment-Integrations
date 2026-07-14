import Stripe from "stripe";

let stripeClient: InstanceType<typeof Stripe> | null = null;

function getStripe(): InstanceType<typeof Stripe> {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not defined");
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

export const stripe = new Proxy({} as InstanceType<typeof Stripe>, {
  get(_, prop) {
    return Reflect.get(getStripe(), prop);
  },
});

export async function retrieveCheckoutSession(sessionId: string) {
  const client = getStripe();
  return client.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "line_items"],
  });
}

export async function createOneTimeCheckoutSession(params: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metaData: Record<string, string>;
  customerEmail?: string;
  couponId?: string;
}) {
  const client = getStripe();

  const session = await client.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metaData,
    ...(params.customerEmail && {
      customer_email: params.customerEmail,
    }),
    ...(params.couponId
      ? { discounts: [{ coupon: params.couponId }] }
      : { allow_promotion_codes: true }),
  });
  return session;
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not defined");
  const client = getStripe();
  return client.webhooks.constructEventAsync(payload, signature, webhookSecret);
}

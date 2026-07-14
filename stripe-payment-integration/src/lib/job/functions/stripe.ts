import { eq } from "drizzle-orm";
import { createElement } from "react";
import { inngest } from "../client";
import { db } from "../../db";
import { purchases, user } from "../../db/schema";
import { brand } from "../../brand";
import { sendEmail } from "../../emails";
import {
  AbandonedCartEmail,
  PartialRefundEmail,
  AccessRevokedEmail,
  PurchaseConfirmationEmail,
  RepoAccessGrantedEmail,
  AdminPurchaseNotificationEmail,
  AdminRefundNotificationEmail,
} from "../../emails/templates";
import { addCollaborator, removeCollaborator } from "../../github";

export const handlePurchaseCompleted = inngest.createFunction(
  {
    id: "purchase-completed",
    triggers: [{ event: "purchase/completed" }],
  },
  async ({ event, step }) => {
    const { userId, tier, sessionId } = event.data as {
      userId: string;
      tier: string;
      sessionId: string;
    };

    // look up user and purchase details
    const { user: foundUserData, purchase } = await step.run(
      "lookup-user-and-purchase",
      async () => {
        const userResult = await db
          .select({
            id: user.id,
            email: user.email,
            name: user.name,
            githubUsername: user.githubUsername,
          })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        const foundUser = userResult[0];
        if (!foundUser) {
          throw new Error(`User not found: ${userId}`);
        }

        const purchaseResult = await db
          .select({
            amount: purchases.amount,
            currency: purchases.currency,
            stripePaymentIntentId: purchases.stripePaymentIntentId,
          })
          .from(purchases)
          .where(eq(purchases.stripeCheckoutSessionId, sessionId))
          .limit(1);

        const foundPurchase = purchaseResult[0];

        return {
          user: foundUser,
          purchase: foundPurchase ?? {
            amount: 0,
            currency: "usd",
            stripePaymentIntentId: null,
          },
        };
      },
    );

    await step.run("send-purchase-confirmation", async () => {
      await sendEmail({
        to: foundUserData.email,
        subject: `Your ${brand.name} purchase is confirmed!`,
        template: createElement(PurchaseConfirmationEmail, {
          amount: purchase.amount,
          currency: purchase.currency,
          customerEmail: foundUserData.email,
        }),
      });
    });

    await step.run("send-admin-notification", async () => {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) return;

      await sendEmail({
        to: adminEmail,
        subject: `New template sale: ${foundUserData.email}`,
        template: createElement(AdminPurchaseNotificationEmail, {
          amount: purchase.amount,
          currency: purchase.currency,
          customerEmail: foundUserData.email,
          customerName: foundUserData.name,
          stripeSessionId: purchase.stripePaymentIntentId ?? sessionId,
        }),
      });
    });

    const githubUsername = foundUserData.githubUsername;
    if (!githubUsername) {
      return { success: true, userId, tier, githubAccessGranted: false };
    }

    // grant github repo access
    const collaboratorResult = await step.run(
      "add-github-collaborator",
      async () => {
        return addCollaborator(githubUsername);
      },
    );

    // update purchase record
    await step.run("update-purchase-record", async () => {
      await db
        .update(purchases)
        .set({
          githubAccessGranted: true,
          githubInvitationId: collaboratorResult.status,
          updatedAt: new Date(),
        })
        .where(eq(purchases.stripeCheckoutSessionId, sessionId));
    });

    // send repo access email
    await step.run("send-repo-access-email", async () => {
      const repoUrl = brand.social.github;
      await sendEmail({
        to: foundUserData.email,
        subject: `Your ${brand.name} repository access is ready!`,
        template: createElement(RepoAccessGrantedEmail, { repoUrl }),
      });
    });

    // schedule follow-up email sequence
    await step.run("schedule-follow-up", async () => {
      const purchaseRecord = await db
        .select({ id: purchases.id })
        .from(purchases)
        .where(eq(purchases.stripeCheckoutSessionId, sessionId))
        .limit(1);

      if (purchaseRecord[0]) {
        await inngest.send({
          name: "purchase/follow-up.scheduled",
          data: {
            userId,
            purchaseId: purchaseRecord[0].id,
            tier,
          },
        });
      }
    });
    return { success: true, userId, tier, githubAccessGranted: true };
  },
);

export const handlePurchaseFollowUp = inngest.createFunction(
  {
    id: "purchase-follow-up",
    triggers: [{ event: "purchase/follow-up.scheduled" }],
    cancelOn: [
      {
        event: "purchase/follow-up.cancelled",
        match: "data.purchaseId",
      },
    ],
  },
  async ({ event, step }) => {
    await step.sleep("wait-7-days", "7d");
    await step.run("send-day-7-email", async () => {
      // send onboarding tips
    });

    await step.sleep("wait-14-days", "7d");
    await step.run("send-day-14-email", async () => {
      // send feedback request
    });
  },
);

export const handleRefund = inngest.createFunction(
  { id: "refund-processed", triggers: [{ event: "stripe/charge.refunded" }] },
  async ({ event, step }) => {
    const data = event.data as {
      chargeId: string;
      paymentIntentId: string;
      amountRefunded: number;
      originalAmount: number;
      currency: string;
    };

    const chargeId = data.chargeId;
    const paymentIntentId = data.paymentIntentId;
    const currency = data.currency;
    const amountRefunded = data.amountRefunded;
    const originalAmount = data.originalAmount;
    const isFullRefund = amountRefunded >= originalAmount;

    const { user: refundUser, purchase } = await step.run(
      "lookup-purchase-by-payment-intent",
      async () => {
        const purchaseResult = await db
          .select({
            id: purchases.id,
            userId: purchases.userId,
            stripePaymentIntentId: purchases.stripePaymentIntentId,
            githubAccessGranted: purchases.githubAccessGranted,
          })
          .from(purchases)
          .where(eq(purchases.stripePaymentIntentId, paymentIntentId))
          .limit(1);

        const foundPurchase = purchaseResult[0];
        if (!foundPurchase) {
          return { user: null, purchase: null };
        }

        const userResult = await db
          .select({
            id: user.id,
            email: user.email,
            name: user.name,
            githubUsername: user.githubUsername,
          })
          .from(user)
          .where(eq(user.id, foundPurchase.userId))
          .limit(1);

        return { user: userResult[0] ?? null, purchase: foundPurchase };
      },
    );

    if (!purchase || !refundUser) {
      return { success: false, reason: "no_matching_purchase" };
    }

    let accessRevoked = false;

    if (isFullRefund && refundUser.githubUsername && purchase.githubAccessGranted) {
      const revokeResult = await step.run("revoke-github-access", async () => {
        return removeCollaborator(refundUser.githubUsername!);
      });
      accessRevoked = revokeResult.success;
    }

    await step.run("update-purchase-status", async () => {
      if (isFullRefund) {
        await db
          .update(purchases)
          .set({
            status: "refunded",
            githubAccessGranted: false,
            updatedAt: new Date(),
          })
          .where(eq(purchases.id, purchase.id));
      } else {
        await db
          .update(purchases)
          .set({
            status: "partially_refunded",
            updatedAt: new Date(),
          })
          .where(eq(purchases.id, purchase.id));
      }
    });

    // await step.run("track-refund-event", async () => {
    //   try {
    //     await trackServerEvent(user.id, "refund_processed", {
    //       charge_id: chargeId,
    //       payment_intent_id: paymentIntentId,
    //       amount_cents: amountRefunded,
    //       original_amount_cents: originalAmount,
    //       currency,
    //       is_full_refund: isFullRefund,
    //       github_access_revoked: accessRevoked,
    //     });
    //   } catch (error) {
    //     console.error(`Failed to track to PostHog:`, error);
    //   }
    // });

    await step.run("send-customer-notification", async () => {
      if (isFullRefund) {
        await sendEmail({
          to: refundUser.email,
          subject: `Your ${brand.name} refund has been processed`,
          template: createElement(AccessRevokedEmail, {
            customerEmail: refundUser.email,
            refundAmount: amountRefunded,
            currency,
          }),
        });
      } else {
        await sendEmail({
          to: refundUser.email,
          subject: `Your ${brand.name} partial refund has been processed`,
          template: createElement(PartialRefundEmail, {
            customerEmail: refundUser.email,
            refundAmount: amountRefunded,
            originalAmount,
            currency,
          }),
        });
      }
    });

    await step.run("send-admin-notification", async () => {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) return;

      await sendEmail({
        to: adminEmail,
        subject: `${isFullRefund ? "Full" : "Partial"} refund processed: ${refundUser.email}`,
        template: createElement(AdminRefundNotificationEmail, {
          customerEmail: refundUser.email,
          customerName: refundUser.name,
          githubUsername: refundUser.githubUsername,
          refundAmount: amountRefunded,
          originalAmount,
          currency,
          stripeChargeId: chargeId,
          accessRevoked: accessRevoked,
          isPartialRefund: !isFullRefund,
        }),
      });
    });
    return { success: true, accessRevoked: isFullRefund, userId: refundUser.id };
  },
);

export const handleCheckoutExpired = inngest.createFunction(
  {
    id: "checkout-expired",
    triggers: [{ event: "stripe/checkout.session.expired" }],
  },
  async ({ event, step }) => {
    const { customerEmail, sessionId } = event.data as {
      customerEmail: string | null;
      sessionId: string;
    };
    if (!customerEmail) {
      return { success: false, reason: "no_email" };
    }

    // wait 1 hour before sending recovery email
    await step.sleep("wait-before-recovery-email", "1h");

    // send abandoned cart email
    await step.run("send-abondoned-cart-email", async () => {
      const baseUrl = process.env.BETTER_AUTH_URL ?? "https://your-app.com";
      const checkoutUrl = new URL("/pricing", baseUrl).toString();

      await sendEmail({
        to: customerEmail,
        subject: `Your ${brand.name} checkout is waiting`,
        template: createElement(AbandonedCartEmail, {
          customerEmail,
          checkoutUrl,
        }),
      });
    });

    // await step.run("track-abandoned-cart", async ()=> {
    //     try {
    //         await trackServerEvent("anonymous", "abandoned_cart_email_sent", {
    //             customer_email: customerEmail,
    //             sessionId: sessionId
    //         })
    //     } catch (error) {
    //         console.error(`Failed to track to Posthog`, error)
    //     }
    // })

    return { success: true, customerEmail };
  },
);

"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

type ClaimState = "idle" | "claiming" | "success" | "already_claimed" | "error";

type Purchase = {
  id: string;
  tier: string;
  status: "completed" | "partially_refunded" | "refunded" | "refund_pending";
  amount: number;
  currency: string;
  githubAccessGranted: boolean;
  purchasedAt: string;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId: string;
};

function DashboardContent() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const purchaseSuccess = searchParams.get("purchase") === "success";
  const sessionId = searchParams.get("session_id");

  const [claimState, setClaimState] = useState<ClaimState>("idle");
  const [tier, setTier] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [refunding, setRefunding] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin?redirect=/dashboard");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) fetchPurchases();
  }, [session]);

  useEffect(() => {
    if (purchaseSuccess && sessionId && session) {
      claimPurchase(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseSuccess, sessionId, session]);

  async function fetchPurchases() {
    try {
      const res = await fetch("/api/purchases");
      const data = await res.json();
      if (res.ok) setPurchases(data.purchases ?? []);
    } catch {}
  }

  async function handleRefund(purchaseId: string, amount?: number) {
    setRefunding(purchaseId);
    try {
      const res = await fetch("/api/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId, ...(amount && { amount }) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refund failed");

      const poll = setInterval(async () => {
        const res = await fetch("/api/purchases");
        const data = await res.json();
        if (res.ok) {
          const updated: Purchase[] = data.purchases ?? [];
          setPurchases(updated);
          const target = updated.find((p) => p.id === purchaseId);
          if (target?.status !== "refund_pending") clearInterval(poll);
        }
      }, 2000);
      await fetchPurchases();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setRefunding(null);
    }
  }

  async function claimPurchase(sid: string) {
    setClaimState("claiming");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to claim purchase");
      setTier(data.tier);
      setClaimState(data.alreadyClaimed ? "already_claimed" : "success");
      router.replace("/dashboard");
      await fetchPurchases();

      // poll until github access is granted
      const poll = setInterval(async () => {
        const res = await fetch("/api/purchases");
        const data = await res.json();
        if (res.ok) {
          const updated: Purchase[] = data.purchases ?? [];
          setPurchases(updated);
          const claimed = updated.find(
            (p) => p.stripeCheckoutSessionId === sid || p.githubAccessGranted,
          );
          if (claimed?.githubAccessGranted) clearInterval(poll);
        }
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setClaimState("error");
    }
  }

  function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  function statusBadge(status: Purchase["status"]) {
    const styles = {
      completed: "bg-green-100 text-green-700",
      refund_pending: "bg-blue-100 text-blue-700",
      partially_refunded: "bg-yellow-100 text-yellow-700",
      refunded: "bg-red-100 text-red-700",
    };
    const labels = {
      completed: "Completed",
      refund_pending: "⏳ Refund Processing",
      partially_refunded: "Partially Refunded",
      refunded: "Refunded",
    };
    return (
      <span
        className={`text-xs font-semibold px-2 py-1 rounded-full ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  }

  if (isPending) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-[#6b6860]">Loading…</p>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#30302e] mb-2">Dashboard</h1>
      <p className="text-[#6b6860] mb-10">
        Welcome back, {session.user.name ?? session.user.email}
      </p>

      {claimState === "claiming" && (
        <div className="bg-[#f0fdf4] border border-green-200 rounded-xl p-6 mb-6">
          <p className="text-[#16a34a] font-semibold">
            Processing your purchase…
          </p>
        </div>
      )}

      {(claimState === "success" || claimState === "already_claimed") && (
        <div className="bg-[#f0fdf4] border border-green-200 rounded-xl p-6 mb-6">
          <p className="text-[#16a34a] font-bold text-lg mb-1">
            {claimState === "success"
              ? "🎉 Purchase confirmed!"
              : "✅ Already activated"}
          </p>
          <p className="text-[#30302e] text-sm">
            Your <strong>{tier}</strong> access has been activated. Check your
            email — GitHub repository access will be granted automatically.
          </p>
        </div>
      )}

      {claimState === "error" && (
        <div className="bg-[#fef2f2] border border-red-200 rounded-xl p-6 mb-6">
          <p className="text-red-600 font-semibold mb-1">
            Something went wrong
          </p>
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Account info */}
      <div className="bg-white border border-[#e5e4df] rounded-xl divide-y divide-[#e5e4df] mb-6">
        <div className="p-6">
          <h2 className="font-semibold text-[#30302e] mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6b6860]">Name</span>
              <span className="text-[#30302e] font-medium">
                {session.user.name ?? "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6860]">Email</span>
              <span className="text-[#30302e] font-medium">
                {session.user.email}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="font-semibold text-[#30302e] mb-4">
            Repository Access
          </h2>
          <p className="text-sm text-[#6b6860] mb-4">
            After purchase, you will receive a GitHub collaborator invitation at{" "}
            <a
              href="https://github.com/sumit298/clothing_store"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#d97757] hover:underline"
            >
              github.com/sumit298/clothing_store
            </a>
          </p>
          <a
            href="https://github.com/sumit298/clothing_store"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm bg-[#24292e] text-white px-4 py-2 rounded-lg hover:bg-[#1a1e22] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Open Repository
          </a>
        </div>
      </div>

      {/* Purchase history */}
      {purchases.length > 0 ? (
        <div className="bg-white border border-[#e5e4df] rounded-xl divide-y divide-[#e5e4df]">
          <div className="p-6">
            <h2 className="font-semibold text-[#30302e]">Purchase History</h2>
          </div>
          {purchases.map((p) => (
            <div key={p.id} className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#30302e] capitalize">
                    {p.tier} plan
                  </span>
                  {statusBadge(p.status)}
                </div>
                <p className="text-xs text-[#6b6860]">
                  {new Date(p.purchasedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-[#6b6860]">
                  GitHub access:{" "}
                  {p.status === "refund_pending"
                    ? "⏳ Pending revocation"
                    : p.githubAccessGranted
                    ? "✅ Granted"
                    : "⏳ Pending"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#30302e]">
                  {formatAmount(p.amount, p.currency)}
                </p>
                {p.status === "refunded" && (
                  <p className="text-xs text-red-500 mt-1">Access revoked</p>
                )}
                {p.status === "partially_refunded" && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Partial refund issued — full refund still available
                  </p>
                )}

                {p.status === "completed" && (
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleRefund(p.id, Math.floor(p.amount / 2))}
                      disabled={refunding === p.id}
                      className="text-xs px-3 py-1 rounded-lg border border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                    >
                      Partial Refund
                    </button>
                    <button
                      onClick={() => handleRefund(p.id)}
                      disabled={refunding === p.id}
                      className="text-xs px-3 py-1 rounded-lg border border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {refunding === p.id ? "Processing…" : "Full Refund"}
                    </button>
                  </div>
                )}
                {p.status === "partially_refunded" && (
                  <button
                    onClick={() => handleRefund(p.id)}
                    disabled={refunding === p.id}
                    className="text-xs px-3 py-1 rounded-lg border border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {refunding === p.id ? "Processing…" : "Full Refund"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        claimState === "idle" && (
          <div className="bg-white border border-[#e5e4df] rounded-xl p-6 text-center">
            <p className="text-[#6b6860] text-sm mb-4">
              You have not purchased access yet.
            </p>
            <a
              href="/pricing"
              className="inline-block bg-[#d97757] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#c4663f] transition-colors"
            >
              Get access — $199
            </a>
          </div>
        )
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const included = [
  "Full source code access",
  "GitHub OAuth authentication",
  "Stripe one-time payments",
  "Webhook handling & refund flows",
  "Transactional emails via Resend",
  "Background jobs via Inngest",
  "Automatic GitHub repo access",
  "PostgreSQL + Drizzle ORM",
  "Lifetime updates",
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleBuy() {
    if (!session) {
      router.push("/auth/signin?redirect=/pricing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Something went wrong");

      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-20">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-[#30302e] mb-3">Simple pricing</h1>
        <p className="text-[#6b6860]">One-time purchase. No subscriptions. No surprises.</p>
      </div>

      <div className="bg-white border border-[#e5e4df] rounded-2xl overflow-hidden">
        <div className="p-8 border-b border-[#e5e4df]">
          <div className="flex items-end gap-2 mb-1">
            <span className="text-5xl font-bold text-[#30302e]">$199</span>
            <span className="text-[#6b6860] mb-2">one-time</span>
          </div>
          <p className="text-[#6b6860] text-sm">Lifetime access to StreamHub</p>
        </div>

        <div className="p-8">
          <ul className="space-y-3 mb-8">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-[#30302e]">
                <span className="text-[#16a34a] font-bold">✓</span>
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
          )}

          <button
            onClick={handleBuy}
            disabled={loading}
            className="w-full bg-[#d97757] text-white py-3 rounded-lg font-semibold text-lg hover:bg-[#c4663f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecting to Stripe…" : session ? "Buy now" : "Sign in to buy"}
          </button>

          <p className="text-xs text-[#6b6860] text-center mt-4">
            Secure checkout via Stripe. GitHub access granted automatically after purchase.
          </p>
        </div>
      </div>
    </main>
  );
}

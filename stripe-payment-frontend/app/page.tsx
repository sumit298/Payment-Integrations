import Link from "next/link";

const features = [
  { icon: "⚡", title: "Authentication", desc: "GitHub OAuth via better-auth. Users sign in and their GitHub username is captured automatically." },
  { icon: "💳", title: "Stripe Payments", desc: "One-time checkout sessions with webhook handling, refunds, and abandoned cart recovery." },
  { icon: "📧", title: "Transactional Emails", desc: "Purchase confirmations, repo access grants, refund notices — all via Resend." },
  { icon: "🔁", title: "Background Jobs", desc: "Inngest handles post-purchase workflows: GitHub access, follow-up emails, refund processing." },
  { icon: "🐙", title: "GitHub Access", desc: "Customers get automatic collaborator access to your private repo after purchase." },
  { icon: "🗄️", title: "Database", desc: "PostgreSQL with Drizzle ORM. Purchases, users, and access state all tracked." },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-block bg-[#f0fdf4] text-[#16a34a] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
          Production-ready SaaS starter
        </div>
        <h1 className="text-5xl font-bold text-[#30302e] leading-tight mb-6">
          Ship your startup<br />
          <span className="text-[#d97757]">this weekend</span>
        </h1>
        <p className="text-xl text-[#6b6860] max-w-2xl mx-auto mb-10">
          StreamHub gives you auth, payments, emails, background jobs, and GitHub access control — all wired together and ready to go.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/pricing"
            className="bg-[#d97757] text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-[#c4663f] transition-colors"
          >
            Get access — $199
          </Link>
          <a
            href="https://github.com/sumit298/clothing_store"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6b6860] px-8 py-3 rounded-lg font-semibold text-lg border border-[#e5e4df] hover:border-[#d97757] transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white border border-[#e5e4df] rounded-xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-[#30302e] mb-2">{f.title}</h3>
              <p className="text-sm text-[#6b6860] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#e5e4df] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-[#30302e] mb-4">Ready to ship?</h2>
          <p className="text-[#6b6860] mb-8">One-time purchase. Lifetime access. No subscriptions.</p>
          <Link
            href="/pricing"
            className="bg-[#d97757] text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-[#c4663f] transition-colors"
          >
            See pricing
          </Link>
        </div>
      </section>
    </main>
  );
}

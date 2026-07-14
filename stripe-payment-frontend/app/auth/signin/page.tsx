"use client";

import { signIn } from "@/lib/auth-client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [loading, setLoading] = useState(false);

  async function handleGitHubSignIn() {
    setLoading(true);
    await signIn.social({
      provider: "github",
      callbackURL: redirect,
    });
    router.push(redirect);
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-24 text-center">
      <h1 className="text-3xl font-bold text-[#30302e] mb-2">Welcome back</h1>
      <p className="text-[#6b6860] mb-10">Sign in with GitHub to continue</p>

      <div className="bg-white border border-[#e5e4df] rounded-2xl p-8">
        <button
          onClick={handleGitHubSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[#24292e] text-white py-3 rounded-lg font-semibold hover:bg-[#1a1e22] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {loading ? "Signing in…" : "Continue with GitHub"}
        </button>

        <p className="text-xs text-[#6b6860] mt-6">
          We use your GitHub username to grant repository access after purchase.
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}

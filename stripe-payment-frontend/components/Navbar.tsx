"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-[#e5e4df] bg-[#faf9f5] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-[#d97757]">
          StreamHub
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-[#6b6860] hover:text-[#30302e] transition-colors">
            Pricing
          </Link>

          {session ? (
            <>
              <Link href="/dashboard" className="text-sm text-[#6b6860] hover:text-[#30302e] transition-colors">
                Dashboard
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm text-[#6b6860] hover:text-[#30302e] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="text-sm bg-[#d97757] text-white px-4 py-1.5 rounded-lg hover:bg-[#c4663f] transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

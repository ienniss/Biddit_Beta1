"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="/brand/logo-horizontal-transparent.png" alt="Biddit" className="h-10 hidden sm:block" />
          <img src="/brand/logo-icon-64.png" alt="Biddit" className="h-8 w-8 sm:hidden" />
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link className="hover:underline" href="/jobs">Jobs</Link>
          <Link className="hover:underline" href="/post-a-job">Post a job</Link>
          <Link className="hover:underline" href="/providers/onboarding">Become a provider</Link>
          <Link className="hover:underline" href="/map">Pricing</Link>
          <Link className="hover:underline" href="/dashboard">Dashboard</Link>

          {email ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-xl border px-3 py-1.5 hover:bg-slate-50"
            >
              Sign out
            </button>
          ) : (
            <Link className="rounded-xl bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800" href="/auth">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

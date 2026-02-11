"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });

    if (error) setStatus(error.message);
    else setStatus("Check your email for a magic link.");
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-slate-600">We’ll email you a magic link.</p>

      <form onSubmit={sendLink} className="mt-6 space-y-3">
        <input
          className="w-full rounded-xl border px-4 py-3"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800">
          Send magic link
        </button>
      </form>

      {status && <div className="mt-4 text-sm text-slate-700">{status}</div>}
    </div>
  );
}

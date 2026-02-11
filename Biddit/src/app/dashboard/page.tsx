"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = { id: string; role: "customer" | "provider" | "admin"; display_name: string | null };

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("id,role,display_name").eq("id", userData.user.id).single();
      setProfile(data as any);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-slate-600">Loading…</div>;
  if (!profile) return <div>Please <Link className="underline" href="/auth">sign in</Link>.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="rounded-2xl border p-6">
        <div className="text-sm text-slate-600">Role</div>
        <div className="font-semibold">{profile.role}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link className="rounded-2xl border p-6 hover:bg-slate-50" href="/post-a-job">Post a job</Link>
        <Link className="rounded-2xl border p-6 hover:bg-slate-50" href="/jobs">Browse jobs</Link>
        <Link className="rounded-2xl border p-6 hover:bg-slate-50" href="/providers/onboarding">Become a provider</Link>
        <Link className="rounded-2xl border p-6 hover:bg-slate-50" href="/map">Pricing insights</Link>
        {profile.role === "admin" && (
          <Link className="rounded-2xl border p-6 hover:bg-slate-50" href="/admin/providers">
            Admin: Approve providers
          </Link>
        )}
      </div>
    </div>
  );
}

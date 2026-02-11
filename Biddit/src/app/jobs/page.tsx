"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CategorySelect from "@/components/CategorySelect";
import { TRIANGLE_COUNTIES } from "@/lib/county";

type Job = {
  id: string;
  title: string;
  category: string;
  city: string;
  zip: string;
  county: string;
  status: string;
  created_at: string;
};

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("__all__");
  const [county, setCounty] = useState<string>("__all__");

  const [mode, setMode] = useState<"all" | "recommended">("all");
  const [role, setRole] = useState<"customer" | "provider" | "admin" | null>(null);
  const [providerCategories, setProviderCategories] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (category !== "__all__" && j.category !== category) return false;
      if (county !== "__all__" && j.county !== county) return false;
      if (q) {
        const hay = `${j.title} ${j.category} ${j.city} ${j.zip} ${j.county}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (mode === "recommended") {
        if (providerCategories.length === 0) return false;
        if (!providerCategories.includes(j.category)) return false;
      }
      return true;
    });
  }, [jobs, search, category, county, mode, providerCategories]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", u.user.id).single();
        const r = (prof?.role as any) ?? null;
        setRole(r);

        if (r === "provider") {
          const { data: pp } = await supabase.from("provider_profiles").select("categories").eq("user_id", u.user.id).maybeSingle();
          setProviderCategories((pp?.categories as any) ?? []);
          setMode("recommended");
        }
      }

      const { data } = await supabase
        .from("jobs")
        .select("id,title,category,city,zip,county,status,created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      setJobs((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-slate-600">Loading…</div>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Open jobs</h1>
          <div className="mt-1 text-sm text-slate-600">
            Triangle MVP (Wake/Durham/Orange). Filter jobs or see recommended matches.
          </div>
        </div>

        {role === "provider" && (
          <div className="flex gap-2">
            <button
              onClick={() => setMode("recommended")}
              className={`rounded-xl border px-3 py-2 text-sm ${mode === "recommended" ? "bg-slate-900 text-white border-slate-900" : "hover:bg-slate-50"}`}
            >
              Recommended
            </button>
            <button
              onClick={() => setMode("all")}
              className={`rounded-xl border px-3 py-2 text-sm ${mode === "all" ? "bg-slate-900 text-white border-slate-900" : "hover:bg-slate-50"}`}
            >
              All
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input className="rounded-xl border px-4 py-3" placeholder="Search jobs…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <CategorySelect value={category} onChange={setCategory} includeAll className="rounded-xl border px-4 py-3" />
          <select className="rounded-xl border px-4 py-3" value={county} onChange={(e) => setCounty(e.target.value)}>
            <option value="__all__">All counties</option>
            {TRIANGLE_COUNTIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>

        {role === "provider" && mode === "recommended" && (
          <div className="mt-3 text-xs text-slate-500">
            Recommended uses your provider categories. Update them in Provider Onboarding.
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3">
        {filtered.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="rounded-2xl border p-6 hover:bg-slate-50">
            <div className="font-semibold">{j.title}</div>
            <div className="mt-1 text-sm text-slate-600">
              {j.category} • {j.city}, {j.zip} ({j.county})
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-slate-600">No matches. Try removing filters{role === "provider" ? " or switch to All." : "."}</div>
        )}
      </div>
    </div>
  );
}

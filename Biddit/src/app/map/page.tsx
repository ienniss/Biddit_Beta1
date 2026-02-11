"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CategorySelect from "@/components/CategorySelect";

type Row = { zip: string; sample_count: number; median_cents: number };

export default function PricingPage() {
  const [category, setCategory] = useState("General");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pricing_zip_stats")
        .select("zip,sample_count,median_cents")
        .eq("category", category);

      const list = ((data as any) ?? []) as Row[];
      list.sort((a, b) => b.sample_count - a.sample_count);
      setRows(list);
      setLoading(false);
    })();
  }, [category]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Pricing insights</h1>
      <p className="mt-2 text-slate-600">Triangle MVP. Aggregated by ZIP (privacy-safe).</p>

      <div className="mt-6 flex gap-2">
        <CategorySelect value={category} onChange={setCategory} className="rounded-xl border px-4 py-3" />
      </div>

      <div className="mt-6 grid gap-3">
        {loading && <div className="text-slate-600">Loading…</div>}
        {!loading &&
          rows.map((r) => (
            <div key={r.zip} className="rounded-2xl border p-6">
              <div className="font-semibold">ZIP {r.zip}</div>
              <div className="mt-1 text-sm text-slate-600">
                Median: ${(r.median_cents / 100).toFixed(2)} • Samples: {r.sample_count}
              </div>
            </div>
          ))}
        {!loading && rows.length === 0 && <div className="text-slate-600">No completed jobs for this category yet.</div>}
      </div>
    </div>
  );
}

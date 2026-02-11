"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TRIANGLE_COUNTIES, isTriangleCounty } from "@/lib/county";
import { useRouter } from "next/navigation";
import CategorySelect from "@/components/CategorySelect";
import { DEFAULT_CATEGORY } from "@/lib/categories";
import { uploadJobPhoto } from "@/lib/jobPhotos";

export default function PostAJob() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [county, setCounty] = useState<(typeof TRIANGLE_COUNTIES)[number]>("Wake");

  const [photos, setPhotos] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Please sign in first.");

      if (!isTriangleCounty(county)) throw new Error("Jobs must be in Wake, Durham, or Orange county.");

      const { data: jobRow, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          customer_id: userData.user.id,
          title,
          category,
          description,
          city,
          zip,
          county,
          state: "NC",
          status: "open",
        })
        .select("id")
        .single();

      if (jobErr) throw jobErr;
      const jobId = jobRow.id as string;

      for (const file of photos.slice(0, 8)) {
        await uploadJobPhoto({ jobId, file });
      }

      router.push(`/jobs/${jobId}`);
    } catch (err: any) {
      setStatus(err?.message ?? "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Post a job</h1>
      <p className="mt-2 text-slate-600">Triangle MVP: Wake, Durham, or Orange county only.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <input className="w-full rounded-xl border px-4 py-3" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g., Need a new roof estimate)" required />

        <div>
          <label className="text-sm text-slate-600">Category</label>
          <CategorySelect value={category} onChange={setCategory} className="mt-1 w-full rounded-xl border px-4 py-3" />
        </div>

        <textarea className="w-full rounded-xl border px-4 py-3 min-h-32" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you need…" required />

        <div className="grid gap-3 md:grid-cols-3">
          <input className="rounded-xl border px-4 py-3" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" required />
          <input className="rounded-xl border px-4 py-3" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" required />
          <select className="rounded-xl border px-4 py-3" value={county} onChange={(e) => setCounty(e.target.value as any)}>
            {TRIANGLE_COUNTIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="font-semibold">Photos (optional)</div>
          <p className="mt-1 text-sm text-slate-600">Add up to 8 photos. Helps providers bid accurately.</p>

          <label className="mt-3 inline-block rounded-xl border px-3 py-2 hover:bg-slate-50 cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).slice(0, 8);
                setPhotos(files);
                e.currentTarget.value = "";
              }}
            />
            Choose photos
          </label>

          {photos.length > 0 && (
            <div className="mt-3 text-sm text-slate-700">
              Selected: {photos.map((p) => p.name).join(", ")}
            </div>
          )}
        </div>

        <button disabled={submitting} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
          {submitting ? "Publishing…" : "Publish job"}
        </button>

        {status && <div className="text-sm text-slate-700">{status}</div>}
      </form>
    </div>
  );
}

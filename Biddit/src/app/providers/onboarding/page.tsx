"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadProviderDoc, createSignedDocUrl } from "@/lib/uploads";
import { CATEGORY_GROUPS } from "@/lib/categories";

type DocRow = {
  id: string;
  kind: "license" | "insurance" | "id" | "other";
  storage_path: string;
  original_filename: string | null;
  created_at: string;
};

export default function ProviderOnboarding() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [radius, setRadius] = useState(15);
  const [currentVerifyStatus, setCurrentVerifyStatus] = useState<string | null>(null);

  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  // Docs
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docKind, setDocKind] = useState<DocRow["kind"]>("license");
  const [docUploading, setDocUploading] = useState(false);
  const [docStatus, setDocStatus] = useState<string | null>(null);

  const canSubmit = useMemo(() => businessName.trim() && selectedCats.length > 0, [businessName, selectedCats]);

  async function refreshDocs(userId: string) {
    const { data } = await supabase
      .from("provider_documents")
      .select("id,kind,storage_path,original_filename,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setDocs((data as any) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setStatus("Please sign in first.");
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).single();
      if (prof?.display_name) setDisplayName(prof.display_name);

      const { data: pp } = await supabase
        .from("provider_profiles")
        .select("business_name, phone, website, categories, service_radius_miles, verification_status")
        .eq("user_id", u.user.id)
        .maybeSingle();

      if (pp) {
        setBusinessName(pp.business_name ?? "");
        setPhone(pp.phone ?? "");
        setWebsite(pp.website ?? "");
        setRadius(pp.service_radius_miles ?? 15);
        setCurrentVerifyStatus(pp.verification_status ?? null);
        setSelectedCats((pp.categories as any) ?? []);
      }

      await refreshDocs(u.user.id);
      setLoading(false);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setStatus("Please sign in first.");

    if (!canSubmit) return setStatus("Business name and at least one category are required.");

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ role: "provider", display_name: displayName.trim() || null })
      .eq("id", u.user.id);

    if (profileErr) return setStatus(profileErr.message);

    const { error: ppErr } = await supabase
      .from("provider_profiles")
      .upsert(
        {
          user_id: u.user.id,
          business_name: businessName.trim(),
          phone: phone.trim() || null,
          website: website.trim() || null,
          categories: selectedCats,
          service_radius_miles: Math.max(1, Math.min(200, Number(radius) || 15)),
          verification_status: "pending",
        },
        { onConflict: "user_id" }
      );

    if (ppErr) return setStatus(ppErr.message);

    setCurrentVerifyStatus("pending");
    setStatus("Application submitted! Upload docs below (recommended).");
  }

  async function onUpload(file: File) {
    setDocStatus(null);
    setDocUploading(true);

    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Please sign in.");

      await uploadProviderDoc({ userId: u.user.id, file, kind: docKind });
      await refreshDocs(u.user.id);
      setDocStatus("Uploaded.");
    } catch (e: any) {
      setDocStatus(e?.message ?? "Upload failed.");
    } finally {
      setDocUploading(false);
    }
  }

  async function openDoc(path: string) {
    try {
      const url = await createSignedDocUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setDocStatus(e?.message ?? "Could not open file.");
    }
  }

  async function deleteDoc(docId: string, path: string) {
    setDocStatus(null);
    try {
      const { error: stErr } = await supabase.storage.from("provider-docs").remove([path]);
      if (stErr) throw stErr;

      const { error: dbErr } = await supabase.from("provider_documents").delete().eq("id", docId);
      if (dbErr) throw dbErr;

      const { data: u } = await supabase.auth.getUser();
      if (u.user) await refreshDocs(u.user.id);

      setDocStatus("Deleted.");
    } catch (e: any) {
      setDocStatus(e?.message ?? "Delete failed.");
    }
  }

  function toggleCat(value: string, checked: boolean) {
    setSelectedCats((cur) => {
      const s = new Set(cur);
      if (checked) s.add(value);
      else s.delete(value);
      return Array.from(s);
    });
  }

  if (loading) return <div className="text-slate-600">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Provider onboarding</h1>
        <p className="mt-2 text-slate-600">
          Apply to become a verified provider in the Triangle (Wake/Durham/Orange).
        </p>
        {currentVerifyStatus && (
          <div className="mt-3 inline-flex items-center rounded-full border px-3 py-1 text-sm">
            Status: <span className="ml-2 font-semibold">{currentVerifyStatus}</span>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="rounded-2xl border p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">Your name (optional)</label>
            <input className="mt-1 w-full rounded-xl border px-4 py-3" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., Alex Johnson" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Business name</label>
            <input className="mt-1 w-full rounded-xl border px-4 py-3" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g., Triangle Roof Pros" required />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">Phone (optional)</label>
            <input className="mt-1 w-full rounded-xl border px-4 py-3" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., (919) 555-0123" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Website (optional)</label>
            <input className="mt-1 w-full rounded-xl border px-4 py-3" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="e.g., https://example.com" />
          </div>
        </div>

        <div className="max-w-xs">
          <label className="text-sm text-slate-600">Service radius (miles)</label>
          <input className="mt-1 w-full rounded-xl border px-4 py-3" value={radius} onChange={(e) => setRadius(Number(e.target.value))} type="number" min={1} max={200} />
        </div>

        <div>
          <label className="text-sm text-slate-600">Categories</label>
          <div className="mt-2 rounded-2xl border p-3 max-h-64 overflow-auto">
            {CATEGORY_GROUPS.map((g) => (
              <div key={g.label} className="mb-3">
                <div className="text-xs font-semibold text-slate-600 mb-2">{g.label}</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {g.options.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedCats.includes(o.value)} onChange={(e) => toggleCat(o.value, e.target.checked)} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-500">These determine your “Recommended” job matches.</div>
        </div>

        <button disabled={!canSubmit} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
          Submit application
        </button>

        {status && <div className="text-sm text-slate-700">{status}</div>}
      </form>

      <div className="rounded-2xl border p-6 space-y-4">
        <div>
          <div className="font-semibold">Verification documents</div>
          <p className="mt-1 text-sm text-slate-600">Upload license/insurance/ID as applicable. Admins can review these for approval.</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select className="rounded-xl border px-3 py-2" value={docKind} onChange={(e) => setDocKind(e.target.value as any)}>
            <option value="license">License</option>
            <option value="insurance">Insurance</option>
            <option value="id">ID</option>
            <option value="other">Other</option>
          </select>

          <label className="rounded-xl border px-3 py-2 hover:bg-slate-50 cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.currentTarget.value = "";
              }}
              disabled={docUploading}
            />
            {docUploading ? "Uploading…" : "Upload file"}
          </label>
        </div>

        {docStatus && <div className="text-sm text-slate-700">{docStatus}</div>}

        <div className="grid gap-2">
          {docs.map((d) => (
            <div key={d.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-slate-600">{d.kind}</div>
                <div className="text-sm font-semibold truncate">{d.original_filename ?? d.storage_path}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="rounded-xl border px-3 py-1.5 hover:bg-slate-50" onClick={() => openDoc(d.storage_path)} type="button">View</button>
                <button className="rounded-xl border px-3 py-1.5 hover:bg-slate-50" onClick={() => deleteDoc(d.id, d.storage_path)} type="button">Delete</button>
              </div>
            </div>
          ))}
          {docs.length === 0 && <div className="text-sm text-slate-600">No documents uploaded yet.</div>}
        </div>
      </div>
    </div>
  );
}

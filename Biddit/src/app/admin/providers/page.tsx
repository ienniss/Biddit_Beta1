"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createSignedDocUrl } from "@/lib/uploads";

export default function AdminProviders() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("provider_profiles")
      .select("user_id,business_name,phone,website,categories,verification_status,created_at")
      .order("created_at", { ascending: true });
    setProviders((data as any) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data: prof } = await supabase.from("profiles").select("role").eq("id", u.user.id).single();
      setIsAdmin(prof?.role === "admin");
      await refresh();
    })();
  }, []);

  async function setVerify(userId: string, v: "approved" | "rejected") {
    setStatus(null);
    const { error } = await supabase.from("provider_profiles").update({ verification_status: v }).eq("user_id", userId);
    if (error) setStatus(error.message);
    else setStatus(`Updated: ${v}`);
    await refresh();
  }

  if (!isAdmin) return <div>Admin only.</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Provider approvals</h1>
      {status && <div className="mt-3 text-sm text-slate-700">{status}</div>}

      <div className="mt-6 grid gap-3">
        {providers.map((p) => (
          <ProviderCard key={p.user_id} p={p} onSetVerify={setVerify} />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  p,
  onSetVerify,
}: {
  p: any;
  onSetVerify: (userId: string, v: "approved" | "rejected") => Promise<void>;
}) {
  const [docs, setDocs] = useState<any[]>([]);
  const [docStatus, setDocStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("provider_documents")
        .select("id,kind,storage_path,original_filename,created_at")
        .eq("user_id", p.user_id)
        .order("created_at", { ascending: false });
      setDocs((data as any) ?? []);
    })();
  }, [p.user_id]);

  async function view(path: string) {
    setDocStatus(null);
    try {
      const url = await createSignedDocUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setDocStatus(e?.message ?? "Could not open file.");
    }
  }

  return (
    <div className="rounded-2xl border p-6">
      <div className="font-semibold">{p.business_name}</div>
      <div className="mt-1 text-sm text-slate-600">
        {p.phone || "—"} • {p.website || "—"} • <b>{p.verification_status}</b>
      </div>
      <div className="mt-2 text-sm text-slate-700">Categories: {(p.categories || []).join(", ") || "—"}</div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => onSetVerify(p.user_id, "approved")} className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800">
          Approve
        </button>
        <button onClick={() => onSetVerify(p.user_id, "rejected")} className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">
          Reject
        </button>
      </div>

      <div className="mt-5">
        <div className="font-semibold">Documents</div>
        {docStatus && <div className="mt-2 text-sm text-slate-700">{docStatus}</div>}
        <div className="mt-3 grid gap-2">
          {docs.map((d) => (
            <div key={d.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-slate-600">{d.kind}</div>
                <div className="text-sm font-semibold truncate">{d.original_filename ?? d.storage_path}</div>
              </div>
              <button className="rounded-xl border px-3 py-1.5 hover:bg-slate-50" onClick={() => view(d.storage_path)}>
                View
              </button>
            </div>
          ))}
          {docs.length === 0 && <div className="text-sm text-slate-600">No docs uploaded.</div>}
        </div>
      </div>
    </div>
  );
}

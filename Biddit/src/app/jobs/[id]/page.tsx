"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { getJobPhotoUrl } from "@/lib/jobPhotos";

export default function JobDetail({ params }: { params: { id: string } }) {
  const jobId = params.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<"customer" | "provider" | "admin" | null>(null);

  const [job, setJob] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [providerApproved, setProviderApproved] = useState(false);
  const [jobPhotos, setJobPhotos] = useState<{ id: string; storage_path: string }[]>([]);

  const [bidAmount, setBidAmount] = useState("");
  const [bidEta, setBidEta] = useState("");
  const [bidMsg, setBidMsg] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [finalPrice, setFinalPrice] = useState("");
  const [completionStatus, setCompletionStatus] = useState<string | null>(null);

  const [reviews, setReviews] = useState<any[]>([]);
  const [myRating, setMyRating] = useState(5);
  const [myReviewBody, setMyReviewBody] = useState("");
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  const isOwner = useMemo(() => userId && job?.customer_id === userId, [userId, job]);
  const isAwardedProvider = useMemo(() => userId && job?.awarded_provider_id === userId, [userId, job]);
  const canReview = useMemo(() => job?.status === "completed" && (isOwner || isAwardedProvider), [job, isOwner, isAwardedProvider]);

  async function refreshAll() {
    const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    setJob(jobData);

    const { data: bidData } = await supabase
      .from("bids")
      .select("id,amount_cents,message,eta_days,status,created_at,provider_id")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    setBids((bidData as any) ?? []);

    const { data: photoData } = await supabase
      .from("job_photos")
      .select("id,storage_path")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    setJobPhotos((photoData as any) ?? []);

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("id,job_id,reviewer_id,reviewee_id,rating,body,created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    setReviews((reviewData as any) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).single();
        setProfileRole((prof?.role as any) ?? null);

        const { data: prov } = await supabase
          .from("provider_profiles")
          .select("verification_status")
          .eq("user_id", uid)
          .maybeSingle();
        setProviderApproved(prov?.verification_status === "approved");
      }

      await refreshAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function placeBid(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (!userId) return setStatus("Please sign in.");
    if (profileRole !== "provider") return setStatus("Only providers can bid.");
    if (!providerApproved) return setStatus("Your provider account is not approved yet.");
    if (job?.status !== "open") return setStatus("This job is not open.");

    const amountCents = Math.max(0, Math.round(Number(bidAmount) * 100));
    if (!amountCents) return setStatus("Enter a bid amount.");

    const { error } = await supabase.from("bids").insert({
      job_id: jobId,
      provider_id: userId,
      amount_cents: amountCents,
      message: bidMsg,
      eta_days: bidEta ? Number(bidEta) : null,
      status: "active",
    });

    if (error) return setStatus(error.message);

    await supabase.from("conversations").insert({
      job_id: jobId,
      customer_id: job.customer_id,
      provider_id: userId,
    }).throwOnError().catch(() => {});

    await refreshAll();
    setStatus("Bid submitted.");
  }

  async function award(providerId: string) {
    setStatus(null);
    if (!isOwner) return setStatus("Only the job owner can award.");
    const { error } = await supabase
      .from("jobs")
      .update({ status: "awarded", awarded_provider_id: providerId })
      .eq("id", jobId);

    if (error) return setStatus(error.message);

    await refreshAll();
    setStatus("Awarded!");
  }

  async function completeJob(e: React.FormEvent) {
    e.preventDefault();
    setCompletionStatus(null);

    if (!isOwner) return setCompletionStatus("Only the customer can mark complete.");
    if (job?.status !== "awarded") return setCompletionStatus("Job must be awarded first.");
    if (!job?.awarded_provider_id) return setCompletionStatus("No provider awarded.");

    const cents = Math.max(0, Math.round(Number(finalPrice) * 100));
    if (!cents) return setCompletionStatus("Enter a final price.");

    const { error: jobErr } = await supabase.from("jobs").update({ status: "completed" }).eq("id", jobId);
    if (jobErr) return setCompletionStatus(jobErr.message);

    const { error: compErr } = await supabase.from("job_completions").upsert(
      {
        job_id: jobId,
        final_price_cents: cents,
        category_snapshot: job.category,
        zip_snapshot: job.zip,
        county_snapshot: job.county,
      },
      { onConflict: "job_id" }
    );
    if (compErr) return setCompletionStatus(compErr.message);

    await refreshAll();
    setCompletionStatus("Marked completed! You can now leave a review.");
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewStatus(null);

    if (!canReview) return setReviewStatus("You can only review after completion.");
    if (!userId) return setReviewStatus("Please sign in.");

    const revieweeId = isOwner ? job.awarded_provider_id : job.customer_id;
    if (!revieweeId) return setReviewStatus("Missing review target.");

    const { error } = await supabase.from("reviews").insert({
      job_id: jobId,
      reviewer_id: userId,
      reviewee_id: revieweeId,
      rating: myRating,
      body: myReviewBody.trim() || null,
    });

    if (error) return setReviewStatus(error.message);

    setMyReviewBody("");
    await refreshAll();
    setReviewStatus("Review submitted.");
  }

  if (!job) return <div className="text-slate-600">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-6">
        <div className="text-sm text-slate-600">{job.category}</div>
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <div className="mt-2 text-slate-700 whitespace-pre-wrap">{job.description}</div>
        <div className="mt-4 text-sm text-slate-600">
          {job.city}, {job.zip} ({job.county}) • Status: <span className="font-semibold">{job.status}</span>
        </div>
      </div>

      {jobPhotos.length > 0 && (
        <div className="rounded-2xl border p-6">
          <div className="font-semibold">Photos</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {jobPhotos.map((p) => {
              const url = getJobPhotoUrl(p.storage_path);
              return (
                <a key={p.id} href={url} target="_blank" rel="noreferrer" className="block">
                  <img src={url} alt="Job photo" className="h-40 w-full rounded-2xl object-cover border" loading="lazy" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border p-6">
        <div className="font-semibold">Submit a bid</div>
        <form onSubmit={placeBid} className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="rounded-xl border px-4 py-3" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="Amount (e.g., 150)" />
          <input className="rounded-xl border px-4 py-3" value={bidEta} onChange={(e) => setBidEta(e.target.value)} placeholder="ETA days (optional)" />
          <input className="rounded-xl border px-4 py-3 md:col-span-3" value={bidMsg} onChange={(e) => setBidMsg(e.target.value)} placeholder="Message (optional)" />
          <button className="md:col-span-3 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
            Place bid
          </button>
        </form>
        {status && <div className="mt-3 text-sm text-slate-700">{status}</div>}
      </div>

      <div className="rounded-2xl border p-6">
        <div className="font-semibold">Bids</div>
        <div className="mt-4 grid gap-3">
          {bids.map((b) => (
            <div key={b.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">${(b.amount_cents / 100).toFixed(2)}</div>
                {isOwner && job.status === "open" && (
                  <button onClick={() => award(b.provider_id)} className="rounded-xl border px-3 py-1.5 hover:bg-slate-50">
                    Award
                  </button>
                )}
              </div>
              {b.eta_days && <div className="text-sm text-slate-600 mt-1">ETA: {b.eta_days} days</div>}
              {b.message && <div className="text-sm text-slate-700 mt-2">{b.message}</div>}
              <ConversationLink jobId={jobId} providerId={b.provider_id} />
            </div>
          ))}
          {bids.length === 0 && <div className="text-slate-600">No bids yet.</div>}
        </div>
      </div>

      {isOwner && job.status === "awarded" && (
        <div className="rounded-2xl border p-6">
          <div className="font-semibold">Mark job completed</div>
          <p className="mt-1 text-sm text-slate-600">Enter the final price to power pricing insights.</p>
          <form onSubmit={completeJob} className="mt-4 flex flex-wrap gap-2">
            <input className="rounded-xl border px-4 py-3" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} placeholder="Final price (e.g., 275)" />
            <button className="rounded-xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800">Complete</button>
          </form>
          {completionStatus && <div className="mt-3 text-sm text-slate-700">{completionStatus}</div>}
        </div>
      )}

      {job.status === "completed" && (
        <div className="rounded-2xl border p-6 space-y-4">
          <div className="font-semibold">Reviews</div>

          <div className="grid gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border p-4">
                <div className="text-sm text-slate-600">
                  Rating: <span className="font-semibold">{r.rating}</span>/5
                </div>
                {r.body && <div className="mt-2 text-sm text-slate-800">{r.body}</div>}
              </div>
            ))}
            {reviews.length === 0 && <div className="text-slate-600">No reviews yet.</div>}
          </div>

          {canReview && (
            <form onSubmit={submitReview} className="rounded-2xl border p-4 bg-slate-50 space-y-3">
              <div className="font-semibold">Leave your review</div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Rating</label>
                <select className="rounded-xl border px-3 py-2" value={myRating} onChange={(e) => setMyRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
              <textarea className="w-full rounded-xl border px-4 py-3 min-h-24" value={myReviewBody} onChange={(e) => setMyReviewBody(e.target.value)} placeholder="What was your experience like?" />
              <button className="rounded-xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800">Submit review</button>
              {reviewStatus && <div className="text-sm text-slate-700">{reviewStatus}</div>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function ConversationLink({ jobId, providerId }: { jobId: string; providerId: string }) {
  const [convId, setConvId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("conversations").select("id").eq("job_id", jobId).eq("provider_id", providerId).maybeSingle();
      setConvId(data?.id ?? null);
    })();
  }, [jobId, providerId]);

  if (!convId) return null;
  return (
    <Link className="mt-3 inline-block text-sm underline" href={`/messages/${convId}`}>
      Message thread
    </Link>
  );
}

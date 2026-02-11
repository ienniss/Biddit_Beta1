import Link from "next/link";

export default function Home() {
  return (
    <main className="py-10">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-semibold leading-tight">
            Post a job. Get bids. Pick the best.
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl">
            <span className="font-semibold text-slate-900">Post it. Bid it. Done.</span>{" "}
            Biddit helps Triangle homeowners and customers compare bids from verified local providers.
          </p>

          <div className="mt-6 flex gap-3">
            <Link href="/post-a-job" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
              Post a job
            </Link>
            <Link href="/jobs" className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-slate-50">
              Browse jobs (providers)
            </Link>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Triangle MVP: Wake • Durham • Orange
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { t: "Free to post", d: "Customers post jobs in minutes." },
            { t: "Verified providers", d: "Providers are reviewed before bidding." },
            { t: "Transparent pricing", d: "Completed jobs power local pricing insights." },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border p-6">
              <div className="font-semibold">{x.t}</div>
              <div className="mt-2 text-sm text-slate-600">{x.d}</div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border p-6 bg-slate-50">
          <div className="font-semibold">How it works</div>
          <ol className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-slate-700">
            <li><b>1) Post</b> your job with photos and details.</li>
            <li><b>2) Compare</b> bids and chat with providers.</li>
            <li><b>3) Choose</b> the best fit, complete, and review.</li>
          </ol>
        </section>

        <section className="flex flex-col sm:flex-row gap-3">
          <Link href="/providers/onboarding" className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-slate-50">
            Become a provider
          </Link>
          <Link href="/map" className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-slate-50">
            See pricing insights
          </Link>
        </section>
      </div>
    </main>
  );
}

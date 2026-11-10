import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader, MarketingFooter } from "@/components/MarketingHeader";

const PLANS = [
  {
    title: "CPU compute",
    desc: "Simulations, data processing and other CPU-bound work.",
    price: "₹1.49",
    unit: "per core-hour",
    features: [
      "MPI simulations split by domain",
      "Data jobs split into shards",
      "Watchdog requeues chunks on node failure",
      "Pre-verified Python and OpenFOAM images",
    ],
  },
  {
    title: "GPU compute",
    desc: "ML training, Blender rendering and parallel GPU workloads.",
    price: "₹12.50",
    unit: "per RTX 3090-hour",
    featured: true,
    features: [
      "CUDA 12 PyTorch image",
      "Blender renders split by frame range",
      "DDP or Local-SGD for multi-node training",
      "Priority queue",
    ],
  },
];

const COMPARISON = [
  { provider: "AWS EC2 p3.2xlarge", cost: "₹224.50" },
  { provider: "Google Cloud, V100", cost: "₹286.00" },
  { provider: "Azure NV6", cost: "₹198.25" },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingHeader />

      <main>
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[1240px] px-4 py-14 sm:px-8 md:py-20">
            <h1 className="max-w-[16ch] text-[44px] font-semibold leading-[1] tracking-[-0.04em] sm:text-[60px]">
              Pay for the compute you use.
            </h1>
            <p className="mt-6 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">
              Jobs run on idle campus hardware, so you pay for execution time only. Contributors earn credits for the
              time their machines spend on your chunks.
            </p>
          </div>
        </section>

        <section className="border-b border-rule">
          <div className="mx-auto grid max-w-[1240px] md:grid-cols-2">
            {PLANS.map((p, i) => (
              <article
                key={p.title}
                className={`px-4 py-12 sm:px-8 md:py-16 ${i === 0 ? "border-b border-rule md:border-b-0 md:border-r" : "bg-surface"}`}
              >
                <div>
                  <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{p.title}</h2>
                </div>
                <p className="mt-2 text-[15px] text-mute">{p.desc}</p>
                <div className="mt-8 flex items-baseline gap-2 border-t border-ink pt-6">
                  <span className={`num text-[56px] font-medium leading-none tracking-[-0.03em] ${p.featured ? "text-primary" : ""}`}>
                    {p.price}
                  </span>
                  <span className="num text-sm text-mute">{p.unit}</span>
                </div>
                <ul className="mt-8 border-t border-rule">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 border-b border-rule py-3 text-sm text-ink-2">
                      <span className="h-1.5 w-1.5 shrink-0 bg-ink" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/submit" className={`btn mt-8 ${p.featured ? "btn-primary" : "btn-outline"}`}>
                  Submit a job
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-rule">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1fr_1.4fr] md:py-20">
            <div>
              <h2 className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">Against the cloud</h2>
              <p className="mt-3 max-w-[44ch] text-[15px] leading-relaxed text-mute">
                Per-hour cost for one GPU. Cloud figures are approximate on-demand list prices, converted to rupees.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table-ruled">
                <thead>
                  <tr>
                    <th className="!pl-0">Provider</th>
                    <th className="!text-right">Per hour</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((r) => (
                    <tr key={r.provider}>
                      <td className="!pl-0 text-ink-2">{r.provider}</td>
                      <td className="num text-right text-ink-2">{r.cost}</td>
                    </tr>
                  ))}
                  <tr className="[&>td]:!border-t [&>td]:!border-ink">
                    <td className="!pl-0 font-semibold">SpareCycles, RTX 3090</td>
                    <td className="num text-right text-[18px] font-medium text-primary">₹12.50</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

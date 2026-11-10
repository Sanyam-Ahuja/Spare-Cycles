import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { MarketingHeader, MarketingFooter } from "@/components/MarketingHeader";
import { ChunkFanout } from "@/components/marketing/ChunkFanout";

const STEPS = [
  { name: "Upload", body: "Drop a .blend, a .py or .ipynb, or an archive of your project." },
  { name: "Detect", body: "The pipeline works out the workload type, framework and resources. Gemini fills in what heuristics miss." },
  { name: "Containerize", body: "A pre-verified image is matched or built, after a scan for malicious code and miners." },
  { name: "Split", body: "Frame ranges for renders, ranks for training, shards for data, domains for simulations." },
  { name: "Dispatch", body: "Each chunk goes to the best-ranked online node. LAN peers are grouped for multi-node jobs." },
  { name: "Assemble", body: "Outputs are merged into one video, model, dataset or result set you download." },
];

const WORKLOADS = [
  { type: "3D render", tool: "Blender", input: ".blend", split: "frame ranges", output: "frames + assembled video" },
  { type: "ML training", tool: "PyTorch", input: ".py / .ipynb", split: "ranks (DDP or Local-SGD)", output: "weights + checkpoints" },
  { type: "Data processing", tool: "Python", input: "script + data archive", split: "shards", output: "merged dataset" },
  { type: "Simulation", tool: "OpenFOAM / MPI", input: "case archive", split: "domains", output: "merged results" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-12 sm:px-8 md:py-20 lg:grid-cols-[1fr_1.08fr] lg:gap-14">
          <div>
            <h1 className="max-w-[13ch] text-[44px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[60px] xl:text-[72px]">
              Your campus&apos;s idle compute, put to work.
            </h1>
            <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
              SpareCycles splits a Blender render, a training run or a data job into chunks and runs them on lab
              machines and student laptops that would otherwise sit idle. Contributors earn credits for every chunk
              their machine finishes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/submit" className="btn btn-primary btn-lg">
                Submit a job
                <ArrowRight size={16} />
              </Link>
              <Link href="/submit?sample=1" className="btn btn-outline btn-lg">
                Try the sample scene
              </Link>
            </div>
            <dl className="mt-10 grid max-w-[480px] grid-cols-3 border-t border-rule pt-4">
              <div>
                <dt className="label">Workloads</dt>
                <dd className="num mt-1 text-sm">4 types</dd>
              </div>
              <div>
                <dt className="label">Retries</dt>
                <dd className="num mt-1 text-sm">7 per chunk</dd>
              </div>
              <div>
                <dt className="label">Watchdog</dt>
                <dd className="num mt-1 text-sm">every 30 s</dd>
              </div>
            </dl>
          </div>

          <figure className="panel overflow-hidden">
            <figcaption className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
              <span className="label !text-ink-2">job 7f3a · render · 16 chunks · 5 nodes</span>
              <span className="label hidden sm:inline">schematic</span>
            </figcaption>
            <div className="bg-grid px-3 py-4 sm:px-5 sm:py-6">
              <ChunkFanout />
            </div>
          </figure>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-b border-rule">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-8 md:py-24">
          <div className="grid gap-6 md:grid-cols-[1fr_2fr] md:items-end">
            <h2 className="text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">How a job runs</h2>
            <p className="max-w-[60ch] text-[15px] leading-relaxed text-mute">
              You upload files. The control plane decides what they are, packages them into a container, cuts the
              work into chunks and hands each chunk to a machine on the network.
            </p>
          </div>
          <ol className="mt-12 grid grid-cols-1 border-t border-ink sm:grid-cols-2 lg:grid-cols-6">
            {STEPS.map((s, i) => (
              <li key={s.name} className="border-b border-rule py-5 sm:pr-6 lg:border-b-0 lg:border-r lg:pl-4 lg:first:pl-0 lg:last:border-r-0">
                <div className="num text-xs text-mute">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-3 text-[17px] font-semibold">{s.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 flex items-start gap-3 border-t border-rule pt-5 text-sm text-ink-2">
            <span className="mt-1.5 inline-block h-2 w-2 shrink-0 bg-primary" aria-hidden="true" />
            <span>
              Machines leave. If a node stops sending heartbeats, the watchdog lowers its reliability score and
              requeues its chunks on another machine.
            </span>
          </p>
        </div>
      </section>

      {/* Workloads */}
      <section id="workloads" className="scroll-mt-16 border-b border-rule bg-surface">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-8 md:py-24">
          <h2 className="text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">What you can run</h2>
          <div className="mt-10 overflow-x-auto border-t border-ink">
            <table className="table-ruled min-w-[680px]">
              <thead>
                <tr>
                  <th className="!pl-0">Workload</th>
                  <th>Input</th>
                  <th>Split by</th>
                  <th>You get back</th>
                </tr>
              </thead>
              <tbody>
                {WORKLOADS.map((w) => (
                  <tr key={w.type}>
                    <td className="!pl-0">
                      <div className="font-medium">{w.type}</div>
                      <div className="text-xs text-mute">{w.tool}</div>
                    </td>
                    <td className="num text-[13px]">{w.input}</td>
                    <td className="num text-[13px]">{w.split}</td>
                    <td className="text-ink-2">{w.output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sample scene */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-14 sm:px-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div className="flex gap-5">
            <SampleThumb />
            <div>
              <h2 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[30px]">No .blend handy?</h2>
              <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
                Use our sample scene: a 72-frame animated scene that renders in about two minutes on two laptops.
              </p>
              <p className="num mt-3 text-xs text-mute">sparecycles-sample.blend · 1.4 MB · 640×360</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <a href="/samples/sparecycles-sample.blend" download className="btn btn-outline btn-lg">
              <Download size={16} />
              Download sample
            </a>
            <Link href="/submit?sample=1" className="btn btn-ink btn-lg">
              Use sample &amp; submit
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Two sides */}
      <section id="contribute" className="scroll-mt-16 border-b border-rule">
        <div className="mx-auto grid max-w-[1240px] md:grid-cols-2">
          <div className="border-b border-rule px-4 py-14 sm:px-8 md:border-b-0 md:border-r md:py-20">
            <div className="label">If you have a job</div>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">Spread one job across many machines.</h2>
            <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
              Sign in with Google, upload your files and watch every chunk move across the network live. When the
              last one lands, download the assembled output.
            </p>
            <Link href="/submit" className="btn btn-primary mt-8">
              Submit a job
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="px-4 py-14 sm:px-8 md:py-20">
            <div className="label">If you have a machine</div>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">Lend it while you&apos;re not using it.</h2>
            <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
              Install the SpareCycles desktop app and switch it on. It runs chunks in local Docker containers, uses
              your GPU if you have one, and earns credits for each chunk it completes.
            </p>
            <Link href="/contributor/register" className="btn btn-outline mt-8">
              Contribute a machine
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

/** Tiny 4×3 frame: the sample scene, already chunked. */
function SampleThumb() {
  return (
    <div className="hidden shrink-0 grid-cols-4 gap-[3px] border border-ink bg-surface p-[5px] sm:grid" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <span key={i} className={`h-4 w-4 ${i === 6 ? "bg-primary" : "bg-ink"}`} />
      ))}
    </div>
  );
}

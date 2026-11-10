import Link from "next/link";
import { Wordmark, ThemeToggle } from "@/components/Brand";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#workloads", label: "Workloads" },
  { href: "/#contribute", label: "Contribute" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-8">
        <Wordmark />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Site">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-ink-2 transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/submit" className="btn btn-primary btn-sm">
            Submit a job
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-mute">
            Your campus&apos;s idle compute, put to work.
          </p>
          <p className="num mt-6 text-xs text-mute">sparecycles.sahuja.in</p>
        </div>
        <div>
          <div className="label mb-3">Product</div>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-ink-2 hover:text-ink" href="/#how">How it works</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/#workloads">Workloads</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/pricing">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <div className="label mb-3">Start</div>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-ink-2 hover:text-ink" href="/submit">Submit a job</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/submit?sample=1">Try the sample scene</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/contributor/register">Contribute a machine</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/login">Sign in</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

import type { ReactNode } from "react";

/**
 * SpareCycles UI kit. Small, token-driven building blocks shared by every
 * authenticated page so the app reads as one instrument.
 */

export function PageHeader({
  title,
  sub,
  actions,
  meta,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-rule pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {meta && <div className="label mb-3">{meta}</div>}
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-ink md:text-[34px]">{title}</h1>
        {sub && <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  aside,
  children,
  className = "",
  bodyClassName = "p-5",
  as: Tag = "section",
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`panel ${className}`}>
      {(title || aside) && (
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-rule px-5 py-2.5">
          {title && <h2 className="label !text-ink-2">{title}</h2>}
          {aside && <div className="flex items-center gap-2 text-sm text-mute">{aside}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}

/** A readout cell. Put several inside <StatRow> for a ruled strip. */
export function Stat({
  label,
  value,
  unit,
  accent = false,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  accent?: boolean;
  hint?: ReactNode;
}) {
  return (
    <div className="min-w-0 px-5 py-4">
      <div className="label">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`num text-[28px] font-medium leading-none tracking-[-0.02em] ${accent ? "text-primary" : "text-ink"}`}
        >
          {value}
        </span>
        {unit && <span className="num text-xs text-mute">{unit}</span>}
      </div>
      {hint && <div className="mt-1.5 text-xs text-mute">{hint}</div>}
    </div>
  );
}

export function StatRow({ children, cols = 4, className = "" }: { children: ReactNode; cols?: 2 | 3 | 4 | 5; className?: string }) {
  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-3 lg:grid-cols-5",
  }[cols];
  return (
    <div
      className={`grid grid-cols-2 ${colClass} gap-px overflow-hidden rounded-[var(--radius)] border border-rule bg-rule [&>*]:bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

type Tone = "live" | "ok" | "warn" | "err" | "idle";

const STATUS_TONE: Record<string, Tone> = {
  analyzing: "live",
  needs_dockerfile: "warn",
  queued: "idle",
  pending: "idle",
  assigned: "live",
  running: "live",
  assembling: "live",
  completed: "ok",
  success: "ok",
  online: "live",
  active: "ok",
  busy: "live",
  failed: "err",
  error: "err",
  requeued: "warn",
  cancelled: "idle",
  offline: "idle",
  inactive: "idle",
};

const TONE_CLASS: Record<Tone, { dot: string; text: string }> = {
  live: { dot: "bg-live", text: "text-ink" },
  ok: { dot: "bg-ok", text: "text-ok" },
  warn: { dot: "bg-warn", text: "text-warn" },
  err: { dot: "bg-err", text: "text-err" },
  idle: { dot: "bg-rule-strong", text: "text-mute" },
};

export function toneFor(status?: string): Tone {
  return STATUS_TONE[(status || "").toLowerCase()] || "idle";
}

/** Square dot + mono status text. Live states pulse (magenta). */
export function StatusPill({ status, label }: { status?: string; label?: ReactNode }) {
  const tone = toneFor(status);
  const c = TONE_CLASS[tone];
  const text = label ?? (status || "unknown").replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] ${c.text}`}>
      <span className="relative inline-flex h-2 w-2">
        {tone === "live" && (
          <span className="absolute inset-0 animate-ping bg-live opacity-50 motion-reduce:hidden" />
        )}
        <span className={`relative inline-block h-2 w-2 ${c.dot}`} />
      </span>
      {text}
    </span>
  );
}

/** Mono tag for job type, framework, resources. */
export function Tag({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "primary" | "ink" }) {
  const cls =
    tone === "primary"
      ? "border-primary bg-primary-wash text-ink"
      : tone === "ink"
        ? "border-ink bg-ink text-canvas"
        : "border-rule-strong bg-surface text-ink-2";
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-[2px] border px-2 font-mono text-[11px] uppercase tracking-[0.04em] ${cls}`}>
      {children}
    </span>
  );
}

export function Meter({ value, max = 100, tone = "ink" }: { value: number; max?: number; tone?: "ink" | "primary" | "live" | "ok" | "err" }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const bar = { ink: "bg-ink", primary: "bg-primary", live: "bg-live", ok: "bg-ok", err: "bg-err" }[tone];
  return (
    <div className="h-1.5 w-full bg-raised outline outline-1 -outline-offset-1 outline-rule" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${bar} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="bg-grid flex flex-col items-start gap-3 px-5 py-10">
      <div className="grid grid-cols-3 gap-[3px]" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className={`h-2.5 w-2.5 ${i === 8 ? "border border-dashed border-rule-strong" : "bg-rule"}`} />
        ))}
      </div>
      <div className="text-[15px] font-medium text-ink">{title}</div>
      {children && <div className="max-w-[56ch] text-sm leading-relaxed text-mute">{children}</div>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-10 text-mute">
      <span className="grid grid-cols-3 gap-[3px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 bg-ink animate-pulse motion-reduce:animate-none"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      <span className="label">{label}</span>
    </div>
  );
}

/** Wraps the content of an authenticated page with consistent gutters. */
export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-6 sm:px-8 sm:py-10 ${className}`}>{children}</div>;
}

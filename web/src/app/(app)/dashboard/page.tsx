"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { Upload, Server, CreditCard, ArrowUpRight, Copy, Check, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Page, PageHeader, Panel, Stat, StatRow, StatusPill, Tag, Empty, Loading, Meter } from "@/components/kit";

export default function DashboardPage() {
  const { data: session } = useSession();

  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ["jobs", session?.backend_jwt],
    queryFn: () => api.getJobs(1, 20),
    enabled: !!session?.backend_jwt,
    refetchInterval: 15000,
  });

  const { data: earnings } = useQuery({
    queryKey: ["dashboard-earnings", session?.backend_jwt],
    queryFn: () => api.getEarnings(),
    enabled: !!session?.backend_jwt,
  });

  const { data: clusterStats } = useQuery({
    queryKey: ["cluster-stats", session?.backend_jwt],
    queryFn: () => api.getClusterStats(),
    enabled: !!session?.backend_jwt,
    refetchInterval: 30000,
  });

  const jobs = jobsResponse?.jobs || [];
  const activeJobs = jobs.filter((j: any) => ["analyzing", "queued", "running", "assembling"].includes(j.status));

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        sub={
          activeJobs.length === 0
            ? "No jobs running right now."
            : `${activeJobs.length} job${activeJobs.length === 1 ? "" : "s"} running on the network.`
        }
        actions={
          <>
            {session?.backend_jwt && <TokenField token={session.backend_jwt as string} />}
            <Link href="/submit" className="btn btn-primary">
              <Upload size={16} />
              Submit job
            </Link>
          </>
        }
      />

      <StatRow cols={4} className="mb-6">
        <Stat label="Total jobs" value={jobsResponse?.total || 0} />
        <Stat label="Active jobs" value={activeJobs.length} accent={activeJobs.length > 0} />
        <Stat label="GPU hours" value={(earnings?.total_gpu_hours || 0).toFixed(1)} unit="h" />
        <Stat label="Earned" value={`$${(earnings?.total_earned || 0).toFixed(2)}`} />
      </StatRow>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Network" aside={<StatusPill status="online" label="live" />} className="lg:col-span-2" bodyClassName="">
          <div className="grid grid-cols-3 divide-x divide-rule border-b border-rule">
            <Stat label="Nodes" value={clusterStats?.total_nodes || 0} />
            <Stat label="Active jobs" value={clusterStats?.active_jobs || 0} />
            <Stat label="Queued" value={clusterStats?.queued_jobs || 0} />
          </div>
          <div className="px-5 py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="label">Total VRAM</span>
              <span className="num text-sm text-ink">{clusterStats?.total_vram_gb || 0} GB</span>
            </div>
            <Meter value={Math.min(100, (clusterStats?.active_jobs || 0) * 5)} tone="primary" />
          </div>
        </Panel>

        <Panel title="Shortcuts" bodyClassName="p-2">
          <ShortcutLink href="/submit" icon={Upload} label="Submit a job" />
          <ShortcutLink href="/contributor" icon={Server} label="Manage nodes" />
          <ShortcutLink href="/billing" icon={CreditCard} label="Billing" />
        </Panel>
      </div>

      <Panel title="Recent jobs" aside={<span className="num text-xs">{jobs.length} shown</span>} bodyClassName="">
        {isLoading ? (
          <Loading label="Loading jobs" />
        ) : jobs.length === 0 ? (
          <Empty
            title="No jobs yet"
            action={
              <Link href="/submit" className="btn btn-outline btn-sm">
                Submit your first job
              </Link>
            }
          >
            Upload a .blend file, a training script or a data job. It gets split into chunks and run on idle machines.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-ruled">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th className="!text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job: any) => (
                  <tr key={job.id}>
                    <td>
                      <div className="num text-[13px] text-ink">{job.id.substring(0, 8)}</div>
                      <div className="max-w-[220px] truncate font-mono text-[11px] text-mute">{job.input_path}</div>
                    </td>
                    <td>
                      <Tag>{(job.type || "unknown").replace(/_/g, " ")}</Tag>
                    </td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                    <td className="whitespace-nowrap text-mute">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    <td className="text-right">
                      {job.status === "completed" ? (
                        <Link href={`/results/${job.id}`} className="link inline-flex items-center gap-1 text-sm whitespace-nowrap">
                          Results <ArrowUpRight size={13} />
                        </Link>
                      ) : (
                        <Link href={`/monitor/${job.id}`} className="link inline-flex items-center gap-1 text-sm whitespace-nowrap">
                          Monitor <ArrowUpRight size={13} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Page>
  );
}

function ShortcutLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link
      href={href}
      className="group flex h-11 items-center justify-between rounded-[var(--radius)] px-3 text-sm text-ink-2 transition-colors hover:bg-raised hover:text-ink"
    >
      <span className="flex items-center gap-3">
        <Icon size={16} strokeWidth={1.75} className="text-mute group-hover:text-ink" />
        {label}
      </span>
      <ArrowUpRight size={14} className="text-mute transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
    </Link>
  );
}

/** The backend JWT, hidden by default. Contributors paste it into the desktop app. */
function TokenField({ token }: { token: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex h-10 w-full items-center gap-2 rounded-[var(--radius)] border border-rule-strong bg-surface pl-3 pr-1 sm:w-64">
      <span className="label shrink-0">Token</span>
      <input
        readOnly
        value={token}
        aria-label="Node token"
        className={`num min-w-0 flex-1 bg-transparent text-[11px] text-ink outline-none ${shown ? "" : "blur-[3px]"}`}
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button type="button" className="btn btn-ghost h-8 w-8 p-0" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide token" : "Show token"}>
        {shown ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <button
        type="button"
        className="btn btn-ghost h-8 w-8 p-0"
        aria-label="Copy token"
        onClick={() => {
          navigator.clipboard?.writeText(token).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

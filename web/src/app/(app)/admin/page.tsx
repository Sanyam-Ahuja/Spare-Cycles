"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { Shield } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Page, PageHeader, Panel, Stat, StatRow, StatusPill, Tag, Meter, Empty, Loading } from "@/components/kit";

export default function AdminPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "nodes" | "jobs">("overview");

  const { data: overview, isLoading: loadingOverview, error } = useQuery({
    queryKey: ["admin-overview", session?.backend_jwt],
    queryFn: () => api.getAdminOverview(),
    enabled: !!session?.backend_jwt,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users", session?.backend_jwt],
    queryFn: () => api.getAdminUsers(1, 50),
    enabled: !!session?.backend_jwt && activeTab === "users",
  });

  const { data: nodesData } = useQuery({
    queryKey: ["admin-nodes", session?.backend_jwt],
    queryFn: () => api.getAdminNodes(1, 50),
    enabled: !!session?.backend_jwt && activeTab === "nodes",
  });

  const { data: jobsData } = useQuery({
    queryKey: ["admin-jobs", session?.backend_jwt],
    queryFn: () => api.getAdminJobs(1, 50),
    enabled: !!session?.backend_jwt && activeTab === "jobs",
  });

  if (error) {
    return (
      <Page>
        <Panel className="mx-auto mt-16 max-w-md" bodyClassName="">
          <Empty title="Access denied">
            <span className="inline-flex items-center gap-2">
              <Shield size={14} className="text-err" /> You need admin privileges to view this page.
            </span>
          </Empty>
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Shield size={12} /> Admin
          </span>
        }
        title="Cluster management"
        sub="Users, nodes and jobs across the SpareCycles network."
      />

      <div className="mb-6 flex gap-0 overflow-x-auto border-b border-rule" role="tablist">
        {(["overview", "users", "nodes", "jobs"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px h-10 shrink-0 border-b-2 px-4 text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? "border-primary text-ink" : "border-transparent text-mute hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" &&
        (loadingOverview ? (
          <Loading label="Loading cluster data" />
        ) : overview ? (
          <div className="space-y-6">
            <StatRow cols={4}>
              <Stat label="Users" value={overview.users.total} hint={`${overview.users.contributors} contributors`} />
              <Stat
                label="Nodes online"
                value={`${overview.nodes.online}/${overview.nodes.total}`}
                hint={`${overview.nodes.offline} offline`}
              />
              <Stat label="Active jobs" value={overview.jobs.active} accent={overview.jobs.active > 0} hint={`${overview.jobs.total} total`} />
              <Stat label="Revenue" value={`$${overview.financials.total_revenue}`} hint={`${overview.financials.total_gpu_hours} GPU hrs`} />
            </StatRow>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel title="Job pipeline" bodyClassName="space-y-4 p-5">
                <PipelineRow label="Completed" count={overview.jobs.completed} total={overview.jobs.total} tone="ok" />
                <PipelineRow label="Active" count={overview.jobs.active} total={overview.jobs.total} tone="live" />
                <PipelineRow label="Failed" count={overview.jobs.failed} total={overview.jobs.total} tone="err" />
              </Panel>

              <Panel title="Chunk processing" bodyClassName="px-5 py-1">
                <KV label="Chunks created" value={overview.chunks.total} />
                <KV label="Running now" value={<span className="text-live">{overview.chunks.running}</span>} />
                <KV
                  label="Node utilization"
                  value={
                    overview.nodes.total > 0
                      ? `${Math.round((overview.nodes.online / overview.nodes.total) * 100)}%`
                      : "—"
                  }
                />
              </Panel>
            </div>
          </div>
        ) : null)}

      {activeTab === "users" && (
        <Panel title="Users" aside={<span className="num text-xs">{usersData?.users?.length ?? 0} shown</span>} bodyClassName="">
          {!usersData ? (
            <Loading label="Loading users" />
          ) : usersData.users?.length === 0 ? (
            <Empty title="No users yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-ruled">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th className="!text-right">Nodes</th>
                    <th className="!text-right">Jobs</th>
                    <th className="!text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.users?.map((u: any) => (
                    <tr key={u.id}>
                      <td className="whitespace-nowrap font-medium text-ink">{u.name}</td>
                      <td className="whitespace-nowrap text-mute">{u.email}</td>
                      <td>
                        <Tag tone={u.role === "admin" ? "ink" : u.role === "both" ? "primary" : "plain"}>{u.role}</Tag>
                      </td>
                      <td className="num text-right text-ink">{u.nodes_count}</td>
                      <td className="num text-right text-ink">{u.jobs_count}</td>
                      <td className="num text-right text-ink">${u.credit_balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {activeTab === "nodes" && (
        <Panel title="Nodes" aside={<span className="num text-xs">{nodesData?.nodes?.length ?? 0} shown</span>} bodyClassName="">
          {!nodesData ? (
            <Loading label="Loading nodes" />
          ) : nodesData.nodes?.length === 0 ? (
            <Empty title="No nodes registered" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-ruled">
                <thead>
                  <tr>
                    <th>Hostname</th>
                    <th>GPU</th>
                    <th>Status</th>
                    <th className="!text-right">Reliability</th>
                    <th className="!text-right">GPU hours</th>
                    <th className="!text-right">Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {nodesData.nodes?.map((n: any) => (
                    <tr key={n.id}>
                      <td className="whitespace-nowrap font-mono text-[13px] text-ink">{n.hostname}</td>
                      <td className="whitespace-nowrap">
                        <span className="font-mono text-[13px] text-ink">{n.gpu_model}</span>
                        <span className="num ml-1.5 text-xs text-mute">{n.gpu_vram_gb} GB</span>
                      </td>
                      <td>
                        <StatusPill status={n.status} />
                      </td>
                      <td className="num text-right text-ink">{(n.reliability_score * 100).toFixed(0)}%</td>
                      <td className="num text-right text-ink">{n.total_gpu_hours.toFixed(1)}</td>
                      <td className="num text-right text-ink">${n.total_earned.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {activeTab === "jobs" && (
        <Panel title="Jobs" aside={<span className="num text-xs">{jobsData?.jobs?.length ?? 0} shown</span>} bodyClassName="">
          {!jobsData ? (
            <Loading label="Loading jobs" />
          ) : jobsData.jobs?.length === 0 ? (
            <Empty title="No jobs submitted yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-ruled">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="!text-right">Chunks</th>
                    <th className="!text-right">Cost</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsData.jobs?.map((j: any) => (
                    <tr key={j.id}>
                      <td className="num text-[13px] text-ink">{j.id.substring(0, 8)}</td>
                      <td>{j.type ? <Tag>{j.type.replace(/_/g, " ")}</Tag> : <span className="text-mute">—</span>}</td>
                      <td>
                        <StatusPill status={j.status} />
                      </td>
                      <td className="num whitespace-nowrap text-right text-ink">
                        {j.completed_chunks}/{j.total_chunks}
                      </td>
                      <td className="num text-right text-ink">${j.actual_cost.toFixed(2)}</td>
                      <td className="num whitespace-nowrap text-xs text-mute">
                        {j.created_at ? new Date(j.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </Page>
  );
}

function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-3 last:border-b-0">
      <span className="text-sm text-ink-2">{label}</span>
      <span className="num text-sm text-ink">{value}</span>
    </div>
  );
}

function PipelineRow({ label, count, total, tone }: { label: string; count: number; total: number; tone: "ok" | "live" | "err" }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="num text-ink">
          {count}
          <span className="ml-2 text-xs text-mute">{pct.toFixed(0)}%</span>
        </span>
      </div>
      <Meter value={pct} tone={tone} />
    </div>
  );
}

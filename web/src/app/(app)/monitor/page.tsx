"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { ArrowUpRight, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Page, PageHeader, Panel, Stat, StatRow, StatusPill, Tag, Empty, Loading } from "@/components/kit";

export default function MonitorIndexPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ["jobs-monitor", session?.backend_jwt],
    queryFn: () => api.getJobs(1, 100),
    enabled: !!session?.backend_jwt,
    refetchInterval: 10000,
  });

  const { data: clusterStats } = useQuery({
    queryKey: ["cluster-stats-monitor", session?.backend_jwt],
    queryFn: () => api.getClusterStats(),
    enabled: !!session?.backend_jwt,
    refetchInterval: 30000,
  });

  const jobs = jobsResponse?.jobs || [];
  const activeJobs = jobs.filter((j: any) => ["analyzing", "queued", "running", "assembling"].includes(j.status));

  return (
    <Page>
      <PageHeader
        title="Monitor"
        sub="Jobs in flight and the state of the network. Refreshes every 10 seconds."
        actions={
          <Link href="/submit" className="btn btn-primary">
            <Upload size={16} />
            Submit job
          </Link>
        }
      />

      <StatRow cols={4} className="mb-6">
        <Stat label="Active jobs" value={activeJobs.length} accent={activeJobs.length > 0} />
        <Stat label="Nodes online" value={clusterStats?.total_nodes || 0} />
        <Stat label="Total VRAM" value={clusterStats?.total_vram_gb || 0} unit="GB" />
        <Stat label="Queued" value={clusterStats?.queued_jobs || 0} />
      </StatRow>

      <Panel
        title="Active jobs"
        aside={<span className="num text-xs">{activeJobs.length} running</span>}
        bodyClassName=""
      >
        {isLoading ? (
          <Loading label="Loading jobs" />
        ) : activeJobs.length === 0 ? (
          <Empty
            title="Nothing running"
            action={
              <Link href="/submit" className="btn btn-outline btn-sm">
                Submit job
              </Link>
            }
          >
            Jobs show up here while they are being analyzed, queued, rendered or assembled.
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
                {activeJobs.map((job: any) => (
                  <tr key={job.id}>
                    <td>
                      <div className="num text-[13px] text-ink">{job.id.substring(0, 12)}</div>
                      <div className="max-w-[240px] truncate font-mono text-[11px] text-mute">{job.input_path}</div>
                    </td>
                    <td>
                      <Tag>{(job.type || "unknown").replace(/_/g, " ")}</Tag>
                    </td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                    <td className="whitespace-nowrap text-mute">
                      {job.created_at ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true }) : "—"}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/monitor/${job.id}`}
                        className="link inline-flex items-center gap-1 whitespace-nowrap text-sm"
                      >
                        Live view <ArrowUpRight size={13} />
                      </Link>
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

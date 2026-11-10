"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Page, PageHeader, Panel, Stat, StatRow, StatusPill, Tag, Empty, Loading } from "@/components/kit";

export default function ResultsIndexPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ["jobs-results", session?.backend_jwt],
    queryFn: () => api.getJobs(1, 100),
    enabled: !!session?.backend_jwt,
  });

  const jobs = jobsResponse?.jobs || [];
  const completedJobs = jobs.filter((j: any) => ["completed", "failed", "cancelled"].includes(j.status));
  const succeeded = completedJobs.filter((j: any) => j.status === "completed").length;

  return (
    <Page>
      <PageHeader title="Results" sub="Finished jobs. Open one to preview and download its output." />

      <StatRow cols={3} className="mb-6">
        <Stat label="Finished" value={completedJobs.length} />
        <Stat label="Completed" value={succeeded} accent={succeeded > 0} />
        <Stat label="Failed or cancelled" value={completedJobs.length - succeeded} />
      </StatRow>

      <Panel title="Finished jobs" aside={<span className="num text-xs">{completedJobs.length} shown</span>} bodyClassName="">
        {isLoading ? (
          <Loading label="Loading results" />
        ) : completedJobs.length === 0 ? (
          <Empty
            title="No finished jobs yet"
            action={
              <Link href="/submit" className="btn btn-outline btn-sm">
                Submit job
              </Link>
            }
          >
            Outputs appear here once every chunk has run and been assembled.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-ruled">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="!text-right">Chunks</th>
                  <th>Finished</th>
                  <th className="!text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {completedJobs.map((job: any) => (
                  <tr key={job.id}>
                    <td>
                      <div className="max-w-[260px] truncate text-[14px] text-ink">{job.input_path}</div>
                      <div className="num text-[11px] text-mute">{job.id.substring(0, 12)}</div>
                    </td>
                    <td>
                      <Tag>{(job.type || "unknown").replace(/_/g, " ")}</Tag>
                    </td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                    <td className="num text-right text-ink-2">{job.total_chunks ?? "—"}</td>
                    <td className="whitespace-nowrap text-mute">
                      {job.updated_at || job.created_at
                        ? formatDistanceToNow(new Date(job.updated_at || job.created_at), { addSuffix: true })
                        : "—"}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/results/${job.id}`}
                        className="link inline-flex items-center gap-1 whitespace-nowrap text-sm"
                      >
                        View <ArrowUpRight size={13} />
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

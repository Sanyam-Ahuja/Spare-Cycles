"use client";

import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { ArrowLeft, Download, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Page, PageHeader, Panel, Stat, StatusPill, Meter, Loading } from "@/components/kit";

export default function ResultsPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { data: session } = useSession();

  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: job, isLoading } = useQuery({
    queryKey: ["job-results-detail", jobId],
    queryFn: () => api.getJob(jobId),
    enabled: !!session?.backend_jwt && !!jobId,
  });

  if (isLoading || !job) {
    return (
      <Page>
        <Loading label="Loading result" />
      </Page>
    );
  }

  const totalChunks = job.chunks?.length || 0;
  const completedChunks = job.chunks?.filter((c: any) => c.status === "completed").length || 0;
  const totalGpuHours = job.chunks?.reduce((sum: number, c: any) => sum + (c.gpu_hours || 0), 0) || 0;
  const totalCost = job.actual_cost || job.chunks?.reduce((sum: number, c: any) => sum + (c.cost || 0), 0) || 0;

  const startTimes = job.chunks?.map((c: any) => c.started_at).filter(Boolean).map((t: string) => new Date(t).getTime()) || [];
  const endTimes = job.chunks?.map((c: any) => c.completed_at).filter(Boolean).map((t: string) => new Date(t).getTime()) || [];
  const wallClockMs = startTimes.length > 0 && endTimes.length > 0 ? Math.max(...endTimes) - Math.min(...startTimes) : 0;
  const wallClockStr = wallClockMs > 0
    ? `${Math.floor(wallClockMs / 3600000).toString().padStart(2, "0")}:${Math.floor((wallClockMs % 3600000) / 60000).toString().padStart(2, "0")}:${Math.floor((wallClockMs % 60000) / 1000).toString().padStart(2, "0")}`
    : "—";

  return (
    <Page>
      <Link href="/results" className="btn btn-ghost btn-sm -ml-3 mb-4">
        <ArrowLeft size={14} />
        Results
      </Link>

      <PageHeader
        meta={<StatusPill status={job.status} />}
        title={
          <>
            Job <span className="num">{job.id.substring(0, 8)}</span>
          </>
        }
        sub={
          <span className="num text-[13px]">
            {job.updated_at ? format(new Date(job.updated_at), "MMM d, h:mm a") : "—"}
          </span>
        }
        actions={
          job.presigned_url ? (
            <a href={job.presigned_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
              <Download size={16} />
              Download output
            </a>
          ) : (
            <button disabled className="btn btn-outline btn-lg">
              Preparing output
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Output" className="min-w-0 lg:col-span-2" bodyClassName="">
          <div className="flex aspect-video items-center justify-center overflow-hidden bg-raised">
            {job.presigned_url ? (
              <>
                {job.output_path?.endsWith(".mp4") ? (
                  <video
                    src={job.presigned_url}
                    controls
                    autoPlay
                    loop
                    className="h-full w-full object-contain"
                  />
                ) : job.output_path?.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                  <img
                    src={job.presigned_url}
                    alt="Job output"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <FileText size={40} strokeWidth={1.5} className="text-mute" />
                    <p className="max-w-xs break-all font-mono text-[12px] text-ink-2">
                      {job.output_path || "Archive ready to download"}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <span className="grid grid-cols-3 gap-[3px]" aria-hidden="true">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span
                      key={i}
                      className="h-2.5 w-2.5 animate-pulse bg-ink motion-reduce:animate-none"
                      style={{ animationDelay: `${i * 90}ms` }}
                    />
                  ))}
                </span>
                <h3 className="text-[15px] font-medium text-ink">Assembling output</h3>
                <p className="max-w-sm text-sm text-mute">
                  Finished chunks are being merged into the final file. This usually takes a few seconds.
                </p>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Summary" className="min-w-0" bodyClassName="">
          <div className="border-b border-rule">
            <Stat label="Total cost" value={`$${totalCost.toFixed(2)}`} accent />
          </div>
          <div className="grid grid-cols-2 divide-x divide-rule border-b border-rule">
            <Stat label="Wall clock" value={<span className="text-[20px]">{wallClockStr}</span>} />
            <Stat label="GPU hours" value={<span className="text-[20px]">{totalGpuHours.toFixed(1)}</span>} unit="h" />
          </div>
          <div className="px-5 py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="label">Chunks completed</span>
              <span className="num text-sm text-ink">
                {completedChunks}/{totalChunks}
              </span>
            </div>
            <Meter value={completedChunks} max={totalChunks} tone="ink" />
          </div>
        </Panel>
      </div>
    </Page>
  );
}

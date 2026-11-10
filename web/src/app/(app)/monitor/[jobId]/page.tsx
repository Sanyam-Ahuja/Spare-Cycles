"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { useJobStream } from "@/lib/ws";
import { ArrowLeft, Check, Circle, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Page, PageHeader, Panel, Stat, StatRow, StatusPill, Meter, Empty, Loading } from "@/components/kit";

export default function MonitorPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { data: session } = useSession();
  const router = useRouter();

  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: jobInfo, isLoading } = useQuery({
    queryKey: ["job-detail", jobId],
    queryFn: () => api.getJob(jobId),
    enabled: !!session?.backend_jwt && !!jobId,
    refetchInterval: 5000,
  });

  const { messages } = useJobStream(jobId, session?.backend_jwt || "");

  const [liveChunks, setLiveChunks] = useState<any[]>([]);
  const [jobStatus, setJobStatus] = useState<string>("queued");
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (jobInfo?.chunks) {
      setLiveChunks(prev => {
        const sortedInfoChunks = [...jobInfo.chunks].sort((a, b) => a.chunk_index - b.chunk_index);
        return sortedInfoChunks.map(infoChunk => {
          const existingChunk = prev.find(c => c.id === infoChunk.id);
          if (existingChunk) {
            return {
              ...infoChunk,
              progress: existingChunk.progress || infoChunk.progress || 0,
              telemetry: existingChunk.telemetry || infoChunk.telemetry
            };
          }
          return infoChunk;
        });
      });
      setJobStatus(jobInfo.status);
    }
  }, [jobInfo]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];

      if (lastMsg.type === "chunk_status") {
        setLiveChunks(prev => prev.map(c =>
          c.id === lastMsg.chunk_id
            ? { ...c, status: lastMsg.status, progress: lastMsg.progress || c.progress, telemetry: lastMsg.telemetry }
            : c
        ));
      } else if (lastMsg.type === "job_complete") {
        setJobStatus("completed");
        setTimeout(() => router.push(`/results/${jobId}`), 3000);
      } else if (lastMsg.type === "log") {
        setLogs(prev => [...prev, lastMsg].slice(-50));
      }
    }
  }, [messages, jobId, router]);

  if (isLoading || !jobInfo) {
    return (
      <Page>
        <Loading label="Loading job" />
      </Page>
    );
  }

  const completedChunks = liveChunks.filter(c => c.status === "completed").length;
  const progressPercent = liveChunks.length > 0 ? (completedChunks / liveChunks.length) * 100 : 0;

  // Aggregate telemetry from active chunks
  const activeChunks = liveChunks.filter(c => c.status === "running");
  const avgGpuLoad = activeChunks.length > 0
    ? activeChunks.reduce((acc, c) => acc + (c.telemetry?.gpu_load || 0), 0) / activeChunks.length
    : 0;

  // Display-only: pipeline steps streamed over the same socket.
  const pipelineSteps = messages.filter((m: any) => m.type === "detection_step");

  return (
    <Page>
      <Link href="/monitor" className="btn btn-ghost btn-sm -ml-3 mb-4">
        <ArrowLeft size={14} />
        Monitor
      </Link>

      <PageHeader
        meta={<StatusPill status={jobStatus} />}
        title={
          <>
            Job <span className="num">{jobId.substring(0, 12)}</span>
          </>
        }
        sub={<span className="break-all font-mono text-[13px]">{jobInfo.input_path}</span>}
        actions={
          <div className="text-left md:text-right">
            <div className="label">Progress</div>
            <div className="num mt-1 text-[34px] font-medium leading-none tracking-[-0.02em] text-primary">
              {progressPercent.toFixed(1)}
              <span className="text-base text-mute">%</span>
            </div>
          </div>
        }
      />

      {jobStatus === "completed" && (
        <div className="mb-6 flex items-center gap-3 rounded-[var(--radius)] border border-rule bg-surface px-4 py-3 text-sm text-ink">
          <Check size={16} className="text-ok" />
          Job complete. Opening results.
          <Link href={`/results/${jobId}`} className="link ml-auto whitespace-nowrap">
            Go now
          </Link>
        </div>
      )}

      <div className="mb-6">
        <Meter value={progressPercent} tone={jobStatus === "completed" ? "ok" : "primary"} />
      </div>

      <StatRow cols={4} className="mb-6">
        <Stat label="Status" value={<span className="text-[20px]">{jobStatus.replace(/_/g, " ")}</span>} />
        <Stat label="Avg GPU load" value={avgGpuLoad.toFixed(0)} unit="%" />
        <Stat label="Chunks done" value={`${completedChunks}/${liveChunks.length}`} accent={completedChunks > 0} />
        <Stat label="Running now" value={activeChunks.length} />
      </StatRow>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Panel
            title="Chunk map"
            aside={<span className="num text-xs">{liveChunks.length} tiles</span>}
            bodyClassName=""
          >
            {liveChunks.length === 0 ? (
              <Empty title="No chunks yet">The job is split into chunks once analysis finishes.</Empty>
            ) : (
              <>
                <div className="p-5">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(32px,1fr))] gap-1">
                    {liveChunks.map((chunk) => (
                      <ChunkTile key={chunk.id} chunk={chunk} />
                    ))}
                  </div>
                </div>
                <Legend />
              </>
            )}
          </Panel>

          {liveChunks.length > 0 && (
            <Panel title="Chunks" bodyClassName="">
              <div className="overflow-x-auto">
                <table className="table-ruled">
                  <thead>
                    <tr>
                      <th>Chunk</th>
                      <th>Node</th>
                      <th>Status</th>
                      <th className="min-w-[120px]">Progress</th>
                      <th>GPU</th>
                      <th>Temp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveChunks.map((chunk) => {
                      const showTelemetry = chunk.status === "running" && chunk.telemetry;
                      return (
                        <tr key={chunk.id}>
                          <td className="num text-ink">#{chunk.chunk_index}</td>
                          <td className="num text-[12px] text-mute">{chunk.node_id?.substring(0, 8) || "waiting"}</td>
                          <td>
                            <StatusPill status={chunk.status} />
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-20">
                                <Meter value={chunk.progress || 0} tone={chunk.status === "completed" ? "ink" : "live"} />
                              </div>
                              <span className="num text-[12px] text-ink-2">{chunk.progress || 0}%</span>
                            </div>
                          </td>
                          <td className="num text-[12px] text-ink-2">
                            {showTelemetry ? `${chunk.telemetry.gpu_load}%` : "—"}
                          </td>
                          <td className="num text-[12px] text-ink-2">
                            {showTelemetry ? `${chunk.telemetry.temp}°C` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {pipelineSteps.length > 0 && (
            <Panel title="Pipeline" bodyClassName="">
              <ol>
                {pipelineSteps.map((step: any, idx: number, arr: any[]) => {
                  const isLast = idx === arr.length - 1;
                  const failed = step.step === "failed";
                  const done = step.completed || !isLast;
                  return (
                    <li
                      key={idx}
                      className="flex items-start gap-3 border-b border-rule px-5 py-3 last:border-b-0"
                    >
                      <span className="mt-0.5 shrink-0">
                        {failed ? (
                          <X size={14} className="text-err" />
                        ) : done ? (
                          <Check size={14} className="text-ok" />
                        ) : (
                          <Circle size={14} className="animate-pulse fill-live text-live motion-reduce:animate-none" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className={`font-mono text-[12px] uppercase tracking-[0.04em] ${failed ? "text-err" : "text-ink"}`}>
                          {step.step}
                        </div>
                        {step.detail && <div className="mt-0.5 text-[13px] text-mute">{step.detail}</div>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          )}

          <Panel title="Logs" aside={<span className="num text-xs">{logs.length}</span>} bodyClassName="p-3">
            <div className="h-[420px] overflow-y-auto rounded-[2px] border border-rule bg-raised p-3 font-mono text-[12px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-mute">Waiting for node output.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="num shrink-0 text-mute">
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className={`min-w-0 break-words ${log.level === "error" ? "text-err" : "text-ink-2"}`}>
                      {log.log || log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  );
}

function tileClass(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "assigned":
      return "border-live bg-live-wash text-ink";
    case "running":
      return "border-live bg-live text-on-live animate-pulse motion-reduce:animate-none";
    case "completed":
      return "border-ink bg-ink text-canvas";
    case "failed":
      return "border-err bg-err text-canvas";
    case "requeued":
      return "border-warn border-dashed bg-surface text-warn";
    default:
      return "border-rule bg-raised text-mute";
  }
}

function ChunkTile({ chunk }: { chunk: any }) {
  const node = chunk.node_id?.substring(0, 8) || "unassigned";
  const label = `Chunk ${chunk.chunk_index} · ${chunk.status || "pending"} · node ${node} · ${chunk.progress || 0}%`;
  return (
    <div
      title={label}
      aria-label={label}
      className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[2px] border font-mono text-[10px] tabular-nums ${tileClass(chunk.status)}`}
    >
      {chunk.chunk_index}
      {chunk.status === "running" && (chunk.progress || 0) > 0 && (
        <span className="absolute bottom-0 left-0 h-[3px] bg-ink/60" style={{ width: `${chunk.progress}%` }} />
      )}
    </div>
  );
}

function Legend() {
  const items: { status: string; label: string }[] = [
    { status: "pending", label: "Pending" },
    { status: "assigned", label: "Assigned" },
    { status: "running", label: "Running" },
    { status: "completed", label: "Done" },
    { status: "failed", label: "Failed" },
    { status: "requeued", label: "Requeued" },
  ];
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-rule px-5 py-3">
      {items.map((it) => (
        <span key={it.status} className="label inline-flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-[2px] border ${tileClass(it.status).replace(/animate-pulse|motion-reduce:animate-none/g, "")}`}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

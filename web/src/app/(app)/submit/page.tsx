"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, Check, XCircle, ShieldAlert, Download, ArrowRight, Loader2, FileBox } from "lucide-react";
import { CampuGridAPI } from "@/lib/api";
import { useJobStream } from "@/lib/ws";
import { useQuery } from "@tanstack/react-query";
import { Page, PageHeader, Panel, StatusPill, Tag, Meter } from "@/components/kit";

type SubmitState = "idle" | "uploading" | "detecting" | "ready" | "needs_dockerfile" | "failed";

/** Public sample scene for people without a .blend file. Served from web/public. */
const SAMPLE_URL = "/samples/sparecycles-sample.blend";
const SAMPLE_NAME = "sparecycles-sample.blend";

export default function SubmitPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobProfile, setJobProfile] = useState<any>(null);
  const [requiresNetwork, setRequiresNetwork] = useState(false);
  const [pauseDetail, setPauseDetail] = useState<string>("");
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [resolving, setResolving] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState<string>("");
  const [highlightSample, setHighlightSample] = useState(false);
  const sampleTriggered = useRef(false);

  const { messages } = useJobStream(jobId, session?.backend_jwt || "");

  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: clusterStats } = useQuery({
    queryKey: ["cluster-stats-submit", session?.backend_jwt],
    queryFn: () => api.getClusterStats(),
    enabled: !!session?.backend_jwt,
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !session?.backend_jwt) return;

    setSubmitError("");
    setSubmitState("uploading");

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 10, 95));
    }, 150);

    try {
      const res = await api.submitJob(acceptedFiles, undefined, requiresNetwork);
      setJobId(res.job_id);
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => setSubmitState("detecting"), 500);
    } catch (e) {
      console.error(e);
      setSubmitState("idle");
      clearInterval(interval);
      setUploadProgress(0);
      setSubmitError("Upload failed. Check your connection and try again.");
    }
  }, [session, requiresNetwork]);

  /**
   * Fetch the bundled sample scene, wrap it in a File and send it through
   * exactly the same path as a dropped file (onDrop -> api.submitJob).
   */
  const submitSample = useCallback(async () => {
    setSampleError("");
    setSampleLoading(true);
    try {
      const res = await fetch(SAMPLE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], SAMPLE_NAME, { type: "application/octet-stream" });
      await onDrop([file]);
    } catch (e) {
      console.error("Sample fetch failed:", e);
      setSampleError("Couldn't load the sample scene. Download it and drop it in instead.");
    } finally {
      setSampleLoading(false);
    }
  }, [onDrop]);

  // /submit?sample=1 (from the landing page) submits the sample once the session is ready.
  useEffect(() => {
    if (sampleTriggered.current || !session?.backend_jwt || submitState !== "idle") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("sample") !== "1") return;
    sampleTriggered.current = true;
    setHighlightSample(true);
    window.history.replaceState(null, "", "/submit");
    submitSample();
  }, [session?.backend_jwt, submitState, submitSample]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    if (lastMsg.type === "pipeline_complete" && lastMsg.profile) {
      setJobProfile(lastMsg.profile);
      setSubmitState("ready");
    } else if (lastMsg.type === "detection_step" && lastMsg.step === "needs_dockerfile") {
      // Pipeline paused — the user must supply a Dockerfile or authorize AI generation.
      setPauseDetail(lastMsg.detail || "Could not auto-detect this workload.");
      setSubmitState("needs_dockerfile");
    } else if (lastMsg.type === "detection_step" && lastMsg.step === "failed") {
      setErrorDetail(lastMsg.detail || "Pipeline failed.");
      setSubmitState("failed");
    }
  }, [messages]);

  // Fallback REST API polling to escape "Connecting to pipeline..." if WebSocket fails or misses messages
  useEffect(() => {
    if (submitState !== "detecting" || !jobId || !session?.backend_jwt) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const job = await api.getJob(jobId);
        if (!active) return;

        if (job.status === "needs_dockerfile") {
          setPauseDetail(job.profile?.error_details || "Dockerfile required for this custom workload.");
          setSubmitState("needs_dockerfile");
        } else if (job.status === "failed") {
          setErrorDetail(job.profile?.error_details || "AI Pipeline analysis failed.");
          setSubmitState("failed");
        } else if (job.status !== "analyzing") {
          setJobProfile(job.profile);
          setSubmitState("ready");
        }
      } catch (e) {
        console.error("Pipeline fallback polling error:", e);
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [submitState, jobId, session?.backend_jwt, api]);

  const handleResolve = useCallback(async (opts: { dockerfile?: File; useAi?: boolean }) => {
    if (!jobId) return;
    setResolving(true);
    try {
      await api.resolveDockerfile(jobId, opts);
      // Clear consumed messages by re-entering detecting state.
      setSubmitState("detecting");
    } catch (e) {
      console.error(e);
      setErrorDetail("Failed to submit resolution. Please try again.");
      setSubmitState("failed");
    } finally {
      setResolving(false);
    }
  }, [jobId, api]);

  const handleLaunch = () => {
    if (jobId) {
      router.push(`/monitor/${jobId}`);
    }
  };

  const steps = messages.filter((m) => m.type === "detection_step");
  const busy = submitState !== "idle";

  return (
    <Page>
      <PageHeader
        title="Submit a job"
        sub="Upload your files. The pipeline detects the workload, builds a container and splits the work into chunks for the network."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {submitState === "idle" && (
            <>
              <section className="panel p-2">
                <div
                  {...getRootProps()}
                  className={`flex cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-14 text-center transition-colors sm:py-20 ${
                    isDragActive
                      ? "border-primary bg-primary-wash"
                      : "border-rule-strong hover:border-ink hover:bg-raised/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center border ${isDragActive ? "border-primary text-primary" : "border-ink text-ink"}`}>
                    <Upload size={20} strokeWidth={1.75} />
                  </div>
                  <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
                    {isDragActive ? "Release to upload" : "Drop files here"}
                  </h2>
                  <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-mute">
                    or click to choose. Accepts <span className="num text-ink-2">.blend .py .ipynb .zip .tar.gz</span>.
                    Hardware is matched automatically.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-1 pt-3">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-2">
                    <input
                      type="checkbox"
                      checked={requiresNetwork}
                      onChange={(e) => setRequiresNetwork(e.target.checked)}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    Job needs public internet access
                  </label>
                  {submitError && <span className="text-sm text-err">{submitError}</span>}
                </div>
              </section>

              <SampleCard
                highlight={highlightSample}
                loading={sampleLoading}
                error={sampleError}
                disabled={!session?.backend_jwt}
                onSubmit={submitSample}
              />
            </>
          )}

          {(submitState === "uploading" || submitState === "detecting") && (
            <Panel
              title={submitState === "uploading" ? "Uploading" : "Pipeline"}
              aside={<StatusPill status="analyzing" label={submitState === "uploading" ? "uploading" : "analyzing"} />}
              bodyClassName=""
            >
              <div className="border-b border-rule px-5 py-6">
                <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
                  {submitState === "uploading" ? "Uploading files" : "Detecting the workload"}
                </h2>
                <p className="mt-1 text-sm text-mute">
                  {submitState === "uploading"
                    ? "Sending your files to object storage."
                    : "Identifying the job type, framework and resources, then preparing a container."}
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex-1">
                    <Meter value={submitState === "uploading" ? uploadProgress : 100} tone="primary" />
                  </div>
                  <span className="num w-12 text-right text-sm">{submitState === "uploading" ? `${uploadProgress}%` : "done"}</span>
                </div>
              </div>
              <ol className="font-mono text-[13px]">
                {steps.map((step, idx, arr) => {
                  const current = idx === arr.length - 1;
                  return (
                    <li key={idx} className="flex items-start gap-3 border-b border-rule px-5 py-2.5 last:border-b-0">
                      {current ? (
                        <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-live motion-reduce:animate-none" />
                      ) : (
                        <Check size={14} className="mt-0.5 shrink-0 text-ok" />
                      )}
                      <span className={current ? "text-ink" : "text-mute"}>{step.detail || step.step}</span>
                    </li>
                  );
                })}
                {messages.length === 0 && (
                  <li className="px-5 py-3 text-mute">Connecting to pipeline…</li>
                )}
              </ol>
            </Panel>
          )}

          {submitState === "ready" && jobProfile && (
            <Panel title="Analysis complete" aside={<StatusPill status="completed" label="ready" />} bodyClassName="">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule px-5 py-6">
                <div>
                  <h2 className="text-[22px] font-semibold capitalize tracking-[-0.02em]">
                    {(jobProfile.type || "workload").replace(/_/g, " ")}
                  </h2>
                  <p className="mt-1 text-sm text-mute">Hardware matched. Chunks are queued for the network.</p>
                </div>
                <div className="text-right">
                  <div className="label">Confidence</div>
                  <div className="num mt-1 text-[28px] leading-none text-ink">
                    {((jobProfile.confidence ?? 0) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2">
                <Spec label="Framework" value={<span className="capitalize">{jobProfile.framework || "automatic"}</span>} />
                <Spec
                  label="Entry file"
                  value={
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <FileBox size={14} className="shrink-0 text-mute" />
                      <span className="truncate">{jobProfile.entry_file}</span>
                    </span>
                  }
                />
                <Spec
                  label="Resources"
                  value={
                    <span className="flex flex-wrap gap-1.5">
                      {jobProfile.gpu_required && <Tag tone="primary">GPU</Tag>}
                      <Tag>{jobProfile.resources?.cpu_cores} vCPU</Tag>
                      <Tag>{jobProfile.resources?.ram_gb} GB RAM</Tag>
                    </span>
                  }
                />
                <Spec label="Job ID" value={<span className="truncate">{jobId}</span>} />
              </dl>
              <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
                <button onClick={() => setSubmitState("idle")} className="btn btn-outline">
                  Back
                </button>
                <button onClick={handleLaunch} className="btn btn-primary">
                  Open live monitor
                  <ArrowRight size={16} />
                </button>
              </div>
            </Panel>
          )}

          {submitState === "needs_dockerfile" && (
            <Panel title="Action needed" aside={<StatusPill status="needs_dockerfile" label="paused" />}>
              <div className="flex items-start gap-3">
                <ShieldAlert size={20} className="mt-0.5 shrink-0 text-warn" />
                <div>
                  <h2 className="text-[20px] font-semibold tracking-[-0.02em]">We couldn&apos;t detect this workload</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{pauseDetail}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="label">Upload a Dockerfile</span>
                  <input
                    type="file"
                    disabled={resolving}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleResolve({ dockerfile: f });
                    }}
                    className="mt-2 block w-full text-sm text-mute file:mr-4 file:h-9 file:cursor-pointer file:rounded-[var(--radius)] file:border file:border-rule-strong file:bg-surface file:px-3 file:text-sm file:text-ink hover:file:border-ink"
                  />
                </label>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-rule" />
                  <span className="label">or</span>
                  <div className="h-px flex-1 bg-rule" />
                </div>

                <button
                  disabled={resolving}
                  onClick={() => handleResolve({ useAi: true })}
                  className="btn btn-primary w-full"
                >
                  {resolving ? "Submitting…" : "Let the AI pipeline generate one"}
                </button>
                <button
                  disabled={resolving}
                  onClick={() => setSubmitState("idle")}
                  className="btn btn-ghost w-full"
                >
                  Cancel
                </button>
              </div>
            </Panel>
          )}

          {submitState === "failed" && (
            <Panel title="Job failed" aside={<StatusPill status="failed" />}>
              <div className="flex items-start gap-3">
                <XCircle size={20} className="mt-0.5 shrink-0 text-err" />
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{errorDetail}</p>
              </div>
              <button
                onClick={() => { setSubmitState("idle"); setUploadProgress(0); }}
                className="btn btn-outline mt-6 w-full"
              >
                Start over
              </button>
            </Panel>
          )}
        </div>

        <aside className="space-y-6">
          <Panel title="Network" aside={<StatusPill status="online" label="live" />} bodyClassName="">
            <dl>
              <Row label="Online nodes" value={clusterStats?.active_nodes ?? 0} />
              <Row label="Jobs completed today" value={clusterStats?.jobs_completed_today ?? 0} />
              <Row label="GPU hours today" value={(clusterStats?.total_gpu_hours_today ?? 0).toFixed?.(1) ?? 0} />
            </dl>
          </Panel>

          <Panel title="What happens next" bodyClassName="">
            <ol className="text-sm">
              {[
                ["Detect", "Type, framework and resources"],
                ["Scan", "Malicious code and miners"],
                ["Containerize", "Pre-verified image or a new build"],
                ["Split", "Frames, ranks, shards or domains"],
                ["Dispatch", "Best-ranked online nodes"],
              ].map(([k, v], i) => (
                <li key={k} className="flex gap-3 border-b border-rule px-5 py-2.5 last:border-b-0">
                  <span className="num w-5 shrink-0 text-xs leading-5 text-mute">{i + 1}</span>
                  <span>
                    <span className="font-medium text-ink">{k}</span>
                    <span className="text-mute"> · {v}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          {busy && submitState !== "failed" && (
            <p className="px-1 text-xs leading-relaxed text-mute">
              You can leave this page. The job keeps running; find it under Monitor.
            </p>
          )}
        </aside>
      </div>
    </Page>
  );
}

function SampleCard({
  highlight,
  loading,
  error,
  disabled,
  onSubmit,
}: {
  highlight: boolean;
  loading: boolean;
  error: string;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <section
      id="sample"
      className={`panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center ${highlight ? "!border-primary" : ""}`}
    >
      <div className="grid w-fit shrink-0 grid-cols-4 gap-[3px] border border-ink bg-canvas p-[5px]" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={`h-3.5 w-3.5 ${i === 6 ? "bg-primary" : "bg-ink"}`} />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">No .blend handy? Use our sample scene</h2>
        <p className="mt-1 text-sm leading-relaxed text-mute">
          A 72-frame animated scene, about 2 minutes on two laptops.
        </p>
        <p className="num mt-1.5 text-[11px] text-mute">{SAMPLE_NAME} · 1.4 MB · 640×360</p>
        {error && <p className="mt-2 text-sm text-err">{error}</p>}
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
        <button type="button" onClick={onSubmit} disabled={loading || disabled} className="btn btn-ink">
          {loading ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <ArrowRight size={16} />}
          {loading ? "Loading sample…" : "Use sample & submit"}
        </button>
        <a href={SAMPLE_URL} download className="btn btn-outline">
          <Download size={16} />
          Download sample
        </a>
      </div>
    </section>
  );
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-b border-rule px-5 py-4 sm:odd:border-r">
      <dt className="label">{label}</dt>
      <dd className="num mt-1.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-rule px-5 py-3 last:border-b-0">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="num text-sm text-ink">{value}</dd>
    </div>
  );
}

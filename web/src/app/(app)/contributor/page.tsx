"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { Plus, RefreshCw, Copy, Check, KeyRound } from "lucide-react";
import { useState } from "react";
import { Page, PageHeader, Panel, Stat, StatRow, StatusPill, Tag, Empty, Loading } from "@/components/kit";

export default function ContributorPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: nodes, isLoading, refetch } = useQuery({
    queryKey: ["my-nodes", session?.backend_jwt],
    queryFn: () => api.getMyNodes(),
    enabled: !!session?.backend_jwt,
    refetchInterval: 10000,
  });

  const { data: earnings } = useQuery({
    queryKey: ["earnings", session?.backend_jwt],
    queryFn: () => api.getEarnings(),
    enabled: !!session?.backend_jwt,
  });

  return (
    <Page>
      <PageHeader
        title="Your nodes"
        sub="Machines you've connected to SpareCycles, and what they've earned."
        actions={
          <Link href="/contributor/register" className="btn btn-primary">
            <Plus size={16} />
            Register node
          </Link>
        }
      />

      <StatRow cols={3} className="mb-6">
        <Stat label="Total earned" value={`$${(earnings?.total_earned || 0).toFixed(2)}`} accent />
        <Stat label="GPU hours contributed" value={(earnings?.total_gpu_hours || 0).toFixed(1)} unit="h" />
        <Stat label="Current rate" value={`$${(earnings?.current_rate_per_hour || 0).toFixed(3)}`} unit="/h" />
      </StatRow>

      <Panel
        title="Nodes"
        aside={
          <>
            {nodes && nodes.length > 0 && <span className="num text-xs">{nodes.length} registered</span>}
            <button onClick={() => refetch()} className="btn btn-ghost h-8 w-8 p-0" aria-label="Refresh nodes">
              <RefreshCw size={14} />
            </button>
          </>
        }
        bodyClassName=""
      >
        {isLoading ? (
          <Loading label="Loading nodes" />
        ) : !nodes || nodes.length === 0 ? (
          <Empty
            title="No nodes registered yet"
            action={
              <Link href="/contributor/register" className="btn btn-outline btn-sm">
                Register your first node
              </Link>
            }
          >
            Install the desktop app on a machine with a spare GPU. It shows up here once it signs in.
          </Empty>
        ) : (
          <div className={`grid grid-cols-1 gap-px bg-rule [&>*]:bg-surface ${nodes.length > 1 ? "lg:grid-cols-2 lg:[&>*:last-child:nth-child(odd)]:col-span-2" : ""}`}>
            {nodes.map((node: any) => (
              <NodeCard key={node.id} node={node} api={api} />
            ))}
          </div>
        )}
      </Panel>
    </Page>
  );
}

function NodeCard({ node, api }: { node: any; api: CampuGridAPI }) {
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOnline = node.status === "online" || node.status === "busy";

  const handleRegenToken = async () => {
    setLoading(true);
    try {
      const res = await api.regenerateNodeToken(node.id);
      setToken(res.node_token);
      setShowToken(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const specs: [string, string][] = [
    ["GPU", node.gpu_model || "—"],
    ["VRAM", `${node.gpu_vram_gb} GB`],
    ["CPU", `${node.cpu_cores} cores`],
    ["RAM", `${node.ram_gb} GB`],
    ["GPU hours", `${node.total_gpu_hours.toFixed(1)} h`],
    ["Node ID", node.id.substring(0, 12)],
  ];

  return (
    <article className="flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <div className="truncate font-mono text-[15px] font-medium text-ink">{node.hostname}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusPill status={isOnline ? node.status : "offline"} />
            {node.gpu_model && <Tag>{node.gpu_model}</Tag>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="label">Earned</div>
          <div className="num mt-1 text-xl text-ink">${node.total_earned.toFixed(2)}</div>
        </div>
      </div>

      <dl className="px-5">
        {specs.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-dashed border-rule py-2 last:border-b-0">
            <dt className="label">{k}</dt>
            <dd className="num min-w-0 truncate text-right text-[13px] text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto border-t border-rule px-5 py-3">
        <button onClick={handleRegenToken} disabled={loading} className="btn btn-ghost btn-sm -ml-3">
          <KeyRound size={13} />
          {loading ? "Generating…" : "Get auth token"}
        </button>
        {showToken && token && (
          <div className="mt-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="label">Node token</span>
              <button onClick={copyToken} className="btn btn-outline btn-sm">
                {copied ? (
                  <>
                    <Check size={13} className="text-ok" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy
                  </>
                )}
              </button>
            </div>
            <code className="num block max-h-20 overflow-y-auto break-all rounded-[2px] border border-rule bg-raised p-2 text-[11px] text-ink-2">
              {token}
            </code>
            <p className="mt-2 text-xs text-mute">Paste this into the SpareCycles desktop app&apos;s setup screen.</p>
          </div>
        )}
      </div>
    </article>
  );
}

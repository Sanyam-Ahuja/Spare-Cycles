"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { useState } from "react";
import { Page, PageHeader, Panel, Stat, StatRow, Tag, Empty, Loading } from "@/components/kit";

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");
  const [activeTab, setActiveTab] = useState<"earnings" | "hours">("earnings");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard-grid", session?.backend_jwt, activeTab],
    queryFn: () => api.getLeaderboard("month", 25),
    enabled: !!session?.backend_jwt,
    refetchInterval: 60000,
  });

  const leaderboard = data?.leaderboard || [];
  const yourRank = data?.your_rank;

  // Sorting based on tab
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (activeTab === "earnings") return b.total_earned - a.total_earned;
    return b.total_gpu_hours - a.total_gpu_hours;
  });

  return (
    <Page>
      <PageHeader
        title="Leaderboard"
        sub="Top contributors on SpareCycles this month."
        actions={
          <div className="inline-flex rounded-[var(--radius)] border border-rule-strong bg-surface p-0.5" role="tablist">
            <TabButton active={activeTab === "earnings"} onClick={() => setActiveTab("earnings")} label="Earnings" />
            <TabButton active={activeTab === "hours"} onClick={() => setActiveTab("hours")} label="GPU hours" />
          </div>
        }
      />

      <StatRow cols={2} className="mb-6">
        <Stat label="Your rank" value={yourRank ? `#${yourRank}` : "—"} accent={!!yourRank} />
        <Stat label="Total nodes" value={leaderboard.length} />
      </StatRow>

      <Panel
        title="Rankings"
        aside={<span className="num text-xs">by {activeTab === "earnings" ? "earnings" : "GPU hours"}</span>}
        bodyClassName=""
      >
        {isLoading ? (
          <Loading label="Loading rankings" />
        ) : sortedLeaderboard.length === 0 ? (
          <Empty title="No contributors yet">Nodes appear here once they complete work.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-ruled">
              <thead>
                <tr>
                  <th className="w-14">Rank</th>
                  <th>Contributor</th>
                  <th>GPU</th>
                  <th className="!text-right">Reliability</th>
                  <th className="!text-right">{activeTab === "earnings" ? "Total earned" : "GPU hours"}</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaderboard.map((entry: any, idx: number) => (
                  <tr key={entry.node_id} className={entry.is_you ? "bg-primary-wash" : ""}>
                    <td>
                      <span
                        className={`num text-[15px] ${
                          idx === 0 ? "font-semibold text-primary" : idx < 3 ? "font-semibold text-ink" : "text-mute"
                        }`}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <span className="max-w-[200px] truncate">{entry.hostname}</span>
                        {entry.is_you && <Tag tone="primary">You</Tag>}
                      </div>
                      <div className="font-mono text-[11px] text-mute">{entry.node_id.substring(0, 12)}</div>
                    </td>
                    <td className="whitespace-nowrap">{entry.gpu_model ? <Tag>{entry.gpu_model}</Tag> : <span className="text-mute">—</span>}</td>
                    <td className="num text-right text-ink-2">{(entry.reliability_score * 100).toFixed(0)}%</td>
                    <td className="num whitespace-nowrap text-right text-ink">
                      {activeTab === "earnings" ? `₹${entry.total_earned.toFixed(2)}` : `${entry.total_gpu_hours.toFixed(1)} h`}
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

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-8 rounded-[2px] px-3 text-[13px] font-medium transition-colors ${
        active ? "bg-ink text-canvas" : "text-ink-2 hover:bg-raised hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

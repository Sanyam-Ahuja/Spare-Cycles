"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { Page, PageHeader, Panel, Stat, StatRow, Tag, Meter, Empty, Loading } from "@/components/kit";

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", session?.backend_jwt],
    queryFn: () => api.getLeaderboard("month", 25),
    enabled: !!session?.backend_jwt,
    refetchInterval: 30000,
  });

  const leaderboard = data?.leaderboard || [];
  const yourRank = data?.your_rank;

  return (
    <Page>
      <PageHeader title="Campus leaderboard" sub="Nodes ranked by contribution this month." />

      {yourRank && (
        <StatRow cols={2} className="mb-6">
          <Stat label="Your rank" value={`#${yourRank}`} accent />
          <Stat label="Nodes ranked" value={leaderboard.length} />
        </StatRow>
      )}

      <Panel title="Rankings" aside={<span className="num text-xs">this month</span>} bodyClassName="">
        {isLoading ? (
          <Loading label="Loading leaderboard" />
        ) : leaderboard.length === 0 ? (
          <Empty title="No contributors yet">Register a node and it will show up here after its first job.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-ruled">
              <thead>
                <tr>
                  <th className="w-14">Rank</th>
                  <th>Node</th>
                  <th>Tier</th>
                  <th className="!text-right">GPU hours</th>
                  <th>Reliability</th>
                  <th className="!text-right">Streak</th>
                  <th className="!text-right">Earned</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry: any) => (
                  <tr key={entry.node_id} className={entry.is_you ? "bg-primary-wash" : ""}>
                    <td>
                      <span
                        className={`num text-[15px] ${
                          entry.rank === 1 ? "font-semibold text-primary" : entry.rank <= 3 ? "font-semibold text-ink" : "text-mute"
                        }`}
                      >
                        {String(entry.rank).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <span className="max-w-[200px] truncate">{entry.hostname}</span>
                        {entry.is_you && <Tag tone="primary">You</Tag>}
                      </div>
                      <div className="font-mono text-[11px] text-mute">{entry.gpu_model}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="text-ink">{entry.tier_name}</span>
                      <span className="num ml-1.5 text-xs text-mute">Lv.{entry.tier_level}</span>
                    </td>
                    <td className="num text-right text-ink">{entry.total_gpu_hours.toFixed(1)}</td>
                    <td>
                      <div className="flex min-w-[120px] items-center gap-2">
                        <div className="w-16">
                          <Meter value={entry.reliability_score} max={1} />
                        </div>
                        <span className="num text-xs text-ink-2">{entry.reliability_score.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="num text-right text-ink-2">{entry.current_streak > 0 ? `${entry.current_streak}d` : "—"}</td>
                    <td className="num text-right text-ink">${entry.total_earned.toFixed(2)}</td>
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

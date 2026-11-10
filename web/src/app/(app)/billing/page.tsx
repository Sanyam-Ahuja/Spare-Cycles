"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { Download, Copy, Check, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Page, PageHeader, Panel, Stat, StatRow, Tag, Empty, Loading } from "@/components/kit";

export default function BillingPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");
  const [showBankModal, setShowBankModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const { data: earnings } = useQuery({
    queryKey: ["billing-earnings", session?.backend_jwt],
    queryFn: () => api.getEarnings(),
    enabled: !!session?.backend_jwt,
  });

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["billing-history", session?.backend_jwt],
    queryFn: () => api.getBillingHistory(1, 20),
    enabled: !!session?.backend_jwt,
  });

  const records = historyData?.records || [];
  const totalSpent = records
    .filter((r: any) => r.role === "customer")
    .reduce((sum: number, r: any) => sum + r.customer_charge, 0);
  const totalEarned = records
    .filter((r: any) => r.role === "contributor")
    .reduce((sum: number, r: any) => sum + r.contributor_credit, 0);

  return (
    <Page>
      <PageHeader title="Billing" sub="Balance, usage and every charge or credit on your account." />

      <StatRow cols={3} className="mb-6">
        <Stat label="Available balance" value={`₹${(totalEarned - totalSpent).toFixed(2)}`} accent hint="Spendable on jobs" />
        <Stat label="Total spent" value={`₹${totalSpent.toFixed(2)}`} hint="Lifetime usage" />
        <Stat label="Total earned" value={`₹${totalEarned.toFixed(2)}`} hint="Contributor credit" />
      </StatRow>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Earnings" className="lg:col-span-2" bodyClassName="">
          <div className="grid grid-cols-2 gap-px bg-rule sm:grid-cols-4 [&>*]:bg-surface">
            <Stat label="GPU hours" value={(earnings?.total_gpu_hours || 0).toFixed(1)} unit="h" />
            <Stat label="Transactions" value={historyData?.total || 0} />
            <Stat label="Nodes" value={earnings?.nodes?.length || 0} />
            <Stat label="Current rate" value={`₹${(earnings?.current_rate_per_hour || 0).toFixed(2)}`} unit="/h" />
          </div>
        </Panel>

        <Panel title="Contribute" bodyClassName="flex flex-col gap-4 p-5">
          <p className="text-sm leading-relaxed text-ink-2">
            Run the desktop app on an idle machine and earn credit for every GPU hour it serves.
          </p>
          <Link href="/contributor" className="link inline-flex items-center gap-1 text-sm">
            Become a contributor <ArrowUpRight size={13} />
          </Link>
        </Panel>
      </div>

      <Panel
        title="Transactions"
        aside={
          <button className="btn btn-outline btn-sm">
            <Download size={14} />
            Export CSV
          </button>
        }
        bodyClassName=""
      >
        {isLoading ? (
          <Loading label="Loading transactions" />
        ) : records.length === 0 ? (
          <Empty title="No transactions yet">Charges for jobs and credits for contributed hours show up here.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-ruled">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Job</th>
                  <th>Role</th>
                  <th>GPU time</th>
                  <th className="!text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record: any) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap text-mute">
                      {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                    </td>
                    <td className="num text-[13px] text-ink">{record.job_id.substring(0, 12)}</td>
                    <td>
                      <Tag tone={record.role === "contributor" ? "primary" : "plain"}>{record.role}</Tag>
                    </td>
                    <td className="num whitespace-nowrap text-ink-2">{record.gpu_hours.toFixed(2)} h</td>
                    <td className={`num whitespace-nowrap text-right ${record.role === "contributor" ? "text-ok" : "text-ink"}`}>
                      {record.role === "contributor" ? "+" : "-"}₹
                      {Math.abs(record.role === "contributor" ? record.contributor_credit : record.customer_charge).toFixed(2)}
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

function BankField({ label, value, onCopy, copied, isMono }: any) {
  return (
    <div className="flex items-center justify-between border-b border-rule px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="label mb-0.5">{label}</div>
        <div className={`truncate text-ink ${isMono ? "num" : ""}`}>{value}</div>
      </div>
      <button onClick={onCopy} className="btn btn-ghost h-8 w-8 p-0" aria-label={`Copy ${label}`}>
        {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

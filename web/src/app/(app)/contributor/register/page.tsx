"use client";

import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { Page, PageHeader, Panel } from "@/components/kit";

const STEPS: { title: string; body: string }[] = [
  { title: "Download and install", body: "Linux (.AppImage, .deb, .rpm). On Windows, build it from source. Docker must be installed and running." },
  { title: "Paste your connection token", body: "Copy the token from your Dashboard and paste it into the app. It registers this machine to your account." },
  { title: "Start contributing", body: "GPU, CPU, RAM and CUDA version are detected automatically. Press the power button to go online." },
];

export default function RegisterNodePage() {
  return (
    <Page className="max-w-3xl">
      <Link href="/contributor" className="link mb-6 inline-flex items-center gap-2 text-sm">
        <ArrowLeft size={14} /> Back to your nodes
      </Link>

      <PageHeader
        title="Register a node"
        sub="Nodes join through the SpareCycles desktop app. It reads your hardware, so there is nothing to fill in here."
      />

      <Panel title="Setup" bodyClassName="">
        <ol>
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 border-b border-rule px-5 py-4 last:border-b-0">
              <span className="num w-6 shrink-0 pt-0.5 text-sm text-mute">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="text-[15px] font-medium text-ink">{step.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-mute">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3 border-t border-rule px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="num text-xs text-mute">v0.1.0 · ~6 MB · requires Docker</span>
          <div className="flex flex-wrap gap-2">
            <a href="/downloads/sparecycles-node_0.1.0_amd64.deb" download className="btn btn-primary">
              <Download size={16} />
              Linux .deb
            </a>
            <a href="/downloads/sparecycles-node-0.1.0-1.x86_64.rpm" download className="btn btn-ghost">
              <Download size={16} />
              Linux .rpm
            </a>
          </div>
        </div>
      </Panel>
    </Page>
  );
}

import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const C = {
  bg: "#09090b", surface: "#121217", surfaceHi: "#18181f",
  border: "#1e1e24", primary: "#10b981", secondary: "#34d399",
  success: "#10b981", danger: "#ef4444", warning: "#f59e0b",
  text: "#f8fafc", muted: "#64748b",
};

export default function Dashboard({ isActive, toggleActive, hwProfile }: any) {
  const [telemetry, setTelemetry] = useState<any[]>([]);

  useEffect(() => {
    const unlisten = listen("telemetry", (e: any) => {
      setTelemetry(prev => {
        const next = [...prev, { ...e.payload, t: Date.now() }];
        return next.length > 30 ? next.slice(-30) : next;
      });
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  const latest = telemetry.length > 0 ? telemetry[telemetry.length - 1] : { gpu_load: 0, temp: 0, vram_percent: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, animation: "fadeIn 0.35s ease", paddingBottom: 40 }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.025em" }}>
            Node Dashboard
          </h1>
          <p style={{ margin: "6px 0 0", color: C.muted, fontSize: "0.875rem" }}>
            Manage your active contribution to the SpareCycles network.
          </p>
        </div>

        {/* Big power button */}
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: "0 0 8px", fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
            Node Status
          </p>
          <button
            onClick={toggleActive}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 24px", borderRadius: 14, border: "none", cursor: "pointer",
              background: isActive
                ? `linear-gradient(135deg, ${C.danger}, #dc2626)`
                : `linear-gradient(135deg, ${C.success}, #16a34a)`,
              color: "#fff", fontWeight: 700, fontSize: "1rem",
              boxShadow: isActive ? `0 8px 24px ${C.danger}40` : `0 8px 24px ${C.success}40`,
              transition: "all 0.25s",
              animation: isActive ? "pulseGlow 2s ease infinite" : "none",
            }}
          >
            <PowerSvg />
            {isActive ? "Stop Node" : "Start Earning"}
          </button>
        </div>
      </div>

      {/* Main row: chart + side stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 20 }}>

        {/* Telemetry card */}
        <div style={{
          background: C.surface, borderRadius: 20, padding: 28,
          border: `1px solid ${C.border}`,
          borderTop: `3px solid ${C.primary}`,
          position: "relative", overflow: "hidden",
          boxShadow: `0 4px 32px rgba(0,0,0,0.5)`,
        }}>
          {/* Ambient glow */}
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: 180, height: 180,
            background: `${C.primary}0d`,
            borderRadius: "50%", filter: "blur(50px)",
            pointerEvents: "none",
          }} />

          <h2 style={{ margin: "0 0 24px", fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
            Live Telemetry
          </h2>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 24 }}>
            <TelStat label="GPU Load" value={`${latest.gpu_load}%`} color={C.primary} />
            <TelStat label="Temperature" value={`${latest.temp}°C`} color={C.warning} />
            <TelStat label="VRAM Usage" value={`${latest.vram_percent}%`} color={C.secondary} />
          </div>

          {/* Chart */}
          <div style={{ height: 120, marginLeft: -16 }}>
            {telemetry.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetry}>
                  <defs>
                    <linearGradient id="gGpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gVram" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, color: C.text }}
                    labelStyle={{ display: "none" }}
                  />
                  <Area type="monotone" dataKey="gpu_load"    stroke={C.primary}   fill="url(#gGpu)"  strokeWidth={2} dot={false} animationDuration={200} />
                  <Area type="monotone" dataKey="vram_percent" stroke={C.secondary} fill="url(#gVram)" strokeWidth={2} dot={false} animationDuration={200} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px dashed ${C.border}`, borderRadius: 12, color: C.muted, fontSize: "0.8rem"
              }}>
                {isActive ? "Waiting for telemetry…" : "Activate node to see live stats"}
              </div>
            )}
          </div>
        </div>

        {/* Side cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ flex: 1 }}>
            <Label>Total Earnings</Label>
            <div style={{ color: `${C.success}cc`, fontWeight: 700, fontSize: "0.95rem", margin: "4px 0 4px" }}>
              Check Web Dashboard
            </div>
            <small style={{ color: C.muted, fontSize: "0.72rem" }}>Balance synced to your account</small>
          </Card>

          <Card style={{ flex: 1 }}>
            <Label>Platform Trust</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 4px" }}>
              <span style={{ fontSize: "1.75rem" }}>🛡</span>
              <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>99.8%</span>
            </div>
            <small style={{ color: C.muted, fontSize: "0.72rem" }}>High reliability · Priority routing</small>
          </Card>
        </div>
      </div>

      {/* Hardware profile */}
      <div style={{ background: C.surface, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>Hardware Profile</h3>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16,
          background: C.bg, borderRadius: 12, padding: 16, border: `1px solid ${C.border}`,
          fontSize: "0.8rem",
        }}>
          <HwItem label="OS"          value={hwProfile?.os ?? "—"} />
          <HwItem label="CPU Cores"   value={hwProfile ? String(hwProfile.cpu_cores) : "—"} />
          <HwItem label="System RAM"  value={hwProfile ? `${hwProfile.ram_gb?.toFixed(1)} GB` : "—"} />
          <HwItem label="CUDA"        value={hwProfile?.cuda_version ?? "N/A"} />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────
function Card({ children, style }: any) {
  return (
    <div style={{
      background: C.surface, borderRadius: 16, padding: 20,
      border: `1px solid ${C.border}`,
      boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column",
      ...(style ?? {}),
    }}>
      {children}
    </div>
  );
}

function Label({ children }: any) {
  return <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{children}</p>;
}

function TelStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ borderLeft: `2px solid ${color}30`, paddingLeft: 16 }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.8rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function HwItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ color: C.muted, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function PowerSvg() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"/>
      <line x1="12" y1="2" x2="12" y2="12"/>
    </svg>
  );
}

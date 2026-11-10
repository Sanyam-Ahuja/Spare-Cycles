import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Dashboard from "./Dashboard";
import WorkloadView from "./WorkloadView";
import SettingsView from "./SettingsView";
import SetupView from "./SetupView";

// ── Design tokens (no Tailwind needed) ──────────────────────────────
const C = {
  bg: "#09090b",
  surface: "#121217",
  surfaceHi: "#18181f",
  border: "#1e1e24",
  primary: "#10b981",
  secondary: "#34d399",
  success: "#10b981",
  danger: "#ef4444",
  text: "#f8fafc",
  muted: "#64748b",
};

type Tab = "dashboard" | "workload" | "history" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isActive, setIsActive] = useState(false);
  const [hwProfile, setHwProfile] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    invoke("has_credentials").then((has: any) => setIsSetup(!!has)).catch(() => setIsSetup(false));
    invoke("is_node_active").then((active: any) => setIsActive(!!active)).catch(console.error);
    invoke("get_hardware_profile").then((res: any) => setHwProfile(res)).catch(console.error);

    const unWs = listen("ws_status", (e: any) => setWsStatus(e.payload.status));
    const unJob = listen("job_dispatch", (e: any) => {
      setCurrentJob(e.payload);
      setActiveTab("workload");
    });
    return () => { unWs.then(f => f()); unJob.then(f => f()); };
  }, []);

  const toggleActive = async () => {
    try { const s = await invoke("toggle_active"); setIsActive(s as boolean); }
    catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    try {
      await invoke("clear_credentials");
      setIsSetup(false);
      setIsActive(false);
      setCurrentJob(null);
      setWsStatus("disconnected");
    } catch (e) { console.error(e); }
  };

  const handleSetupComplete = () => {
    setIsSetup(true);
    invoke("restart_websocket").catch(console.error);
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (isSetup === null) return (
    <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.muted, fontSize: 13 }}>Loading…</div>
    </div>
  );

  // ── Setup ────────────────────────────────────────────────────────
  if (!isSetup) return (
    <div style={{ height: "100vh", background: C.bg, color: C.text, overflowY: "auto" }}>
      <SetupView onComplete={handleSetupComplete} />
    </div>
  );

  const connected = wsStatus === "connected";

  // ── Main app ─────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter','SF Pro Display',-apple-system,sans-serif", overflow: "hidden" }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div style={{
        width: 64, flexShrink: 0,
        background: `${C.surface}cc`,
        backdropFilter: "blur(20px)",
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "20px 0", gap: 8,
        position: "relative", zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 16px ${C.primary}40`,
          marginBottom: 12,
        }}>
          <span style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>C</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, width: "100%", padding: "0 8px" }}>
          {([
            ["dashboard", DashIcon, false],
            ["workload",  CpuIcon,  !!currentJob],
            ["history",   ClockIcon, false],
            ["settings",  GearIcon, false],
          ] as [Tab, () => React.ReactElement, boolean][]).map(([tab, Icon, badge]) => (
            <NavBtn key={tab} active={activeTab === tab} badge={badge} onClick={() => setActiveTab(tab)}>
              <Icon />
            </NavBtn>
          ))}
        </nav>

        {/* Power toggle */}
        <button
          onClick={toggleActive}
          title={isActive ? "Stop Node" : "Start Earning"}
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isActive ? C.success : "rgba(255,255,255,0.08)",
            color: isActive ? "#fff" : C.muted,
            boxShadow: isActive ? `0 0 16px ${C.success}55` : "none",
            transition: "all 0.25s",
          }}
        >
          <PowerIcon />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sign out"
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent",
            color: C.muted,
            marginBottom: 4,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
        >
          <LogoutIcon />
        </button>
      </div>

      {/* ── Main area ───────────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Status bar */}
        <div
          data-tauri-drag-region
          style={{
            height: 36, flexShrink: 0,
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            padding: "0 16px", gap: 16,
            fontSize: 11.5, fontWeight: 500, color: C.muted,
          }}
        >
          {hwProfile && (
            <span style={{ borderRight: `1px solid ${C.border}`, paddingRight: 16 }}>
              🖥 {hwProfile.gpu_model} · {hwProfile.gpu_vram_gb?.toFixed(1)} GB
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: connected ? C.success : C.danger,
              boxShadow: connected ? `0 0 8px ${C.success}` : "none",
              display: "inline-block",
            }} />
            {connected ? "Connected to Grid" : "Disconnected"}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
          <div style={{ display: activeTab === "dashboard" ? "block" : "none" }}>
            <Dashboard isActive={isActive} toggleActive={toggleActive} hwProfile={hwProfile} />
          </div>
          <div style={{ display: activeTab === "workload" ? "block" : "none" }}>
            <WorkloadView currentJob={currentJob} />
          </div>
          {activeTab === "history"   && <JobHistory />}
          {activeTab === "settings"  && <SettingsView />}
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────
function NavBtn({ active, badge, onClick, children }: { active: boolean; badge: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", aspectRatio: "1", borderRadius: 10, border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
      background: active ? `${C.primary}22` : "transparent",
      color: active ? C.primary : C.muted,
      outline: active ? `1px solid ${C.primary}44` : "none",
      transition: "all 0.2s",
    }}>
      {children}
      {badge && !active && (
        <span style={{
          position: "absolute", top: 6, right: 6,
          width: 7, height: 7, borderRadius: "50%",
          background: C.success, boxShadow: `0 0 6px ${C.success}`,
        }} />
      )}
    </button>
  );
}

function JobHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke("fetch_node_history")
      .then((res: any) => {
        setHistory(res?.history || []);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to fetch history:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ animation: "fadeIn 0.35s ease" }}>
      <header style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Job History</h1>
        <p style={{ color: C.muted, marginTop: 6, fontSize: "0.875rem" }}>Your past contributions to the SpareCycles network.</p>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.muted }}>Loading...</div>
      ) : history.length === 0 ? (
        <div style={{
          borderRadius: 20, padding: "48px 24px", textAlign: "center",
          background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div>
          <p style={{ color: C.muted, margin: 0 }}>No completed jobs yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {history.map((h, i) => (
            <div key={i} style={{
              background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
              padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                  {h.job_type === "render" ? "Blender Render" : "AI Workflow"} <span style={{ color: C.muted, fontWeight: 400, marginLeft: 8 }}>#{h.chunk_id.split("-")[0]}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: C.muted }}>
                  {new Date(h.completed_at).toLocaleString()} · {h.duration_seconds.toFixed(1)}s elapsed
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: C.success, fontWeight: 600, fontSize: "1.1rem" }}>+${h.earned.toFixed(4)}</div>
                <div style={{ color: C.muted, fontSize: "0.75rem" }}>Credit</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline SVG icons ─────────────────────────────────────────────────
const iconProps = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function DashIcon() { return <svg {...iconProps}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function CpuIcon()  { return <svg {...iconProps}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>; }
function ClockIcon(){ return <svg {...iconProps}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>; }
function GearIcon() { return <svg {...iconProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function PowerIcon(){ return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"/><line x1="12" y1="2" x2="12" y2="12"/></svg>; }
function LogoutIcon(){ return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

const C_EXPORT = C;
export { C_EXPORT as DesignTokens };

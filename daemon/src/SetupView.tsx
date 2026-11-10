import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CheckCircle2, AlertCircle, Cpu, Loader2, Zap, Shield, Terminal } from "lucide-react";

interface GpuSetupStatus {
  nvidia_gpu_detected: boolean;
  gpu_model: string;
  toolkit_installed: boolean;
  toolkit_version: string;
  docker_gpu_runtime: boolean;
  fully_ready: boolean;
  distro_family: string;
  install_command: string;
  configure_command: string;
}

interface SetupViewProps {
  onComplete: () => void;
}

export default function SetupView({ onComplete }: SetupViewProps) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "detecting" | "registering" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [detectedHw, setDetectedHw] = useState<any>(null);

  // GPU setup state
  const [gpuStatus, setGpuStatus] = useState<GpuSetupStatus | null>(null);
  const [gpuChecking, setGpuChecking] = useState(true);
  const [gpuInstalling, setGpuInstalling] = useState(false);
  const [gpuConfiguring, setGpuConfiguring] = useState(false);
  const [gpuError, setGpuError] = useState("");
  const [gpuSuccess, setGpuSuccess] = useState("");

  // Check GPU setup on mount
  useEffect(() => {
    checkGpu();
  }, []);

  const checkGpu = async () => {
    setGpuChecking(true);
    setGpuError("");
    try {
      const status = await invoke<GpuSetupStatus>("check_gpu_setup");
      setGpuStatus(status);
    } catch (e: any) {
      setGpuError(e?.toString() || "Failed to check GPU status");
    }
    setGpuChecking(false);
  };

  const handleInstallToolkit = async () => {
    setGpuInstalling(true);
    setGpuError("");
    setGpuSuccess("");
    try {
      const result = await invoke<string>("install_gpu_toolkit");
      setGpuSuccess(result);
      // Re-check after install
      await checkGpu();
      // If toolkit installed but docker not configured, auto-configure
      const newStatus = await invoke<GpuSetupStatus>("check_gpu_setup");
      if (newStatus.toolkit_installed && !newStatus.docker_gpu_runtime) {
        await handleConfigureDocker();
      }
    } catch (e: any) {
      setGpuError(e?.toString() || "Installation failed");
    }
    setGpuInstalling(false);
  };

  const handleConfigureDocker = async () => {
    setGpuConfiguring(true);
    setGpuError("");
    setGpuSuccess("");
    try {
      const result = await invoke<string>("configure_docker_gpu");
      setGpuSuccess(result);
      await checkGpu();
    } catch (e: any) {
      setGpuError(e?.toString() || "Configuration failed");
    }
    setGpuConfiguring(false);
  };

  const handleSubmit = async () => {
    if (!token.trim()) {
      setError("Connection token is required.");
      return;
    }

    setError("");
    setStatus("detecting");

    try {
      const hw: any = await invoke("get_hardware_profile");
      setDetectedHw(hw);

      setStatus("registering");
      const regResult: any = await invoke("auto_register_node", {
        userToken: token.trim(),
        hwProfile: hw,
      });

      if (!regResult.success) {
        setError(regResult.error || "Node registration failed.");
        setStatus("error");
        return;
      }

      await invoke("save_credentials", {
        nodeId: regResult.node_id,
        token: regResult.node_token,
      });

      setStatus("success");
      setTimeout(() => onComplete(), 1500);
    } catch (e: any) {
      setError(e?.toString() || "Something went wrong.");
      setStatus("error");
    }
  };

  const statusMessages: Record<string, string> = {
    detecting: "Detecting hardware...",
    registering: "Registering node on the grid...",
    success: "Connected! Starting daemon...",
  };

  // GPU status rendering helper
  const renderGpuSetup = () => {
    if (gpuChecking) {
      return (
        <div className="bg-[#12121a] border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center gap-3 text-sm text-[#64748b]">
            <Loader2 size={16} className="animate-spin text-[#10b981]" />
            Checking GPU & Docker setup...
          </div>
        </div>
      );
    }

    if (!gpuStatus) return null;

    // No NVIDIA GPU at all — just show info, no action needed
    if (!gpuStatus.nvidia_gpu_detected) {
      return (
        <div className="bg-[#12121a] border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-[#64748b]" />
            <span className="text-sm font-medium text-[#64748b]">CPU-Only Mode</span>
          </div>
          <p className="text-xs text-[#475569]">
            No NVIDIA GPU detected. Your node will contribute CPU compute only. GPU passthrough is not available.
          </p>
        </div>
      );
    }

    // GPU detected — check toolkit & docker config
    if (gpuStatus.fully_ready) {
      return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">GPU Ready</span>
          </div>
          <div className="text-xs text-[#94a3b8] space-y-0.5">
            <div>GPU: <span className="text-white font-medium">{gpuStatus.gpu_model}</span></div>
            <div>Toolkit: <span className="text-white">{gpuStatus.toolkit_version}</span></div>
            <div>Docker nvidia runtime: <span className="text-emerald-400">Active</span></div>
          </div>
        </div>
      );
    }

    // GPU detected but setup incomplete
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">GPU Setup Required</span>
        </div>

        <div className="text-xs text-[#94a3b8] space-y-1">
          <div className="flex items-center gap-2">
            {gpuStatus.nvidia_gpu_detected ? (
              <CheckCircle2 size={12} className="text-emerald-400" />
            ) : (
              <AlertCircle size={12} className="text-red-400" />
            )}
            <span>NVIDIA GPU: {gpuStatus.gpu_model || "Not detected"}</span>
          </div>
          <div className="flex items-center gap-2">
            {gpuStatus.toolkit_installed ? (
              <CheckCircle2 size={12} className="text-emerald-400" />
            ) : (
              <AlertCircle size={12} className="text-amber-400" />
            )}
            <span>Container Toolkit: {gpuStatus.toolkit_installed ? gpuStatus.toolkit_version : "Not installed"}</span>
          </div>
          <div className="flex items-center gap-2">
            {gpuStatus.docker_gpu_runtime ? (
              <CheckCircle2 size={12} className="text-emerald-400" />
            ) : (
              <AlertCircle size={12} className="text-amber-400" />
            )}
            <span>Docker nvidia runtime: {gpuStatus.docker_gpu_runtime ? "Active" : "Not configured"}</span>
          </div>
        </div>

        {gpuError && (
          <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
            {gpuError}
          </div>
        )}

        {gpuSuccess && (
          <div className="text-xs text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2">
            {gpuSuccess}
          </div>
        )}

        {/* Auto-install button */}
        {!gpuStatus.toolkit_installed && (
          <button
            onClick={handleInstallToolkit}
            disabled={gpuInstalling}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {gpuInstalling ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Installing... (System password required)
              </>
            ) : (
              <>
                <Shield size={14} />
                Install NVIDIA Container Toolkit
              </>
            )}
          </button>
        )}

        {/* Configure Docker button (toolkit installed but runtime not configured) */}
        {gpuStatus.toolkit_installed && !gpuStatus.docker_gpu_runtime && (
          <button
            onClick={handleConfigureDocker}
            disabled={gpuConfiguring}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#10b981] to-[#34d399] text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {gpuConfiguring ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Configuring Docker...
              </>
            ) : (
              <>
                <Terminal size={14} />
                Configure Docker for GPU
              </>
            )}
          </button>
        )}

        {/* Re-check button */}
        <button
          onClick={checkGpu}
          className="w-full py-2 rounded-lg border border-[#1e293b] text-[#64748b] text-xs hover:border-[#10b981] hover:text-[#10b981] transition-all"
        >
          Re-check GPU Status
        </button>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center h-full min-h-[500px] p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#10b981] to-[#34d399] flex items-center justify-center shadow-lg shadow-[#10b981]/30 mb-4">
            <span className="font-bold text-white text-2xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">SpareCycles</h1>
          <p className="text-[#64748b] mt-2 text-sm">
            Sign in to start contributing your compute power.
          </p>
        </div>

        {/* GPU Setup Status */}
        {renderGpuSetup()}

        {/* Hardware Auto-Detection Notice */}
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#10b981] mb-1 flex items-center gap-2">
            <Cpu size={14} /> Automatic Setup
          </h3>
          <p className="text-xs text-[#64748b]">
            Your GPU, CPU, RAM, and CUDA version will be detected automatically. Just sign in and we handle the rest.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Connection Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the JWT token from your web dashboard"
              className="w-full px-4 py-4 rounded-xl bg-[#0a0a0f] border border-[#1e293b] text-white placeholder:text-[#475569] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all font-mono text-sm"
            />
          </div>

          {/* Status Progress */}
          {status !== "idle" && status !== "error" && (
            <div className="flex items-center gap-3 text-sm bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl px-4 py-3">
              {status === "success" ? (
                <CheckCircle2 size={16} className="text-green-400" />
              ) : (
                <Loader2 size={16} className="text-[#10b981] animate-spin" />
              )}
              <span className={status === "success" ? "text-green-400" : "text-[#10b981]"}>
                {statusMessages[status]}
              </span>
            </div>
          )}

          {/* Detected Hardware Display */}
          {detectedHw && status !== "idle" && (
            <div className="p-3 bg-[#12121a] rounded-xl border border-[#1e293b] text-xs space-y-1">
              <div className="text-[#64748b]">Detected: <span className="text-white font-medium">{detectedHw.gpu_model}</span> • {detectedHw.gpu_vram_gb.toFixed(1)} GB VRAM</div>
              <div className="text-[#64748b]">{detectedHw.cpu_cores} CPU cores • {detectedHw.ram_gb.toFixed(1)} GB RAM • {detectedHw.os}</div>
              <div className="text-[#64748b]">Docker GPU: {detectedHw.docker_gpu_ready ? <span className="text-emerald-400">✓ Ready</span> : <span className="text-amber-400">✗ Not available</span>}</div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={status === "detecting" || status === "registering" || status === "success"}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#34d399] text-white font-bold hover:opacity-90 shadow-lg shadow-[#10b981]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "idle" || status === "error"
              ? "Verify & Connect Node"
              : statusMessages[status]
            }
          </button>
        </div>
      </div>
    </div>
  );
}

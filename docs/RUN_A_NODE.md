# Running a SpareCycles node (Linux & Windows)

A node is the desktop daemon in `daemon/` (Tauri). It keeps a WebSocket open to
`wss://sparecycles.sahuja.in`, receives chunks and runs them in local Docker
containers. The production server URL is compiled in, so there is nothing to configure.

## 0. Before you start (both OSes)

1. **Pair with the new server.** Sign in at https://sparecycles.sahuja.in (Google),
   open **Dashboard** and copy the **connection token**.
2. **Clear credentials from an old deployment** if this machine was a node before
   (the old node ID doesn't exist on the new server, so the app would keep being rejected):
   - Linux: `rm -f ~/.local/share/com.samito.daemon/{node_id,auth_token}.txt`
   - Windows (PowerShell): `Remove-Item "$env:APPDATA\com.samito.daemon\*.txt"`
3. **Pre-pull the Blender image** (about 1.5 GB) so the first judge's render doesn't wait for it:
   `docker pull lscr.io/linuxserver/blender:latest`
4. **Never sleep.** The node must stay awake with the lid closed (see the per-OS notes below).

## Linux

**Docker.** The daemon runs the `docker` CLI.
- Docker Engine: install it and make sure your user can run `docker ps` without sudo
  (`sudo usermod -aG docker $USER`, then log out and back in).
- Fedora / Silverblue with podman: install the `docker` shim and enable the socket:
  ```bash
  sudo dnf install podman-docker          # Silverblue: rpm-ostree install podman-docker && reboot
  systemctl --user enable --now podman.socket
  export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
  docker ps                                # must work
  ```
- NVIDIA GPU (optional, renders fall back to CPU without it): working driver (`nvidia-smi`)
  plus `nvidia-container-toolkit`. For podman, generate CDI once:
  `sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml`.
  The app's setup screen can also install the toolkit for you.

**Run the app.** Use one of these:
- Prebuilt bundle from `daemon/src-tauri/target/release/bundle/`:
  `appimage/*.AppImage` (any distro: `chmod +x` and run), `deb/*.deb` or `rpm/*.rpm`.
- From source:
  ```bash
  # build deps (Fedora): webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel gcc
  # build deps (Ubuntu): libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev build-essential
  cd daemon && npm install && npm run tauri dev
  ```

**Keep it awake** (lid closed, screen off):
```bash
systemd-inhibit --what=sleep:idle:handle-lid-switch --why="SpareCycles node" ./SpareCycles*.AppImage
```
Or set *Power → Automatic suspend: Off* and lid-close action to *Do nothing*
(`HandleLidSwitch=ignore` in `/etc/systemd/logind.conf`).

## Windows 10/11

1. **Docker Desktop** with the WSL 2 backend. Start it and wait for "Engine running";
   `docker ps` must work in PowerShell. For NVIDIA GPUs, a current Game Ready/Studio driver
   is enough (Docker Desktop passes `--gpus all` through WSL 2).
2. **Build tools** (one time):
   - Node.js 20 LTS: https://nodejs.org
   - Rust: https://rustup.rs (default `x86_64-pc-windows-msvc`)
   - Visual Studio Build Tools → "Desktop development with C++"
   - WebView2 is already on Windows 10/11.
3. **Run.** Copy the repo's `daemon/` folder to the machine, then in PowerShell:
   ```powershell
   cd daemon
   npm install
   npm run tauri dev            # runs the app directly
   # or build an installer:  npm run tauri build   → src-tauri\target\release\bundle\nsis\*.exe
   ```
4. **Keep it awake.** *Settings → System → Power*: Sleep **Never** (plugged in);
   *Control Panel → Power Options → Choose what closing the lid does*: **Do nothing**.

## Using the app

1. Paste the connection token and press **Connect**. The app detects CPU/RAM/GPU and registers the node.
2. Press the power button to go **online**. The node sends a heartbeat every 10 s; the
   web dashboard and the admin page should show it as online.
3. Leave it running. The app reconnects by itself after Wi-Fi drops or a server restart.
   If a node is silent for 90 s, the watchdog marks it offline and requeues its chunk on another node.

## Quick check

With both nodes online, open https://sparecycles.sahuja.in/submit and press
**Use sample & submit**. The 72-frame sample splits into one chunk per online node
plus an assembly chunk, and an MP4 is ready in about 2–4 minutes on CPU.

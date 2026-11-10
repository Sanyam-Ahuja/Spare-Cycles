#!/usr/bin/env bash
# Deploy SpareCycles (CampusGrid) to the GCP VM: single VM, Docker Compose, Caddy HTTPS.
#   ./gcp_deploy.sh              copy code, (first run) create secrets, build + migrate + restart
#   ./gcp_deploy.sh web          same, but only rebuild/restart the web app
# Run from the repo root. Needs gcloud logged in with access to the project.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-1bf1c3f9-bddb-4f10-b33}"
ZONE="${ZONE:-asia-south1-a}"
VM_NAME="${VM_NAME:-campusgrid-vm}"
REMOTE_DIR="campusgrid"
BUCKET="${BUCKET:-campusgrid-deploy-1bf1c3f9}"
GCLOUD="${GCLOUD:-gcloud}"
ONLY="${1:-}"

# Plain ssh/scp with gcloud's key: `gcloud compute ssh/scp` can hang after the
# remote command finishes. Run `gcloud compute ssh campusgrid-vm` once first so
# the key is installed and the host key recorded.
VM_IP="$("$GCLOUD" compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='value(networkInterfaces[0].accessConfigs[0].natIP)')"
VM_ID="$("$GCLOUD" compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='value(id)')"
SSH_OPTS=(-i ~/.ssh/google_compute_engine -o UserKnownHostsFile=~/.ssh/google_compute_known_hosts
          -o HostKeyAlias="compute.${VM_ID}" -o StrictHostKeyChecking=accept-new)
vm() { ssh "${SSH_OPTS[@]}" "${USER}@${VM_IP}" "$1"; }

cd "$(dirname "$0")"

echo "==> Copying code to ${VM_NAME}:~/${REMOTE_DIR}"
# Replace the code completely so deleted files don't linger; .env stays on the VM.
vm "mkdir -p ~/${REMOTE_DIR} && rm -rf ~/${REMOTE_DIR}/server ~/${REMOTE_DIR}/web"
TARBALL="$(mktemp -t campusgrid-XXXX.tgz)"
trap 'rm -f "$TARBALL"' EXIT
tar --exclude='node_modules' --exclude='.next' --exclude='.venv' --exclude='__pycache__' \
    --exclude='.env' --exclude='test-results' --exclude='playwright-report' \
    --exclude='server/celerybeat-schedule' \
    -czf "$TARBALL" server web infra docker-compose.prod.yml Caddyfile.prod deploy.sh vm_secrets.sh
# Bulk uploads over ssh stall on some networks, so the code goes through a
# private bucket (HTTPS) that the VM's service account can read.
"$GCLOUD" storage cp "$TARBALL" "gs://${BUCKET}/src.tgz" --quiet
vm "gcloud storage cp gs://${BUCKET}/src.tgz /tmp/campusgrid-src.tgz --quiet && tar -xzf /tmp/campusgrid-src.tgz -C ~/${REMOTE_DIR} && rm /tmp/campusgrid-src.tgz"

if [ "$ONLY" = "web" ]; then
  vm "set -e; cd ~/${REMOTE_DIR}
sudo docker compose -f docker-compose.prod.yml up -d --build web
sudo docker compose -f docker-compose.prod.yml ps"
else
  vm "set -e; cd ~/${REMOTE_DIR}
bash vm_secrets.sh
sudo bash deploy.sh"
fi
echo "==> Done: https://sparecycles.sahuja.in"

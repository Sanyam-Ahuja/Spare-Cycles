# CampuGrid

A distributed peer-to-peer compute platform for campus hardware. **Customers** upload a workload (Blender scene, Python/ML script, data job, simulation) through a web app; the server analyses it with an AI pipeline, packages it into a Docker container, splits it into **chunks**, and dispatches those chunks over WebSockets to **contributor nodes**: student and lab machines running a Tauri desktop daemon that executes them in local Docker. Results are merged by an assembler and returned to the customer. Contributors earn credits.

> Diagrams of the topology, the AI pipeline sequence, and the watchdog state machine are in [`docs/architecture.md`](docs/architecture.md).

---

## Repository layout

```
CampusGrid-main/
├── server/                 # Control plane: FastAPI + Celery (Python 3.11)
├── web/                    # Customer/contributor web app: Next.js (App Router)
├── daemon/                 # Contributor node desktop app: Tauri 2 (Rust) + React/Vite
├── client/scripts/         # mock_daemon.py, a fake contributor node for testing
├── infra/                  # Local dev infrastructure (docker-compose, Caddy, Prometheus)
├── docs/architecture.md    # Mermaid architecture diagrams
├── docker-compose.prod.yml # Full production stack (single VM)
├── deploy.sh               # Production deploy script (build → migrate → up)
├── Caddyfile.prod          # Production reverse proxy (Caddy)
├── nginx.conf              # Alternative production reverse proxy (Nginx + Certbot)
├── .env.prod.example       # Production env template
└── web_backup/             # Older snapshot of web/ (not deployed)
```

---

## High-level architecture

```
 ┌───────────────┐   HTTPS / JSON + WS /ws/job/{id}   ┌──────────────────────────────┐
 │  web/ (Next)  │ ─────────────────────────────────► │  server/ FastAPI (uvicorn)    │
 │  customers &  │ ◄───────── live job updates ─────── │  REST /api/v1, WebSockets     │
 │  contributors │                                    │  Redis Pub/Sub listeners      │
 └───────────────┘                                    └──────┬─────────────┬─────────┘
        │ presigned URLs                                     │ enqueue     │ WS /ws/node/{id}
        ▼                                                    ▼             │ job_dispatch / job_cancel
 ┌───────────────┐        ┌────────────┐          ┌──────────────────┐     │
 │ MinIO (S3)    │◄──────►│ PostgreSQL │◄────────►│ Celery workers   │     │
 │ inputs/outputs│        └────────────┘          │ pipeline, matcher│     │
 │ checkpoints   │        ┌────────────┐          │ assemblers       │     │
 └──────▲────────┘        │   Redis    │◄────────►│ Celery beat      │     │
        │                 │ broker,    │          │ (watchdog, 30s)  │     │
        │                 │ queues,    │          └────────┬─────────┘     │
        │                 │ pub/sub    │                   │ Gemini API    │
        │                 └────────────┘                   ▼               ▼
        │                                         ┌──────────────────────────────┐
        └──── download inputs / upload outputs ── │ daemon/ (Tauri) on each node │
                                                  │ runs chunks in local Docker  │
                                                  └──────────────────────────────┘
```

### Backing services

| Service    | Purpose |
|------------|---------|
| PostgreSQL | Users, nodes, jobs, chunks, container images, billing records |
| Redis      | Celery broker/backend, chunk queues (`queue:chunks:priority`, `queue:chunks:normal`), Pub/Sub channels `job_updates` and `node_dispatches` |
| MinIO      | Object storage. Buckets: `job-inputs`, `job-outputs`, `checkpoints`, `build-contexts` |
| Registry   | Private Docker registry (`registry:2`) for built workload images |
| Prometheus / Grafana / Loki | Metrics (`/metrics` on the server), dashboards, logs |
| Gemini API | Workload classification, Dockerfile/wrapper generation, and verification |

---

## `server/`: control plane

Python 3.11 with FastAPI, SQLAlchemy (async, asyncpg), Alembic, Celery, Redis, MinIO and `google-genai`. Config is loaded from env vars or `infra/.env` (`app/core/config.py`).

```
server/app/
├── main.py            # FastAPI app, lifespan, /health, /admin/rescue, Redis Pub/Sub bridges
├── celery_worker.py   # Celery app, task modules, beat schedule (watchdog every 30s)
├── api/v1/            # REST + WebSocket routers, mounted at /api/v1
│   ├── users.py       # register, login, Google OAuth exchange, /me
│   ├── jobs.py        # submit (multipart), list, get, cancel, resolve_dockerfile, price estimate
│   ├── nodes.py       # node register, tokens, settings, history, cluster stats, leaderboard
│   ├── billing.py     # earnings, history
│   ├── admin.py       # overview, users/roles, nodes, jobs
│   └── websocket.py   # /ws/node/{node_id} (daemons) and /ws/job/{job_id} (browsers)
├── core/              # config, database session, redis helpers, JWT/password security
├── models/            # SQLAlchemy models: User, Node, Job, Chunk, ContainerImage, BillingRecord
├── schemas/           # Pydantic request/response and WS message schemas
├── pipeline/          # AI pipeline (see below)
├── scheduler/         # matcher, dispatcher, network_manager, watchdog
├── assembler/         # Per-job-type result merging (render, ml, data, sim)
├── services/          # minio_service (buckets, presigned URLs), billing_service
└── utils/             # gamification, GPU benchmarks
server/docker/
├── images/            # Pre-verified base images: pytorch-cuda12, python-data, openfoam
└── wrappers/          # Entrypoint, ML checkpoint and Local-SGD wrappers injected into containers
server/migrations/     # Alembic migrations
server/purge.py        # Dev utility that wipes Postgres, Redis and MinIO state
```

### Process model

The same Docker image runs three ways:

1. **`server`**: `uvicorn app.main:app`. Owns all live WebSocket connections.
2. **`celery_worker`**: runs the pipeline, matcher and assembler tasks.
3. **`celery_beat`**: fires `scheduler.watchdog` every 30 s.

Celery workers can't reach WebSocket connections because those live in the API process. The workers publish to Redis instead:
- `job_updates`: the API forwards each message to the browsers watching `/ws/job/{job_id}`.
- `node_dispatches`: the API sends a `job_dispatch` or `job_cancel` to the target node's socket. If the node is offline, it schedules `requeue_chunk` to retry 15 s later.

### Job lifecycle

**Job status:** `analyzing → (needs_dockerfile) → queued → running → assembling → completed`, or `failed` / `cancelled`.
**Chunk status:** `pending → assigned → running → completed`, or `failed` / `requeued`.

1. **Submit**: `POST /api/v1/jobs/` uploads the files to MinIO, creates a `Job`, and enqueues `analyze_and_dispatch`.
2. **AI pipeline** (`pipeline/orchestrator.py`). Each step streams progress to the customer as `detection_step` messages:
   1. `detector`: identifies file formats safely from MinIO.
   2. `analyzer`: builds a `JobProfile` (type: render / ml_training / data / simulation, framework, resources). Uses `classifier` (Gemini) when heuristics aren't enough. If the type still can't be determined, the job pauses in `needs_dockerfile`.
   3. `security`: scans for malicious patterns and crypto-miners. Critical findings fail the job.
   4. **Image resolution**: uses the customer's Dockerfile if one was given. Otherwise it looks up a pre-verified image in `catalog`, which `verifier` adapts for extra dependencies. If there's no match, `generator` asks Gemini for a container config and `builder` (Kaniko) builds it.
   5. `splitter`: computes chunks per job type (frame ranges for renders, ranks for ML, shards for data, domains for simulations). Renders get an extra assembly chunk.
3. **Scheduling** (`scheduler/matcher.py`): chunks are pushed to the Redis queues. `score_node` ranks online nodes by resources, and `find_lan_cluster` groups LAN peers for multi-node ML or MPI jobs. `dispatcher.py` handles DDP, Local-SGD and simulation dispatch, and `network_manager.py` sets up the peer overlay.
4. **Execution**: the daemon receives `job_dispatch`, pulls the image, runs the container with presigned input/output URLs, and reports back with `chunk_ack`, `chunk_status` and `log` messages.
5. **Success or failure**: `chunk_success` and `chunk_failed` update state. A failed chunk is retried on another node (`MAX_CHUNK_RETRIES = 7`), and the wrapper or config can be regenerated by Gemini from the error log (`MAX_GEMINI_RETRIES = 7`).
6. **Watchdog** (`scheduler/watchdog.py`): finds chunks on nodes whose heartbeats have stopped, lowers those nodes' reliability scores, and requeues the chunks. `POST /admin/rescue` does a manual sweep for orphaned `pending` chunks.
7. **Assembly** (`assembler/*`): once all chunks are done, merges the outputs (video/frames, model weights, data, simulation results) into `job-outputs`. `billing_service` then records customer charges and contributor earnings.

---

## `web/`: Next.js web app

Next.js App Router with TypeScript, Tailwind, shadcn/Radix UI (`src/components/ui`), MUI and NextAuth.

- `src/app/page.tsx`, `pricing/`, `login/`: marketing pages and sign-in.
- `src/app/(app)/`: the authenticated app, with a shared sidebar layout:
  - customer pages: `dashboard`, `submit`, `monitor` and `monitor/[jobId]` (live pipeline and chunk progress over WS), `results` and `results/[jobId]`, `billing`
  - contributor pages: `contributor`, `contributor/register`, `contributor/leaderboard`, `leaderboard`
  - `admin`
- `src/app/api/auth/[...nextauth]/route.ts` and `src/lib/auth.ts`: Google sign-in through NextAuth. The Google token is exchanged for a backend JWT at `POST /api/v1/users/google`.
- `src/lib/api.ts`: the `CampuGridAPI` REST client (`NEXT_PUBLIC_API_URL`).
- `src/lib/ws.ts`: the job-monitoring WebSocket client (`NEXT_PUBLIC_WS_URL`).
- `e2e/`: Playwright tests (auth, job submission).

---

## `daemon/`: contributor node (Tauri)

A desktop app that turns a machine into a compute node. The React UI is in `src/` and the Rust core is in `src-tauri/src/`.

| Rust module         | Responsibility |
|---------------------|----------------|
| `lib.rs`            | Tauri commands exposed to the UI: hardware profile, Docker/GPU status, toggle active, credentials, authenticate, auto-register node, restart WS, history |
| `websocket.rs`      | Persistent connection to `/ws/node/{node_id}`. Sends heartbeats and handles `job_dispatch` and `job_cancel` |
| `docker_manager.rs` | Pulls images, runs and cancels workload containers, streams logs back |
| `hw_detector.rs`    | CPU, RAM and GPU detection (`sysinfo`), reported at registration and in heartbeats |
| `gpu_setup.rs`      | Checks and installs the NVIDIA container toolkit and configures Docker for GPU use |

UI views: `SetupView` (login and registration), `Dashboard`, `WorkloadView` (the running chunk and its logs) and `SettingsView`.

To test without the desktop app, run `client/scripts/mock_daemon.py`. It simulates a node over the same WebSocket protocol.

---

## Running locally

**Prerequisites:** Docker, Python 3.11+, Node 20+, and Rust with the Tauri prerequisites for the daemon.

```bash
# 1. Infrastructure: Postgres, Redis, MinIO, registry, Prometheus, Grafana, Loki
cd infra
cp .env.example .env              # set GEMINI_API_KEY, Google OAuth credentials, etc.
docker compose up -d

# 2. Server
cd ../server
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000          # API docs at http://localhost:8000/docs
celery -A app.celery_worker.celery_app worker --loglevel=info   # separate terminal
celery -A app.celery_worker.celery_app beat   --loglevel=info   # separate terminal

# 3. Web app
cd ../web
npm install && npm run dev        # http://localhost:3000

# 4. Contributor daemon
cd ../daemon
npm install && npm run tauri dev
```

Local ports: API 8000, web 3000, MinIO 9000 (console 9001), Postgres 5432, Redis 6379, registry 5000, Prometheus 9090, Grafana 3001, Loki 3100.

Tests: `cd server && pytest` · `cd web && npx playwright test`

---

## Production deployment

Everything runs on a single VM via `docker-compose.prod.yml`:

```bash
cp .env.prod.example .env         # fill in the secrets
./deploy.sh                       # build → start postgres/redis/minio → alembic upgrade → up -d
```

- Services bind to `127.0.0.1`. A reverse proxy in front of them terminates TLS. Use either `Caddyfile.prod` or `nginx.conf`.
  - `sparecycles.sahuja.in`: `/api/v1/*`, `/ws/*`, `/docs`, `/health` and `/metrics` go to the server; `/minio/*` goes to the MinIO console; everything else goes to Next.js.
  - `s3-sparecycles.sahuja.in`: the public MinIO S3 endpoint. Its host must match `PUBLIC_MINIO_ENDPOINT`, because presigned SigV4 URLs sign the Host header.
- `web` is built with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` baked in as build args.

---

## Notes

- `init_db()` creates tables on startup for convenience in dev. In production, run Alembic migrations instead (`deploy.sh` does this).
- `web_backup/` is an older copy of `web/`. It isn't used by any compose file.
- `docs/architecture.md` has the Mermaid diagrams. Keep it and this README in sync when the pipeline or protocol changes.

/**
 * Hero schematic: one render job split into 16 chunks, dispatched to peer
 * machines, one node dropping out and its chunk being requeued by the
 * watchdog, then results returning to assemble the frame.
 * Pure SVG + CSS keyframes (see styles/fanout.css). Static under
 * prefers-reduced-motion.
 */
import type { CSSProperties } from "react";

const TILE = 44;
const GAP = 4;
const FX = 24; // frame origin
const FY = 104;
const SLOT = 18;
const SCALE = SLOT / TILE;

const NODES = [
  { host: "lab-204.pc07", spec: "RTX 3060 · 12 GB" },
  { host: "lab-112.pc03", spec: "RTX 4070 · 12 GB" },
  { host: "hostel-b.dell", spec: "8 cores · 16 GB" },
  { host: "lab-118.pc11", spec: "GTX 1660 · 6 GB" },
  { host: "lib-ws.02", spec: "RTX 3050 · 8 GB" },
];
const NODE_X = 356;
const NODE_W = 228;
const NODE_H = 62;
const nodeY = (n: number) => 14 + n * 78;
const slotPos = (n: number, k: number) => ({ x: NODE_X + 128 + k * 23, y: nodeY(n) + 30 });

// Which node and slot each chunk lands on. Chunk 13 lands on node 3,
// which then misses its heartbeat; the watchdog moves it to node 1, slot 3.
const PLAN: { node: number; slot: number }[] = [];
{
  const fill = [0, 0, 0, 0, 0];
  const order = [0, 1, 2, 4];
  for (let i = 0; i < 16; i++) {
    if (i === 13) {
      PLAN.push({ node: 3, slot: 0 });
      continue;
    }
    const idx = i < 13 ? i : i - 1;
    const n = order[idx % 4];
    PLAN.push({ node: n, slot: fill[n]++ });
  }
}
const REQUEUE = { from: 13, node: 1, slot: 3 };

const DELAY0 = 0.5;
const STEP = 0.2;
const delay = (i: number) => `${(DELAY0 + i * STEP).toFixed(2)}s`;

function firstChunkOf(n: number) {
  return PLAN.findIndex((p) => p.node === n);
}

export function ChunkFanout({ className = "" }: { className?: string }) {
  const frameW = TILE * 4 + GAP * 3;
  const portX = FX + frameW + 8;
  const portY = FY + frameW / 2;

  return (
    <svg
      viewBox="0 0 600 410"
      className={`fanout block h-auto w-full ${className}`}
      role="img"
      aria-labelledby="fanout-title fanout-desc"
    >
      <title id="fanout-title">One job split into chunks and run on peer machines</title>
      <desc id="fanout-desc">
        A render frame is divided into 16 tiles. Each tile is sent to one of five campus machines. One machine
        stops responding, and its tile is requeued to another machine. Finished tiles return to assemble the frame.
      </desc>

      {/* Frame */}
      <text x={FX - 8} y={FY - 18} className="fo-mono fo-ink">scene.blend</text>
      <text x={FX + frameW + 8} y={FY - 18} textAnchor="end" className="fo-mono fo-mute">frames 1–240</text>
      <rect
        x={FX - 8}
        y={FY - 8}
        width={frameW + 16}
        height={frameW + 16}
        className="fo-frame"
      />
      {PLAN.map((_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        return (
          <rect
            key={`g${i}`}
            x={FX + col * (TILE + GAP)}
            y={FY + row * (TILE + GAP)}
            width={TILE}
            height={TILE}
            className="fo-ghost"
          />
        );
      })}
      <text x={FX - 8} y={FY + frameW + 30} className="fo-mono fo-mute">16 chunks · 15 frames each</text>

      {/* Routes */}
      {NODES.map((_, n) => {
        const y = nodeY(n) + NODE_H / 2;
        const midX = portX + 52 + n * 6;
        return (
          <path
            key={`r${n}`}
            d={`M${portX} ${portY} H${midX} V${y} H${NODE_X}`}
            className="fo-route"
          />
        );
      })}
      <rect x={portX - 3} y={portY - 3} width={6} height={6} className="fo-port" />

      {/* Nodes */}
      {NODES.map((node, n) => {
        const y = nodeY(n);
        const dead = n === 3;
        const lampDelay = delay(dead ? REQUEUE.from : firstChunkOf(n));
        return (
          <g key={node.host}>
            <rect x={NODE_X} y={y} width={NODE_W} height={NODE_H} className="fo-node" />
            {dead && (
              <rect
                x={NODE_X}
                y={y}
                width={NODE_W}
                height={NODE_H}
                className="fo-node-dead"
                style={{ animationDelay: lampDelay }}
              />
            )}
            <rect
              x={NODE_X + 12}
              y={y + 13}
              width={6}
              height={6}
              className={dead ? "fo-lamp fo-lamp-dead" : "fo-lamp"}
              style={{ animationDelay: lampDelay }}
            />
            <text x={NODE_X + 26} y={y + 20} className="fo-mono fo-ink">{node.host}</text>
            <text
              x={NODE_X + 12}
              y={y + 46}
              className={`fo-mono fo-mute fo-small ${dead ? "fo-spec-dead" : ""}`}
              style={dead ? { animationDelay: lampDelay } : undefined}
            >
              {node.spec}
            </text>
            {dead && (
              <text
                x={NODE_X + 12}
                y={y + 46}
                className="fo-mono fo-small fo-err fo-lost"
                style={{ animationDelay: lampDelay }}
              >
                heartbeat lost
              </text>
            )}
            {[0, 1, 2, 3].map((k) => {
              const s = slotPos(n, k);
              return <rect key={k} x={s.x} y={s.y} width={SLOT} height={SLOT} className="fo-slot" />;
            })}
          </g>
        );
      })}

      {/* Chunks */}
      {PLAN.map((p, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const ox = FX + col * (TILE + GAP);
        const oy = FY + row * (TILE + GAP);
        const s = slotPos(p.node, p.slot);
        const requeue = i === REQUEUE.from;
        const s2 = slotPos(REQUEUE.node, REQUEUE.slot);
        const style = {
          "--dx": `${s.x - ox}px`,
          "--dy": `${s.y - oy}px`,
          "--dx2": `${s2.x - ox}px`,
          "--dy2": `${s2.y - oy}px`,
          "--s": SCALE,
          animationDelay: delay(i),
        } as CSSProperties;
        return (
          <rect
            key={`c${i}`}
            x={ox}
            y={oy}
            width={TILE}
            height={TILE}
            className={requeue ? "fo-chunk fo-chunk-requeue" : "fo-chunk"}
            style={style}
          />
        );
      })}

      {/* Watchdog annotation */}
      <g className="fo-note" style={{ animationDelay: delay(REQUEUE.from) }}>
        <text x={FX - 8} y={FY + 282} className="fo-mono fo-small fo-err">watchdog: lab-118.pc11 missed heartbeat</text>
        <text x={FX - 8} y={FY + 300} className="fo-mono fo-small fo-ink">chunk 14 requeued → lab-112.pc03</text>
      </g>
    </svg>
  );
}

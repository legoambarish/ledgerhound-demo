import { useMemo, useState } from 'react';
import { hierarchy, cluster } from 'd3-hierarchy';
import { motion, useReducedMotion } from 'framer-motion';
import { useSim } from '../sim/store';
import { canonicalJSON, short } from '../sim/crypto';
import { ROW_IDS } from '../sim/seed';

interface TNode {
  level: number;
  index: number;
  children?: TNode[];
}

function buildShape(depth: number): TNode {
  const make = (level: number, index: number): TNode =>
    level === 0 ? { level, index } : { level, index, children: [make(level - 1, index * 2), make(level - 1, index * 2 + 1)] };
  return make(depth, 0);
}

const W = 1000;
const H = 330;
const LEAF_W = 56;
const NODE_W = 58;
const NODE_H = 26;

type Tone = 'ok' | 'bad' | 'warn' | 'seal';
const TONE: Record<Tone, { fill: string; stroke: string; text: string }> = {
  ok: { fill: 'var(--surface)', stroke: 'var(--line-2)', text: 'var(--ink-2)' },
  bad: { fill: 'var(--bad)', stroke: 'var(--bad)', text: '#fff' },
  warn: { fill: 'var(--warn-soft)', stroke: 'var(--warn)', text: 'var(--warn)' },
  seal: { fill: 'var(--seal)', stroke: 'var(--seal)', text: '#fff' },
};

export function MerkleTree({ showRoot = true }: { showRoot?: boolean }) {
  const levels = useSim((s) => s.levels);
  const anchored = useSim((s) => s.anchoredLevels);
  const rows = useSim((s) => s.rows);
  const incident = useSim((s) => s.incident);
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<{ level: number; index: number; x: number; y: number } | null>(null);

  const depth = levels.length - 1;
  const layout = useMemo(() => {
    if (depth < 1) return [];
    const root = hierarchy(buildShape(depth));
    cluster<TNode>().size([W - LEAF_W - 8, H - 70]).separation(() => 1)(root);
    return root.descendants().map((d) => ({ ...d.data, x: (d.x ?? 0) + LEAF_W / 2 + 4, y: 34 + (d.y ?? 0), parent: d.parent?.data }));
  }, [depth]);

  if (depth < 1) return null;
  const pos = new Map(layout.map((n) => [`${n.level}-${n.index}`, n]));

  const tamperLeaves = new Set(incident && incident.kind === 'tamper' && incident.status === 'detected' ? incident.rowIds.map((id) => ROW_IDS.indexOf(id)) : []);
  const visited = new Set(incident && incident.kind === 'tamper' && incident.status === 'detected' ? incident.visited.map((v) => `${v.level}-${v.index}`) : []);
  const justRepaired = incident && incident.kind === 'tamper' && (incident.status === 'repaired' || incident.status === 'sealed') ? incident : null;
  const repairedLeaves = new Set(justRepaired ? justRepaired.rowIds.map((id) => ROW_IDS.indexOf(id)) : []);

  const coversLeaf = (level: number, index: number, set: Set<number>) => {
    const span = 1 << level;
    for (const l of set) if (l >= index * span && l < (index + 1) * span) return true;
    return false;
  };

  const toneOf = (level: number, index: number): Tone => {
    const mismatch = levels[level]?.[index] !== anchored[level]?.[index];
    if (mismatch && coversLeaf(level, index, tamperLeaves)) return 'bad';
    if (mismatch) return 'warn';
    return 'ok';
  };

  const hv = hover ? { ...hover, hash: levels[hover.level][hover.index] } : null;

  return (
    <div className="relative">
      <div className="overflow-x-auto scrollbar-thin">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[720px]" role="img" aria-label="Merkle tree of 16 watched rows">
          {/* edges */}
          {layout.map((n) => {
            if (!n.parent) return null;
            const p = pos.get(`${n.parent.level}-${n.parent.index}`)!;
            const tone = toneOf(n.level, n.index);
            const red = tone === 'bad';
            return (
              <motion.path
                key={`e-${n.level}-${n.index}`}
                d={`M${n.x},${n.y - NODE_H / 2} C${n.x},${(n.y + p.y) / 2} ${p.x},${(n.y + p.y) / 2} ${p.x},${p.y + NODE_H / 2}`}
                fill="none"
                initial={false}
                animate={{ stroke: red ? 'var(--bad)' : tone === 'warn' ? 'var(--warn)' : 'var(--line-2)', strokeWidth: red ? 2.5 : 1.5 }}
                transition={{ delay: reduce ? 0 : red ? n.level * 0.14 : 0, duration: 0.3 }}
              />
            );
          })}
          {/* nodes */}
          {layout.map((n) => {
            const key = `${n.level}-${n.index}`;
            const tone = toneOf(n.level, n.index);
            const isLeaf = n.level === 0;
            const isRoot = n.level === depth;
            const w = isRoot ? 120 : isLeaf ? LEAF_W : NODE_W;
            const h = isRoot ? 34 : NODE_H;
            const label = isLeaf ? ROW_IDS[n.index] : short(levels[n.level][n.index], isRoot ? 4 : 2).replace('…', '·');
            const pulse = justRepaired && coversLeaf(n.level, n.index, repairedLeaves);
            if (isRoot && !showRoot) return null;
            return (
              <g
                key={key}
                transform={`translate(${n.x - w / 2},${n.y - h / 2})`}
                onMouseEnter={(e) => {
                  const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ level: n.level, index: n.index, x: ((n.x / W) * r.width) as number, y: (n.y / H) * r.height });
                }}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ level: n.level, index: n.index, x: 0, y: 0 })}
                onBlur={() => setHover(null)}
                tabIndex={0}
                className="cursor-help outline-none"
              >
                {visited.has(key) && (
                  <rect x={-5} y={-5} width={w + 10} height={h + 10} rx={10} fill="none" stroke="var(--bad)" strokeDasharray="4 4" strokeWidth={1.5} opacity={0.6} style={{ animation: reduce ? undefined : 'dash 0.8s linear infinite' }} />
                )}
                <motion.rect
                  width={w}
                  height={h}
                  rx={isLeaf ? 7 : h / 2}
                  initial={false}
                  animate={{ fill: TONE[tone].fill, stroke: TONE[tone].stroke }}
                  transition={{ delay: reduce ? 0 : tone === 'bad' ? n.level * 0.14 : 0, duration: 0.3 }}
                  strokeWidth={isRoot ? 2 : 1.5}
                />
                {pulse && !reduce && (
                  <motion.rect
                    key={`pulse-${justRepaired!.id}`}
                    width={w}
                    height={h}
                    rx={isLeaf ? 7 : h / 2}
                    fill="var(--seal)"
                    initial={{ opacity: 0.95 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: (depth - n.level) * 0.15, duration: 1.1 }}
                  />
                )}
                <motion.text
                  x={w / 2}
                  y={h / 2 + 5}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize={isRoot ? 15 : 13.5}
                  fontWeight={isRoot ? 700 : 500}
                  initial={false}
                  animate={{ fill: TONE[tone].text }}
                >
                  {label}
                </motion.text>
              </g>
            );
          })}
          <text x={8} y={H - 6} className="font-mono" fontSize={13} fill="var(--muted)">
            16 leaves · leaf = SHA256(0x00 ‖ row)
          </text>
          <text x={W - 8} y={22} textAnchor="end" className="font-mono" fontSize={13} fill="var(--muted)">
            node = SHA256(0x01 ‖ L ‖ R)
          </text>
        </svg>
      </div>
      {hv && hover && hover.x > 0 && (
        <div
          className="pointer-events-none absolute z-30 w-[min(440px,90vw)] rounded-xl bg-ink p-4 text-[14px] leading-snug text-paper shadow-2xl"
          style={{ left: Math.min(Math.max(hover.x - 220, 0), 560), top: hover.level === 0 ? hover.y - 190 : hover.y + 26 }}
        >
          {hover.level === 0 ? (
            <>
              <div className="font-semibold">Leaf #{hover.index} · row {ROW_IDS[hover.index]}</div>
              <div className="mt-2 break-all font-mono opacity-80">{canonicalJSON(rows[hover.index])}</div>
              <div className="mt-2 font-mono opacity-60">SHA256(0x00 ‖ canonicalJSON(row)) =</div>
              <div className="break-all font-mono">{hv.hash}</div>
            </>
          ) : (
            <>
              <div className="font-semibold">{hover.level === depth ? 'Root' : `Node L${hover.level}·${hover.index}`} = SHA256(0x01 ‖ left ‖ right)</div>
              <div className="mt-2 font-mono opacity-70">left&nbsp; {short(levels[hover.level - 1][hover.index * 2], 10)}</div>
              <div className="font-mono opacity-70">right {short(levels[hover.level - 1][hover.index * 2 + 1], 10)}</div>
              <div className="mt-1.5 break-all font-mono">= {hv.hash}</div>
              {hover.level === depth && (
                <div className="mt-1.5 break-all font-mono opacity-70">on-chain: {short(anchored[depth][0], 10)} {hv.hash === anchored[depth][0] ? '✓' : '✗'}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

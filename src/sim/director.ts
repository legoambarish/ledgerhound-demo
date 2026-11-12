// Autoplay director: a scripted ~3 minute story, as data.
import { create } from 'zustand';
import { useSim, type Mode } from './store';
import type { ScenarioId } from './scenarios';

export interface DirectorStep {
  mode: Mode;
  /** tech section id (t1…t9) or overview anchor id */
  target: string;
  scenario?: ScenarioId;
  caption: string;
  duration: number;
  /** extra timed actions within the step */
  cues?: { at: number; run: () => void }[];
}

const sim = () => useSim.getState();

export const STORY: DirectorStep[] = [
  { mode: 'overview', target: 'hero', caption: 'TripGrid ships 14 changes a day. LedgerHound attacks every one of them.', duration: 8000 },
  { mode: 'overview', target: 'problem', caption: 'The costly bugs aren’t crashes — they’re cheats that scanners miss.', duration: 10000 },
  { mode: 'overview', target: 'cheat', scenario: 'fare-to-one', caption: 'Someone changes a ₹18,400 fare to ₹1. Watch all three lanes.', duration: 20000 },
  { mode: 'overview', target: 'cheat', scenario: 'legit-booking', caption: 'Now a real customer books. The data changes — and there is no false alarm.', duration: 12000 },
  { mode: 'tech', target: 't1', caption: 'Under the hood: Hunt agents, a Prove ledger, and a Protect watchdog.', duration: 15000, cues: [{ at: 2500, run: () => sim().runScenario('peek-other-agency') }] },
  { mode: 'tech', target: 't2', scenario: 'deploy', caption: 'v2.14.0 ships. Recon maps it without docs — and finds a zombie and a shadow API.', duration: 20000 },
  {
    mode: 'tech',
    target: 't3',
    caption: 'The planner reasons per endpoint, asks a human before risky tests, and backs off when the app strains.',
    duration: 20000,
    cues: [
      { at: 3000, run: () => sim().setPlannerEndpoint('e7') },
      { at: 7000, run: () => { const p = sim().hunt.approvals.find((a) => a.status === 'pending'); if (p) sim().decideApproval(p.id, true); } },
      { at: 9000, run: () => sim().startExecutors() },
      { at: 11000, run: () => sim().spikeLatency() },
    ],
  },
  { mode: 'tech', target: 't6', caption: 'Proof by data, not by status code: the row diff shows the exploit, then we revert it.', duration: 15000, cues: [{ at: 1500, run: () => sim().replayProof() }] },
  { mode: 'tech', target: 't5', scenario: 'make-me-admin', caption: 'A sub-agent makes himself admin in the database. Red climbs to the root — then it’s repaired and sealed.', duration: 25000 },
  {
    mode: 'tech',
    target: 't8',
    caption: 'Every agent request is hash-chained. Try to hide one, and every page after it stops matching.',
    duration: 15000,
    cues: [
      { at: 1500, run: () => void sim().verifyAudit() },
      { at: 5500, run: () => sim().coverUp(3) },
      { at: 7500, run: () => void sim().verifyAudit() },
      { at: 13000, run: () => { sim().restoreAudit(); void sim().verifyAudit(); } },
    ],
  },
  { mode: 'tech', target: 't7', caption: 'The fix ships. LedgerHound retests and closes F-12 automatically.', duration: 10000, cues: [{ at: 1500, run: () => sim().retest('F-12') }] },
];

interface DirectorState {
  active: boolean;
  paused: boolean;
  index: number;
  stepStartedAt: number;
  elapsedAtPause: number;
  finished: boolean;
  start: () => void;
  exit: () => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
}

let stepTimers: number[] = [];
const clear = () => {
  stepTimers.forEach((t) => window.clearTimeout(t));
  stepTimers = [];
};

function scrollToTarget(step: DirectorStep, modeChanged: boolean) {
  if (step.mode !== 'overview') return;
  window.setTimeout(() => {
    const el = document.getElementById(step.target);
    el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, modeChanged ? 900 : 300);
}

function enter(index: number, fromElapsed = 0) {
  clear();
  const step = STORY[index];
  const s = sim();
  const modeChanged = s.mode !== step.mode;
  if (modeChanged) s.setMode(step.mode);
  if (step.mode === 'tech') s.setSection(step.target);
  if (fromElapsed === 0) {
    scrollToTarget(step, modeChanged);
    if (step.scenario) window.setTimeout(() => sim().runScenario(step.scenario!), 600);
  }
  for (const cue of step.cues ?? []) {
    if (cue.at >= fromElapsed) stepTimers.push(window.setTimeout(cue.run, cue.at - fromElapsed));
  }
  stepTimers.push(
    window.setTimeout(() => {
      const d = useDirector.getState();
      if (index + 1 < STORY.length) d.next();
      else useDirector.setState({ finished: true, paused: true });
    }, step.duration - fromElapsed),
  );
  useDirector.setState({ index, stepStartedAt: Date.now() - fromElapsed, paused: false, finished: false });
}

export const useDirector = create<DirectorState>()((set, get) => ({
  active: false,
  paused: false,
  index: 0,
  stepStartedAt: 0,
  elapsedAtPause: 0,
  finished: false,
  start: () => {
    set({ active: true });
    void sim()
      .reset()
      .then(() => enter(0));
  },
  exit: () => {
    clear();
    set({ active: false, paused: false, finished: false });
  },
  pause: () => {
    const d = get();
    if (!d.active || d.paused) return;
    clear();
    set({ paused: true, elapsedAtPause: Date.now() - d.stepStartedAt });
  },
  resume: () => {
    const d = get();
    if (!d.active) return;
    if (d.finished) {
      get().start();
      return;
    }
    if (!d.paused) return;
    enter(d.index, Math.min(d.elapsedAtPause, STORY[d.index].duration - 50));
  },
  toggle: () => (get().paused ? get().resume() : get().pause()),
  next: () => {
    const d = get();
    if (d.index + 1 < STORY.length) enter(d.index + 1);
  },
  prev: () => {
    const d = get();
    enter(Math.max(0, d.index - 1));
  },
}));

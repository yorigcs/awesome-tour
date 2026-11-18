/**
 * Loopwork's state: a small external store (useSyncExternalStore-friendly) per app instance, so
 * several demos on one page never share a project.
 */

export const STEPS = 16;

export type DrumRow = 'kick' | 'snare' | 'hat' | 'clap';
export const DRUM_ROWS: readonly { id: DrumRow; label: string }[] = [
  { id: 'kick', label: 'Kick' },
  { id: 'snare', label: 'Snare' },
  { id: 'hat', label: 'Hat' },
  { id: 'clap', label: 'Clap' },
];

export type ChannelId = 'drums' | 'bass' | 'keys' | 'vox';
export const CHANNELS: readonly { id: ChannelId; label: string; hue: number }[] = [
  { id: 'drums', label: 'Drums', hue: 1 },
  { id: 'bass', label: 'Bass', hue: 2 },
  { id: 'keys', label: 'Keys', hue: 3 },
  { id: 'vox', label: 'Vox', hue: 4 },
];

/** Clips on the arrangement, in bars (1 bar = 16 steps). */
export interface Clip {
  id: string;
  channel: ChannelId;
  name: string;
  start: number;
  length: number;
}

export type Route = 'arrange' | 'mix' | 'library';
export type ExportFormat = 'wav' | 'mp3' | 'stems';
export type Plan = 'free' | 'pro';

export interface LoopworkState {
  project: string;
  bpm: number;
  playing: boolean;
  recording: boolean;
  /** Current sequencer step (0–15) while playing. */
  step: number;
  /** Playback position in bars (fractional). */
  position: number;
  pattern: Record<DrumRow, boolean[]>;
  mixer: Record<ChannelId, { level: number; muted: boolean }>;
  fx: { drive: number; tape: boolean };
  /** The drum bus effects dialog is open. */
  fxOpen: boolean;
  clips: Clip[];
  route: Route;
  sound: boolean;
  plan: Plan;
  export: { format: ExportFormat; status: 'idle' | 'bouncing' | 'done'; progress: number };
  /** Sample last auditioned in the browser. */
  preview: string | null;
  /** Sample the browser should scroll into view (it's virtualized: off-screen rows don't exist). */
  revealed: string | null;
}

const empty = () => Array.from({ length: STEPS }, () => false);
const pattern = (on: number[]) => {
  const row = empty();
  for (const i of on) row[i] = true;
  return row;
};

export const SEEDED_PATTERN: Record<DrumRow, boolean[]> = {
  kick: pattern([0, 6, 8, 11]),
  snare: pattern([4, 12]),
  hat: pattern([0, 2, 4, 6, 8, 10, 12, 14]),
  clap: pattern([12]),
};

export const clonePattern = (p: Record<DrumRow, boolean[]>): Record<DrumRow, boolean[]> => ({
  kick: [...p.kick],
  snare: [...p.snare],
  hat: [...p.hat],
  clap: [...p.clap],
});

/** A blank bar: every cell off. */
export const emptyPattern = (): Record<DrumRow, boolean[]> => ({
  kick: empty(),
  snare: empty(),
  hat: empty(),
  clap: empty(),
});

export function initialState(overrides: Partial<LoopworkState> = {}): LoopworkState {
  return {
    project: 'night-drive',
    bpm: 92,
    playing: false,
    recording: false,
    step: 0,
    position: 0,
    pattern: clonePattern(SEEDED_PATTERN),
    mixer: {
      drums: { level: 0.8, muted: false },
      bass: { level: 0.35, muted: false },
      keys: { level: 0.6, muted: false },
      vox: { level: 0.5, muted: true },
    },
    fx: { drive: 0.2, tape: false },
    fxOpen: false,
    clips: [
      { id: 'c1', channel: 'drums', name: 'Beat A', start: 0, length: 4 },
      { id: 'c2', channel: 'drums', name: 'Beat B', start: 4, length: 4 },
      { id: 'c3', channel: 'bass', name: 'Sub line', start: 2, length: 6 },
      { id: 'c4', channel: 'keys', name: 'Rhodes', start: 0, length: 8 },
      { id: 'c5', channel: 'vox', name: 'Hook (dry)', start: 4, length: 3 },
    ],
    route: 'arrange',
    sound: false,
    plan: 'free',
    export: { format: 'wav', status: 'idle', progress: 0 },
    preview: null,
    revealed: null,
    ...overrides,
  };
}

export type LoopworkEvent =
  | 'play'
  | 'stop'
  | 'record'
  | 'step-toggled'
  | 'level-changed'
  | 'fx-opened'
  | 'fx-changed'
  | 'sample-previewed'
  | 'route-changed'
  | 'bounce-started'
  | 'bounced';

export interface Loopwork {
  getState(): LoopworkState;
  subscribe(listener: () => void): () => void;
  /** App events, so a tour can follow along (`loopwork.on('play', () => tour.signal('played'))`). */
  on(event: LoopworkEvent, handler: () => void): () => void;
  play(): void;
  stop(): void;
  toggleRecord(): void;
  toggleStep(row: DrumRow, step: number): void;
  setLevel(channel: ChannelId, level: number): void;
  toggleMute(channel: ChannelId): void;
  setBpm(bpm: number): void;
  setDrive(drive: number): void;
  setTape(on: boolean): void;
  setFxOpen(open: boolean): void;
  preview(sample: string): void;
  /** Scroll the sample browser to `sample` (clears the search if it hides it). */
  revealSample(sample: string): void;
  navigate(route: Route): void;
  setSound(on: boolean): void;
  setPlan(plan: Plan): void;
  setFormat(format: ExportFormat): void;
  bounce(): void;
  /** Start over with a fresh project (keeps `sound` and `plan`). */
  reset(overrides?: Partial<LoopworkState>): void;
  /** Activate cells so a demo can start mid-story. */
  seed(pattern?: Record<DrumRow, boolean[]>): void;
  destroy(): void;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export function createLoopwork(overrides: Partial<LoopworkState> = {}): Loopwork {
  let state = initialState(overrides);
  const listeners = new Set<() => void>();
  const handlers = new Map<LoopworkEvent, Set<() => void>>();
  let frame = 0;
  let bounceTimer: ReturnType<typeof setInterval> | undefined;
  let startedAt = 0;
  let startPosition = 0;

  const set = (patch: Partial<LoopworkState>) => {
    state = { ...state, ...patch };
    for (const l of [...listeners]) l();
  };
  const emit = (event: LoopworkEvent) => {
    for (const h of [...(handlers.get(event) ?? [])]) h();
  };

  // Transport clock: position in bars from elapsed time and tempo (4 beats per bar).
  const tick = (now: number) => {
    const bars = startPosition + ((now - startedAt) / 1000) * (state.bpm / 60 / 4);
    const loop = 8;
    const position = bars % loop;
    const step = Math.floor((position % 1) * STEPS);
    if (step !== state.step || Math.abs(position - state.position) > 0.01) set({ position, step });
    frame = requestAnimationFrame(tick);
  };

  const app: Loopwork = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    on(event, handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler);
      return () => set!.delete(handler);
    },
    play() {
      if (state.playing) return;
      startedAt = performance.now();
      startPosition = state.position;
      set({ playing: true });
      if (typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(tick);
      emit('play');
    },
    stop() {
      if (!state.playing && state.position === 0) return;
      cancelAnimationFrame(frame);
      set({ playing: false, recording: false, position: 0, step: 0 });
      emit('stop');
    },
    toggleRecord() {
      set({ recording: !state.recording });
      if (state.recording) {
        app.play();
        emit('record');
      }
    },
    toggleStep(row, step) {
      const next = state.pattern[row].slice();
      next[step] = !next[step];
      set({ pattern: { ...state.pattern, [row]: next } });
      emit('step-toggled');
    },
    setLevel(channel, level) {
      const current = state.mixer[channel];
      set({ mixer: { ...state.mixer, [channel]: { ...current, level: clamp(level) } } });
      emit('level-changed');
    },
    toggleMute(channel) {
      const current = state.mixer[channel];
      set({ mixer: { ...state.mixer, [channel]: { ...current, muted: !current.muted } } });
    },
    setBpm(bpm) {
      set({ bpm: Math.round(Math.min(180, Math.max(60, bpm))) });
    },
    setDrive(drive) {
      set({ fx: { ...state.fx, drive: clamp(drive) } });
      emit('fx-changed');
    },
    setTape(on) {
      set({ fx: { ...state.fx, tape: on } });
      emit('fx-changed');
    },
    setFxOpen(open) {
      if (open === state.fxOpen) return;
      set({ fxOpen: open });
      if (open) emit('fx-opened');
    },
    preview(sample) {
      set({ preview: sample });
      emit('sample-previewed');
    },
    revealSample(sample) {
      set({ revealed: sample });
    },
    navigate(route) {
      if (route === state.route) return;
      set({ route });
      emit('route-changed');
    },
    setSound: (on) => set({ sound: on }),
    setPlan: (plan) => set({ plan }),
    setFormat: (format) =>
      set({ export: { ...state.export, format, status: 'idle', progress: 0 } }),
    bounce() {
      if (state.export.status === 'bouncing') return;
      clearInterval(bounceTimer);
      set({ export: { ...state.export, status: 'bouncing', progress: 0 } });
      emit('bounce-started');
      bounceTimer = setInterval(() => {
        const progress = Math.min(1, state.export.progress + 0.125);
        if (progress >= 1) {
          clearInterval(bounceTimer);
          set({ export: { ...state.export, status: 'done', progress: 1 } });
          emit('bounced');
        } else set({ export: { ...state.export, progress } });
      }, 120);
    },
    reset(next = {}) {
      cancelAnimationFrame(frame);
      clearInterval(bounceTimer);
      set(initialState({ sound: state.sound, plan: state.plan, ...next }));
    },
    seed(p = SEEDED_PATTERN) {
      set({ pattern: clonePattern(p) });
    },
    destroy() {
      cancelAnimationFrame(frame);
      clearInterval(bounceTimer);
      listeners.clear();
      handlers.clear();
    },
  };
  return app;
}

/** How many cells of the drum pattern are on. */
export function activeCells(state: LoopworkState): number {
  return DRUM_ROWS.reduce((n, row) => n + state.pattern[row.id].filter(Boolean).length, 0);
}

/** 400 sample names for the (virtualized) browser. */
export const SAMPLES: readonly { name: string; kind: string; bpm: number | null }[] = (() => {
  const kinds = [
    ['Kick', ['dusty', 'round', 'tape', 'sub', '808', 'punch', 'soft', 'click']],
    ['Snare', ['rim', 'brush', 'crack', 'room', 'lofi', 'layered']],
    ['Hat', ['closed', 'open', 'shaker', 'tick', 'swing']],
    ['Clap', ['wide', 'tight', 'gospel', 'snap']],
    ['Bass', ['sub', 'reese', 'pluck', 'upright', 'fm']],
    ['Keys', ['rhodes', 'wurli', 'felt piano', 'organ', 'pad']],
    ['Vox', ['chop', 'breath', 'hum', 'ad-lib']],
  ] as const;
  const out: { name: string; kind: string; bpm: number | null }[] = [];
  let i = 0;
  while (out.length < 400) {
    for (const [kind, flavours] of kinds) {
      const flavour = flavours[i % flavours.length]!;
      const n = String(Math.floor(i / flavours.length) + 1).padStart(2, '0');
      const loop = kind === 'Bass' || kind === 'Keys' || kind === 'Vox';
      out.push({
        name: `${kind} ${flavour} ${n}`,
        kind,
        bpm: loop ? [84, 88, 92, 96, 100][i % 5]! : null,
      });
      if (out.length === 400) break;
    }
    i++;
  }
  return out;
})();

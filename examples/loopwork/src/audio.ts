import type { DrumRow, Loopwork } from './store';

/**
 * A tiny synthesized drum kit (no samples to download). Sound is off until the user turns it on,
 * and the AudioContext is created on that gesture.
 */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function hit(row: DrumRow, gainLevel: number) {
  const ac = audio();
  if (!ac || !noise) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.connect(ac.destination);
  if (row === 'kick') {
    const osc = ac.createOscillator();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    out.gain.setValueAtTime(0.9 * gainLevel, t);
    out.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(out);
    osc.start(t);
    osc.stop(t + 0.36);
    return;
  }
  const src = ac.createBufferSource();
  src.buffer = noise;
  const filter = ac.createBiquadFilter();
  filter.type = row === 'hat' ? 'highpass' : 'bandpass';
  filter.frequency.value = row === 'hat' ? 7000 : row === 'clap' ? 1400 : 1800;
  const length = row === 'hat' ? 0.05 : row === 'clap' ? 0.18 : 0.2;
  out.gain.setValueAtTime((row === 'hat' ? 0.25 : 0.5) * gainLevel, t);
  out.gain.exponentialRampToValueAtTime(0.001, t + length);
  src.connect(filter);
  filter.connect(out);
  src.start(t);
  src.stop(t + length + 0.01);
}

/** Plays the drum pattern while the transport runs and sound is on. Returns a cleanup. */
export function connectAudio(app: Loopwork): () => void {
  let lastStep = -1;
  return app.subscribe(() => {
    const s = app.getState();
    if (!s.playing || !s.sound) {
      lastStep = -1;
      return;
    }
    if (s.step === lastStep) return;
    lastStep = s.step;
    const drums = s.mixer.drums;
    if (drums.muted) return;
    for (const row of ['kick', 'snare', 'hat', 'clap'] as const) {
      if (s.pattern[row][s.step]) hit(row, drums.level);
    }
  });
}

/** Unlock audio from a user gesture (the sound toggle). */
export function unlockAudio() {
  audio();
}

/**
 * Play a hymn tune in the browser.
 *
 * Sung recordings are copyrighted even when the hymn is not — the performance
 * is its own work. The tunes themselves are public domain, so the melody is
 * synthesised here with the Web Audio API: no files to download, works offline,
 * nothing to license.
 *
 * Melody data comes from the Open Hymnal Project, converted from ABC notation.
 * A soft organ-like tone is built from a few sine partials rather than a raw
 * oscillator, which sounds far less like a test tone.
 */

export interface Note {
  /** MIDI note number, or null for a rest. */
  midi: number | null;
  /** Duration in whole notes — 0.25 is a crotchet. */
  dur: number;
}

export type PartName = 'soprano' | 'alto' | 'tenor' | 'bass';

export interface Tune {
  title: string;
  tune: string | null;
  meter: string;
  /** Usually all four; some scores only carry two or three. */
  parts: Partial<Record<PartName, Note[]>>;
}

export const PART_ORDER: PartName[] = ['soprano', 'alto', 'tenor', 'bass'];

/** Relative loudness, so the melody sits on top rather than being buried. */
const PART_GAIN: Record<PartName, number> = {
  soprano: 1,
  alto: 0.55,
  tenor: 0.5,
  bass: 0.62,
};

const URL_PATH = '/hymns/tunes/tunes.json';

let cache: Record<string, Tune> | null = null;
let loading: Promise<Record<string, Tune> | null> | null = null;

export async function loadTunes(): Promise<Record<string, Tune> | null> {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch(URL_PATH)
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, Tune>>) : null))
    .then((d) => { cache = d; return d; })
    .catch(() => null);
  return loading;
}

export async function getTune(slug: string): Promise<Tune | null> {
  const all = await loadTunes();
  return all?.[slug] ?? null;
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/* ------------------------------------------------------------------ player */

let ctx: AudioContext | null = null;
let stopFlag = 0;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx || ctx.state === 'closed') ctx = new Ctor();
  return ctx;
}

export interface PlayOptions {
  /** Crotchets per minute. Hymns sit around 90. */
  tempo?: number;
  /** 0–1. */
  volume?: number;
  /** Which voices to sound. Defaults to everything the score has. */
  parts?: PartName[];
  /** Fires on each melody note, for following the words. */
  onNote?: (index: number) => void;
  onEnd?: () => void;
}

/**
 * A single note, voiced with three quiet partials and a gentle envelope so it
 * reads as an instrument rather than a beep.
 */
function voice(c: AudioContext, midi: number, start: number, dur: number, gain: number) {
  const partials: Array<[number, number]> = [[1, 1], [2, 0.32], [3, 0.14]];
  const master = c.createGain();
  master.connect(c.destination);

  const attack = 0.02;
  const release = Math.min(0.22, dur * 0.4);
  master.gain.setValueAtTime(0, start);
  master.gain.linearRampToValueAtTime(gain, start + attack);
  master.gain.setValueAtTime(gain, start + Math.max(attack, dur - release));
  master.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  for (const [mult, level] of partials) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq(midi) * mult;
    g.gain.value = level;
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }
}

export async function playTune(tune: Tune, opts: PlayOptions = {}) {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') await c.resume();

  const token = ++stopFlag;
  const tempo = opts.tempo ?? 90;
  const base = opts.volume ?? 0.16;   // four voices at once, so quieter each
  const whole = (60 / tempo) * 4;
  const start = c.currentTime + 0.12;

  const wanted = (opts.parts ?? PART_ORDER).filter((p) => tune.parts[p]?.length);
  if (!wanted.length) return;

  // Each voice keeps its own clock, so parts that differ slightly in note
  // count still begin together and stay in step bar by bar.
  let longest = 0;
  for (const name of wanted) {
    const notes = tune.parts[name] ?? [];
    let t = start;
    const gain = base * PART_GAIN[name];
    for (const n of notes) {
      const dur = n.dur * whole;
      if (n.midi !== null) voice(c, n.midi, t, Math.max(0.08, dur * 0.95), gain);
      t += dur;
    }
    longest = Math.max(longest, t);
  }

  // Follow the melody for highlighting the words
  if (opts.onNote) {
    let t = start;
    (tune.parts.soprano ?? []).forEach((n, i) => {
      const at = (t - c.currentTime) * 1000;
      window.setTimeout(() => { if (token === stopFlag) opts.onNote?.(i); }, at);
      t += n.dur * whole;
    });
  }

  const total = (longest - c.currentTime) * 1000;
  window.setTimeout(() => { if (token === stopFlag) opts.onEnd?.(); }, total);
}

export function stopTune() {
  stopFlag += 1;
  if (ctx && ctx.state !== 'closed') {
    void ctx.close();
    ctx = null;
  }
}

/** Rough length in seconds, for a duration label. */
export function tuneLength(tune: Tune, tempo = 90): number {
  const whole = (60 / tempo) * 4;
  return (tune.parts.soprano ?? []).reduce((a, n) => a + n.dur * whole, 0);
}

export function partsAvailable(tune: Tune): PartName[] {
  return PART_ORDER.filter((p) => tune.parts[p]?.length);
}

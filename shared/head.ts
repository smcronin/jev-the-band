import { z } from 'zod';
import { musicians, patches, type Musician, type Note } from './music.js';
import { headModes, tonicNames } from './keys.js';
import { validateNotes } from './score.js';

// The HEAD: a written twelve-bar opening for all four players, composed by the Luna arranger
// from the prompt before the jam starts. It is System Two: slow, deliberate, whole. Jev is
// System One: it takes over from bar thirteen, hearing the head as performed music and holding
// its own part of it as memory. Head notes are labelled `source: 'luna'`; they are never
// presented as Jev decisions.
//
// Compact notation, one string per bar, events separated by spaces:
//   pitched   NAME@BEAT/DUR[!DYN]     D3@0/1 F#3@1.5/0.5!f
//   chord     NAME+NAME+NAME@BEAT/DUR  D3+F3+A3@0/2
//   keys      hand prefix L: or R:     L:D3+F3@0/2 R:A4@1/0.5
//   drums     VOICE@BEAT[!DYN]         K@0 H@0.5 S@1!f
// BEAT counts from 0 within the bar (4/4); DUR in beats; DYN is p, mp, mf or f.

export const headBars = 12;
export const headSchema = z.object({
  title: z.string().min(2).max(80),
  idea: z.string().min(8).max(300),
  bpm: z.number().int().min(70).max(125),
  tonic: z.enum(tonicNames),
  mode: z.enum(headModes),
  keys: z.object({ left: z.enum(patches), right: z.enum(patches) }),
  guitar: z.array(z.string().max(240)).length(headBars),
  bass: z.array(z.string().max(240)).length(headBars),
  keyboard: z.array(z.string().max(320)).length(headBars),
  drums: z.array(z.string().max(320)).length(headBars),
});
export type Head = z.infer<typeof headSchema>;
export interface HeadReport {
  status: 'planning' | 'ready' | 'failed';
  model: string;
  requestedAt: number;
  request?: unknown;
  head?: Head;
  /** The tonic the room asked for, chosen off-model for variety; the head is transposed onto it. */
  tonic?: number;
  /** The three modes the room offered; Luna picked the one that fit. */
  modesOffered?: string[];
  /** Set when Luna wrote in another key and the head was moved, e.g. "D → F#". */
  transposed?: string;
  /** Per-player events that could not be read or broke an instrument limit. */
  dropped?: Partial<Record<Musician, number>>;
  providerId?: string;
  latencyMs?: number;
  cost?: number;
  error?: string;
}
export const drumLetters: Record<string, number> = {
  K: 36,
  S: 38,
  X: 37,
  H: 42,
  O: 46,
  P: 44,
  R: 51,
  B: 53,
  C: 49,
  SP: 55,
  T1: 50,
  T2: 47,
  T3: 45,
};
const dynamics: Record<string, number> = { p: 0.35, mp: 0.5, mf: 0.65, f: 0.85 };
const pitchClasses: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const ranges: Record<Musician, [number, number]> = {
  bass: [28, 55],
  guitar: [40, 88],
  keys: [48, 84],
  drums: [36, 55],
};
export function parsePitch(name: string): number | undefined {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return undefined;
  return (Number(m[3]) + 1) * 12 + pitchClasses[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const pitchedToken =
  /^(?:([LR]):)?([A-G][#b]?-?\d(?:\+[A-G][#b]?-?\d)*)@(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?:!(p|mp|mf|f))?$/;
const drumToken = /^(K|S|X|H|O|P|R|B|C|SP|T1|T2|T3)@(\d+(?:\.\d+)?)(?:!(p|mp|mf|f))?$/;

/**
 * The arranger sometimes writes several bars in one string separated by '|'. Those pieces are
 * spread forward into the following bars while they are empty; anything beyond is dropped.
 */
export function spreadBars(bars: string[]): string[] {
  const out = bars.map((b) => b.trim());
  for (let i = 0; i < out.length; i++) {
    if (!out[i].includes('|')) continue;
    const pieces = out[i].split('|').map((p) => p.trim());
    out[i] = pieces[0];
    for (let j = 1, k = i + 1; j < pieces.length && k < out.length; k++)
      if (!out[k]) out[k] = pieces[j++];
  }
  return out;
}
/** Read one player's twelve bars into six two-bar chunks of validated notes. */
export function readHeadPart(
  role: Musician,
  bars: string[],
  handPatches: Head['keys'],
  shift = 0,
): { chunks: Note[][]; dropped: number } {
  const chunks: Note[][] = Array.from({ length: headBars / 2 }, () => []);
  let dropped = 0;
  const [low, high] = ranges[role];
  spreadBars(bars).forEach((bar, index) => {
    const chunk = chunks[Math.floor(index / 2)];
    const offset = (index % 2) * 4;
    for (const token of bar.trim().split(/\s+/).filter(Boolean)) {
      const candidates: Note[] = [];
      if (role === 'drums') {
        const m = drumToken.exec(token);
        if (!m || Number(m[2]) >= 4) {
          dropped++;
          continue;
        }
        const beat = offset + snapBeat(Number(m[2]));
        candidates.push({
          beat,
          midi: drumLetters[m[1]],
          duration: Math.min(0.25, 8 - beat),
          velocity: dynamics[m[3] ?? 'mf'],
        });
      } else {
        const m = pitchedToken.exec(token);
        if (!m || Number(m[3]) >= 4 || (role === 'keys') !== !!m[1]) {
          dropped++;
          continue;
        }
        const beat = offset + snapBeat(Number(m[3]));
        const hand = m[1] === 'L' ? 'left' : m[1] === 'R' ? 'right' : undefined;
        for (const name of m[2].split('+')) {
          let midi = parsePitch(name);
          if (midi === undefined) {
            dropped++;
            continue;
          }
          midi += shift;
          // A note written outside the instrument's range is folded by octaves into it.
          while (midi < low) midi += 12;
          while (midi > high) midi -= 12;
          candidates.push({
            beat,
            midi,
            duration: Math.max(0.0625, Math.min(Number(m[4]), 8 - beat)),
            velocity: dynamics[m[5] ?? 'mf'],
            ...(hand ? { hand, patch: handPatches[hand] } : {}),
          });
        }
      }
      for (const note of candidates) {
        if (
          chunk.some((n) => n.beat === note.beat && n.midi === note.midi && n.hand === note.hand)
        ) {
          dropped++;
          continue;
        }
        try {
          validateNotes([...chunk, note], role);
          chunk.push(note);
        } catch {
          dropped++;
        }
      }
    }
    chunk.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  });
  return { chunks, dropped };
}
/** Semitones to move the written head onto the requested tonic, by the shorter way round. */
export function headShift(head: Head, tonic: number | undefined): number {
  if (tonic === undefined) return 0;
  const written = tonicNames.indexOf(head.tonic);
  return ((((tonic - written) % 12) + 18) % 12) - 6;
}
export function readHead(head: Head, tonic?: number) {
  const shift = headShift(head, tonic);
  const parts = {} as Record<Musician, Note[][]>;
  const dropped: Partial<Record<Musician, number>> = {};
  for (const role of musicians) {
    const bars = role === 'keys' ? head.keyboard : head[role];
    const read = readHeadPart(role, bars, head.keys, role === 'drums' ? 0 : shift);
    parts[role] = read.chunks;
    if (read.dropped) dropped[role] = read.dropped;
  }
  return { parts, dropped };
}
/** The finest grid the written drum part uses, as the pulse Kit inherits for its moves. */
const onGrid = (beat: number, pulse: number) =>
  Math.abs(beat * pulse - Math.round(beat * pulse)) < 0.02;
/** Triplet beats written as 0.333 or 0.667 land exactly on the triplet grid. */
export function snapBeat(beat: number): number {
  if (onGrid(beat, 4)) return beat;
  return onGrid(beat, 3) ? Math.round(beat * 3) / 3 : beat;
}
export function inferPulse(notes: Note[]): number {
  for (const pulse of [1, 2, 4]) if (notes.every((n) => onGrid(n.beat, pulse))) return pulse;
  return notes.every((n) => onGrid(n.beat, 3)) ? 3 : 4;
}

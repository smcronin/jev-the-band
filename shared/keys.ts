import { noteNames } from './music.js';

// Key variety across jams. Left to their priors, both the arranger and the opening decision
// gravitate to C, D and E, and to dorian. The last few jams' keys are remembered, told to the
// arranger, and rested from the opening menu, the same boredom rule the players use within a jam.

export interface RecentKey {
  root: number;
  mode: string;
  title?: string;
}
/** Plain ASCII tonic names the arranger reads and writes (C#, Eb rather than ♯/♭). */
export const tonicNames = noteNames.map((n) => n.replace('♯', '#').replace('♭', 'b')) as [
  string,
  ...string[],
];
export const keyName = (root: number, mode: string) =>
  `${tonicNames[((root % 12) + 12) % 12]} ${mode.replaceAll('_', ' ')}`;
/** Modes the arranger may write a head in; the four everyday ones first, the rest as colors. */
export const headModes = [
  'major',
  'minor',
  'dorian',
  'mixolydian',
  'lydian',
  'phrygian',
  'harmonic_minor',
  'melodic_minor',
  'phrygian_dominant',
  'lydian_dominant',
] as const;
export const rememberedKeys = 8;
/**
 * Tonics that should rest because recent jams used them. At least six tonics always stay
 * available, so a long run of varied jams never empties the menu.
 */
export function restedTonics(recent: RecentKey[]): number[] {
  const rested: number[] = [];
  for (const key of recent.slice(-rememberedKeys).reverse()) {
    const root = ((key.root % 12) + 12) % 12;
    if (rested.includes(root)) continue;
    if (rested.length >= 6) break;
    rested.push(root);
  }
  return rested;
}
/** Modes used by the last few songs rest too, so a new default cannot quietly take over. */
export function restedModes(recent: RecentKey[]): string[] {
  const rested: string[] = [];
  for (const key of recent.slice(-4).reverse())
    if (!rested.includes(key.mode) && rested.length < 3) rested.push(key.mode);
  return rested;
}
/** What the arranger and director are told: recent keys and the tonics and modes resting. */
export function keyGuidance(recent: RecentKey[]) {
  if (!recent.length) return undefined;
  const rested = restedTonics(recent);
  return {
    recentJams: recent.slice(-rememberedKeys).map((k) => keyName(k.root, k.mode)),
    tonicsResting: rested.map((r) => tonicNames[r]),
    modesResting: restedModes(recent),
    guidance:
      'The band has lived in the keys above lately. Do not write in a resting tonic or a resting mode unless the prompt clearly demands it; twelve tonics and ten modes exist. Guitars and basses love E, A, G, B, F# and Bb as much as C and D; major, lydian, minor, harmonic minor and phrygian dominant are as welcome as dorian and mixolydian.',
  };
}

// Guitars and basses have favourite keys; every tonic is possible, the open-string ones more so.
const tonicWeights = [2, 0.7, 2.5, 1, 3, 1.5, 1, 2.5, 0.7, 3, 1.5, 1.5];
/**
 * The tonic of the next song, chosen off-model so the band actually moves: recent tonics are
 * out, the rest are drawn by instrument-friendliness with a seeded roll. Luna then writes in it.
 */
export function chooseTonic(recent: RecentKey[], roll: number): number {
  const rested = restedTonics(recent);
  const weights = tonicWeights.map((w, i) => (rested.includes(i) ? 0 : w));
  let draw = (roll % 1) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 12; i++) {
    draw -= weights[i];
    if (draw < 0) return i;
  }
  return 4;
}

const modeWeights: Record<string, number> = {
  major: 3,
  minor: 3,
  dorian: 3,
  mixolydian: 3,
  lydian: 1.5,
  phrygian: 0.8,
  harmonic_minor: 1,
  melodic_minor: 0.8,
  phrygian_dominant: 0.6,
  lydian_dominant: 0.6,
};
/**
 * Three modes offered for the next song, drawn without replacement, resting modes excluded. Luna
 * picks the one that fits the prompt, so variety comes from the menu and fit from the arranger.
 */
export function offerModes(recent: RecentKey[], roll: () => number): string[] {
  const rested = restedModes(recent);
  const pool = headModes
    .filter((m) => !rested.includes(m))
    .map((m) => [m, modeWeights[m]] as const);
  const offered: string[] = [];
  while (offered.length < 3 && pool.length) {
    let draw = roll() * pool.reduce((sum, [, w]) => sum + w, 0);
    let index = pool.findIndex(([, w]) => (draw -= w) < 0);
    if (index < 0) index = pool.length - 1;
    offered.push(pool.splice(index, 1)[0][0]);
  }
  return offered;
}

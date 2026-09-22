import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { directJam } from '../server/director.js';
import { composeHead } from '../server/head.js';
import { jevConfig } from '../server/provider.js';
import { readHead } from '../shared/head.js';
import { chooseTonic, offerModes, tonicNames, type RecentKey } from '../shared/keys.js';
import { musicians, noteNames } from '../shared/music.js';

// Explicit paid audition of the written head: one director call and one head call per prompt,
// concurrently as in a live room. RECENT_KEYS (JSON) reproduces the archive's recent keys. No Jev.
const config = jevConfig();
if (!config.directorModel) throw new Error('Set OPENROUTER_API_KEY for the arranger.');
const prompts = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['Rainy Tuesday in Lisbon, a fado-tinged slow groove', 'Roller rink 1979, bright and bouncy'];
const recent: RecentKey[] = process.env.RECENT_KEYS ? JSON.parse(process.env.RECENT_KEYS) : [];
const results = [];
for (const prompt of prompts) {
  const tonic = chooseTonic(recent, Math.random());
  const modes = offerModes(recent, Math.random);
  const [director, report] = await Promise.all([
    directJam(prompt, config.directorModel, config.directorKey, [], undefined, recent),
    composeHead(
      prompt,
      undefined,
      config.directorModel,
      config.directorKey,
      undefined,
      recent,
      tonic,
      modes,
    ),
  ]);
  const summary: Record<string, unknown> = {
    prompt,
    concept: director.concept?.concept,
    conceptKey: director.concept
      ? `${noteNames[director.concept.root]} ${director.concept.mode} ${director.concept.bpm}bpm`
      : undefined,
    askedTonic: tonicNames[tonic],
    offeredModes: modes,
    wrote: report.head
      ? `${report.head.tonic} ${report.head.mode} ${report.head.bpm}bpm`
      : undefined,
    transposed: report.transposed,
    status: report.status,
    latencyMs: report.latencyMs,
    cost: report.cost,
    dropped: report.dropped,
  };
  if (report.head) {
    const { parts } = readHead(report.head, report.tonic);
    summary.title = report.head.title;
    summary.idea = report.head.idea;
    summary.keys = report.head.keys;
    summary.notesPerChunk = Object.fromEntries(
      musicians.map((r) => [r, parts[r].map((c) => c.length)]),
    );
  }
  results.push({ summary, director, report });
  console.log(JSON.stringify(summary));
}
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/head-audit.json',
  JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2),
);

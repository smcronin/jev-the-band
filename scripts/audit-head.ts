import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { directJam } from '../server/director.js';
import { composeHead } from '../server/head.js';
import { jevConfig } from '../server/provider.js';
import { readHead } from '../shared/head.js';
import { musicians, noteNames } from '../shared/music.js';

// Explicit paid audition of the written head: one director call and one head call per prompt. No Jev.
const config = jevConfig();
if (!config.directorModel) throw new Error('Set OPENROUTER_API_KEY for the arranger.');
const prompts = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['Rainy Tuesday in Lisbon, a fado-tinged slow groove', 'Roller rink 1979, bright and bouncy'];
const results = [];
for (const prompt of prompts) {
  const director = await directJam(prompt, config.directorModel, config.directorKey);
  const report = await composeHead(
    prompt,
    director.concept,
    config.directorModel,
    config.directorKey,
  );
  const summary: Record<string, unknown> = {
    prompt,
    concept: director.concept?.concept,
    key: director.concept
      ? `${noteNames[director.concept.root]} ${director.concept.mode}`
      : undefined,
    bpm: director.concept?.bpm,
    status: report.status,
    latencyMs: report.latencyMs,
    cost: report.cost,
    dropped: report.dropped,
  };
  if (report.head) {
    const { parts } = readHead(report.head);
    summary.title = report.head.title;
    summary.idea = report.head.idea;
    summary.keys = report.head.keys;
    summary.notesPerChunk = Object.fromEntries(
      musicians.map((r) => [r, parts[r].map((c) => c.length)]),
    );
    summary.bars = Object.fromEntries(
      musicians.map((r) => [
        r,
        (r === 'keys' ? report.head!.keyboard : report.head![r]).slice(0, 4),
      ]),
    );
  }
  results.push({ summary, director, report });
  console.log(JSON.stringify(summary, null, 1));
}
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/head-audit.json',
  JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2),
);

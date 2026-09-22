import test from 'node:test';
import assert from 'node:assert/strict';
import { keyGuidance, keyName, restedTonics } from '../shared/keys.js';
import { bootstrapRequest } from '../server/jev.js';
import { composeHead } from '../server/head.js';
import { Archive } from '../server/archive.js';
import { Room } from '../server/room.js';

const recent = [
  { root: 0, mode: 'dorian' },
  { root: 4, mode: 'minor' },
  { root: 0, mode: 'major' },
  { root: 2, mode: 'dorian' },
];

test('recently used tonics rest, at most six at a time, newest first', () => {
  assert.deepEqual(restedTonics(recent), [2, 0, 4]);
  const many = Array.from({ length: 12 }, (_, i) => ({ root: i, mode: 'major' }));
  assert.deepEqual(restedTonics(many), [11, 10, 9, 8, 7, 6], 'six tonics always remain');
  assert.deepEqual(restedTonics([]), []);
  assert.equal(keyName(1, 'harmonic_minor'), 'C# harmonic minor');
  const guidance = keyGuidance(recent)!;
  assert.deepEqual(guidance.tonicsResting, ['D', 'C', 'E']);
  assert.deepEqual(guidance.recentJams, ['C dorian', 'E minor', 'C major', 'D dorian']);
  assert.equal(keyGuidance([]), undefined);
});

test("the Jev opening menu omits resting tonics but keeps the director's own choice", () => {
  const plain = bootstrapRequest('x', 't', undefined, [], recent);
  assert.deepEqual(
    Object.keys(plain.questions.root.criteria).map(Number),
    [1, 3, 5, 6, 7, 8, 9, 10, 11],
  );
  assert.ok((plain.state as any).recentKeys.tonicsResting.includes('C'));
  const concept = { root: 0, mode: 'major', bpm: 100, chapters: [] } as any;
  const withConcept = bootstrapRequest('x', 't', concept, [], recent);
  assert.ok(
    '0' in withConcept.questions.root.criteria,
    'C stays because the director asked for it',
  );
  assert.ok(!('2' in withConcept.questions.root.criteria));
  assert.equal(Object.keys(bootstrapRequest('x', 't').questions.root.criteria).length, 12);
});

test('the arranger is told the recent keys and may answer in any tonic and ten modes', async (t) => {
  let body: any;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    body = JSON.parse(init.body as string);
    return new Response('{}', { status: 500 });
  });
  await composeHead('x', undefined, 'luna', 'k', undefined, recent);
  const user = JSON.parse(body.messages[1].content);
  assert.deepEqual(user.recentKeys.tonicsResting, ['D', 'C', 'E']);
  assert.match(body.messages[0].content, /Any of the twelve tonics/);
  assert.ok(!/C=0/.test(body.messages[0].content));
  const schema = body.response_format.json_schema.schema.properties;
  assert.equal(schema.tonic.enum.length, 12);
  assert.ok(schema.mode.enum.includes('phrygian_dominant') && schema.mode.enum.includes('lydian'));
});

test("the archive reports recent live keys oldest first, from each jam's songs or its opening key", async () => {
  const archive = new Archive('', ':memory:');
  await archive.init();
  const base = (id: string, mode: 'live' | 'rehearsal', startedAt: number) => ({
    ...new Room('t', mode, '').view(),
    id,
    startedAt,
    status: 'ended' as const,
  });
  await archive.state({
    ...base('a', 'live', 1),
    initialRoot: 0,
    initialMode: 'dorian',
    setlist: [],
  });
  await archive.state({
    ...base('b', 'live', 2),
    initialRoot: 4,
    initialMode: 'minor',
    setlist: [
      {
        id: 'b',
        prompt: 'first',
        requestedAt: 2,
        atFrame: 0,
        appliedAt: 2,
        root: 4,
        mode: 'minor',
      },
      {
        id: 'q',
        prompt: 'queued',
        requestedAt: 3,
        atFrame: 20,
        appliedAt: 4,
        root: 9,
        mode: 'lydian',
      },
      { id: 'n', prompt: 'never played', requestedAt: 5, atFrame: 40 },
    ],
  });
  await archive.state({ ...base('c', 'rehearsal', 3), initialRoot: 7, initialMode: 'major' });
  assert.deepEqual(
    (await archive.recentKeys()).map((k) => [k.root, k.mode, k.title]),
    [
      [0, 'dorian', 't'],
      [4, 'minor', 'first'],
      [9, 'lydian', 'queued'],
    ],
  );
});

test('the room chooses a tonic off-model, never a resting one, and a head written elsewhere is transposed onto it', async () => {
  const { chooseTonic } = await import('../shared/keys.js');
  const { headShift, readHead, headSchema } = await import('../shared/head.js');
  const picks = new Set<number>();
  for (let i = 0; i < 200; i++) picks.add(chooseTonic(recent, i / 200));
  assert.ok(!picks.has(0) && !picks.has(2) && !picks.has(4), 'C, D and E rest');
  assert.ok(picks.size >= 8, `spread across ${picks.size} tonics`);
  const written = headSchema.parse({
    title: 'Tune',
    idea: 'a head written in D',
    bpm: 100,
    tonic: 'D',
    mode: 'dorian',
    keys: { left: 'piano', right: 'piano' },
    guitar: ['D4@0/1 A4@1/1', ...Array(11).fill('')],
    bass: ['D2@0/1', ...Array(11).fill('')],
    keyboard: ['L:D3+F3+A3@0/2', ...Array(11).fill('')],
    drums: ['K@0 S@1', ...Array(11).fill('')],
  });
  assert.equal(headShift(written, 6), 4, 'D to F# goes up four');
  assert.equal(headShift(written, 9), -5, 'D to A goes down five, the shorter way');
  const { parts } = readHead(written, 6);
  assert.deepEqual(
    parts.guitar[0].map((n) => n.midi),
    [66, 73],
  );
  assert.deepEqual(
    parts.bass[0].map((n) => n.midi),
    [42],
  );
  assert.deepEqual(
    parts.keys[0].map((n) => n.midi),
    [54, 57, 61],
  );
  assert.deepEqual(
    parts.drums[0].map((n) => n.midi),
    [36, 38],
    'drums never transpose',
  );
  assert.deepEqual(
    readHead(written, 2).parts.guitar[0].map((n) => n.midi),
    [62, 69],
  );
});

test('recent modes rest as well, three at most', async () => {
  const { restedModes, keyGuidance } = await import('../shared/keys.js');
  assert.deepEqual(restedModes(recent), ['dorian', 'major', 'minor']);
  assert.deepEqual(restedModes([{ root: 0, mode: 'lydian' }]), ['lydian']);
  assert.deepEqual(keyGuidance(recent)!.modesResting, ['dorian', 'major', 'minor']);
});

test('three modes are offered without replacement, never a resting one, weighted toward the everyday ones', async () => {
  const { offerModes } = await import('../shared/keys.js');
  const { random } = await import('../shared/music.js');
  const seen = new Map<string, number>();
  for (let seed = 0; seed < 300; seed++) {
    const offered = offerModes(recent, random(seed));
    assert.equal(new Set(offered).size, 3);
    assert.ok(!offered.some((m) => ['dorian', 'major', 'minor'].includes(m)));
    for (const m of offered) seen.set(m, (seen.get(m) ?? 0) + 1);
  }
  assert.ok(seen.get('mixolydian')! > seen.get('phrygian_dominant')!);
  assert.ok(seen.size >= 6);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { headSchema, inferPulse, parsePitch, readHead, readHeadPart } from '../shared/head.js';
import { Room } from '../server/room.js';
import { type JevRequest, type Musician, type Snapshot, type Trace } from '../shared/music.js';

const bar = (s: string) => s;
const silent = Array(12).fill('');
const head = {
  title: 'Lantern Walk',
  idea: 'A patient bass ostinato under a two-note guitar call; keys answer in bar 5.',
  bpm: 88,
  root: 2,
  mode: 'dorian' as const,
  keys: { left: 'rhodes' as const, right: 'organ' as const },
  guitar: [
    '',
    '',
    bar('D4@0/1 F4@1.5/0.5!f A4@2/2'),
    bar('G4@0/1 F4@1/1 D4@2/2'),
    ...silent.slice(4),
  ],
  bass: [
    bar('D2@0/1 D2@1.5/0.5 A2@2/1 C3@3/1!p'),
    ...Array(11).fill('D2@0/1 D2@1.5/0.5 A2@2/1 C3@3/1'),
  ],
  keyboard: [...silent.slice(0, 4), bar('L:D3+F3+A3@0/2 R:C5@2/1 R:A4@3/1'), ...silent.slice(5)],
  drums: Array(12).fill('K@0 H@0 H@0.5 S@1!f H@1 H@1.5 K@2 H@2 H@2.5 S@3!f H@3 O@3.5'),
};

test('the head notation reads pitches, chords, hands, dynamics and drums into six validated chunks', () => {
  assert.deepEqual(
    [parsePitch('C4'), parsePitch('F#3'), parsePitch('Bb2'), parsePitch('E1')],
    [60, 54, 46, 28],
  );
  const { parts, dropped } = readHead(headSchema.parse(head));
  assert.deepEqual(dropped, {});
  assert.deepEqual(parts.guitar[0], []);
  assert.deepEqual(
    parts.guitar[1].map((n) => [n.beat, n.midi, n.duration, n.velocity]),
    [
      [0, 62, 1, 0.65],
      [1.5, 65, 0.5, 0.85],
      [2, 69, 2, 0.65],
      [4, 67, 1, 0.65],
      [5, 65, 1, 0.65],
      [6, 62, 2, 0.65],
    ],
  );
  assert.equal(parts.bass[0][3].velocity, 0.35);
  const june = parts.keys[2];
  assert.deepEqual(
    june.filter((n) => n.hand === 'left').map((n) => [n.midi, n.patch]),
    [
      [50, 'rhodes'],
      [53, 'rhodes'],
      [57, 'rhodes'],
    ],
  );
  assert.deepEqual(
    june.filter((n) => n.hand === 'right').map((n) => [n.beat, n.midi, n.patch]),
    [
      [2, 72, 'organ'],
      [3, 69, 'organ'],
    ],
  );
  assert.equal(parts.drums[0].length, 24);
  assert.deepEqual(
    parts.drums[0].filter((n) => n.midi === 46).map((n) => n.beat),
    [3.5, 7.5],
  );
  assert.equal(inferPulse(parts.drums[0]), 2);
  assert.equal(inferPulse([{ beat: 0.333, midi: 42, duration: 0.25, velocity: 0.5 }]), 3);
});

test('unreadable or unplayable events are dropped and counted; the rest still plays', () => {
  const { chunks, dropped } = readHeadPart(
    'keys',
    ['L:C3+E3+G3+B3+D4+F4@0/4 R:Q7@1/1 D3@2/1 R:C5@4/1 R:E5@1/1', ...silent.slice(1)],
    { left: 'piano', right: 'piano' },
  );
  // One finger too many, a bad pitch name, a keys event without a hand, a beat past the bar.
  assert.equal(dropped, 4);
  const folded = readHeadPart('keys', ['L:A2+C3@0/1 R:C7@0/1', ...silent.slice(1)], head.keys);
  assert.deepEqual([folded.dropped, folded.chunks[0].map((n) => n.midi)], [0, [48, 57, 84]]);
  assert.equal(chunks[0].filter((n) => n.hand === 'left').length, 5);
  assert.deepEqual(
    chunks[0].filter((n) => n.hand === 'right').map((n) => n.midi),
    [76],
  );
  const bass = readHeadPart('bass', ['C5@0/1 E1@0/1 K@1', ...silent.slice(1)], head.keys);
  assert.deepEqual([bass.dropped, bass.chunks[0].map((n) => n.midi)], [1, [28, 48]]);
});

function jevReply(request: JevRequest, role: Musician): Trace {
  const settings: Record<string, string> = {
    opener: 'keys',
    bpm: '96',
    action: 'vary',
    phraseBars: '2',
    sound: 'play',
    move: 'keep',
  };
  return {
    id: 'h-' + Math.random(),
    role,
    frame: 0,
    at: Date.now(),
    source: 'jev',
    latencyMs: 0,
    cost: 0,
    requestHash: 'fixture',
    request,
    answers: Object.fromEntries(
      Object.entries(request.questions).map(([key, q]) => {
        const options = Object.keys(q.criteria);
        const value = options.includes(settings[key]) ? settings[key] : options[0];
        return [
          key,
          {
            choice: value,
            probabilities: Object.fromEntries(options.map((o) => [o, +(o === value)])),
          },
        ];
      }),
    ),
  };
}
const concept = {
  concept: 'A lantern-lit walk home',
  openingInstrument: 'bass',
  openingReason: 'The ostinato is the floor',
  bpm: 88,
  root: 2,
  mode: 'dorian',
  chapters: [
    {
      name: 'Walk',
      atSeconds: 0,
      style: 'soul_gospel',
      arc: 'settle',
      harmonicDirection: 'D dorian vamp',
      guitar: 'call',
      bass: 'ostinato',
      keys: 'answer',
      drums: 'pocket',
      sound: 'warm',
    },
    {
      name: 'Lift',
      atSeconds: 60,
      style: 'soul_gospel',
      arc: 'build',
      harmonicDirection: 'lift',
      guitar: 'keep going',
      bass: 'keep going',
      keys: 'keep going',
      drums: 'keep going',
      sound: 'keep going',
    },
    {
      name: 'Glow',
      atSeconds: 120,
      style: 'soul_gospel',
      arc: 'peak',
      harmonicDirection: 'peak',
      guitar: 'keep going',
      bass: 'keep going',
      keys: 'keep going',
      drums: 'keep going',
      sound: 'keep going',
    },
    {
      name: 'Home',
      atSeconds: 200,
      style: 'ambient',
      arc: 'release',
      harmonicDirection: 'home',
      guitar: 'keep going',
      bass: 'keep going',
      keys: 'keep going',
      drums: 'keep going',
      sound: 'keep going',
    },
  ],
};
function mockProviders(t: import('node:test').TestContext, headOk: boolean) {
  const calls = { director: 0, head: 0, jevMusicians: [] as number[] };
  t.mock.method(globalThis, 'fetch', async (url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    if (String(url).includes('chat/completions')) {
      const isHead = body.response_format.json_schema.name === 'head';
      if (isHead) {
        calls.head++;
        if (!headOk) return new Response('{}', { status: 500 });
        return new Response(
          JSON.stringify({
            id: 'h',
            choices: [{ message: { content: JSON.stringify(head) } }],
            usage: { cost: 0.02 },
          }),
        );
      }
      calls.director++;
      return new Response(
        JSON.stringify({
          id: 'd',
          choices: [{ message: { content: JSON.stringify(concept) } }],
          usage: { cost: 0.01 },
        }),
      );
    }
    const name = body.state.persona?.name ?? body.state.context?.persona?.name;
    const role: Musician =
      name === 'JUNE' ? 'keys' : name === 'KIT' ? 'drums' : name === 'MOSS' ? 'bass' : 'guitar';
    if (name && ['JUNE', 'KIT', 'MOSS', 'ROOK'].includes(name) && body.questions.phraseBars)
      calls.jevMusicians.push(Date.now());
    const trace = jevReply(body, role);
    return new Response(JSON.stringify({ answers: trace.answers, usage: { cost: 0 } }));
  });
  return calls;
}
async function run(t: import('node:test').TestContext, room: Room, seconds: number) {
  const frames: NonNullable<Snapshot['frame']>[] = [];
  room.on('state', (state) => {
    if (state.frame && state.frame.id !== frames.at(-1)?.id)
      frames.push(structuredClone(state.frame));
  });
  await room.start();
  for (let s = 0; s < seconds; s++) {
    t.mock.timers.tick(1000);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  return frames;
}

test('the band reads the written head for twelve bars, labelled as Luna, then Jev takes over from what it heard', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const calls = mockProviders(t, true);
  const room = new Room('Lantern', 'live', 'fixture', 'test', 6000, 600, {
    directorModel: 'luna',
    directorApiKey: 'or',
  });
  const frames = await run(t, room, 90);
  room.stop();
  assert.deepEqual([calls.director, calls.head], [1, 1]);
  assert.equal(room.state.head?.status, 'ready');
  assert.deepEqual(
    [room.state.baseBpm, room.state.initialRoot, room.state.initialMode, room.state.opener],
    [88, 2, 'dorian', 'bass'],
  );
  assert.ok(
    !room.state.traces.some((tr) => tr.role === 'host'),
    'no Jev opening decision: the head opens',
  );
  const heads = frames.slice(0, 6);
  assert.equal(heads.length, 6);
  for (const [i, f] of heads.entries()) {
    assert.equal(f.chapter, 'Reading the head');
    assert.equal(f.bpm, 88);
    assert.ok(
      f.parts.every(
        (p) =>
          p.source === 'luna' &&
          !p.continued &&
          p.performance?.headBars === `${i * 2 + 1}–${i * 2 + 2}`,
      ),
    );
  }
  const guitar = (f: NonNullable<Snapshot['frame']>) => f.parts.find((p) => p.role === 'guitar')!;
  assert.deepEqual(guitar(heads[0]).notes, []);
  assert.deepEqual(
    guitar(heads[1]).notes.map((n) => n.midi),
    [62, 65, 69, 67, 65, 62],
  );
  assert.equal(heads[2].parts.find((p) => p.role === 'keys')!.notes.length, 5);
  assert.equal(heads[0].parts.find((p) => p.role === 'drums')!.performance?.drumPulse, 2);
  assert.ok(
    room.state.traces.filter(
      (tr) => tr.frame < 6 && ['guitar', 'bass', 'keys', 'drums'].includes(tr.role),
    ).length === 0,
    'no musician composed during the head',
  );
  const seventh = frames[6];
  assert.ok(seventh && seventh.chapter !== 'Reading the head');
  const fresh = seventh.parts.filter((p) => !p.continued);
  assert.equal(fresh.length, 1, 'the fair rotation resumes with one new idea');
  assert.equal(fresh[0].source, 'jev');
  assert.ok(
    seventh.parts.filter((p) => p.continued).every((p) => p.source === 'luna'),
    'the others still play their written bars',
  );
  const drumsLater = frames
    .slice(6)
    .map((f) => f.parts.find((p) => p.role === 'drums')!)
    .find((p) => p.source === 'jev');
  assert.ok(
    drumsLater && drumsLater.performance?.drumMove !== 'new_groove',
    'Kit inherits the written groove instead of rewriting it',
  );
  const jevRequest = room.state.traces.find((tr) => tr.role === 'guitar' && tr.source === 'jev')!
    .request.state as any;
  assert.ok(
    jevRequest.recent.some((f: any) => f.players.some((p: any) => p.notes.length)),
    'Jev heard the head as performed music',
  );
});

test('a failed or disabled head means Jev opens the song itself, as before', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const calls = mockProviders(t, false);
  const room = new Room('Lantern', 'live', 'fixture', 'test', 6000, 600, {
    directorModel: 'luna',
    directorApiKey: 'or',
  });
  const frames = await run(t, room, 30);
  room.stop();
  assert.equal(calls.head, 1);
  assert.equal(room.state.head?.status, 'failed');
  assert.ok(room.state.traces.some((tr) => tr.role === 'host'));
  assert.equal(frames[0].chapter, 'Finding each other');
  assert.ok(frames[0].parts.every((p) => p.source === 'jev'));
  const off = mockProviders(t, true);
  const quiet = new Room('Lantern', 'live', 'fixture', 'test', 6000, 600, {
    directorModel: 'luna',
    directorApiKey: 'or',
    headEnabled: false,
  });
  await run(t, quiet, 12);
  quiet.stop();
  assert.equal(off.head, 0);
});

test('a queued song receives its head while the previous song plays and starts by reading it', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const calls = mockProviders(t, true);
  const room = new Room('Lantern', 'live', 'fixture', 'test', 6000, 600, {
    directorModel: 'luna',
    directorApiKey: 'or',
  });
  const frames: NonNullable<Snapshot['frame']>[] = [];
  room.on('state', (state) => {
    if (state.frame && state.frame.id !== frames.at(-1)?.id)
      frames.push(structuredClone(state.frame));
  });
  await room.start();
  let cue: ReturnType<Room['queueTheme']> | undefined;
  for (let s = 0; s < 200; s++) {
    t.mock.timers.tick(1000);
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (s === 20) cue = room.queueTheme('Second song');
  }
  room.stop();
  assert.equal(calls.head, 2);
  assert.equal(cue!.head?.status, 'ready');
  const first = frames.find((f) => f.themeId === cue!.id)!;
  assert.equal(first.chapter, 'Reading the head');
  assert.ok(first.parts.every((p) => p.source === 'luna'));
  assert.equal(
    frames.filter((f) => f.themeId === cue!.id && f.chapter === 'Reading the head').length,
    6,
  );
});

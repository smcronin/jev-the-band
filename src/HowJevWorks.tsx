import { ArrowUpRight, X } from 'lucide-react';

const Out = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer">
    {children} <ArrowUpRight size={14} />
  </a>
);

/** The liner notes. Whimsical in tone, but every number here is read from the code it describes. */
export function HowJevWorks({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="about-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          autoFocus
          className="icon-button modal-close"
          aria-label="Close how Jev works"
          onClick={onClose}
        >
          <X />
        </button>
        <span className="eyebrow">LINER NOTES · FUNKY BUT TRUE</span>
        <h2 id="about-title">
          How Jev
          <br />
          works
        </h2>
        <p className="about-lede">
          Jev is not a chatbot and has never written a sentence in this band. It is a decision
          model: you hand it a situation and a multiple-choice quiz, and it hands back how much it
          believes in every answer. Rook, Moss, June and Kit are four personas taking that quiz a
          few hundred times per jam. Lux takes it for the lights, Patch for the mix. Nobody on stage
          can talk. Everybody can choose.
        </p>
        <nav className="about-toc" aria-label="Sections">
          <a href="#sees">Sees</a>
          <a href="#chooses">Chooses</a>
          <a href="#possibilities">Possibilities</a>
          <a href="#systems">Two systems</a>
          <a href="#credits">Credits</a>
          <a href="#license">License</a>
          <a href="#seth">Seth</a>
        </nav>

        <h3 id="sees">
          <i>01</i> How Jev “sees” music
        </h3>
        <p>
          Jev has no ears. No audio ever reaches it. What it gets is a tidy ledger of what has
          already been played: who struck which MIDI pitch, on which beat, how hard, and through
          which pedals. We call this symbolic hearing, because “reading the receipt of a groove”
          tested poorly.
        </p>
        <p>
          The ledger is a rolling window. The band delivers music in two-bar phrases, and each
          musician sees the two bars just heard in full detail plus up to three phrases before that,
          eight bars at most. If a busy drummer makes the request too large, the oldest phrase falls
          off the back first. The past is heavy and Jev travels light.
        </p>
        <p>
          The window is honest about time. Everything is cut off 180 milliseconds before now, a
          reaction delay, the way a real player is always slightly behind the air. The newest phrase
          is trimmed to the exact beat that has sounded, and a note still ringing reports only the
          length heard so far, because the end of a note is information from the future. No musician
          ever sees a bandmate’s unplayed notes, private plan or next pedal move.
        </p>
        <pre className="about-exhibit">{`heard by ROOK, 180 ms ago
  MOSS   beat 0.0  D2   vel .80  held 0.5
  KIT    beat 0.0  kick           feel: half time
  JUNE   beat 1.5  F4 A4 C5      patch: rhodes
  ...through beat 5.25 of 8. The rest hasn't happened yet.`}</pre>
        <p>
          Alongside the ledger, each player carries a few private things: its own last notes and
          direction, the band’s key (and a nudge if someone just led a key change), how loud the
          others are playing, the drummer’s feel, the current chapter of the shared chart, and blunt
          feedback such as “you have built tension twice, a release is due.”
        </p>

        <h3 id="chooses">
          <i>02</i> How Jev “chooses” notes
        </h3>
        <p>
          Every request is a state plus questions, and every answer is a choice with a probability
          for each option. A musician’s turn is a small stack of quizzes:
        </p>
        <ol className="about-steps">
          <li>
            <b>The plan.</b> One request: how many bars, style branch, arc (settle, build, peak,
            release, space), register, texture, mode, keyboard patches, volume, feel, and whether to
            move the key or nudge the tempo.
          </li>
          <li>
            <b>The rig.</b> One request: seven pedals, on or off, for each bar. Drive, wah,
            envelope, chorus, tremolo, delay, reverb. That is 128 pedalboards per bar. Kit gets
            three pedals and better judgement.
          </li>
          <li>
            <b>The notes.</b> One request per attack. Play or rest? Which pitch? Held how long? How
            hard? How many beats until the next one? The pitch menu is real MIDI notes from the
            chosen scale and chord, each labelled like{' '}
            <code>F♯4 · major third · 2 semitones above your previous pitch</code>. Solos ask for
            whole gestures instead: runs, cries, bends, slides, hammer-ons and breaths.
          </li>
        </ol>
        <p>
          June’s chord voices are drawn from one distribution without replacement, so five fingers
          land on five different keys. Kit answers kick, snare and cymbal for every slot of an
          elected grid. There is no stored drum pattern and no inserted backbeat. If the backbeat is
          there, Kit meant it.
        </p>
        <p>
          The answers become a score, and the score is checked before it is accepted: six strings, a
          five-fret hand window, five notes per keyboard hand, a bass that stays a bass. Then the
          audio clock takes over. No network call ever schedules a note. A request has 1.8 seconds
          to return; if it fails, that player honestly repeats or rests, the trace says “fallback”,
          and nothing is invented on Jev’s behalf.
        </p>
        <p>
          In your browser, each chosen note finds the nearest recorded guitar, bass or piano note
          and is repitched by the ratio 2<sup>(semitones ÷ 12)</sup>. Softer velocities reach for
          softer recordings. Bends and slides ride the sample’s detune, vibrato waits for the bend
          to arrive, and a hammer-on skips the recorded pick attack and fades in over 14
          milliseconds, so you hear fingers, not plectrum. Rhodes, organ, analog, pad and bell are
          stacks of oscillators. Snare, hats and cymbals are recordings; the kick and one tom are
          synthesized and unbothered by it. Each player then runs through its own pedal rig, and
          Patch reads real channel meters (numbers, never audio) and moves faders a decibel at a
          time.
        </p>

        <h3 id="possibilities">
          <i>03</i> From probabilities to possibilities
        </h3>
        <p>
          Here is the problem with a very sure classifier in a jam band. Early traces read{' '}
          <code>rhodes 0.94</code>, <code>warm 0.99</code>, <code>stay 1.00</code>, phrase after
          phrase. Same state in, same answer out, forever. Technically a groove. Spiritually a
          screensaver. So the harness provokes it, three ways, without ever editing what Jev said.
        </p>
        <p>
          <b>Boredom (option fatigue).</b> Every choice has a patience. Three phrases on one
          register, four on a texture, five on a feel, six on a style, and that option may go for a
          lie-down: it is removed from the menu for one decision and the request says so plainly.
          Jev must pick its best <em>alternative</em>. The favourite returns the moment something
          else has been played. After 48 bars in one key, “stay” gets tired too.
        </p>
        <p>
          <b>Heat.</b> Each player has a novelty pressure from 0 to 1 that rises with time into the
          song and with every two-bar chunk its direction has not changed. Rook bores fastest
          (×1.25), then June (×1.1), Moss (×0.8), and Kit, who could play that beat until Tuesday
          (×0.7). Pressure warms the dice: sampling temperature climbs from 0.6 to 2.2, the nucleus
          widens from the top 70% of probability to 98%, and a player’s own recent picks are
          penalised. The second and third most likely answers become live options. They are still
          Jev’s answers, from Jev’s distribution; we just stop always taking the first one. Change
          two audible things at once and it counts as a departure, and the player cools back down.
          Moving the whole band’s key or tempo stays locked until a player is properly restless.
        </p>
        <p>
          <b>LLM themes.</b> One language model is allowed near the band, and never on the clock.
          When you type a prompt, a director model (gpt-5.6-luna) turns it into a sonic concept and
          a loose chart of four to six sections with ideas for each player, and at the same time
          writes the head, the twelve bars the band reads first (see the next section). Players see
          the prompt itself only for their first four phrases; after that, what they hear matters
          more than what you said. Queue another prompt mid-jam and the band lands the current song
          on its own, each player choosing how to resolve or stop. Once the stage is silent the next
          song starts from nothing, with a fresh opener, tempo and key and no memory of the last
          one. Luna can also sketch a 16-bar solo story, off the clock, as advice. If Luna is late
          or down, the band plays from your raw words and says so.
        </p>
        <p>
          The console shows both layers for every decision: the raw answer with its probabilities,
          and the applied answer after heat. Rehearsal and fallback are always labelled. It is an
          inspectable trace, not a signed attestation, and none of it certifies taste.
        </p>

        <h3 id="systems">
          <i>04</i> Two systems, one band
        </h3>
        <p>
          Daniel Kahneman described two kinds of thinking. System One is fast, automatic and
          intuitive: you recognise a face, finish a bandmate’s phrase, feel where the downbeat is.
          System Two is slow, deliberate and effortful: you work out a chord voicing, plan a set,
          write a tune. TypeSafe calls Jev a System One model for a reason. It answers a
          multiple-choice question in about a third of a second, and it cannot write a paragraph,
          let alone a song. A language model like Luna is the opposite: it can write you twelve bars
          with a turnaround, but it needs half a minute and cannot be interrupted by what the
          drummer just did.
        </p>
        <p>A jam band needs both. So the head is written, and the jam is played.</p>
        <ol className="about-steps">
          <li>
            <b>System Two writes the head.</b> When you press Play, Luna gets two jobs at once: the
            sonic concept, and a written twelve-bar opening for all four players, in a compact
            notation (<code>D3@0/1 F#3@1.5/0.5!f</code>, chords joined with <code>+</code>,{' '}
            <code>L:</code> and <code>R:</code> for June’s hands, letters for the drums), with its
            own tempo, key and mode. Both calls run together, so the first sound arrives after the
            slower one, typically half a minute. Every written note passes the same checks as a Jev
            note: instrument ranges, five fingers per hand, the bar it lives in. What cannot be
            played is dropped and counted; a note written off the instrument is moved by octaves
            onto it.
          </li>
          <li>
            <b>The band reads.</b> For six two-bar phrases nobody composes and no Jev request is
            made for the musicians. Each player card says “Reading the head · bars 3–4”, the chapter
            is “Reading the head”, and every part is labelled <code>luna</code>. These are the only
            notes in a live jam that Jev did not choose, and they are never dressed up as Jev’s.
          </li>
          <li>
            <b>System One takes it from bar 13.</b> The rotation resumes: one player at a time
            brings a new idea while the others keep playing their written bars. Each musician’s last
            two head bars are its own memory, the whole head is what it heard, and Kit inherits the
            written groove as its theme, so its first move is a variation, a fill or a drop rather
            than a new beat. From here on every note is a Jev choice again, warmed by heat and
            provoked by boredom as above.
          </li>
        </ol>
        <p>
          The handoff is deliberately one-way. Luna never hears the jam and never plays during it;
          Jev never sees Luna’s reasoning, only the music. When you queue the next song, Luna writes
          its head while the current one is still playing, so the fresh start reads it without
          waiting. If a head fails, arrives late or is switched off, Jev opens the song itself, as
          it always did, and the concept card says so. The head’s full request, latency, cost and
          any dropped events sit under “Inspect the director brief”.
        </p>

        <h3 id="credits">
          <i>05</i> Credits
        </h3>
        <ul className="about-credits">
          <li>
            <b>Codex</b> <span>gpt-6-astra</span>
          </li>
          <li>
            <b>Claude Code</b> <span>fable 5.1</span>
          </li>
          <li>
            <b>Jev</b> <span>the decision model, by TypeSafe</span>
          </li>
          <li>
            <b>Luna</b> <span>gpt-5.6-luna, director, head writer and solo arranger</span>
          </li>
          <li>
            <b>Recorded instruments</b>{' '}
            <span>Karoryfer Samples, Versilian Studios, tonejs-instruments</span>
          </li>
        </ul>
        <div className="about-links">
          <Out href="https://typesafe.ai/blog/introducing-system-one-models-and-jev">
            Meet the decision model
          </Out>
          <Out href="/samples/CREDITS.md">Instrument recordings &amp; credits</Out>
        </div>

        <h3 id="license">
          <i>06</i> License
        </h3>
        <p>
          The code is MIT licensed, © 2026 Seth Cronin. Take it, fork it, start a rival band. The
          recordings keep their own terms: guitar, bass and drum hits are CC0, the piano is CC BY
          3.0, and the generated crowd sounds are noncommercial and sit outside the MIT grant.
        </p>

        <h3 id="seth">
          <i>07</i> About me
        </h3>
        <p>
          Seth lives in Vermont with his wife and two kids, working as an intellectual property
          consultant at ipCapital Group, where he helps inventors, entrepreneurs and companies
          develop their intellectual property. This band is what happens when he is left alone with
          a decision model.
        </p>
        <div className="about-links">
          <Out href="https://github.com/smcronin">GitHub</Out>
          <Out href="https://www.linkedin.com/in/sethcronin/">LinkedIn</Out>
          <Out href="https://x.com/SethCronin">X</Out>
          <Out href="https://www.ipcg.com/team/seth-cronin/">ipCapital Group</Out>
        </div>

        <div className="about-label">INSTRUMENT DEMO · NO AI</div>
        <p>
          No API key? The stage still plays. Demo mode uses procedural decisions, makes no Jev
          calls, and is labelled as rehearsal everywhere it appears.
        </p>
      </section>
    </div>
  );
}

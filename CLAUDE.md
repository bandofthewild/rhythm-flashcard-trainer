# Rhythm Flashcard Trainer — working agreement

A single-file, self-contained rhythm-reading drill app for band class. Deployed to GitHub
Pages and embedded on beyermusicresources.com (Wix) via a promo card that opens the app in
a new tab. Built and maintained by Brad Beyer (6–12 band, Michigan).

## The one rule that matters most

**Never edit `index.html` directly.** It is a *build artifact* — the concatenation of the
three files in `src/`. Any hand-edit to it is silently destroyed on the next build.

Edit `src/`, then run the build:

```bash
./build.sh          # mac / linux / Git Bash
build.bat           # native Windows cmd
```

## Repo layout

```
src/shell_top.html      <head>, all CSS, all body markup, opens <script>
src/engine.js           rhythm generation + VexFlow renderer (lifted from the
                        Rhythm Worksheet Generator; treat as mostly-frozen)
src/shell_bottom.html   glue JS: audio, scheduler, card logic, controls,
                        song sync, save/load; closes </script></body></html>
index.html              BUILD ARTIFACT — deploy this, never edit it
rhythm-flashcard-trainer-promo.html   Wix promo card (embedded on the site)
test/generation.test.js 3024 rhythm-generation tests
test/dsp.test.js        tempo / beat-phase / bar-phase tests vs synthetic clicks
test/dom-stubs.js       minimal DOM/Audio stubs so node can parse the inline script
```

Concatenation order is `shell_top.html + engine.js + shell_bottom.html`. Nothing else.

## Verification protocol — run before every hand-off

`./build.sh` (or `build.bat` on Windows) does all of this and must end with `BUILD OK`.
Node.js is the only requirement.

1. Rebuild `index.html` from `src/`
2. `node --check` the extracted inline script (syntax)
3. `node test/generation.test.js` → must print **`Failures: 0`**
4. `node test/dsp.test.js` → must print **`21 passed, 0 failed`**

If a change touches the counting engine, also eyeball the sample counting lines the
generation suite prints (4/4, 6/8, cut, asymmetrical).

## What cannot be verified here — always flag it

There is no browser in this environment. **VexFlow rendering and Web Audio cannot be
tested.** After any change to notation, beaming, layout, full-screen scaling, or sound,
say so plainly and ask for a screenshot. Do not claim visual/audio correctness.

Known items that have needed screenshot verification: beam grouping in asymmetrical
meters, full-screen scale factor, counting-strip alignment and collisions, groove feel.

## Architecture notes worth knowing

- **Engine DOM contract.** `engine.js` reads hidden inputs: `#dropdownLevel`,
  `#dropdownTimeSignature`, `#dropdownDifficulty`, `#allowTies`, and `#rhythm-<key>`
  checkboxes. `syncEngineDom()` in the glue keeps them in step with `state`.
- **Clock.** One scheduler on 16th-note units. `sixteenthDur() = (60/bpm)/pulseUnits`,
  where `pulseUnits` comes from `getMeterPlaybackConfig(ts)` — 4 simple, 6 compound,
  8 cut, 2 asymmetrical. Everything (groove, sweep, Hear It, song lock) rides this.
- **Cycle.** prep (whole bars) → Count It → optional Clap It. Because every phase is a
  whole number of bars, the groove never stutters and cards start on a downbeat.
- **Meters.** Simple (4/4, 3/4, 2/4), compound (6/8, 9/8, 12/8), cut (2/2, half = beat,
  counted one tier removed), asymmetrical (5/8, 7/8, counted per eighth with a grouping
  picker that drives groove accents and beam grouping).
- **Grab-bag.** With Combine on, each card picks a random level *and* generates from
  **that level's own pool** — not the union — so level 1 + 6 really does mix trivial
  cards with hard ones. Don't "optimise" this back into a union.
- **Song sync** (`Your Own Music`). Onset envelope via `OfflineAudioContext` (lowpass 180
  → bass channel for bar phase; bandpass 3200 Q0.7 + 900 Q0.6 ×0.9 → attack channel),
  comb-filter tempo search 40–220 with a log-normal prior at 120, 200-subdivision phase
  refinement, bass-band bar phase by argmax. The song plays through **our** audio clock,
  so drill and music cannot drift. Saved songs live in IndexedDB (`rhythmTrainerSongs`).

## Song-sync invariants — these were bugs once, don't reintroduce them

- `barBeats` is the index where `k % barLen === argmax`. Not `(4 - argmax) % 4`.
- Always pass `barLen` in and normalise `barBeats` into range on meter change and on
  load. Bound the realign loop — an out-of-range value once froze the page.
- Widen tempo bounds to 30–330 while a song is locked, and report the actual number if
  a ÷/× would exceed them.
- Tap Beat 1 snaps to the **nearest existing beat** (tempo untouched) and comes in a
  **full bar** later.
- A meter change re-derives the downbeat from the cached envelope. Tempo must **not**
  change with the meter.
- Keep the original `File`/`Blob` for saving; `decodeAudioData` can detach the buffer.
- IndexedDB is blocked on `file://` — detect it and explain, don't fail silently.
- While a song owns the clock: tap-tempo becomes "Beat 1", speed trainer off and greyed,
  tempo slider locked and relabelled "Tempo (from song)", groove forced to Off.

## Design constraints

- **Visibility is king.** This gets projected to a full ensemble. Full-screen must be
  huge and must not scroll.
- Theme: powder blue `#a5c8d4`, deep teal `#035772`, Roboto Slab headings, Nunito Sans
  body. Keep the Trainer and the Note Board looking like a family.
- Must work offline, from a single file, on a school Chromebook. No build step in the
  browser, no external deps beyond the VexFlow CDN and Google Fonts.
- Classroom pacing over cleverness. Prefer one obvious control to two clever ones.

## Deploying

`index.html` at the repo root is served by GitHub Pages. Commit a rebuilt `index.html`
and the live URL updates within about a minute — nothing to re-paste in Wix. The Wix page
embeds `rhythm-flashcard-trainer-promo.html`, whose button opens the app in a new tab.

## Style of collaboration Brad wants

Concise, honest engineering. Say when you disagree and why. Flag anything unverified
rather than papering over it. Don't pad summaries.

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

## What can and can't be verified here

Claude Code sessions on this repo have had a real Chromium browser pane (resizable to any
viewport, with DOM/console/network inspection and screenshots) — use it. Rendering,
layout, and console-error regressions at a given viewport size (including narrow/mobile
widths) can and should be checked directly rather than guessed at from reading source.

What still can't be verified from here: real-device behavior that a desktop Chromium pane
doesn't reproduce — iOS Safari's collapsing URL bar (the `100vh`/`100dvh` distinction, see
below), touch-gesture quirks, and real hardware audio latency/output. After a change
whose correctness depends on one of those, say so plainly and ask for it to be checked on
an actual phone. Don't claim device-specific correctness the pane can't back up.

Known items that have needed real-device (not just pane) verification: full-screen on iOS
Safari specifically, groove feel/latency on real hardware, beam grouping fine details in
asymmetrical meters at a teacher's actual projector resolution.

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

## Mobile invariants — these were bugs once too (Wix embed gets real phone traffic)

- **Never re-derive an SVG's `viewBox` from `svgEl.width.baseVal.value`** once that SVG's
  `width` attribute is a percentage. `.baseVal.value` resolves a percentage length against
  the element's *current rendered CSS box* — on a narrow phone that's the small container
  width, not the (wider) coordinate space the notes were actually laid out in. Feeding
  that back into `viewBox` shrinks the coordinate system without moving any already-placed
  glyphs, silently clipping everything past the new, narrower width. This is exactly why
  notation disappeared on mobile once: `renderOneLineWithVexFlow`'s "re-assert fluid sizing"
  pass in `engine.js` was doing this. Always reuse the original `svgW`/`lineH` the drawing
  was laid out in — they're already in scope; there's never a reason to re-derive them from
  a percentage-resolved DOM read.
- **`100vh` includes the area behind iOS Safari's collapsing URL bar** — the real visible
  height is smaller whenever that chrome is showing, so a fixed `100vh` full-screen layout
  overflows off the bottom of the screen on an iPhone. Use `100dvh` with a `100vh` fallback
  declared first (`height:100vh; height:100dvh;` — an unsupported value is ignored per
  declaration, so older browsers keep the `vh` line and newer ones use `dvh`). Applies to
  `body.present .wrap` and `.modalbox`'s `max-height`.
- **Full-screen's control row is tuned for a wide projector, not a phone.** iOS has no
  working screen-orientation lock, so Full-Screen can't force landscape itself — instead,
  a pure-CSS `@media (orientation:portrait)` swap (`#rotateHint`) replaces the whole UI
  with a "turn your phone sideways" prompt while `body.present` and portrait, and reverts
  live the moment the phone rotates, no JS involved. A second query,
  `@media (orientation:landscape) and (max-height:500px)`, shrinks the control row
  (buttons, fonts, gaps) specifically for a phone turned sideways — tall projectors and
  laptops never hit that height ceiling, so they're untouched. `.cardwrap`/`.card` also
  keep `overflow:auto` (not `hidden`) in present mode as a last-resort safety net — on a
  projector everything already fits via the scale-to-fit logic in `renderCard()`, so
  `auto` never shows a scrollbar there, but it means a still-too-tight phone case scrolls
  instead of silently clipping notation off-screen.
- **Full-screen has two completely different rendering paths, and a phone must use the
  fluid one, not the projector one.** The projector path (`renderCard()`'s default
  present-mode branch) renders VexFlow once at a fixed 760px, then reads `.card`'s real
  size and applies a CSS `transform:scale(k)` to zoom the whole thing up — this depends on
  measuring the container at the right moment, which is fragile when Safari's own chrome
  (address bar, landscape tab bar) is still eating into the viewport and things settle
  later/differently than on desktop. `isCompactPresent()` (mirrors the
  `orientation:landscape and max-height:500px` media query) detects a phone turned
  sideways and routes it through the *same* fluid width:100%+viewBox path normal
  (non-present) mode uses — no transform-scale measurement to get wrong. Its row height is
  measured from `#cardwrap`'s actual (already-compacted) size, so the SVG fills the space
  instead of rendering small-and-top-anchored inside a mostly-empty box. Don't merge these
  two paths or make the phone one "smarter" — the fixed-render-then-zoom approach exists
  specifically so VexFlow never sees an extreme lineWidth on a huge projector, and that
  reasoning doesn't apply on a phone, where the natural size is already in the right range.
- **iOS Safari often doesn't grant real `requestFullscreen()`**, so Full-Screen frequently
  runs with Safari's own chrome still visible — in landscape that's a persistent tab bar
  that `100vh`/`100dvh` don't account for (`dvh` tracks the portrait toolbar's collapse,
  not this). `.wrap`'s height is pinned directly from `window.visualViewport.height` (see
  `fitPresentHeight()`), updated live on its `resize`/`scroll` events, with the `vh`/`dvh`
  CSS only as the fallback for browsers without `visualViewport`.
- **`enterPresent()` deliberately does NOT call `requestFullscreen()` anymore — don't add
  it back without solving the problem that got it removed.** It seemed like an obvious way
  to also hide the *browser's* chrome (address bar, tabs) on top of our own CSS-based
  layout, but it caused more problems than it solved: iOS mostly rejects it anyway (the
  whole reason the CSS-based "present" mode exists), and on desktop, real fullscreen
  introduced browser-level quirks outside the app's control — Chrome/Edge/Firefox reveal
  their own "press Esc to exit" hover bar near the top of a real fullscreen window, and it
  was reported (not fully root-caused — this sandbox's `requestFullscreen()` calls get
  rejected outright, so it couldn't be reproduced directly here) that clicks could stop
  reaching controls anywhere on the page. The CSS-only "present" mode is the reliable,
  well-tested experience everywhere; a user who wants the browser's own chrome gone too
  can press F11 (or their browser's fullscreen shortcut) themselves — the
  `fullscreenchange` listener still notices if they do and adds the extra top clearance
  (the `real-fullscreen` body class) for that hover bar, without our own code ever
  triggering the fragile programmatic path.
- **Audio needs a real user gesture to unlock, and this app is deployed two different
  ways that affect how strict that requirement is.** The Rhythm Trainer's promo card opens
  it in a **new tab** (not an iframe), so any tap/click/keydown anywhere unlocking
  `AudioContext` (see the `ensureAudio()` listeners) has been enough in testing. The
  **Note Board**, by contrast, needed a dedicated "tap to enable sound" button because it's
  actually embedded **in an iframe** on the Wix page, and some browsers are stricter about
  which gestures count as "real" inside embedded/cross-origin content specifically. If the
  Trainer is ever embedded the same way (rather than opened standalone), re-check whether
  the broad gesture-listener approach here is still sufficient, or whether it needs the
  Note Board's explicit button too — don't assume standalone-tab behavior carries over.

## Design constraints

- **Visibility is king.** This gets projected to a full ensemble. Full-screen must be
  huge and must not scroll.
- Theme: powder blue `#a5c8d4`, deep teal `#035772`, Roboto Slab headings, Nunito Sans
  body. Keep the Trainer and the Note Board looking like a family.
- Must work offline, from a single file, on a school Chromebook. No build step in the
  browser, no external deps beyond the VexFlow CDN and Google Fonts.
- Classroom pacing over cleverness. Prefer one obvious control to two clever ones.
- **Mobile Safari is a real, supported target**, not just desktop/Chromebook — the app is
  embedded on beyermusicresources.com (Wix) and gets phone traffic directly. See "Mobile
  invariants" above before touching layout, viewport units, or SVG sizing.

## Deploying

`index.html` at the repo root is served by GitHub Pages. Commit a rebuilt `index.html`
and the live URL updates within about a minute — nothing to re-paste in Wix. The Wix page
embeds `rhythm-flashcard-trainer-promo.html`, whose button opens the app in a new tab.

## Style of collaboration Brad wants

Concise, honest engineering. Say when you disagree and why. Flag anything unverified
rather than papering over it. Don't pad summaries.

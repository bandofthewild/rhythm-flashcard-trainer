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

## Full-screen (present mode) invariants

- **Never give a button the bare class `present` (or any other name that collides with
  the `body.present` mode class).** `enterPresent()` adds class `present` to `<body>` to
  mark full-screen mode; the "Full-Screen"/"Exit" buttons were *also* styled with class
  `present` (unrelated — just a styling class, predating the mode class). A bare `.present`
  selector matches **any** element with that class, including `<body>`, so the shared
  button "press feedback" rule (`.present:active{transform:scale(.92)}`) fired on
  `<body>` itself on every mousedown anywhere in full-screen mode — visibly scaling the
  whole page down to 92% and back on every click. Because a CSS `transform` on `<body>`
  moves every descendant's actual hit-test position without reflowing anything, this made
  clicks in full-screen wildly unreliable on desktop (worked only if mousedown/mouseup
  happened to land within the shifted target) while a slider drag or a synthetic
  `.click()` still worked fine — a very confusing symptom to debug from behavior alone.
  `.present{cursor:pointer}` leaking onto `<body>` was also the source of a stray
  pointer/"hand" cursor hovering over the whole full-screen background. Fixed by renaming
  the buttons' class to `presentbtn`, scoped away from the body mode class. If a full-screen
  desktop click bug like this ever recurs, check computed `transform`/`padding`/`cursor` on
  `<body>` itself first — a bare class selector colliding with `body.present` is a much
  more likely culprit than the fullscreen/audio/viewport machinery this bug was originally
  (wrongly) blamed on.

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
- **`enterPresent()` calls `requestFS(document.documentElement)` to also hide the
  browser's own chrome (tabs, address bar) and the OS taskbar, on top of the CSS-based
  `body.present` layout.** This was pulled out for a while after a desktop bug report
  ("clicking anything in full-screen does nothing, the screen squishes in") that looked
  fullscreen-related — it wasn't; the real cause was the `.present` class collision
  documented above ("Never give a button the bare class `present`"). Once that was fixed,
  there was no remaining reason to avoid real fullscreen, so it was restored. iOS Safari
  still mostly rejects `requestFullscreen()` on non-video elements — `requestFS()` swallows
  that rejection silently, and the CSS-only `body.present` layout is the real, always-on
  fallback everywhere, so a user on a platform that refuses the API sees the same reliable
  experience as before. Chrome/Edge/Firefox briefly show their own "press Esc to exit"
  hover bar near the top of a real fullscreen window when it activates; the
  `fullscreenchange` listener adds the `real-fullscreen` body class (extra top clearance)
  for that. If a fullscreen-adjacent bug ever comes back, check the `.present` class
  collision invariant above before suspecting this call again.
- **Full-screen's height comes from plain CSS (`100vh`/`100dvh`) only — there is
  deliberately no JS re-measuring it.** A `window.visualViewport`-driven
  `fitPresentHeight()` lived here briefly (pinning `.wrap`'s height directly, re-rendering
  the card on every `visualViewport` `resize`/`scroll` event) to work around Safari's
  persistent landscape tab bar not being reflected in `dvh`. It was removed after a
  confirmed report that **real mouse clicks stopped reaching controls anywhere on the
  page** in a plain windowed desktop browser (no real fullscreen involved) — a synthetic
  `.click()` and slider dragging both still worked, meaning something was interfering
  specifically with the browser's own hit-testing, not the app's click handlers
  themselves. It was never conclusively proven that this *specific* mechanism was the
  cause (a continuous re-render loop from a scrollbar toggling by a pixel and re-firing
  `visualViewport` was the leading theory), but it's exactly the kind of continuous,
  global, unproven-on-a-real-device machinery the Note Board doesn't have and doesn't
  need — its present mode is just padding, no explicit height rule at all. Don't
  re-introduce a `visualViewport`-driven height/re-render loop without first confirming
  on a real device that the plain CSS fallback is actually insufficient.
- **There is no global "unlock audio on the first tap anywhere" listener, and there
  shouldn't be one.** One lived on `document` (bubble-phase, self-removing after the first
  `touchstart`/`click`) briefly this session, to address a *reported but never confirmed*
  iOS audio issue. It was removed for the same reason as the point above: unproven
  benefit, and it's global, page-wide machinery the Note Board doesn't have — Note Board
  calls `ensureAudio()` directly from each control that needs it (Play, Tap) and nothing
  else, which is what this file does now too. The Rhythm Trainer's promo card opens it in
  a **new tab** (not an iframe); the **Note Board** needed a dedicated "tap to enable
  sound" button specifically because it's embedded **in an iframe** on the Wix page, where
  some browsers are stricter about which gestures count as "real." If the Trainer is ever
  embedded the same way, re-check whether per-control `ensureAudio()` calls are still
  sufficient, or whether it needs the Note Board's explicit button too.

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

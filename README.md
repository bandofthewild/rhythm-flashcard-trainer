# Rhythm Flashcard Trainer

Fun, practical rhythm drilling — individual or ensemble sight-reading.
Procedurally generated rhythm flash cards for band class, with a counting sweep,
drum grooves, full-screen projection, and beat-locked playback of your own music.

**Live app:** https://bandofthewild.github.io/rhythm-flashcard-trainer/

## Features

- **Flash-card rhythm reading** — a fresh card each turn, or *Hold* to drill one
- **Counting in time** — count-off, then the pulse sweeps "1 e & a" through the bar
- **Every meter** — simple (4/4, 3/4, 2/4), compound (6/8, 9/8, 12/8), cut time,
  and asymmetrical (5/8, 7/8) with a 2+3 / 3+2 grouping picker
- **Six difficulty levels** from whole notes to syncopated 16ths and triplets,
  combinable into a grab-bag; per-value Rhythm Customization on top
- **Card length** 1, 2 or 4 bars
- **Grooves** (rock, funk, latin, march, click) or silent count-along
- **Your Own Music** — load an audio file; the app finds its tempo and downbeat and
  locks the drill to the track, no tapping and no drift
- **Full-screen** projection sized for the back row
- **Save setups**, share a setup by link, save songs (hosted version only)

Everything runs in the browser from one file. No install, works offline, fine on a
Chromebook.

## Build

`index.html` is generated — do not edit it by hand. Edit the three files in `src/`
and rebuild:

```bash
./build.sh      # mac / linux / Git Bash
build.bat       # native Windows cmd
```

The build concatenates `src/shell_top.html + src/engine.js + src/shell_bottom.html`
into `index.html`, syntax-checks it, and runs both test suites. It prints `BUILD OK`
only if everything passes.

Requires **Node.js only** (LTS from nodejs.org). No Python, no other tooling.

## Tests

```bash
node test/generation.test.js   # 3024 rhythm-generation tests -> "Failures: 0"
node test/dsp.test.js          # tempo / phase / bar-phase   -> "21 passed, 0 failed"
```

`dsp.test.js` pulls the tempo-detection functions directly out of
`src/shell_bottom.html`, so the tests cannot drift from shipped code.

Browser rendering (VexFlow) and Web Audio are **not** covered — verify those by eye
and ear.

## Deploying

GitHub Pages serves `index.html` from the repo root. Commit a rebuilt `index.html`
and the live URL refreshes automatically; the Wix embed needs no changes.

`rhythm-flashcard-trainer-promo.html` is the promo card embedded on
beyermusicresources.com; its button opens the live app in a new tab.

## See also

`CLAUDE.md` — architecture notes, invariants, and the verification protocol.
Companion tool: the [Virtual Note Board](https://bandofthewild.github.io/note-board/).

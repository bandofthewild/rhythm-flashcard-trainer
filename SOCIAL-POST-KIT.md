# Rhythm Flashcard Trainer — social post kit

## Read this first: what actually posts where

Social platforms don't render HTML. The promo page (`rhythm-flashcard-trainer-promo.html`)
can't be "posted" as-is — pasting its link produces nothing like that layout. Concretely:

- **Feed autoplay only happens for a video file uploaded natively to the platform.** An
  embedded YouTube iframe never autoplays in someone's feed — if there's a demo video, it
  has to be **downloaded and uploaded** to each platform separately, not linked.
- **Pasting a link produces a preview card built from Open Graph tags**, and that card is
  always a **still image** — never a playing video. That's what `social-link-card-1200x630.png`
  and the meta tags below are for.
- **Bullet points don't survive** into a post. They have to live in the caption text (see
  below) or be baked into the image (already done, on the square/portrait cards).

So the deliverable here is three images, a set of meta tags, and caption text — not an HTML
page.

---

## What's in this kit

| File | Use |
|---|---|
| `social-link-card-1200x630.png` | Open Graph / link-preview image, also postable as a landscape image |
| `social-square-1080.png` | Facebook / Instagram feed post |
| `social-portrait-1080x1350.png` | Instagram portrait (claims the most feed space) |
| Open Graph + Twitter Card tags | Already added to `src/shell_top.html` → `index.html` `<head>` |

---

## Setup steps

1. **Upload the PNGs to the repo root** — already done in this commit
   (`social-link-card-1200x630.png`, `social-square-1080.png`, `social-portrait-1080x1350.png`
   sit next to `index.html`). The `og:image` tag points at
   `https://bandofthewild.github.io/rhythm-flashcard-trainer/social-link-card-1200x630.png` —
   that URL only resolves once both the PNG and the updated `index.html` are pushed and
   GitHub Pages has redeployed (~1 minute after push).
2. **Re-scrape before trusting any preview.** Facebook, LinkedIn, etc. cache link previews
   hard — if you shared this URL before today, the *old* (missing) preview may still be
   cached. Run the URL through [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/)
   and click "Scrape Again" after the new `index.html` is live. Twitter/X has no public
   equivalent — posting the link fresh is usually enough there.
3. **Wix keeps its own social-share image, separately.** Sharing the *Wix page* (not the
   GitHub Pages app URL directly) needs its own image set under Wix's **Page Settings →
   Social Share** — the Open Graph tags added to `index.html` only cover the app's own URL,
   not the Wix promo page that links to it.

---

## Posting a demo video, if/when one exists

- **Download it and upload the actual file natively** to each platform — a linked/embedded
  video will not autoplay in anyone's feed.
- Keep it under **~60 seconds**.
- **Assume it plays on mute by default.** This matters more here than for a purely visual
  tool, since the whole point of this app is *audible* counting — strongly consider
  burned-in captions or on-screen counting text (the app's own counting-syllable sweep is
  already visual, which helps) so the video still makes sense silent.

---

## Captions

**Short (X / Twitter):**
> Free rhythm-reading drill for band & orchestra. Flash-card speed, counts in 1 e & a while the beat sweeps through, six levels, any meter (yes, even 5/8 and 7/8). No login, works on a Chromebook. beyermusicresources.com

**Medium (Facebook / LinkedIn):**
> Rhythm Flashcard Trainer — a free browser-based rhythm-reading drill for band and orchestra.
>
> ✓ Flash-card speed — a fresh rhythm every few seconds, no worksheets
> ✓ Counts in 1 e & a — syllables sweep with the beat as students read
> ✓ Six levels — quarter notes through sixteenths, dots and triplets
> ✓ Any meter — simple, compound, cut time, and asymmetrical 5/8 & 7/8
>
> Projects full-screen for the whole ensemble, or works one-on-one on a phone or Chromebook. No installs, no accounts. Try it: beyermusicresources.com

**Teacher-group (framed as sharing something built, not advertising):**
> I built a free rhythm-reading drill for my own band room and figured other directors might find it useful too. It flashes a new rhythm every few seconds — counts it out loud in 1 e & a while the beat sweeps across the notation — and covers six levels from quarter notes up through sixteenths, dots, triplets, and asymmetrical meters like 5/8 and 7/8. Works full-screen on a projector for the whole ensemble, or one-on-one on a phone. No login, nothing to install: beyermusicresources.com. Happy to answer questions if anyone wants to try it with their own students.

**Instagram (caption links aren't clickable):**
> New free tool for the band room 🥁 Flash-card rhythm reading — counts it in 1 e & a while the beat sweeps through, then flips to a new one. Six levels, any meter (4/4 through asymmetrical 5/8 & 7/8). Link in bio. #bandteacher #musiceducation #rhythm #bandclass #orchestraclass #musicedtech

---

## Cross-promotion worth considering

The Note Board now has a matching kit too. Might be worth a small "part of a free set of
classroom tools" line on each card, or posting the two as a pair — not built here, just
worth raising.

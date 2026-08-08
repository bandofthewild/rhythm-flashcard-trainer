# "Your Own Music" — handoff for the Note Board

Written from the Rhythm Flashcard Trainer, where this feature is shipped, tested, and has
been through several rounds of real UI feedback. The Note Board doesn't have an audio-sync
feature yet; this doc hands over the working design (UI + algorithm) so it can be ported
over with the same shape, rather than re-inventing it from scratch.

**How to use this doc:** section 1 is *why* each UI decision looks the way it does — read
that before touching layout, because most of these choices came from a teacher rejecting a
first attempt and explaining what was actually wrong with it. Section 2 is the DSP/audio
algorithm, which is close to drop-in portable. Section 3 is state/DOM wiring you'll need to
adapt to the Note Board's own code. Section 4 is a list of specific bugs this already hit
once — don't re-hit them. Section 5 is how to test without owning a real audio file.

Note: `tapTempo`/`estimateInterval` (section 2) were themselves *ported from the Note
Board* originally — check whether the Note Board already has this and can be reused as-is,
rather than re-porting the Trainer's copy back.

---

## 0. What the feature does (user-facing)

A teacher loads an audio file from their computer. The app analyzes it locally (no upload,
no server) to find its **tempo** and **downbeat**, then plays the track back through the
app's own audio clock — with the drill/board's own clock riding that exact same clock, so
they can never drift apart, no matter how long the session runs. No tapping required to
get started. If the detected downbeat or tempo is slightly off, there are small correction
controls (÷/×, nudge the downbeat, nudge by ms). If the teacher is playing music from
somewhere the app *can't* load (a phone, a stream, a live accompanist), there's a fallback:
mute the built-in groove/metronome and tap the beat by hand to match it — with the explicit
understanding that this second path *will* drift over time and needs occasional re-syncing,
which is why loading the actual file is presented as the better option whenever possible.

---

## 1. UI/UX architecture — the decisions and why

These were arrived at through several iterations after a live walkthrough with the actual
end user (a band teacher). Reproduce the *shape* of these decisions, not necessarily the
exact pixels — the Note Board has its own visual language, but the same problems will show
up if a similarly-sized feature gets bolted onto an existing control bar.

### 1.1 Give it a real, promoted control — don't bury it in an options drawer

First instinct is to tuck a feature like this into an "Advanced Options" panel alongside
rarer settings. Don't. It's arguably the *best* mode for practicing with real repertoire —
it deserves a same-level, always-visible entry point next to the other primary controls
(Groove, in the Trainer's case), not one extra click deep. Concretely: a **dropdown-style
toggle button** (`♪ Your Own Music ▾` / `▴` when open) sitting in the main control row,
which reveals a collapsible panel with the actual Load/Remove/tempo/downbeat/volume
controls. Nothing music-related stays in the generic options drawer.

### 1.2 First-run explainer, plus a permanent way back into it

The *first* time a teacher opens that panel, show a one-time modal explaining: how it
works, best practices (clean recording, use ÷/× if the tempo reads at half/double speed,
tap the downbeat correction if it lands wrong), and — critically — **how this differs from
playing music from a source the app can't load** (mute the groove, tap the beat by hand,
understand it will drift and needs re-syncing). Gate it on a `localStorage` flag so it only
auto-opens once, ever. Then leave a small, permanent "ⓘ How This Works" button inside the
panel itself so they can pull the same explainer back up any time — don't make it a
one-shot they can never see again. This mirrors whatever "Quick Tour" / onboarding modal
pattern the Note Board already has; keep them as two separate modals (general tour vs.
this feature's own explainer) rather than cramming this into the general tour, though the
general tour should still get 1–2 lines pointing at it.

### 1.3 Say "four taps," specifically, for tap-tempo

If the board has any manual tap-tempo control (for setting tempo without a loaded track,
or for the "different source" fallback), be explicit in the UI copy that it takes **four
taps in a row** to lock onto an accurate reading — not "tap a few times." This isn't vague
guidance; it maps to real behavior in the reference implementation (median-of-intervals,
dropping the first tap once ≥4 taps exist — see 2.4) and, more importantly, to a *hard*
requirement in the live-resync path (the resync only arms exactly on the 4th tap in a row —
see `tapTempo()` in 2.4). Teachers reported being confused when they didn't know this and
assumed 1–2 taps should "just work." Say "four" everywhere this is documented in-app.

### 1.4 Say "Preparing…", not "Ready," while waiting for the track's downbeat

When a loaded track starts, there's necessarily a gap between pressing Play and the
detected downbeat actually arriving — the audio is already playing during that gap (that's
inherent to snapping the drill to the nearest matching beat in the track, not the very
next audio sample). If the status readout says "Ready" during that window, it *looks*
frozen/broken to a teacher who can already hear the track going. Show something like
**"Preparing…"** for that specific wait state, distinct from the idle "Ready." See
`hardResetDrillAt()` in 2.5 — this is the one function that owns that transition.

### 1.5 Picking a different sound/groove must hand the clock back

This is a real bug this app shipped once, so flag it clearly: if a track is loaded and
locked in, and the teacher then clicks a *different* groove/metronome option, playback
must stop using the loaded track and use the newly-picked sound instead. It is **not**
enough to just visually swap the selected button — the underlying "is a track currently
driving the clock" state has to actually clear (unload), or Play will silently keep using
the old track. Concretely: whatever handler responds to a groove/sound picker click should
check "is a track loaded/locked?" and if so, unload it (stop playback, clear the loaded
buffer/state, revert the tempo control back to unlocked, close the panel) *before* applying
the new sound choice. See `removeSong()` + the `soundSeg` wiring in 3.3.

### 1.6 Layout consistency: the row must look identical whether the panel is open or closed

This one took multiple passes to get right, so it's worth explaining the *failure modes*,
not just the final answer.

**Failure mode A:** if the collapsible panel is placed so that it forces a full-width line
break in the surrounding control row only while it happens to be *open*, then the controls
after it (e.g. a "currently loaded file" badge, Play/Full-Screen) visibly jump to a
different row position depending on whether the panel is open or closed. That reads as
buggy even when nothing is technically broken — the eye expects the same row to look the
same regardless of an unrelated toggle's state.

**The fix:** if a "currently loaded" indicator (file-name badge, etc.) and the primary
transport controls (Play/Full-Screen/whatever "go" button exists) need to sit in the *same
row* as other persistent controls (tempo, steps, whatever), put that row in its own
**separate, literal flex container**, not sharing a container with the toggle button that
opens the collapsible panel. Don't rely on the panel's own forced-break behavior to keep
that row separate — make it structurally guaranteed:

```html
<div class="playbarGroup">
  <div class="playbar">
    <!-- groove/sound picker -->
    <!-- "Your Own Music ▾" toggle button -->
  </div>

  <div class="songpanel" id="songPanel" hidden> ... collapsible contents ... </div>

  <div class="playbar">
    <!-- tempo, steps, cards, whatever persistent controls -->
    <!-- loaded-file badge -->
    <!-- Play / Full-Screen -->
  </div>
</div>
```
Two separate `.playbar` flex-wrap containers, with the collapsible panel sandwiched
between them (and itself using `flex:1 1 100%` so *if* it ever shared a container with
something, it would force its own line — but here it just sits between two independent
rows). Verify by measuring: open the panel, note each control's bounding rect; close it;
re-measure; the second row's controls should have **identical** top/left/right in both
states. If they don't, something is still coupled that shouldn't be.

### 1.7 A "loaded file" badge should grow to fill its row, and scroll if the title still overflows

Don't hardcode a badge's width to whatever looked right in one test — either let it
flex-grow to consume whatever space is actually left in its row (`flex:1 1 <sensible
minimum>px; min-width:0` on the wrapping flex item, `width:100%` on the badge itself), or
size it deliberately and accept truncation. If you want to show the *full* title without
truncating and without permanently reserving huge width, add a scroll animation that only
activates when the text actually overflows:

```css
.songbadge{ /* ...background, padding, min-height, a fixed or flex-grown width... */
  overflow:hidden; white-space:nowrap; }
.songbadge .songbadgetext{ display:inline-block; white-space:nowrap; }
.songbadge.scroll .songbadgetext{
  animation-name:songScroll; animation-timing-function:ease-in-out; animation-iteration-count:infinite; }
@keyframes songScroll{
  0%,15%{ transform:translateX(0); }
  50%,85%{ transform:translateX(var(--scrollx,0)); }
  100%{ transform:translateX(0); }
}
```
```js
function setSongBadgeText(text){
  var badge = /* the badge element */, t = /* its inner text span */;
  t.textContent = text;
  badge.classList.remove('scroll'); t.style.transform=''; t.style.animationDuration='';
  requestAnimationFrame(function(){
    var overflow = t.scrollWidth - badge.clientWidth;
    if(overflow > 4){
      var dist = -(overflow + 8);
      t.style.setProperty('--scrollx', dist+'px');
      t.style.animationDuration = Math.max(5, Math.min(16, 4 + Math.abs(dist)/40)) + 's';
      badge.classList.add('scroll');
    }
  });
}
```
Ping-pong (pause → scroll to reveal the end → pause → scroll back), not a one-directional
marquee that snaps back — reads as far less jarring on a projector. Short titles that
already fit just sit still; the `overflow > 4` check is what decides whether to animate at
all, per-title, computed after layout via `requestAnimationFrame`.

### 1.8 Full-screen/presentation mode: merge rows if the width constraint goes away

If (like the Trainer) the app's normal layout is capped at some `max-width` for
readability, but presentation/full-screen mode removes that cap (`max-width:none`) to use
the whole projector width, then rows that had to stay visually separate at the normal width
often *don't* need to anymore — there's plenty of room in full-screen. Rather than
duplicating markup for a "full-screen version" of the control bar, use `display:contents`
to merge the existing rows only in that mode:

```css
body.present .playbarGroup{ display:flex; flex-wrap:wrap; gap:18px; align-items:flex-end; }
body.present .playbarGroup > .playbar{ display:contents; }
```
`display:contents` makes an element generate *no box at all* — its own margin/padding/flex
properties stop applying, but its children render exactly as if they were direct children
of its parent instead, so they become flex items of `.playbarGroup`'s single row. Normal
(non-present) mode is completely unaffected, since this rule only fires under
`body.present`. If there's a live-editable control that isn't essential in full-screen
(the Trainer swaps its "loaded file" badge for a Rhythm Complexity picker, so a teacher can
tweak difficulty live during a projected drill without leaving full-screen) — do that swap
by literally moving the DOM node into a placeholder slot on enter, and back to a marker
element (an empty `<span id="xHome">` left in its original position) on exit:

```js
function moveIntoPresent(){
  var el = document.getElementById('theControl'), slot = document.getElementById('presentSlot');
  if(el && slot){ slot.appendChild(el); slot.style.display='flex'; }
}
function moveHome(){
  var el = document.getElementById('theControl'), home = document.getElementById('theControlHome'), slot = document.getElementById('presentSlot');
  if(el && home) home.parentNode.insertBefore(el, home.nextSibling);
  if(slot) slot.style.display='none';
}
```
Moving the real node (not cloning) means existing event listeners keep working with zero
extra wiring.

### 1.9 The `[hidden]` cascade gotcha — check this before assuming a toggle works

Any element you plan to hide via the plain HTML `hidden` attribute needs to *not* also
match a CSS rule that sets `display` on it — because **any** author-stylesheet rule beats
the browser's built-in `[hidden]{display:none}` default, regardless of specificity (origin
beats specificity in the cascade). Concretely: if your control-group wrapper class does
`.grp{display:flex; ...}`, then `<div class="grp" id="x" hidden>` will **not** actually be
hidden — it'll render as an empty flex box. This bit the Trainer twice (once for a
"currently loaded" badge group, once for a sub-row of controls) before the fix became a
standing rule: **any class that sets `display` must also carry a matching `[hidden]`
override**, e.g. `.grp[hidden]{display:none}`. Audit every `hidden`-toggled element in the
Note Board's existing code for this before adding new ones — it's an easy, invisible bug
that only shows up as "a phantom empty box where nothing should render."

---

## 2. The audio analysis + clock-lock algorithm

This is the actual working pipeline from the Trainer, copied close to verbatim. It's
almost entirely pure DSP + Web Audio API calls with no dependency on the Trainer's rhythm
engine, so it should port with only naming changes (`state.timeSig` → whatever the Note
Board calls its own "beats per bar" concept, if it has one at all — if the Note Board has
no concept of a bar/meter, treat `barLen` as a fixed default like 4 and skip the
meter-aware bits in 2.6).

### 2.1 Onset envelope (`OfflineAudioContext`)

Splits the track into a **bass band** (lowpass @180Hz → used for bar/downbeat phase) and
an **attack band** (bandpass @3200Hz Q0.7, blended with bandpass @900Hz Q0.6 ×0.9 — catches
both percussive and soft/orchestral attacks) → half-wave-rectified rising energy per band,
~86 fps:

```js
function buildOnsetEnvelope(buffer){
  var SR=22050, len=Math.max(1, Math.ceil(buffer.duration*SR));
  var OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  var off=new OAC(2, len, SR);
  var src=off.createBufferSource(); src.buffer=buffer;
  var merger=off.createChannelMerger(2);
  var lp=off.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=180;
  src.connect(lp); lp.connect(merger, 0, 0);                       // ch0 = bass (bar phase)
  var bp1=off.createBiquadFilter(); bp1.type='bandpass'; bp1.frequency.value=3200; bp1.Q.value=0.7;
  var bp2=off.createBiquadFilter(); bp2.type='bandpass'; bp2.frequency.value=900;  bp2.Q.value=0.6;
  var g2=off.createGain(); g2.gain.value=0.9;
  src.connect(bp1); bp1.connect(merger, 0, 1);
  src.connect(bp2); bp2.connect(g2); g2.connect(merger, 0, 1);
  merger.connect(off.destination);
  src.start(0);
  return off.startRendering().then(function(rendered){
    var low=rendered.getChannelData(0), high=rendered.getChannelData(1);
    var hop=256, n=Math.floor(rendered.length/hop), fps=SR/hop;
    var eAll=new Float32Array(n), eLow=new Float32Array(n);
    for(var i=0;i<n;i++){
      var s=i*hop, ls=0, hs=0;
      for(var j=0;j<hop;j++){ var a=low[s+j]||0, b=high[s+j]||0; ls+=a*a; hs+=b*b; }
      eLow[i]=Math.log(1 + ls/hop*400);
      eAll[i]=Math.log(1 + (ls*1.5 + hs)/hop*400);
    }
    var env=new Float32Array(n), envLow=new Float32Array(n);
    for(var k=1;k<n;k++){
      env[k]   =Math.max(0, eAll[k]-eAll[k-1]);
      envLow[k]=Math.max(0, eLow[k]-eLow[k-1]);
    }
    return {env:env, envLow:envLow, fps:fps};
  });
}
```

### 2.2 Tempo + beat phase (comb-filter search with a log-normal prior)

Searches 40–220 BPM in 0.25 BPM steps, scoring each candidate by summing the (mean-removed,
half-wave-rectified) envelope at 24 phase offsets per period, weighted by a log-normal
prior centered at 120 BPM (otherwise it systematically prefers half-tempo). Then refines
phase within the winning period at 200 sub-steps:

```js
function detectTempoFromEnvelope(env, fps, minBpm, maxBpm){
  minBpm=minBpm||40; maxBpm=maxBpm||220;
  var n=env.length; if(n<16) return {bpm:120, phaseFrames:0, beatSec:0};
  var mean=0, i; for(i=0;i<n;i++) mean+=env[i]; mean/=n;
  var e=new Float32Array(n);
  for(i=0;i<n;i++){ var v=env[i]-mean; e[i]= v>0 ? v : 0; }
  function at(x){ if(x<0 || x>=n-1) return 0; var i0=x|0, f=x-i0; return e[i0]*(1-f)+e[i0+1]*f; }
  var bestScore=-1, bestBpm=120, bestPhase=0;
  for(var bpm=minBpm; bpm<=maxBpm+1e-9; bpm+=0.25){
    var period=fps*60/bpm;
    var nb=Math.floor((n-1)/period);
    if(nb<8) continue;                                             // need >=8 beats to trust it
    var prior=Math.exp(-0.5*Math.pow(Math.log2(bpm/120)/0.9, 2));
    for(var p=0;p<24;p++){
      var ph=period*p/24, sum=0;
      for(var k=0;k<nb;k++) sum+=at(ph + k*period);
      var sc=(sum/nb)*prior;
      if(sc>bestScore){ bestScore=sc; bestBpm=bpm; bestPhase=ph; }
    }
  }
  var per2=fps*60/bestBpm, nb2=Math.max(1, Math.floor((n-1)/per2)), bs=-1, bp=bestPhase;
  for(var q=0;q<200;q++){
    var ph2=per2*q/200, s2=0;
    for(var k2=0;k2<nb2;k2++) s2+=at(ph2 + k2*per2);
    if(s2>bs){ bs=s2; bp=ph2; }
  }
  return {bpm:bestBpm, phaseFrames:bp, beatSec:bp/fps};
}
```

### 2.3 Bar phase from the bass band (argmax convention)

Given the detected tempo and a "beats per bar" (`barLen`), buckets bass-band energy by
`beat index mod barLen` and picks the bucket with the highest mean energy as the downbeat:

```js
function pickBarPhase(envLow, fps, bpm, phaseFrames, barLen){
  barLen=Math.max(1, barLen|0);
  var n=envLow.length, period=fps*60/bpm;
  if(!n || !isFinite(period) || period<=0) return 0;
  function at(x){ if(x<0 || x>=n-1) return 0; var i0=x|0, f=x-i0; return envLow[i0]*(1-f)+envLow[i0+1]*f; }
  var sums=new Float64Array(barLen), cnts=new Float64Array(barLen);
  var nb=Math.floor((n-1-phaseFrames)/period);
  for(var k=0;k<nb;k++){ var idx=k % barLen; sums[idx]+=at(phaseFrames + k*period); cnts[idx]++; }
  var arg=0, best=-1;
  for(var i=0;i<barLen;i++){ var v=cnts[i] ? sums[i]/cnts[i] : 0; if(v>best){ best=v; arg=i; } }
  return arg;   // "barBeats" = the index where (k % barLen) === arg — NOT (barLen-arg)%barLen
}
function normBarBeats(song){
  song.barLen=Math.max(1, song.barLen|0);
  song.barBeats=((song.barBeats % song.barLen) + song.barLen) % song.barLen;
}
```
**If this ships wrong the first time, it's almost always this convention getting flipped.**
`barBeats` is the index where `k % barLen === argmax`, full stop — don't "helpfully"
invert it. And always run the result through `normBarBeats` after any change to `barLen`
or `barBeats` (meter change, load, tempo halve/double) — an un-normalized value once froze
a loop elsewhere (see 4).

### 2.4 Tap tempo (median-of-intervals, drops the first tap once ≥4 exist)

```js
function estimateInterval(times){
  var n=times.length; if(n<2) return null;
  var iv=[];
  for(var i=1;i<n;i++) iv.push(times[i]-times[i-1]);
  if(iv.length>=3) iv=iv.slice(1);           // drop the probably-anticipatory first tap once we have ≥4 taps
  iv.sort(function(a,b){ return a-b; });
  var m=iv.length;
  return m%2 ? iv[(m-1)/2] : (iv[m/2-1]+iv[m/2])/2;
}
// inside the tap handler: if NOT currently running, update the tempo live after every tap
// (starting from the 2nd) so it visibly refines as the teacher keeps tapping. If a track
// is currently locked in and running, DON'T update live — instead accumulate taps and only
// commit a resync once exactly 4 taps have landed in one continuous streak (see 3.4):
if(tapTimes.length === 4){ /* arm a resync at lastTapTime + 60/estimatedBpm */ }
```

### 2.5 Playback + clock lock

The song plays through the app's **own** `AudioContext`; the drill/board clock derives its
next event time from the song's own beat-time function — never from `Date.now()` or a
separate timer. This is *the* reason drift can't happen: there's only one clock.

```js
function songPeriod(song){ return 60/Math.max(1, song.bpm); }
function songPosNow(audioCtx, song){ return (audioCtx.currentTime - song.startAudio) + song.startOffset; }
function songBeatTime(song, k){ return song.startAudio - song.startOffset + song.beatSec + k*songPeriod(song); }
function nextDownbeatIndex(audioCtx, song, lead){
  var period=songPeriod(song);
  var k=Math.ceil((songPosNow(audioCtx, song) + (lead||0.15) - song.beatSec)/period);
  var guard=0;
  while((((k % song.barLen)+song.barLen)%song.barLen) !== song.barBeats && guard++ < 128) k++;  // ALWAYS bounded
  return k;
}
```
`hardResetDrillAt(k)` (rename freely) is the one function that (re)starts the
drill/board's own clock at `songBeatTime(k)` — call it on: initial Play, "Tap Beat 1"
(below), nudging the downbeat, nudging phase by ms, halving/doubling tempo, and on a meter
change. It should also be the one place that sets the **"Preparing…"** status (1.4) instead
of an idle "Ready," since the drill can't visually start until the audio clock actually
reaches `k`'s beat time.

```js
function tapBeatOne(audioCtx, song, hardResetDrillAt){    // snaps to NEAREST existing beat, tempo/phase untouched
  var period=songPeriod(song);
  var pos=songPosNow(audioCtx, song) /* minus your own output-latency estimate */;
  var k=Math.round((pos - song.beatSec)/period);
  song.barBeats=((k % song.barLen) + song.barLen) % song.barLen;
  hardResetDrillAt(k + song.barLen);   // comes in a FULL BAR later — gives time to get ready
}
```

### 2.6 Meter-aware bits (only if the board has a concept of "beats per bar")

```js
function barLenForMeter(currentMeterBeatsPerBar){ return Math.max(1, currentMeterBeatsPerBar|0); }
function octaveFactor(currentTimeSig){   // for the ÷2/×2 tempo-correction buttons
  return (['3/4','6/8','9/8','12/8'].indexOf(currentTimeSig) >= 0) ? 3 : 2;
}
```
If the Note Board has no meter concept at all, skip this section — just hardcode
`barLen = 4` and drop the ÷2/×2-factor-of-3 special case.

---

## 3. State shape & wiring you'll need to adapt

The Trainer's `song` object (adapt field names to house style, but keep the shape — it's
been battle-tested):

```js
var song = {
  file:null, name:'', buffer:null, src:null, gain:null, playing:false,
  bpm:0, beatSec:0, barBeats:0, barLen:4, vol:0.9,
  startAudio:0, startOffset:0,
  envLow:null, fps:0, timeSig:'4/4', saved:false
};
function songLoaded(){ return !!song.buffer; }
```

### 3.1 Load + analyze

```js
function loadSongFromFile(file){
  song.file=file; song.name=file.name.replace(/\.[^.]+$/,'');
  var fr=new FileReader();
  fr.onload=function(){
    // keep the ORIGINAL File around for later saving — decodeAudioData can detach the
    // ArrayBuffer, so always pass a .slice(0) copy into it, never the original buffer
    audioCtx.decodeAudioData(fr.result.slice(0), function(buf){
      song.buffer=buf;
      buildOnsetEnvelope(buf).then(function(r){
        song.envLow=r.envLow; song.fps=r.fps;
        var t=detectTempoFromEnvelope(r.env, r.fps, 40, 220);
        song.bpm=t.bpm; song.beatSec=t.beatSec;
        song.barLen=barLenForMeter(/* current beats/bar, or 4 */);
        song.barBeats=pickBarPhase(r.envLow, r.fps, t.bpm, t.phaseFrames, song.barLen);
        normBarBeats();
        applySongLock(true);          // see 3.2
        // set your own tempo display/state to song.bpm; refresh the UI
      });
    });
  };
  fr.readAsArrayBuffer(file);
}
```

### 3.2 Locking/unlocking the rest of the UI

```js
function applySongLock(on){
  // disable the manual tempo slider/input + any "speed ramps up over time" toggle
  // relabel the tempo control ("Tempo" -> "Tempo (from song)")
  // if a manual tap-tempo button exists, relabel it ("Tap" -> "Beat 1") while on
  if(on){ /* force the groove/sound picker to its "off/silent" option — see 1.5 */ }
  // show/hide the tempo-correction row, volume row, "loaded file" badge accordingly
}
function removeSong(){
  stopSongPlayback();
  if(currentlyRunning) stop();
  song.file=null; song.name=''; song.buffer=null; song.envLow=null; song.fps=0; song.bpm=0; song.saved=false;
  applySongLock(false);
}
```

### 3.3 Groove/sound-picker handler must detach a loaded song (see 1.5)

```js
soundPicker.addEventListener('click', function(newSound){
  setSound(newSound);
  if(songLoaded()){ removeSong(); closeSongPanel(); }   // hand the clock back
});
```

### 3.4 Song-panel toggle + first-run explainer gate (see 1.1, 1.2)

```js
function openSongPanel(){
  panelEl.hidden=false; toggleBtn.classList.add('on'); toggleBtn.innerHTML='♪ Your Own Music ▴';
  if(!localStorage.getItem('yourAppSongInfoSeen')){ openSongHelpModal(); localStorage.setItem('yourAppSongInfoSeen','1'); }
}
function closeSongPanel(){
  panelEl.hidden=true; toggleBtn.classList.remove('on'); toggleBtn.innerHTML='♪ Your Own Music ▾';
}
toggleBtn.addEventListener('click', function(){ panelEl.hidden ? openSongPanel() : closeSongPanel(); });
```

### 3.5 Saved songs (IndexedDB — `localStorage` can't hold audio blobs)

The Trainer stores `{name, blob, bpm, beatSec, barBeats, barLen, vol, timeSig, savedAt}`
records in an IndexedDB database, keyed by `name`. Two things worth carrying over:
- **Guard on `location.protocol !== 'file:'`** — IndexedDB is unavailable when the app is
  opened directly from disk (no dev server), and fails *silently* if you don't check first.
  Detect it and tell the user plainly ("saving songs needs the hosted version") rather than
  letting saves quietly no-op.
- **Auto-persist tempo/downbeat corrections**, debounced (~500ms), as the teacher nudges
  ÷/×, the downbeat, or ms offset — so a saved song reopens already aligned next time,
  without a separate explicit "save" step for those corrections.

---

## 4. Invariants — bugs this already hit once; don't reintroduce them

- `barBeats` is the index where `k % barLen === argmax`. **Not** `(barLen - argmax) % barLen`.
- Always run new `barBeats`/`barLen` values through `normBarBeats()` — on load, on meter
  change, after any tempo halve/double. An un-normalized value once froze a search loop.
- The "find the next beat matching `barBeats`" loop (`nextDownbeatIndex`) must have a
  **bounded** guard counter — an infinite loop here freezes the page.
- Tempo bounds should widen (e.g. 30–330 instead of a tighter default range) *while a song
  is locked in*, since a real recording's detected tempo can legitimately need octave
  correction outside a narrower manual-entry range. If a ÷/× correction would exceed the
  bound, report the actual resulting BPM in the error, don't just silently clamp or refuse.
- "Tap Beat 1" snaps to the **nearest existing beat** (tempo/phase both untouched) and the
  drill/board comes in a **full bar** later — not immediately, and not adjusting tempo.
- A meter/beats-per-bar change must **re-derive** the downbeat from the cached envelope
  (`pickBarPhase` again); tempo correctly does **not** change on a meter change alone.
- Keep the original `File`/`Blob` object around for saving — `decodeAudioData` can detach
  the `ArrayBuffer` you pass it, so always hand it a `.slice(0)` copy, never the original.
- IndexedDB is unavailable on `file://` — detect and explain, don't fail silently (3.5).
- While a song owns the clock: any manual tap-tempo control becomes "Beat 1" (repurposed,
  not a separate control), any "speed ramps up automatically" toggle turns off and greys
  out, the manual tempo slider locks and relabels, and the groove/sound picker forces to
  its silent/off option (1.5) — and picking a *different* real sound must hand the clock
  back (also 1.5, and it's listed twice because it's the one that shipped broken once).

---

## 5. Testing without owning a real audio file

You don't need a real song to exercise any of this. Build a tiny synthetic WAV with a
regular click pattern directly in JS (works in a real browser; `File`/`Blob`/`DataTransfer`
are all real APIs there) and dispatch it into the file input as if the user had picked it:

```js
function makeClickWav(bpm, seconds){
  var sr=22050, n=sr*(seconds||8);
  var buf=new ArrayBuffer(44+n*2), view=new DataView(buf);
  function ws(o,s){ for(var i=0;i<s.length;i++) view.setUint8(o+i, s.charCodeAt(i)); }
  ws(0,'RIFF'); view.setUint32(4, 36+n*2, true); ws(8,'WAVE');
  ws(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
  view.setUint32(24,sr,true); view.setUint32(28,sr*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
  ws(36,'data'); view.setUint32(40,n*2,true);
  var period=Math.round(sr*60/bpm);
  for(var i=0;i<n;i++){
    var v=0, ph=i%period;
    if(ph<40){ v=(1-ph/40)*0.9*Math.sin(ph*0.9); }
    view.setInt16(44+i*2, Math.max(-1,Math.min(1,v))*32000, true);
  }
  return new Blob([buf], {type:'audio/wav'});
}
var file=new File([makeClickWav(120)], 'test.wav', {type:'audio/wav'});
var dt=new DataTransfer(); dt.items.add(file);
fileInputEl.files=dt.files;
fileInputEl.dispatchEvent(new Event('change', {bubbles:true}));
```
This exercises the entire pipeline for real (decode → envelope → tempo/phase detect →
lock UI → Play). It won't validate the *tempo detector's accuracy* on real, messy audio
(rubato, reverb, etc. — that only clean real recordings can tell you), but it validates
every piece of wiring around it, which is most of what breaks in practice.

If the Note Board has a Node-based test suite already (the Trainer's does — see its
`test/dsp.test.js`), the tempo/phase-detection and bar-phase functions are pure and
side-effect-free enough to `eval` directly out of the shipped source file and test in
Node with a synthetic click envelope, so the tests can never drift from what's actually
deployed. Worth doing the same here rather than writing a parallel, hand-maintained copy
of the algorithm just for tests.

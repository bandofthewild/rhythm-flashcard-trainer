// ==== LIFTED RHYTHM ENGINE (verbatim from Rhythm Worksheet Generator) ====
const RHYTHM_GLYPHS = {
    'whole': '\uE0A2',           // whole notehead (no stem)
    'half': '\uE0A3\uE1F0',      // half notehead + stem up (approximate stem)
    'quarter': '\uE0A4\uE1F0',   // black + stem
    'eighth': '\uE0A4\uE240',    // black + 8th flag (includes stem)
    'sixteenth': '\uE0A4\uE241', // black + 16th flag
    'dotted8th': '\uE0A4\uE240\uE044', // 8th + augmentation dot
    'dottedHalf': '\uE0A3\uE1F0', 
    'dottedQtr': '\uE0A4\uE1F0\uE044', // with dot
    'wholeRest': '\uE4E3',
    'halfRest': '\uE4E4',
    'qrtrRest': '\uE4E5',
    '8thRest': '\uE4E6',
    '16thRest': '\uE4E7',
    'dotted8thRest': '\uE4E6\uE044', // 8th rest + augmentation dot
    'dottedHalfRest': '\uE4E4\uE044',
    'dottedQrtrRest': '\uE4E5\uE044',
    'eighthTriplet': '\uE0A4\uE240', // for triplet, we'll enhance label
    'eighthNoteTriplet': '\uE0A4\uE240',
    'sixteenthTriplet': '\uE0A4\uE241',
    'quarterTriplet': '\uE0A4\uE1F0',
    'dottedQtrRest': '\uE4E5\uE044'
};

const RHYTHM_DEFS = {
    // Canonical single-entry definitions per key. level = earliest level it appears in any meter list.
    // Weights are base musical preferences (quarter is the "default" strong pulse). New-at-level boost is applied at generation time.
    'whole':             { units: 16, vexDur: 'w',   label: 'Whole Note',        isRest: false, level: 1, weight: 3 },
    'wholeRest':         { units: 16, vexDur: 'wr',  label: 'Whole Rest',        isRest: true,  level: 1, weight: 3 },
    'half':              { units: 8,  vexDur: 'h',   label: 'Half Note',         isRest: false, level: 1, weight: 8 },
    'halfRest':          { units: 8,  vexDur: 'hr',  label: 'Half Rest',         isRest: true,  level: 1, weight: 7 },
    'quarter':           { units: 4,  vexDur: 'q',   label: 'Quarter Note',      isRest: false, level: 1, weight: 14 },
    'qrtrRest':          { units: 4,  vexDur: 'qr',  label: 'Quarter Rest',      isRest: true,  level: 1, weight: 12 },

    'dottedHalf':        { units: 12, vexDur: 'h',   label: 'Dotted Half Note',  isRest: false, level: 1, weight: 5, dots: 1 },
    'dottedHalfRest':    { units: 12, vexDur: 'hr',  label: 'Dotted Half Rest',  isRest: true,  level: 1, weight: 4, dots: 1 },
    'dottedQtr':         { units: 6,  vexDur: 'q',   label: 'Dotted Quarter',    isRest: false, level: 1, weight: 6, dots: 1 },
    'dottedQrtrRest':    { units: 6,  vexDur: 'qr',  label: 'Dotted Quarter Rest', isRest: true, level: 1, weight: 5, dots: 1 },
    'eighth':            { units: 2,  vexDur: '8',   label: '8th Note',          isRest: false, level: 1, weight: 10 },
    // Base duration + dots:1 (VF.Dot.buildAndAttach) — native 8d/8dr codes hide the visual dot
    'dotted8th':         { units: 3,  vexDur: '8',   label: 'Dotted 8th Note',   isRest: false, level: 4, weight: 5, dots: 1 },
    // Dotted 8th rest (3 sixteenths) — always paired with a 16th note/rest to fill a beat
    'dotted8thRest':     { units: 3,  vexDur: '8r',  label: 'Dotted 8th Rest',   isRest: true,  level: 4, weight: 3, dots: 1 },

    '8thRest':           { units: 2,  vexDur: '8r',  label: '8th Rest',          isRest: true,  level: 2, weight: 8 },
    'sixteenth':         { units: 1,  vexDur: '16',  label: '16th Note',         isRest: false, level: 2, weight: 6 },

    // 16th rests are introduced as NEW material at L6 simple / L6 compound (not earlier)
    '16thRest':          { units: 1,  vexDur: '16r', label: '16th Rest',         isRest: true,  level: 6, weight: 5 },

    // Triplets: units = wall-clock duration in 16th-ticks (the space the group occupies)
    // eighthNoteTriplet: 3 eights in the time of 2 → occupies 1 quarter beat (4 ticks) in simple meter
    // sixteenthTriplet: 3 sixteenths in the time of 2 → occupies 1/2 quarter beat (2 ticks)
    // eighthNoteTriplet: 3 eights in time of 2 → 1 quarter beat (4 ticks) simple / same wall-clock in cut
    // sixteenthTriplet: 3 sixteenths in time of 2 → ½ quarter beat (2 ticks)
    // quarterTriplet: 3 quarters in time of 2 → 2 quarter beats (8 ticks) in simple; 1 half-note beat in cut
    'eighthNoteTriplet': { units: 4, vexDur: '8',   label: '8th Note Triplet',  isRest: false, level: 5, weight: 7 },
    'sixteenthTriplet':  { units: 2, vexDur: '16',  label: '16th Note Triplet', isRest: false, level: 6, weight: 7 },
    'quarterTriplet':    { units: 8, vexDur: 'q',   label: 'Quarter Note Triplet', isRest: false, level: 6, weight: 7 }
};

const BEATS_PER_MEASURE = {
    "4/4": 4, "3/4": 3, "2/4": 2,
    "6/8": 6, "9/8": 9, "12/8": 12,
    "2/2": 2, "5/8": 5, "7/8": 7
};

// Units per measure (always 16th-note resolution)
const UNITS_PER_MEASURE = {
    "4/4": 16, "3/4": 12, "2/4": 8,
    "6/8": 12, "9/8": 18, "12/8": 24,
    "2/2": 16,   // Cut time still 16 units (half = beat)
    "5/8": 10, "7/8": 14
};

// Exact cumulative per-meter level additions (single source of truth).
// Used both for checkbox defaults (via getDefaultRhythmsForLevel) and to identify "new" material for generation weighting.
const LEVEL_ADDITIONS = {
    simple: {
        1: ['whole', 'wholeRest', 'half', 'halfRest', 'quarter', 'qrtrRest'],
        2: ['dottedHalf', 'dottedHalfRest', 'eighth'],
        3: ['dottedQtr', '8thRest', 'sixteenth'],
        // L4: dotted quarter rest + dotted 8th (+ rest) for dotted-8th+16th patterns
        4: ['dottedQrtrRest', 'dotted8th', 'dotted8thRest'],
        // L5: 8th-note triplets (3 in the time of 2) on the quarter-note beat
        5: ['eighthNoteTriplet'],
        // L6: 16th rests + 16th-note triplets + quarter-note triplets (3 in time of 2 quarters)
        6: ['16thRest', 'sixteenthTriplet', 'quarterTriplet']
    },
    cut: {
        1: ['whole', 'wholeRest', 'half', 'halfRest'],
        2: ['quarter', 'qrtrRest'],
        3: ['dottedHalf', 'dottedHalfRest', 'eighth'],
        4: [],
        // L5: dotted quarter paired with 8th; quarter-note triplets (3 in time of 2 half-note beat)
        5: ['dottedQtr', 'quarterTriplet'],
        // L6: 8th rests + 8th-note triplets only (no 16ths / 16th rests — those ≈ simple 32nds)
        6: ['8thRest', 'eighthNoteTriplet']
    },
    compound: {
        1: ['dottedHalf', 'dottedHalfRest', 'dottedQtr', 'dottedQrtrRest', 'eighth'],
        2: ['quarter'],
        // L3: quarter rests (paired with 8th like quarters); no other vocab change from L2
        3: ['qrtrRest'],
        4: ['8thRest', 'sixteenth'],
        // L5: pattern unlocks (3×quarter syncopation, 8th rests between 8ths, 16ths in 2s/4s with 8ths)
        5: ['quarter', '8thRest', 'sixteenth', 'eighth'],
        // L6: 16th rests + dotted 8th note/rest paired with 16ths (rest form preserved in normalize)
        6: ['16thRest', 'dotted8th', 'dotted8thRest']
    }
};
// (dotted8thRest is in the L6 package so Recommended includes it; emission only uses
//  rest form when that key is user-enabled — see preferDotted8RestForm)

// =====================================================
// INITIALIZATION
// =====================================================

/** True when loaded inside Wix HTML component or with ?embed=1 */
function getMeterPlaybackConfig(timeSig) {
    const ts = timeSig || '4/4';
    if (ts === '6/8') {
        return { kind: 'compound', pulseUnits: 6, pulsesPerMeasure: 2, pulseLabel: 'Beat = dotted quarter (1, 4)' };
    }
    if (ts === '9/8') {
        return { kind: 'compound', pulseUnits: 6, pulsesPerMeasure: 3, pulseLabel: 'Beat = dotted quarter (1, 4, 7)' };
    }
    if (ts === '12/8') {
        return { kind: 'compound', pulseUnits: 6, pulsesPerMeasure: 4, pulseLabel: 'Beat = dotted quarter (1, 4, 7, 10)' };
    }
    if (ts === '2/2') {
        return { kind: 'cut', pulseUnits: 8, pulsesPerMeasure: 2, pulseLabel: 'Beat = half note (cut time)' };
    }
    if (ts === '5/8' || ts === '7/8') {
        const n = (ts === '5/8') ? 5 : 7;   // counted per eighth; grouping drives the felt accents
        return { kind: 'odd', pulseUnits: 2, pulsesPerMeasure: n, pulseLabel: 'Counted in eighths' };
    }
    // Simple meters with quarter-note pulse
    const num = parseInt(String(ts).split('/')[0], 10) || 4;
    return { kind: 'simple', pulseUnits: 4, pulsesPerMeasure: num, pulseLabel: 'Beat = quarter note' };
}

/** Seconds for a given duration in 16th-units at the current pulse BPM */
function unitsToSeconds(units, bpm, pulseUnits) {
    const pu = pulseUnits || 4;
    const b = bpm || 90;
    return (Math.max(0, units) / pu) * (60 / b);
}

/** Expand a measure's events into audible attack slices (triplets → 3 equal notes) */
function expandPlaybackEvents(measureEvents) {
    const out = [];
    (measureEvents || []).forEach(ev => {
        if (!ev) return;
        if (ev.key && String(ev.key).includes('Triplet') && !eventIsRest(ev)) {
            const each = (ev.units || 0) / 3;
            for (let t = 0; t < 3; t++) {
                out.push({
                    units: each,
                    isRest: false,
                    key: '_tripletNote',
                    parentKey: ev.key,
                    // Triplets never participate in across-barline ties
                    tieToNext: false,
                    tiedFromPrev: false
                });
            }
        } else {
            out.push({
                units: ev.units || 0,
                isRest: !!(ev.isRest || eventIsRest(ev)),
                key: ev.key,
                parentKey: ev.key,
                tieToNext: !!ev.tieToNext,
                tiedFromPrev: !!ev.tiedFromPrev
            });
        }
    });
    return out;
}

/** User checked "Allow ties" (across-barline only in v1) */
function allowTiesEnabled() {
    const el = document.getElementById('allowTies');
    return !!(el && el.checked);
}

/**
 * May this event start or end an across-barline tie?
 * Notes only (not rests), not triplets — keeps existing measure math untouched.
 */
function isAcrossBarlineTieable(ev) {
    if (!ev) return false;
    if (eventIsRest(ev) || ev.isRest) return false;
    if (ev.key && String(ev.key).includes('Triplet')) return false;
    if ((ev.units || 0) <= 0) return false;
    return true;
}

/**
 * Post-process generated measures: mark note→note ties across barlines.
 * Does NOT rewrite durations or re-run measure math — only adds flags:
 *   last.tieToNext = true, first.tiedFromPrev = true
 *
 * When Allow ties is on:
 *   • At least 2 ties when 2+ legal barlines exist (note ending + note starting next bar)
 *   • More ties with higher density / more measures / Hard presentation difficulty
 *   • Capped so the page is not all ties (~70% of legal candidates max)
 */
function applyAcrossBarlineTies(measures, difficulty) {
    if (!measures || measures.length < 2) return measures;
    if (!allowTiesEnabled()) return measures;

    // Clear any stale flags (regeneration safety)
    for (let m = 0; m < measures.length; m++) {
        const evs = measures[m] || [];
        for (let i = 0; i < evs.length; i++) {
            if (!evs[i]) continue;
            evs[i].tieToNext = false;
            evs[i].tiedFromPrev = false;
        }
    }

    // Collect every barline where a legal note→note tie is possible
    const candidates = [];
    for (let m = 0; m < measures.length - 1; m++) {
        const cur = measures[m];
        const next = measures[m + 1];
        if (!cur || !cur.length || !next || !next.length) continue;
        const last = cur[cur.length - 1];
        const first = next[0];
        if (!isAcrossBarlineTieable(last) || !isAcrossBarlineTieable(first)) continue;
        candidates.push({ m, last, first });
    }
    if (candidates.length === 0) return measures;

    const d = (difficulty === 'easy' || difficulty === 'hard') ? difficulty : 'medium';
    const nCand = candidates.length;
    // Always aim for at least 2 when possible
    const minTies = Math.min(2, nCand);

    // Base target as a fraction of legal barlines (Easy still meets min of 2)
    const frac = d === 'hard' ? 0.58 : (d === 'easy' ? 0.32 : 0.45);
    let target = Math.max(minTies, Math.round(nCand * frac));

    // Complexity / length boosts (more short notes or more bars → a few extra ties)
    let shortNotes = 0;
    let totalNotes = 0;
    for (let m = 0; m < measures.length; m++) {
        const evs = measures[m] || [];
        for (let i = 0; i < evs.length; i++) {
            const ev = evs[i];
            if (!ev || eventIsRest(ev) || ev.isRest) continue;
            totalNotes++;
            if ((ev.units || 0) <= 2) shortNotes++;
        }
    }
    if (shortNotes >= 8) target += 1;
    if (shortNotes >= 18) target += 1;
    if (measures.length >= 12) target += 1;
    if (measures.length >= 16 && d !== 'easy') target += 1;
    if (totalNotes >= 40 && d === 'hard') target += 1;

    // Cap: leave some untied barlines so it does not look forced
    const maxTies = Math.max(minTies, Math.floor(nCand * 0.72));
    target = Math.min(Math.max(minTies, target), maxTies, nCand);

    // Shuffle candidates
    for (let i = nCand - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = candidates[i];
        candidates[i] = candidates[j];
        candidates[j] = tmp;
    }

    const chosen = [];
    const usedBar = new Set();

    // Pass 1: prefer non-adjacent barlines for visual spacing
    for (let i = 0; i < candidates.length && chosen.length < target; i++) {
        const c = candidates[i];
        if (usedBar.has(c.m - 1) || usedBar.has(c.m + 1) || usedBar.has(c.m)) continue;
        chosen.push(c);
        usedBar.add(c.m);
    }
    // Pass 2: fill remaining slots (allow adjacent) to hit target / min of 2
    for (let i = 0; i < candidates.length && chosen.length < target; i++) {
        const c = candidates[i];
        if (usedBar.has(c.m)) continue;
        chosen.push(c);
        usedBar.add(c.m);
    }

    for (let i = 0; i < chosen.length; i++) {
        chosen[i].last.tieToNext = true;
        chosen[i].first.tiedFromPrev = true;
    }
    return measures;
}

/**
 * Post-process: within-measure note→note ties (syncopation / sustained values).
 * Runs AFTER across-barline ties — never clears those flags.
 * Only pairs consecutive tieable notes that are not already in a tie chain.
 * Prefers pairs that cross a pulse/beat boundary (more musical).
 */
function applyWithinMeasureTies(measures, difficulty, timeSig) {
    if (!measures || !measures.length) return measures;
    if (!allowTiesEnabled()) return measures;

    const d = (difficulty === 'easy' || difficulty === 'hard') ? difficulty : 'medium';
    const meter = getMeterPlaybackConfig(timeSig || '4/4');
    const beatU = meter.pulseUnits || 4;

    // Collect candidates across all measures: { m, i, a, b, crossBeat }
    const candidates = [];
    for (let m = 0; m < measures.length; m++) {
        const evs = measures[m] || [];
        if (evs.length < 2) continue;
        let pos = 0;
        for (let i = 0; i < evs.length - 1; i++) {
            const a = evs[i];
            const b = evs[i + 1];
            const aUnits = (a && a.units) ? a.units : 0;
            const startA = pos;
            const startB = pos + aUnits;
            pos += aUnits;

            if (!isAcrossBarlineTieable(a) || !isAcrossBarlineTieable(b)) continue;
            // Skip if already part of a tie (e.g. across-barline on measure edge)
            if (a.tieToNext || b.tiedFromPrev) continue;

            const crossBeat = Math.floor(startA / beatU) !== Math.floor(startB / beatU);
            candidates.push({ m, i, a, b, crossBeat });
        }
    }
    if (candidates.length === 0) return measures;

    const nCand = candidates.length;
    // At least 1–2 within-measure ties when possible; scale with difficulty
    const minTies = Math.min(d === 'easy' ? 1 : 2, nCand);
    const frac = d === 'hard' ? 0.38 : (d === 'easy' ? 0.18 : 0.28);
    let target = Math.max(minTies, Math.round(nCand * frac));
    if (nCand >= 8) target += 1;
    if (nCand >= 14 && d !== 'easy') target += 1;
    if (d === 'hard' && nCand >= 6) target += 1;
    // Cap: don't tie most consecutive pairs
    const maxTies = Math.max(minTies, Math.floor(nCand * 0.45));
    target = Math.min(Math.max(minTies, target), maxTies, nCand);

    // Prefer cross-beat pairs first
    const preferred = candidates.filter(c => c.crossBeat);
    const rest = candidates.filter(c => !c.crossBeat);
    const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    };
    shuffle(preferred);
    shuffle(rest);
    const ordered = preferred.concat(rest);

    const chosen = [];
    // Avoid using the same event as both end of one tie and start of another in one pass
    // when it would create a 3-note chain mid-measure too often — chains are OK but
    // limit via used indices: each event index can be used at most once as "a" or "b"
    const usedKey = new Set(); // "m:i" for each event slot involved

    for (let k = 0; k < ordered.length && chosen.length < target; k++) {
        const c = ordered[k];
        const ka = c.m + ':' + c.i;
        const kb = c.m + ':' + (c.i + 1);
        if (usedKey.has(ka) || usedKey.has(kb)) continue;
        // Still free of tie flags (across-barline may have claimed edges)
        if (c.a.tieToNext || c.b.tiedFromPrev) continue;
        chosen.push(c);
        usedKey.add(ka);
        usedKey.add(kb);
    }

    for (let k = 0; k < chosen.length; k++) {
        chosen[k].a.tieToNext = true;
        chosen[k].b.tiedFromPrev = true;
    }
    return measures;
}

/** Short labels for the curriculum level dropdown, by meter family */
function getLevelHintText(level, meterCat) {
    const cat = meterCat || 'simple';
    const L = level || 1;
    const hints = {
        simple: {
            1: 'Simple: whole, half, quarter notes & rests',
            2: 'Simple: + dotted half + 8th notes',
            3: 'Simple: + dotted quarter, 8th rests, 16ths in sets of 4 (1 e & a)',
            4: 'Simple: mixed 16ths with 8ths, dotted 8th notes & rests, syncopation',
            5: 'Simple: + 8th-note triplets; more 16th/8th mixes',
            6: 'Simple: + 16th rests, 16th triplets (½ beat) + quarter triplets (2 beats)'
        },
        cut: {
            1: 'Cut time: whole & half notes/rests only',
            2: 'Cut time: + quarter notes & rests',
            3: 'Cut time: + dotted halves + 8ths in sets of 4 (one half-note beat)',
            4: 'Cut time: 8th notes in any context',
            5: 'Cut time: + dotted quarter paired with 8th + quarter-note triplets',
            6: 'Cut time: + 8th rests + 8th-note triplets'
        },
        compound: {
            1: 'Compound: dotted half/quarter + 8ths in sets of 3 only',
            2: 'Compound: + quarters; 8ths after quarters as well as sets of 3',
            3: 'Compound: + quarter rests (paired with 8th like quarter notes)',
            4: 'Compound: + 8th rests + 16ths in sets of 6',
            5: 'Compound: + 16ths in 2s/4s with 8ths; 3× quarter syncopation (two big beats)',
            6: 'Compound: + 16th rests + dotted 8th notes & rests with 16ths'
        }
    };
    return (hints[cat] && hints[cat][L]) || 'Recommended package for this level';
}

function getCurrentWorksheetType() {
    return 'write-counting';
}

// Generate proper educational counting syllables for each event in a measure.
// This version correctly handles starting syllable based on the event's position in the beat grid.
function getCountingSyllables(events, timeSig) {
    const isCompound = ["6/8", "9/8", "12/8", "5/8", "7/8"].includes(timeSig);
    const isCut = (timeSig === "2/2");
    const result = [];
    let currentSub = 0; // 16th-note position in the measure
    
    events.forEach(ev => {
        const duration = ev.units;
        const startSub = currentSub;
        
        let text;
        
        if (isCut) {
            // Cut time: the HALF NOTE gets the beat, so a measure has 2 beats (never 3 or 4).
            // Counting is one tier removed from simple time — half = beat (1, 2),
            // whole = 1-2, quarter = "1 & 2 &", eighth = "1 e & a". Beat = 8 sixteenth-units.
            const beat = Math.floor(startSub / 8);   // 0 or 1 (half-note beats)
            const posInBeat = startSub % 8;
            const beatNum = beat + 1;                 // 1 or 2 only

            if (posInBeat === 0) text = String(beatNum);   // half-note beat
            else if (posInBeat === 4) text = '&';          // quarter-note offbeat
            else if (posInBeat === 2) text = 'e';          // eighth-note subdivision
            else if (posInBeat === 6) text = 'a';
            else text = '';                                // finer than an eighth (rare in cut)

            // Whole note (2 beats) → "1-2"
            const beatsCovered = Math.ceil(duration / 8);
            for (let b = 1; b < beatsCovered; b++) {
                text += '-' + (beat + b + 1);
            }
        } else if (isCompound) {
            // Compound meters counted at the EIGHTH-NOTE level: every eighth gets its
            // own number across the whole bar (6/8 -> 1 2 3 4 5 6, 9/8 -> 1..9, 12/8 -> 1..12),
            // with "&" on the sixteenth between eighths. The felt beat (dotted quarter)
            // stays compound; this is the counting a beginner reads. No wrap at 4.
            const beat = Math.floor(startSub / 2);   // eighth-note index within the measure (0-based)
            const subInBeat = startSub % 2;           // 0 = on the eighth, 1 = the sixteenth after it
            const beatNum = beat + 1;                 // 1..N ordinal, never wraps

            if (subInBeat === 0) {
                text = String(beatNum);
            } else {
                text = '&';
            }

            // Notes longer than one eighth show every eighth they cover (e.g. dotted quarter = 1-2-3)
            const beatsCovered = Math.ceil(duration / 2);
            for (let b = 1; b < beatsCovered; b++) {
                text += '-' + (beat + b + 1);
            }
        } else {
            // 4/4, 3/4, 2/4
            const beat = Math.floor(startSub / 4);
            const subInBeat = startSub % 4;
            const beatNum = (beat % 4) + 1;
            
            if (subInBeat === 0) {
                text = String(beatNum);
            } else if (subInBeat === 1) {
                text = 'e';
            } else if (subInBeat === 2) {
                text = '&';
            } else {
                text = 'a';
            }
            
            // Append dashes + next beat numbers for notes that cover full additional beats
            const beatsCovered = Math.ceil(duration / 4);
            for (let b = 1; b < beatsCovered; b++) {
                const nextBeatNum = ((beat + b) % 4) + 1;
                text += '-' + nextBeatNum;
            }
        }
        
        if (eventIsRest(ev)) {
            text = `(${text})`;
        }
        
        result.push(text);
        currentSub += duration;
    });
    
    return result;
}

// Legacy helper kept for any remaining simple string use
function getCountingTextForMeasure(events, timeSig) {
    return getCountingSyllables(events, timeSig).join('   ');
}

// =====================================================
// RHYTHM GENERATION ENGINE (SMART + MUSICAL)
// =====================================================

function getEnabledRhythms() {
    // The checkboxes (kept in sync by applyLevelDefaults + meter-aware getDefaultRhythmsForLevel)
    // are now the single source of truth for what is allowed for the current level + time signature.
    // No extra global level filter here.
    const enabled = [];
    Object.keys(RHYTHM_DEFS).forEach(key => {
        const checkbox = document.getElementById(`rhythm-${key}`);
        const def = RHYTHM_DEFS[key];
        if (checkbox && checkbox.checked) {
            enabled.push({ key, ...def });
        }
    });
    return enabled;
}

// --- Pattern difficulty (Easy / Medium / Hard) — orthogonal to curriculum Level 1–6 ---
// Level = recommended note package. Difficulty = how dense / unorthodox assemblies are.

function getPresentationDifficulty() {
    const el = document.getElementById('dropdownDifficulty');
    const v = el ? String(el.value || 'medium').toLowerCase() : 'medium';
    if (v === 'easy' || v === 'hard') return v;
    return 'medium';
}

/** Default pattern difficulty when applying a curriculum level package */
function defaultDifficultyForLevel(level) {
    const L = level || 1;
    // L1–3 default Easy so recommended packages stay simple (e.g. L3 = 4×16 packs only)
    if (L <= 3) return 'easy';
    if (L <= 5) return 'medium';
    return 'hard';
}

/**
 * Minimum grouping / hygiene level required by the enabled pool.
 * Ensures custom checkboxes never produce illegal lone 16ths/8ths even on Level 1.
 * Does not exceed what the pool can support (e.g. no L4 syncopation without dotted 8ths).
 */
/**
 * @param {Array} pool enabled rhythm defs
 * @param {boolean} [isCompound] compound meters need higher "emitter" levels for 16th/dotted-8 paths
 */
function minGroupLevelFromPool(pool, isCompound) {
    const keys = new Set((pool || []).map(r => r.key));
    let g = 1;

    if (isCompound) {
        // Compound L1 already has eighth + dottedQ + dottedHalf — do not bump those.
        // L2 = quarters; L3 = quarter rests; L4 = 16ths in sets of 6 (+ 8th rests);
        // L5 mixed 16ths is curriculum-driven (do NOT bump to 5 for eighth+sixteenth).
        // L6 = 16th rests / dotted 8ths. Custom 16th triplets → mixed emitter hygiene.
        if (keys.has('quarter') || keys.has('qrtrRest')) g = Math.max(g, 2);
        if (keys.has('sixteenth') || keys.has('8thRest')) g = Math.max(g, 4);
        // Mixed 16th+8th patterns (2s/4s) are curriculum L5+ via Math.max(curriculumLevel, g)
        if (keys.has('sixteenthTriplet')) g = Math.max(g, 5);
        if (keys.has('dotted8th') || keys.has('dotted8thRest') || keys.has('16thRest')) g = Math.max(g, 6);
        return g;
    }

    // --- Simple / cut ---
    if (keys.has('eighth') || keys.has('8thRest') || keys.has('dottedHalf') || keys.has('dottedHalfRest')) {
        g = Math.max(g, 2);
    }
    if (keys.has('dottedQtr') || keys.has('dottedQrtrRest')) {
        g = Math.max(g, 3);
    }
    if (keys.has('sixteenth')) {
        // Simple L3: 16ths ONLY in sets of 4 (curriculum L3 already includes 8ths from L2).
        // Mixed 16ths unlock via dotted 8ths (L4).
        g = Math.max(g, 3);
    }
    if (keys.has('dotted8th') || keys.has('dotted8thRest')) {
        g = Math.max(g, 4);
    }
    if (keys.has('eighthNoteTriplet') || keys.has('quarterTriplet')) g = Math.max(g, 5);
    if (keys.has('sixteenthTriplet') || keys.has('16thRest')) g = Math.max(g, 6);
    if (keys.has('eighth')) g = Math.max(g, 2);
    return g;
}

/**
 * How "advanced" is the enabled palette? 0 = L1-ish (whole/half/quarter only),
 * 1 = full advanced set (16ths, dotted 8ths, triplets, …).
 * Curriculum level and custom checkboxes both contribute so L6 Easy never collapses
 * to whole-note pages, and L1+custom-16ths still raises the floor.
 */
function poolSophistication(poolKeys, curriculumLevel) {
    const keys = poolKeys instanceof Set ? poolKeys : new Set(poolKeys || []);
    let s = 0;
    // Curriculum floor: L1≈0.05 … L6≈0.72
    const L = Math.max(1, Math.min(6, curriculumLevel || 1));
    s = Math.max(s, (L - 1) / 5 * 0.72);

    if (keys.has('quarter') || keys.has('qrtrRest')) s = Math.max(s, 0.12);
    if (keys.has('eighth') || keys.has('8thRest')) s = Math.max(s, 0.32);
    if (keys.has('dottedQtr') || keys.has('dottedQrtrRest')) s = Math.max(s, 0.42);
    if (keys.has('sixteenth')) s = Math.max(s, 0.55);
    if (keys.has('dotted8th') || keys.has('dotted8thRest')) s = Math.max(s, 0.68);
    if (keys.has('eighthNoteTriplet') || keys.has('quarterTriplet')) s = Math.max(s, 0.78);
    if (keys.has('sixteenthTriplet') || keys.has('16thRest')) s = Math.max(s, 0.90);
    return Math.max(0, Math.min(1, s));
}

function _lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Presentation difficulty × pool sophistication.
 * Easy/Med/Hard still slide density, but the whole scale lifts as the package gets harder.
 *   L1 Easy  → sparse (wholes/halves ok)
 *   L6 Easy  → still advanced palette, just roomier / simpler assemblies than L6 Hard
 *   L6 Hard  → densest + fullest pattern set
 */
function difficultyWeightConfig(difficulty, sophistication) {
    const soph = sophistication == null ? 0.35 : sophistication;
    let base;
    if (difficulty === 'easy') {
        base = {
            shortMul: 0.40,
            midMul: 0.75,
            longMul: 1.45,
            exactFitMul: 3.0,
            fullBarFitMul: 1.65,
            fullBarForceP: 0.30,
            // Target denserRank (0=longest in pool, 1=shortest). Easy stays left of center.
            targetDensity: 0.14,
            densitySigma: 0.38,
            longAtDownbeat: 1.35,
            shortAtDownbeat: 0.88,
            patternStyle: 'basic'
        };
    } else if (difficulty === 'hard') {
        base = {
            shortMul: 2.2,
            midMul: 1.3,
            longMul: 0.32,
            exactFitMul: 1.15,
            fullBarFitMul: 0.35,
            fullBarForceP: 0.05,
            targetDensity: 0.78,
            densitySigma: 0.24,
            longAtDownbeat: 0.55,
            shortAtDownbeat: 1.4,
            patternStyle: 'full'
        };
    } else {
        // Medium: closer to Easy than Hard, especially on early levels (L1–L3)
        base = {
            shortMul: 0.85,
            midMul: 1.0,
            longMul: 0.95,
            exactFitMul: 2.35,
            fullBarFitMul: 1.05,
            fullBarForceP: 0.18,
            targetDensity: 0.30,   // was 0.48 — gentler step up from Easy (0.14)
            densitySigma: 0.34,   // wider band = more mix, less “all short”
            longAtDownbeat: 1.12,
            shortAtDownbeat: 1.02,
            patternStyle: 'standard'
        };
    }

    // Lift Easy/Med toward denser mid-short as sophistication rises (L6 Easy ≠ whole notes).
    // Hard already dense — slight extra pull toward shortest values.
    // Medium: gentle densify at low levels (small Easy→Medium step); a bit more at L5–L6
    // so Medium never sits *below* Easy on advanced packages.
    const densify = difficulty === 'easy' ? 0.50
        : (difficulty === 'hard' ? 0.18 : (0.20 + soph * 0.24));
    base.targetDensity = Math.min(0.95, base.targetDensity + soph * densify);

    // Absolute short/long buckets soften toward neutral when the package is advanced
    // so Easy L6 still uses 16ths/triplets instead of crushing them with longMul.
    const soften = soph * (difficulty === 'easy' ? 0.78 : (difficulty === 'hard' ? 0.25 : 0.48));
    base.shortMul = _lerp(base.shortMul, 1.05, soften);
    base.midMul = _lerp(base.midMul, 1.0, soften * 0.6);
    base.longMul = _lerp(base.longMul, 0.95, soften);

    // Full-bar wholes become rare once short values exist in the package
    base.fullBarFitMul = _lerp(base.fullBarFitMul, 0.38, soph * 0.9);
    base.fullBarForceP = _lerp(base.fullBarForceP, 0.035, soph * 0.95);
    base.exactFitMul = _lerp(base.exactFitMul, 1.35, soph * 0.7);

    // Slightly narrower band on advanced packages so we sit near the target density
    base.densitySigma = _lerp(base.densitySigma, 0.22, soph * 0.45);

    base.sophistication = soph;
    return base;
}

/** Build min/max units among primary (non-auto) candidates for relative density ranking. */
function buildDensityContext(candidates) {
    const units = (candidates || [])
        .filter(r => r && !r.__autoCompleter && r.units > 0)
        .map(r => r.units);
    if (!units.length) return { shortest: 4, longest: 16 };
    return { shortest: Math.min(...units), longest: Math.max(...units) };
}

/** Downbeat bias scaled by Easy/Med/Hard and pool sophistication. */
function downbeatDensityMul(r, difficulty, position, downbeatBias, sophistication) {
    if (position !== 0) return 1;
    const cfg = difficultyWeightConfig(difficulty, sophistication);
    const u = r.units || 4;
    const base = downbeatBias || 1;
    if (u >= 8) return base * cfg.longAtDownbeat;
    if (u <= 2) return base * cfg.shortAtDownbeat;
    return base * ((cfg.longAtDownbeat + cfg.shortAtDownbeat) * 0.5);
}

/**
 * Chance to force a dense short group at a legal beat start:
 *   compound → 3×8th on a big beat; cut → 4×8th on a half-note beat.
 * Easy stays sparse (long dotted values); Hard is busier with short groups.
 */
function shortGroupForceProbability(difficulty, sophistication) {
    const soph = sophistication == null ? 0.3 : sophistication;
    if (difficulty === 'easy') return _lerp(0.06, 0.14, soph);
    if (difficulty === 'hard') return _lerp(0.52, 0.70, soph);
    return _lerp(0.20, 0.36, soph);
}

/**
 * Extra weight for compound-meter candidates by difficulty.
 * Easy → dotted half / dotted quarter; Hard → shorter allowed values.
 */
function compoundMeterDensityMul(r, difficulty, sophistication) {
    if (!r) return 1;
    const u = r.units || 4;
    const d = difficulty || 'medium';
    // Full-measure dotted half (12 in 6/8) / long rests
    if (u >= 12) {
        if (d === 'easy') return 2.4;
        if (d === 'hard') return 0.45;
        return 1.15;
    }
    // Dotted quarter = one complete big beat (preferred on Easy/Med over 3×8)
    if (u === 6 && (r.dots || r.key === 'dottedQtr' || r.key === 'dottedQrtrRest')) {
        if (d === 'easy') return 2.0;
        if (d === 'hard') return 0.75;
        return 1.25;
    }
    // Quarters (L2+) mid density
    if (u === 4 && !r.dots) {
        if (d === 'easy') return 0.85;
        if (d === 'hard') return 1.35;
        return 1.1;
    }
    // Raw 8ths as pickers (should be rare; groups emitted separately)
    if (u === 2) {
        if (d === 'easy') return 0.35;
        if (d === 'hard') return 1.5;
        return 0.9;
    }
    return 1;
}

/** Cut time (2/2): Easy favors whole/half; Hard favors 8th-beat patterns. */
function cutMeterDensityMul(r, difficulty) {
    if (!r) return 1;
    const u = r.units || 4;
    const d = difficulty || 'medium';
    if (u >= 16) {
        if (d === 'easy') return 2.2;
        if (d === 'hard') return 0.4;
        return 1.1;
    }
    if (u >= 8) {
        if (d === 'easy') return 1.7;
        if (d === 'hard') return 0.7;
        return 1.15;
    }
    if (u === 4) {
        if (d === 'easy') return 0.9;
        if (d === 'hard') return 1.25;
        return 1.05;
    }
    if (u === 2) {
        if (d === 'easy') return 0.4;
        if (d === 'hard') return 1.55;
        return 0.95;
    }
    return 1;
}

const COMPOUND_BIG_BEAT = 6; // 16th-ticks per dotted-quarter pulse

/**
 * May this value start at `position` in compound meter without writing awkward
 * cross-beat figures (e.g. quarter + dotted-half + 8th in 9/8)?
 * Big beat = 6 units. Most primary values only start on a big-beat boundary.
 */
function compoundValueLegalAt(r, position, remaining) {
    if (!r || r.units > remaining) return false;
    const sub = position % COMPOUND_BIG_BEAT;
    const u = r.units || 0;
    const k = r.key || '';

    // Dotted half (12) = two big beats — only on a big-beat start
    if (k === 'dottedHalf' || k === 'dottedHalfRest' || u === 12) {
        return sub === 0 && remaining >= 12;
    }
    // Dotted quarter (6) = one complete big beat
    if (k === 'dottedQtr' || k === 'dottedQrtrRest' || (u === 6 && r.dots)) {
        return sub === 0 && remaining >= 6;
    }
    // Quarter (4) must start a big beat and leave room for the completing 8th (2)
    if (k === 'quarter' || k === 'qrtrRest') {
        return sub === 0 && remaining >= 6;
    }
    // Whole / plain half don't align to dotted-quarter pulse
    if (k === 'whole' || k === 'wholeRest' || u === 16) return false;
    if ((k === 'half' || k === 'halfRest') && !r.dots && u === 8) return false;
    // Eighths at big beat only if a full set of 3 can fit; mid-beat open-run filters decide
    if (k === 'eighth' || k === '8thRest' || (u === 2 && !r.dots)) {
        if (sub === 0) return remaining >= 6;
        return true;
    }
    if (k === 'dotted8th' || k === 'dotted8thRest') {
        return sub === 0 ? remaining >= 4 : true;
    }
    if (u === 1) return true;
    // Any other ≥4u value: big-beat starts only
    if (sub !== 0 && u >= 4) return false;
    return true;
}

/**
 * Which 16th-family beat patterns may fire (L4+ emitter).
 * A=4×16  B=2×16+8  C=8+2×16  D=after dottedQ  E=complete 8+2×16
 * F=16+8+16  G=dotted8+16  H=16+dotted8
 *
 * Easy: core combos only (A/B/C + G) — no reverse F/H.
 * Medium: full set including light F/H.
 * Hard: full set evenly.
 * Completing 16th for dotted-8 is auto-injected if needed (ensureMeasureMathCompleters).
 */
function allowedSixteenthPatterns(difficulty, poolKeys) {
    const has8 = poolKeys.has('eighth');
    const hasD8 = poolKeys.has('dotted8th') || poolKeys.has('dotted8thRest');
    const hasDQ = poolKeys.has('dottedQtr');
    if (difficulty === 'easy') {
        // Even split of simple 16th/8th groups + standard G; never reverse H or F
        const s = new Set(['A']);
        if (hasDQ) s.add('D');
        if (has8) { s.add('B'); s.add('C'); }
        if (hasD8) s.add('G');
        return s;
    }
    if (difficulty === 'medium') {
        const s = new Set(['A', 'D', 'E']);
        if (has8) { s.add('B'); s.add('C'); s.add('F'); }
        if (hasD8) { s.add('G'); s.add('H'); }
        return s;
    }
    // hard — all patterns eligible; weights keep them roughly even
    const s = new Set(['A', 'D', 'E']);
    if (has8) { s.add('B'); s.add('C'); s.add('F'); }
    if (hasD8) { s.add('G'); s.add('H'); }
    return s;
}

/**
 * =============================================================================
 * MEASURE MATH — comprehensive completers for ALL meters + custom checkbox sets
 * =============================================================================
 * Some values cannot stand alone inside a legal beat/measure without a partner:
 *   dotted 8th (3)  + 16th (1)     = 4  (one simple quarter-beat)
 *   dotted quarter (6) + 8th (2) = 8  (two simple beats, or one cut-time half-note beat)
 *   dotted half (12) often + quarter (4) in 4/4 & 2/2 to fill the bar
 * Compound: dotted quarter (6) IS a complete primary beat — no partner required.
 *
 * Completers marked __autoCompleter are used only to finish pairs (not randomly chosen).
 */
function ensureMeasureMathCompleters(pool, timeSig) {
    const list = (pool || []).slice();
    const isCompound = ["6/8", "9/8", "12/8"].includes(timeSig);
    const has = (k) => list.some(r => r.key === k);
    /** User-checked only (not auto-injected partners) */
    const userHas = (k) => list.some(r => r.key === k && !r.__autoCompleter);
    const add = (k) => {
        if (!has(k) && RHYTHM_DEFS[k]) {
            list.push({ key: k, ...RHYTHM_DEFS[k], __autoCompleter: true });
        }
    };

    // --- Dotted 8th (all meters) → always pair with a 16th NOTE ---
    // Never inject 16th rests just because dotted-8 is enabled. 16th rests are L6 / checkbox content.
    // Dotted-8 note or rest both complete with a 16th note so the beat is full without inventing
    // a rest value the curriculum/package did not include.
    if (has('dotted8th') || has('dotted8thRest')) {
        add('sixteenth');
        // Only keep 16th rest as a silent partner when the user explicitly enabled it
        if (userHas('16thRest')) add('16thRest');
    }

    // --- Dotted quarter (simple + cut only) → needs 8th NOTE ---
    // Compound: dotted quarter is already one full big beat (6 units).
    // Do not inject 8th rests unless the user already allows them (same rule as 16th rests).
    if ((has('dottedQtr') || has('dottedQrtrRest')) && !isCompound) {
        add('eighth');
        if (userHas('8thRest')) add('8thRest');
    }

    // --- 8th rest content (e.g. L1 + custom 8th rest) needs an 8th NOTE partner ---
    // Without it, the emitter fills 8r+8r and normalize collapses that to a quarter rest,
    // so the checkbox never appears on the page. Auto-completer only finishes pairs.
    if (userHas('8thRest') && !isCompound) {
        add('eighth');
    }

    // --- 16th rest content (simple L6 package, or custom in any meter) needs 16th NOTE partners ---
    // Cut Recommended never includes 16th rests; custom checkbox still works with partners.
    if (userHas('16thRest')) {
        add('sixteenth');
    }

    // --- Dotted half: remainder partners by meter ---
    if (has('dottedHalf') || has('dottedHalfRest')) {
        // 4/4 & 2/2: 12 + 4 = full bar
        if (timeSig === '4/4' || timeSig === '2/2') {
            add('quarter');
            add('qrtrRest');
        }
        // 9/8: 12 + 6 = full bar (dotted quarter)
        if (timeSig === '9/8') {
            add('dottedQtr');
            add('dottedQrtrRest');
        }
        // 12/8: 12 + 12 or 12 + 6 + 6
        if (timeSig === '12/8') {
            add('dottedQtr');
            add('dottedQrtrRest');
            add('dottedHalf');
        }
    }

    // --- Lone 16ths always OK as groups; ensure pack generation has room ---
    // (no pool inject; group rules handle)

    // --- 8ths alone: pairs/sets handled by level rules ---

    // --- Triplets: self-contained wall-clock units ---

    return list;
}

/** Build a canonical event object from a key (or def). */
function makeRhythmEvent(keyOrDef, overrides) {
    const key = typeof keyOrDef === 'string' ? keyOrDef : keyOrDef.key;
    const def = (typeof keyOrDef === 'object' && keyOrDef.units != null)
        ? keyOrDef
        : (RHYTHM_DEFS[key] || {});
    return {
        key,
        units: def.units,
        vexDur: def.vexDur,
        isRest: !!def.isRest,
        dots: def.dots || 0,
        label: def.label,
        ...(overrides || {})
    };
}

/**
 * Append the obligatory partner after an incomplete "head" value.
 * Returns true if something was appended.
 *
 * Policy (all meters / levels):
 *   • Dotted 8th NOTE  → always 16th NOTE (never 16th rest)
 *   • Dotted 8th REST  → 16th rest only if user enabled 16th rests; else 16th note
 *   • Dotted Q NOTE    → always 8th NOTE
 *   • Dotted Q REST    → 8th rest only if user enabled 8th rests; else 8th note
 *
 * `userKeys` = keys the user actually checked (exclude __autoCompleter partners).
 */
function appendPairCompleter(events, headEv, timeSig, userKeys) {
    if (!headEv || !events) return false;
    const isCompound = ["6/8", "9/8", "12/8"].includes(timeSig);
    const k = headEv.key;
    const userAllows = (key) => !userKeys || userKeys.size === 0 || userKeys.has(key);

    // Dotted 8th → 16th note by default (measure math, not a free 16th-rest slot)
    if (k === 'dotted8th' || k === 'dotted8thRest') {
        if (k === 'dotted8thRest' && headEv.isRest && userAllows('16thRest') && userKeys && userKeys.has('16thRest')) {
            events.push(makeRhythmEvent('16thRest'));
        } else {
            events.push(makeRhythmEvent('sixteenth'));
        }
        return true;
    }

    // Dotted quarter in simple/cut → 8th (compound DQ is complete)
    if ((k === 'dottedQtr' || k === 'dottedQrtrRest') && !isCompound) {
        if (k === 'dottedQrtrRest' && headEv.isRest && userKeys && userKeys.has('8thRest')) {
            events.push(makeRhythmEvent('8thRest'));
        } else {
            events.push(makeRhythmEvent('eighth'));
        }
        return true;
    }

    return false;
}

/**
 * Does this event type require an immediate partner for legal beat math?
 */
function needsImmediatePair(ev, timeSig) {
    if (!ev) return false;
    const isCompound = ["6/8", "9/8", "12/8"].includes(timeSig);
    if (ev.key === 'dotted8th' || ev.key === 'dotted8thRest') return true;
    if ((ev.key === 'dottedQtr' || ev.key === 'dottedQrtrRest') && !isCompound) return true;
    return false;
}

/**
 * End-of-measure sweep: fix any open pairs, then pad remaining units with legal rests.
 * Guarantees sum(units) === totalUnits and no orphan dotted-8 / dotted-Q heads.
 * `userKeys` = user-checked keys only (auto-completers do not count as free content).
 */
function finalizeMeasureMath(events, totalUnits, timeSig, userKeys) {
    const isCompound = ["6/8", "9/8", "12/8"].includes(timeSig);
    const userHas = (k) => userKeys && userKeys.has(k);
    let out = [];
    for (let i = 0; i < (events || []).length; i++) {
        const ev = events[i];
        if (!ev) continue;
        out.push(ev);
        if (needsImmediatePair(ev, timeSig)) {
            const next = events[i + 1];
            // Dotted-8 NOTE must be paired with 16th NOTE. Rest head may use 16th rest only if user enabled.
            let paired = false;
            if (ev.key === 'dotted8th') {
                paired = !!(next && next.key === 'sixteenth' && !next.isRest && next.units === 1);
                // Wrong completer (e.g. 16th rest after a note head): drop it so we re-pair with a note
                if (!paired && next && next.key === '16thRest' && next.units === 1) {
                    i += 1; // skip the bad completer in the source stream
                    appendPairCompleter(out, ev, timeSig, userKeys);
                    continue;
                }
            } else if (ev.key === 'dotted8thRest') {
                paired = !!(next && next.units === 1 && (
                    (next.key === 'sixteenth' && !next.isRest) ||
                    (next.key === '16thRest' && userHas('16thRest'))
                ));
                if (!paired && next && next.key === '16thRest' && !userHas('16thRest')) {
                    i += 1;
                    appendPairCompleter(out, ev, timeSig, userKeys);
                    continue;
                }
            } else {
                paired = !!(next && (next.key === 'eighth' || next.key === '8thRest' ||
                    (next.key === 'sixteenth' && next.units === 1)) &&
                    (next.units === 2 || next.units === 1));
            }
            // For dottedQ, valid completers: 8th (2) OR two 16ths (1+1)
            if (ev.key === 'dottedQtr' || ev.key === 'dottedQrtrRest') {
                if (!isCompound) {
                    const n1 = events[i + 1];
                    const n2 = events[i + 2];
                    const ok8Note = n1 && n1.key === 'eighth' && !n1.isRest && n1.units === 2;
                    const ok8Rest = n1 && n1.key === '8thRest' && n1.units === 2 &&
                        (ev.key === 'dottedQrtrRest' ? userHas('8thRest') : false);
                    const ok8 = ok8Note || ok8Rest;
                    const ok16 = n1 && n1.key === 'sixteenth' && !n1.isRest && n1.units === 1 &&
                        n2 && n2.key === 'sixteenth' && !n2.isRest && n2.units === 1;
                    const half16 = n1 && n1.key === 'sixteenth' && !n1.isRest && n1.units === 1 && !ok16;
                    if (ok8 || ok16) {
                        // already complete — leave following events alone
                    } else if (half16) {
                        // one 16th present — add the second rather than inserting an 8th (would break units)
                        out.push(makeRhythmEvent('sixteenth'));
                    } else {
                        appendPairCompleter(out, ev, timeSig, userKeys);
                    }
                }
            } else if (!paired) {
                appendPairCompleter(out, ev, timeSig, userKeys);
            }
        }
    }

    // Collapse accidental lone 16ths; never invent 16th rests unless user enabled them
    out = sanitizeShortNoteGroups(out, null, isCompound, isCompound ? 6 : 4, userHas('16thRest'));

    // Pad / trim to exact measure length
    let sum = out.reduce((a, e) => a + (e.units || 0), 0);
    if (sum > totalUnits) {
        // Trim from end carefully
        while (sum > totalUnits && out.length) {
            const last = out[out.length - 1];
            if (sum - (last.units || 0) >= totalUnits - 0.001) {
                sum -= last.units || 0;
                out.pop();
            } else break;
        }
    }
    sum = out.reduce((a, e) => a + (e.units || 0), 0);
    let rem = totalUnits - sum;
    // Pad with only user-allowed rests — never invent 16th rests when unchecked
    if (rem > 0) {
        const spelled = spellRestUnits(rem, userKeys, isCompound);
        out.push(...spelled.events);
        rem = spelled.leftover;
        if (rem > 0) {
            absorbOddRemainder(out, rem, userKeys);
            rem = 0;
        }
    }

    // Final pair check after padding (padding shouldn't create open pairs)
    // Also strip any 16th rests that snuck in when user didn't enable them
    if (userKeys && !userKeys.has('16thRest')) {
        const cleaned = [];
        for (let i = 0; i < out.length; i++) {
            const ev = out[i];
            if (ev && ev.key === '16thRest') {
                // Replace illegal 16th rest with 16th note (keeps measure math)
                cleaned.push(makeRhythmEvent('sixteenth'));
            } else {
                cleaned.push(ev);
            }
        }
        out = cleaned;
    }
    return out;
}

/**
 * Apply Easy/Medium/Hard density + duration weights, blended with pool sophistication.
 * @param {object} [densityCtx] { shortest, longest } among current legal candidates
 * @param {number} [sophistication] 0–1 from poolSophistication()
 */
function applyDifficultyToCandidateWeight(r, baseWeight, difficulty, remaining, totalUnits, densityCtx, sophistication) {
    const cfg = difficultyWeightConfig(difficulty, sophistication);
    let w = baseWeight;
    const u = r.units || 4;
    const isTrip = r.key && String(r.key).includes('Triplet');

    // Absolute duration buckets (softened by sophistication inside config)
    if (isTrip || u <= 1) w *= cfg.shortMul;
    else if (u <= 2) w *= cfg.shortMul;
    else if (u <= 4) w *= cfg.midMul;
    else if (u <= 8) w *= (cfg.longMul + cfg.midMul) * 0.5;
    else w *= cfg.longMul;

    // Prefer values near the target density band for this difficulty × package
    // denserRank 0 = longest in pool, 1 = shortest in pool
    if (densityCtx && densityCtx.longest > densityCtx.shortest) {
        const denserRank = (densityCtx.longest - u) / (densityCtx.longest - densityCtx.shortest);
        const sigma = Math.max(0.12, cfg.densitySigma || 0.3);
        const dist = denserRank - cfg.targetDensity;
        // Gaussian peak at target — always includes some spread for variety
        const band = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        w *= Math.max(0.15, 0.25 + 0.95 * band);
    }

    // Exact-fit: legal, scaled by difficulty + sophistication (not whole-note flood at L6)
    if (remaining != null && u === remaining && u > 0) {
        w *= cfg.exactFitMul;
        if (totalUnits != null && remaining === totalUnits) {
            w *= cfg.fullBarFitMul;
        }
    }

    // Discourage bar-eating longs more when the package can support denser writing
    const soph = sophistication == null ? 0.35 : sophistication;
    if (remaining != null && totalUnits != null && remaining === totalUnits) {
        if (u >= totalUnits * 0.75) {
            // Whole-ish values: sparse only when package is simple
            w *= _lerp(difficulty === 'easy' ? 1.15 : 0.35, 0.18, soph);
        } else if (u >= totalUnits * 0.5) {
            w *= _lerp(difficulty === 'easy' ? 1.1 : 0.7, 0.45, soph);
        }
    }

    return Math.max(0.05, w);
}

/**
 * Sometimes force a full-measure value. Probability drops as package sophistication rises
 * (L6 Easy should not open with a whole note every third bar).
 */
function tryPickFullMeasureValue(available, totalUnits, difficulty, sophistication) {
    const exact = (available || []).filter(r =>
        r && r.units === totalUnits && !r.__autoCompleter && r.units > 0
    );
    if (exact.length === 0) return null;
    const p = difficultyWeightConfig(difficulty, sophistication).fullBarForceP;
    if (Math.random() >= p) return null;
    // Prefer notes slightly over rests for full-measure picks
    const notes = exact.filter(r => !r.isRest);
    const pool = notes.length ? notes : exact;
    return pool[Math.floor(Math.random() * pool.length)] || null;
}

/**
 * When advanced figures (triplets, dotted pairs, …) are enabled, occasionally force one
 * at a legal position so they actually appear.
 *
 * Two tiers:
 *   • Package (Recommended for Level) — light nudge only so new material shows up some of
 *     the time without flooding the worksheet (e.g. L5 should not be 80% triplets).
 *   • Custom (user checked a value outside the current level package) — stronger force so
 *     deliberate checkbox choices still surface.
 */
/**
 * How strongly to surface advanced values checked outside the current Level package.
 * Easy = light seasoning; Hard = common. Keeps L1 Easy + dotted-8th rest from flooding
 * the page while still guaranteeing the rhythm appears.
 *
 * kind: 'forceSpecial' | 'gInject' | 'weight' | 'restUpgrade' | 'restShare'
 */
function advancedCustomRate(difficulty, kind) {
    const d = (difficulty === 'easy' || difficulty === 'hard') ? difficulty : 'medium';
    const table = {
        easy:   { forceSpecial: 0.055, gInject: 0.065, weight: 1.18, restUpgrade: 0.10, restShare: 0.22 },
        medium: { forceSpecial: 0.11,  gInject: 0.13,  weight: 1.40, restUpgrade: 0.20, restShare: 0.30 },
        hard:   { forceSpecial: 0.18,  gInject: 0.22,  weight: 1.75, restUpgrade: 0.32, restShare: 0.35 }
    };
    const row = table[d] || table.medium;
    return row[kind] != null ? row[kind] : 0.1;
}

/**
 * Use dotted-8th REST head only when the user checked that value.
 * G-form rest = dotted 8th rest (3u) + ONE 16th note (1u) — never 8th rest + two 16ths.
 * When both note + rest enabled: share scales with Easy/Med/Hard.
 * Only-rest checked → always rest head (rate of G inject still limits flood).
 * Only-note checked → never rest.
 */
function preferDotted8RestForm(userPoolKeys, difficulty) {
    if (!userPoolKeys || !userPoolKeys.has('dotted8thRest')) return false;
    if (!userPoolKeys.has('dotted8th')) return true;
    return Math.random() < advancedCustomRate(difficulty || 'medium', 'restShare');
}

/**
 * Emit one complete G-form beat: dotted 8th (note|rest) + single 16th completer.
 * Mutates events/remaining/position via returned deltas applied by caller, or push into arrays.
 */
function pushDotted8GForm(events, asRest, allow16thRestCompleter) {
    events.push(makeRhythmEvent(asRest ? 'dotted8thRest' : 'dotted8th'));
    // Completer is always exactly ONE 16th (note by default; 16th rest only if allowed + rest head)
    if (asRest && allow16thRestCompleter) {
        events.push(makeRhythmEvent('16thRest'));
    } else {
        events.push(makeRhythmEvent('sixteenth'));
    }
    return 4; // units consumed
}

/**
 * VexFlow base duration for an event (no embedded "d").
 * Augmentation dots are drawn with VF.Dot.buildAndAttach — native codes like "8d"/"qd"
 * adjust ticks but often do NOT draw a visible dot with Bravura.
 */
function resolveVexDuration(ev) {
    if (!ev) return 'q';
    let d = String(ev.vexDur || 'q');
    // Normalize any native dotted codes back to base duration
    const strip = {
        '8d': '8', '8dr': '8r',
        '16d': '16', '16dr': '16r',
        'qd': 'q', 'qdr': 'qr',
        'hd': 'h', 'hdr': 'hr',
        'wd': 'w', 'wdr': 'wr'
    };
    if (strip[d]) d = strip[d];
    return d;
}

/** How many augmentation dots this event needs drawn */
function eventDotCount(ev) {
    if (!ev) return 0;
    if (ev.dots > 0) return ev.dots | 0;
    // Legacy/native dotted duration without dots field
    const d = String(ev.vexDur || '');
    if (/^(?:w|h|q|8|16|32)dr?$/.test(d)) return 1;
    return 0;
}

function tryPickUserEnabledSpecial(available, position, remaining, timeSig, isCompound, difficulty, measureIndex, curriculumLevel) {
    const legal = [];
    (available || []).forEach(r => {
        if (!r || r.__autoCompleter) return;
        // Skip generic rests; allow content rests that need a force path
        if (r.isRest && r.key !== 'dotted8thRest' && r.key !== '8thRest' &&
            r.key !== '16thRest' && r.key !== 'qrtrRest') return;
        const k = r.key;
        if (k === 'quarterTriplet') {
            // 3 quarters in time of 2 = 8 sixteenth-units (simple: 2 beats; cut: 1 half-note beat)
            if (isCompound) return;
            if (timeSig === '2/2') {
                if (remaining >= 8 && (position % 8 === 0)) legal.push(r);
            } else if (remaining >= 8 && (position % 4 === 0)) {
                legal.push(r);
            }
        } else if (k === 'eighthNoteTriplet') {
            if (isCompound) return;
            if (remaining >= 4 && (position % 4 === 0)) legal.push(r);
        } else if (k === 'sixteenthTriplet') {
            // Custom in any meter: 2u figure; compound prefers big-beat starts with room for a pair+
            if (remaining < 2) return;
            if (isCompound) {
                if (position % 6 === 0 && remaining >= 2) legal.push(r);
                else if ((position % 6) % 2 === 0 && remaining >= 2) legal.push(r);
            } else if (position % 2 === 0) {
                legal.push(r);
            }
        } else if (k === 'dotted8th' || k === 'dotted8thRest') {
            if (remaining >= 4 && (isCompound ? (position % 6 === 0) : (position % 4 === 0))) legal.push(r);
        } else if (k === 'qrtrRest') {
            // Compound: quarter rest + 8th completer = one big beat (6u)
            if (isCompound) {
                if (remaining >= 6 && (position % 6 === 0)) legal.push(r);
            } else if (remaining >= 4 && (timeSig === '2/2' ? (position % 8 === 0) : (position % 4 === 0))) {
                legal.push(r);
            }
        } else if (k === '8thRest') {
            // Content 8th rest: compound mid-beat or start with room for 8+8r+8 / 8r+8+8
            if (isCompound) {
                if (remaining >= 4 && (position % 6 === 0 || position % 6 === 2 || position % 6 === 4)) legal.push(r);
            } else if (timeSig === '2/2') {
                if (remaining >= 4 && (position % 8 === 0 || position % 4 === 0)) legal.push(r);
            } else if (remaining >= 4 && (position % 4 === 0)) {
                legal.push(r);
            }
        } else if (k === '16thRest') {
            // Content 16th rest: room for 16r + 16th note pair (2u). Rare in cut — still legal when checked.
            if (remaining < 2) return;
            if (isCompound) {
                if (position % 6 === 0) legal.push(r);
            } else if (timeSig === '2/2') {
                // Align to even 16th slots inside the half-note beat
                if (position % 2 === 0) legal.push(r);
            } else if (position % 2 === 0 || position % 4 === 0) {
                legal.push(r);
            }
        } else if ((k === 'dottedQtr' || k === 'dottedQrtrRest') && !isCompound) {
            if (remaining >= 8 && (timeSig === '2/2' ? (position % 8 === 0) : (position % 4 === 0 || position === 0))) {
                legal.push(r);
            }
        } else if (k === 'dottedHalf' || k === 'dottedHalfRest') {
            // Full-bar or exact-fit dotted half (e.g. 3/4 = 12)
            if (r.units === remaining && remaining > 0) legal.push(r);
        } else if (k === 'sixteenth' && remaining >= 2) {
            // only nudge when it's a legal start (pair+)
            if (!isCompound && position % 4 === 0) legal.push(r);
            if (isCompound && position % 6 === 0) legal.push(r);
            // Cut: free 16ths only when user enabled them (or as partners via other paths)
            if (timeSig === '2/2' && position % 2 === 0) legal.push(r);
        }
    });
    if (legal.length === 0) return null;

    const packageKeys = new Set(getDefaultRhythmsForLevel(curriculumLevel || 1));
    const customLegal = legal.filter(r => !packageKeys.has(r.key));
    const packageLegal = legal.filter(r => packageKeys.has(r.key));
    // Custom checkbox outside package → stronger; default package → light sprinkle only
    const useCustom = customLegal.length > 0;
    const candidates = useCustom ? customLegal : packageLegal;
    if (candidates.length === 0) return null;

    let p;
    if (useCustom) {
        // Season advanced custom values by complexity — Easy sprinkles, Hard uses often
        p = advancedCustomRate(difficulty, 'forceSpecial');
        if (measureIndex != null && measureIndex < 2) p = Math.min(p + 0.03, p * 1.35);
    } else {
        // Recommended package: occasional appearance of new material only
        p = difficulty === 'hard' ? 0.10 : (difficulty === 'easy' ? 0.04 : 0.07);
        if (measureIndex != null && measureIndex === 0) p = Math.min(0.12, p + 0.03);
    }
    if (Math.random() >= p) return null;

    // Custom: prefer triplets so the rare check is visible. Package: no hard trip preference
    let pool = candidates;
    if (useCustom) {
        const trips = candidates.filter(r => String(r.key).includes('Triplet'));
        const dotted = candidates.filter(r => String(r.key).startsWith('dotted'));
        pool = trips.length ? trips : (dotted.length ? dotted : candidates);
    }
    // When both d8 note and rest are candidates, share rest form by complexity (not fixed 1/3)
    const d8Notes = pool.filter(r => r.key === 'dotted8th');
    const d8Rests = pool.filter(r => r.key === 'dotted8thRest');
    if (d8Notes.length && d8Rests.length) {
        if (Math.random() < advancedCustomRate(difficulty, 'restShare')) {
            return d8Rests[Math.floor(Math.random() * d8Rests.length)];
        }
        return d8Notes[Math.floor(Math.random() * d8Notes.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)] || null;
}

/**
 * Weight multiplier for advanced figures.
 * @param {boolean} isCustomOutsidePackage — true when this key is not in Recommended for Level
 */
function userSpecialWeightBoost(r, difficulty, isCustomOutsidePackage) {
    if (!r || !r.key) return 1;
    const k = r.key;
    const custom = !!isCustomOutsidePackage;
    if (String(k).includes('Triplet')) {
        // Package: mild. Custom: scales with Easy/Med/Hard (not a fixed heavy hammer)
        if (custom) return advancedCustomRate(difficulty, 'weight') + 0.15;
        return difficulty === 'hard' ? 1.35 : (difficulty === 'easy' ? 1.05 : 1.2);
    }
    if (k === 'dotted8th' || k === 'dotted8thRest') {
        if (custom) return advancedCustomRate(difficulty, 'weight');
        return difficulty === 'hard' ? 1.25 : (difficulty === 'easy' ? 1.1 : 1.15);
    }
    if (k === '8thRest') {
        // Custom (e.g. L1 + 8th rest): scale so it surfaces; package: mild presence
        if (custom) return advancedCustomRate(difficulty, 'weight') + 0.12;
        return difficulty === 'hard' ? 1.25 : (difficulty === 'easy' ? 1.08 : 1.15);
    }
    if (k === 'qrtrRest') {
        // Compound custom (L1/L2 + quarter rest) or package L3+
        if (custom) return advancedCustomRate(difficulty, 'weight') + 0.12;
        return difficulty === 'hard' ? 1.2 : (difficulty === 'easy' ? 1.08 : 1.12);
    }
    if (k === 'dottedQtr' || k === 'dottedQrtrRest') {
        if (custom) return advancedCustomRate(difficulty, 'weight');
        return difficulty === 'hard' ? 1.2 : 1.1;
    }
    if (k === 'sixteenth' || k === '16thRest') {
        if (custom) return Math.min(1.55, advancedCustomRate(difficulty, 'weight') + 0.05);
        return 1.1;
    }
    if (k === 'sixteenthTriplet') {
        // Never in compound package — always treat as custom when checked
        if (custom) return advancedCustomRate(difficulty, 'weight') + 0.2;
        return difficulty === 'hard' ? 1.3 : 1.15;
    }
    return 1;
}

function getTotalUnits(timeSig) {
    return UNITS_PER_MEASURE[timeSig] || 16;
}

// True if an event is a rest (defensive: some paths set key/vexDur for rests but forget isRest).
function eventIsRest(ev) {
    if (!ev) return false;
    if (ev.isRest === true) return true;
    if (typeof ev.key === 'string' && /Rest$/i.test(ev.key)) return true;
    if (typeof ev.vexDur === 'string' && /r$/i.test(ev.vexDur)) return true;
    return false;
}

// Build a rest event from a known rest key/size.
function makeRestEvent(key, units, vexDur, dots) {
    return { key, units, vexDur, isRest: true, dots: dots || 0 };
}

/**
 * May we freely use this rest key as content/padding?
 * 16th rests are NEVER invented unless the user explicitly enabled them (or no key set = legacy open).
 * 8th / quarter rests are allowed as beat-math fillers when the set is empty or includes them.
 */
function restKeyAllowed(key, allowedKeys, isCompound) {
    if (!allowedKeys || allowedKeys.size === 0) return true;
    if (key === '16thRest') return allowedKeys.has('16thRest');
    // Dotted 8th rest is never a silent substitute for plain 8th rest — only when checked
    if (key === 'dotted8thRest') return allowedKeys.has('dotted8thRest');
    // Compound silence always uses pulse-aligned rests (incl. quarter rest for 2 of 3 8ths)
    if (isCompound && (key === 'dottedQrtrRest' || key === '8thRest' || key === 'dottedHalfRest' || key === 'qrtrRest')) {
        return true;
    }
    if (isCompound && (key === 'wholeRest' || key === 'halfRest')) {
        return allowedKeys.has(key);
    }
    // Simple/cut: quarter & 8th rests OK as fillers when user has any rest package
    if (key === '8thRest' || key === 'qrtrRest') {
        return allowedKeys.has(key) || allowedKeys.has('qrtrRest') || allowedKeys.has('8thRest') ||
            allowedKeys.has('halfRest') || allowedKeys.has('wholeRest');
    }
    return allowedKeys.has(key);
}

/**
 * Place silence of `rem` sixteenth-units using only allowed rests.
 * Returns { events, leftover }. leftover is 0 when fully placed; may be 1 if 16th rests disallowed.
 */
function spellRestUnits(rem, allowedKeys, isCompound) {
    const out = [];
    let r = rem;
    // Dotted 8th rest (3u) MUST sit before plain 8th rest (2u). If 8th rest comes first,
    // a 3-unit dotted8thRest is destroyed as 8r(2)+leftover(1→16th note), and the G-form
    // completer 16th remains → page shows "8th rest + two 16ths" with zero d8 rests.
    const sizes = isCompound
        ? [
            { key: 'dottedHalfRest', u: 12, v: 'hr', dots: 1 },
            { key: 'dottedQrtrRest', u: 6, v: 'qr', dots: 1 },
            { key: 'qrtrRest', u: 4, v: 'qr', dots: 0 },
            { key: 'dotted8thRest', u: 3, v: '8r', dots: 1 },
            { key: '8thRest', u: 2, v: '8r', dots: 0 },
            { key: '16thRest', u: 1, v: '16r', dots: 0 }
        ]
        : [
            { key: 'wholeRest', u: 16, v: 'wr', dots: 0 },
            { key: 'dottedHalfRest', u: 12, v: 'hr', dots: 1 },
            { key: 'halfRest', u: 8, v: 'hr', dots: 0 },
            { key: 'dottedQrtrRest', u: 6, v: 'qr', dots: 1 },
            { key: 'qrtrRest', u: 4, v: 'qr', dots: 0 },
            { key: 'dotted8thRest', u: 3, v: '8r', dots: 1 },
            { key: '8thRest', u: 2, v: '8r', dots: 0 },
            { key: '16thRest', u: 1, v: '16r', dots: 0 }
        ];
    for (const rs of sizes) {
        if (!restKeyAllowed(rs.key, allowedKeys, isCompound)) continue;
        // Simple: avoid dotted-quarter rest as multi-beat silence (prefer q+8)
        if (!isCompound && rs.key === 'dottedQrtrRest') continue;
        while (r >= rs.u) {
            out.push(makeRestEvent(rs.key, rs.u, rs.v, rs.dots));
            r -= rs.u;
        }
    }
    return { events: out, leftover: r };
}

/**
 * Absorb leftover 1-unit holes without inventing 16th rests.
 * Prefer: merge trailing 16th note into an 8th; otherwise fill with a 16th NOTE.
 */
function absorbOddRemainder(events, leftover, allowedKeys) {
    if (leftover <= 0 || !events) return leftover;
    let rem = leftover;
    const allow16r = allowedKeys && allowedKeys.has('16thRest');
    if (allow16r) {
        while (rem > 0) {
            events.push(makeRestEvent('16thRest', 1, '16r', 0));
            rem -= 1;
        }
        return 0;
    }
    // No 16th rests allowed — never invent them
    while (rem > 0) {
        const last = events.length ? events[events.length - 1] : null;
        // Trailing 16th note + 1 hole → single 8th note (same total duration)
        if (last && last.key === 'sixteenth' && !eventIsRest(last) && last.units === 1) {
            events.pop();
            events.push(makeRhythmEvent('eighth'));
            rem -= 1;
            continue;
        }
        // Otherwise fill with a 16th NOTE (legal L3+ content; not a rest)
        events.push(makeRhythmEvent('sixteenth'));
        rem -= 1;
    }
    return 0;
}

// Post-process consecutive rests into musically correct rest values.
// Compound (6/8, 9/8, 12/8): spell silence in dotted-quarter (6) / dotted-half (12) big-beat
// groups — NEVER whole rest (16) or half rest (8) unless the user explicitly enabled them.
// Simple/cut: largest-first using only rests the user allowed. NEVER invent 16th rests
// unless the user checked them — odd leftovers become 16th notes or rewritten figures.
function normalizeRestSequences(events, timeSig, allowedKeys) {
    const isCompound = timeSig && ["6/8", "9/8", "12/8"].includes(timeSig);
    const COMPOUND_BEAT = 6; // 16th-note ticks per dotted-quarter beat
    const allow = (key) => restKeyAllowed(key, allowedKeys, isCompound);

    let working = (events || []).map(ev => ({ ...ev, isRest: eventIsRest(ev) }));

    // Pass 1 (compound): rewrite rest runs that cover full big beats into dotted-quarter rests.
    // NEVER destroy dotted 8th rest content (3u) — same bug as simple: re-spelling 3→8r+leftover
    // leaves the G-form 16th completer and shows "8th rest + two 16ths" with zero d8 rests.
    if (isCompound) {
        const collapsed = [];
        let pos = 0;
        let i = 0;
        while (i < working.length) {
            const ev = working[i];
            if (!ev.isRest) {
                collapsed.push(ev);
                pos += ev.units || 0;
                i++;
                continue;
            }
            // Preserve content dotted-8th rest (+ optional 16th-rest completer) as written
            if (ev.key === 'dotted8thRest' && (ev.units || 0) === 3) {
                collapsed.push({
                    ...ev,
                    isRest: true,
                    dots: ev.dots != null ? ev.dots : 1,
                    vexDur: ev.vexDur || '8r'
                });
                pos += 3;
                i++;
                if (i < working.length && working[i].isRest &&
                    working[i].key === '16thRest' && (working[i].units || 0) === 1) {
                    collapsed.push({ ...working[i], isRest: true });
                    pos += 1;
                    i++;
                }
                continue;
            }
            // Preserve content quarter rest when user checked it (Q rest + 8th note figure).
            // Re-spelling a lone 4u rest is fine as qrtrRest, but mixed runs can swallow it.
            if (ev.key === 'qrtrRest' && (ev.units || 0) === 4 &&
                allowedKeys && allowedKeys.has('qrtrRest')) {
                collapsed.push({ ...ev, isRest: true, dots: 0, vexDur: ev.vexDur || 'qr' });
                pos += 4;
                i++;
                continue;
            }
            // Preserve a single content 8th rest when user checked it (paired with notes around it).
            // Do NOT preserve runs of 3×8r — those should still become dotted-quarter rest.
            if (ev.key === '8thRest' && (ev.units || 0) === 2 &&
                allowedKeys && allowedKeys.has('8thRest')) {
                const nextIsRest = i + 1 < working.length && working[i + 1].isRest;
                const prevIsRest = collapsed.length > 0 && collapsed[collapsed.length - 1].isRest;
                if (!nextIsRest && !prevIsRest) {
                    collapsed.push({ ...ev, isRest: true, dots: 0, vexDur: ev.vexDur || '8r' });
                    pos += 2;
                    i++;
                    continue;
                }
            }
            // Gather consecutive *fill* rest span (stop before next dotted8thRest / content qrtrRest)
            let j = i;
            let spanUnits = 0;
            while (j < working.length && working[j].isRest &&
                   working[j].key !== 'dotted8thRest' &&
                   !(working[j].key === 'qrtrRest' && allowedKeys && allowedKeys.has('qrtrRest'))) {
                spanUnits += working[j].units || 0;
                j++;
            }
            // Spell rest span with compound pulse alignment:
            //   full empty big beat → dotted quarter rest (never 3× 8th rest)
            //   two of three 8ths silent on the beat → quarter rest (never 2× 8th rest)
            //   one 8th pulse silent → 8th rest (e.g. after a quarter note)
            let rem = spanUnits;
            let p = pos;
            while (rem > 0) {
                const intoBeat = p % COMPOUND_BEAT; // 0 = on big beat
                const toBeatEnd = intoBeat === 0 ? COMPOUND_BEAT : (COMPOUND_BEAT - intoBeat);
                if (intoBeat === 0) {
                    if (rem >= 12 && allow('dottedHalfRest')) {
                        collapsed.push(makeRestEvent('dottedHalfRest', 12, 'hr', 1));
                        rem -= 12; p += 12;
                    } else if (rem >= 6 && allow('dottedQrtrRest')) {
                        collapsed.push(makeRestEvent('dottedQrtrRest', 6, 'qr', 1));
                        rem -= 6; p += 6;
                    } else if (rem >= 4 && allow('qrtrRest')) {
                        // Two of three 8th-pulses — one quarter rest, not two 8th rests
                        collapsed.push(makeRestEvent('qrtrRest', 4, 'qr', 0));
                        rem -= 4; p += 4;
                    } else if (rem >= 2 && allow('8thRest')) {
                        collapsed.push(makeRestEvent('8thRest', 2, '8r', 0));
                        rem -= 2; p += 2;
                    } else if (rem >= 1 && allow('16thRest')) {
                        collapsed.push(makeRestEvent('16thRest', 1, '16r', 0));
                        rem -= 1; p += 1;
                    } else {
                        break;
                    }
                } else {
                    // Mid-beat: fill only to the next big-beat boundary
                    const take = Math.min(rem, toBeatEnd);
                    let t = take;
                    // Prefer a single 8th rest when only one pulse remains (after quarter, etc.)
                    while (t >= 2 && allow('8thRest')) {
                        collapsed.push(makeRestEvent('8thRest', 2, '8r', 0));
                        t -= 2; rem -= 2; p += 2;
                    }
                    if (t === 1 && allow('16thRest')) {
                        collapsed.push(makeRestEvent('16thRest', 1, '16r', 0));
                        rem -= 1; p += 1; t = 0;
                    }
                    if (t > 0) break;
                }
            }
            // Odd leftover silence without 16th rests → 16th notes (or merge into prior)
            if (rem > 0) {
                absorbOddRemainder(collapsed, rem, allowedKeys);
            }
            pos += spanUnits;
            i = j;
        }
        working = collapsed;
        return working.map(ev => ({ ...ev, isRest: eventIsRest(ev) }));
    }

    // Pass 2 (simple/cut): re-spell consecutive rest runs, but NEVER destroy a single
    // already-correct content rest (especially dotted8thRest = 3u). Re-spelling a 3u rest
    // as 8th rest (2) + leftover 16th note left the original 16th completer in place →
    // "8th rest + two 16ths" and zero dotted 8th rests on the page.
    const CANONICAL_REST_UNITS = {
        wholeRest: 16, dottedHalfRest: 12, halfRest: 8,
        dottedQrtrRest: 6, qrtrRest: 4,
        dotted8thRest: 3, '8thRest': 2, '16thRest': 1
    };
    const result = [];
    let i = 0;
    while (i < working.length) {
        if (!working[i].isRest) {
            result.push({ ...working[i], isRest: false });
            i++;
            continue;
        }
        const runStart = i;
        let sumU = 0;
        while (i < working.length && working[i].isRest) {
            sumU += working[i].units || 0;
            i++;
        }
        const run = working.slice(runStart, i);

        // Preserve a single well-formed content rest as-is
        if (run.length === 1) {
            const ev = run[0];
            const canon = CANONICAL_REST_UNITS[ev.key];
            if (canon != null && (ev.units || 0) === canon) {
                result.push({
                    ...ev,
                    isRest: true,
                    dots: ev.dots != null ? ev.dots : (canon === 3 || canon === 6 || canon === 12 ? 1 : 0)
                });
                continue;
            }
        }
        // Preserve intentional consecutive 8th rests when user checked 8th rest.
        // Without this, 8r+8r (common when no 8th notes in pool) becomes a quarter rest
        // and L1 + custom 8th rest never appears on the page.
        if (allowedKeys && allowedKeys.has('8thRest') && run.length >= 1 &&
            run.every(e => e.key === '8thRest' && (e.units || 0) === 2)) {
            for (const ev of run) {
                result.push({ ...ev, isRest: true, dots: 0, vexDur: ev.vexDur || '8r' });
            }
            continue;
        }
        // Preserve intentional 16th rests (single already handled above; multi-rest pure 16r runs)
        if (allowedKeys && allowedKeys.has('16thRest') && run.length >= 1 &&
            run.every(e => e.key === '16thRest' && (e.units || 0) === 1)) {
            for (const ev of run) {
                result.push({ ...ev, isRest: true, dots: 0, vexDur: ev.vexDur || '16r' });
            }
            continue;
        }

        const spelled = spellRestUnits(sumU, allowedKeys, false);
        result.push(...spelled.events);
        if (spelled.leftover > 0) {
            absorbOddRemainder(result, spelled.leftover, allowedKeys);
        }
    }
    return result;
}

// Smart weighted rhythm generator
// Respects exactly the rhythms allowed by current level + timeSig (via the live checked set).
// New material added at the current difficulty level for this meter is strongly boosted so the
// generated rhythms actually feature the latest additions prominently.
function generateMusicalRhythms(timeSig, numMeasures, enabledRhythms) {
    const isCompound = ["6/8", "9/8", "12/8"].includes(timeSig);
    
    if (!enabledRhythms || enabledRhythms.length === 0) {
        // Meter-aware fallback (never introduces rhythms disallowed for the current level)
        if (isCompound) {
            enabledRhythms = [RHYTHM_DEFS.dottedQtr, RHYTHM_DEFS.eighth, RHYTHM_DEFS.dottedQrtrRest].filter(Boolean);
        } else {
            enabledRhythms = [RHYTHM_DEFS.quarter, RHYTHM_DEFS.qrtrRest, RHYTHM_DEFS.half].filter(Boolean);
        }
        if (enabledRhythms.length === 0) {
            enabledRhythms = [RHYTHM_DEFS.quarter, RHYTHM_DEFS.eighth].filter(Boolean);
        }
    }
    
    const totalUnits = getTotalUnits(timeSig);
    
    const measures = [];
    
    for (let m = 0; m < numMeasures; m++) {
        const events = generateOneMeasure(totalUnits, enabledRhythms, isCompound, m, timeSig);
        measures.push(events);
    }

    // Optional ties: pure flags only — does not alter units/spelling.
    try {
        const diff = getPresentationDifficulty();
        applyAcrossBarlineTies(measures, diff);
        applyWithinMeasureTies(measures, diff, timeSig);
    } catch (e) {
        console.warn('[RhythmGen] apply ties failed', e);
    }
    
    return measures;
}

function generateOneMeasure(totalUnits, pool, isCompound, measureIndex, timeSig) {
    // Curriculum level (Level 1–6 package) vs presentation difficulty (Easy/Med/Hard)
    const levelEl = document.getElementById('dropdownLevel');
    const curriculumLevel = levelEl ? parseInt(levelEl.value) || 1 : 1;
    const curTimeSig = timeSig || (document.getElementById('dropdownTimeSignature') || {}).value || '4/4';
    const difficulty = getPresentationDifficulty();
    // Inject partner values so custom checkbox sets always have legal beat math
    pool = ensureMeasureMathCompleters(pool, curTimeSig);
    // All keys in pool (incl. auto-completers used only to finish pairs)
    const poolKeys = new Set((pool || []).map(r => r.key));
    // User-checked content only — NEVER treat auto-completers as freely pickable content
    // (e.g. L4 dotted-8 injects 16th notes as partners, but must not unlock free 16th rests)
    const userPoolKeys = new Set(
        (pool || []).filter(r => r && !r.__autoCompleter).map(r => r.key)
    );
    const userEnabledDotted8Note = userPoolKeys.has('dotted8th');
    const userEnabledDotted8Rest = userPoolKeys.has('dotted8thRest');
    const userEnabledDotted8 = userEnabledDotted8Note || userEnabledDotted8Rest;
    const userEnabledDottedQ = userPoolKeys.has('dottedQtr') || userPoolKeys.has('dottedQrtrRest');
    const userEnabled16thRest = userPoolKeys.has('16thRest');
    const userEnabled8thRest = userPoolKeys.has('8thRest');
    // Free 16th *content* (not auto-injected partners for dotted-8 pairs)
    const userEnabledSixteenth = userPoolKeys.has('sixteenth');
    // Hygiene: custom short values unlock the appropriate grouping emitters
    let groupLevel = Math.max(curriculumLevel, minGroupLevelFromPool(
        (pool || []).filter(r => r && !r.__autoCompleter),
        isCompound
    ));
    // Cut / simple + dotted quarter → pairing paths (dottedQ + 8th)
    if (userEnabledDottedQ && !isCompound) {
        groupLevel = Math.max(groupLevel, curTimeSig === '2/2' ? 5 : 3);
    }
    // Existing rule branches use curLevel — point at groupLevel so lone 16ths never appear
    const curLevel = groupLevel;
    // "New at curriculum level" boost still follows the Level dropdown (not hygiene bump)
    const newAtThisLevel = new Set(getRhythmsNewAtLevel(curriculumLevel, curTimeSig));
    // Full Recommended package for this curriculum level (custom vs package force tiers)
    const recommendedPackageKeys = new Set(getDefaultRhythmsForLevel(curriculumLevel));
    // Sliding density scale: L1 Easy ≠ L6 Easy; custom short values also raise the floor
    const sophistication = poolSophistication(userPoolKeys, curriculumLevel);
    const diffCfg = difficultyWeightConfig(difficulty, sophistication);
    // Free 16th packs (A/B/C…) only if user checked sixteenths — not merely d8 auto-partners
    const allowed16Patterns = (() => {
        const base = allowedSixteenthPatterns(difficulty, poolKeys);
        if (userEnabledSixteenth) return base;
        // No free 16th content: only G/H (dotted-8 pairs) remain if d8 is enabled
        const limited = new Set();
        if (userEnabledDotted8 && base.has('G')) limited.add('G');
        // H needs a free leading 16th — only when sixteenths are user-enabled (handled above)
        return limited;
    })();
    
    // Filter pool to only rhythms that fit the measure size
    // Auto-completers exist only so pair emission can finish dotted-8 groups — never picked as primary
    // Compound: drop whole/half rests from the random picker unless the user checked them
    // (they don't align to the dotted-quarter pulse and look wrong in 9/8 & 12/8).
    const userRestKeys = new Set(
        (pool || []).filter(r => r && r.isRest && !r.__autoCompleter).map(r => r.key)
    );
    let available = pool.filter(r => {
        if (r.units > totalUnits) return false;
        if (r.__autoCompleter) return false;
        // Never free-pick rests that only exist as silent partners (not user-checked)
        if (r.key === '16thRest' && !userEnabled16thRest) return false;
        if (r.key === '8thRest' && !userEnabled8thRest) return false;
        if (isCompound && (r.key === 'wholeRest' || r.key === 'halfRest') && !userRestKeys.has(r.key)) {
            return false;
        }
        if (isCompound && (r.key === 'whole' || r.key === 'half') && r.units % 6 !== 0) {
            // Allow half/whole notes only if duration is a multiple of the big beat when useful;
            // whole note (16) is never a multiple of 6 — exclude from compound pickers.
            if (r.key === 'whole') return false;
        }
        return true;
    });
    if (available.length === 0) available = pool.filter(r => r.units <= totalUnits && !r.__autoCompleter);
    if (available.length === 0) available = pool;
    
    const events = [];
    let remaining = totalUnits;
    let position = 0;
    
    const downbeatBias = (measureIndex % 4 === 0) ? 1.6 : 1.0;
    
    // Special strict path for Level 1 compound: ONLY 8th notes in exact sets of 3 at big-beat
    // boundaries. Legal big-beat fills: dotted quarter (6), 3×8th, dotted half (12), rests of 6/12.
    // NEVER: lone 8th, 8th+dottedQ, quarter (L2), etc.
    if (isCompound && curLevel <= 1) {
        while (remaining > 0) {
            const atBigBeat = (position % 6 === 0);

            // Easy: often fill whole bar with dotted half (note/rest) when legal
            if (position === 0 && remaining === totalUnits) {
                const fullBar = tryPickFullMeasureValue(available, totalUnits, difficulty, sophistication);
                if (fullBar) {
                    events.push({
                        key: fullBar.key, units: fullBar.units, vexDur: fullBar.vexDur,
                        isRest: fullBar.isRest, dots: fullBar.dots || 0, label: fullBar.label
                    });
                    remaining = 0;
                    break;
                }
            }

            // Emit 3×8th only as a complete beamed group — rate follows Easy/Med/Hard
            if (atBigBeat && remaining >= 6) {
                const hasEighth = pool.some(r => r.key === 'eighth' && !r.isRest);
                const sixUnitItems = available.filter(r => r.units === 6 && r.units <= remaining);
                const forceP = shortGroupForceProbability(difficulty, sophistication);
                // Only force 3×8 when no longer values exist, or density roll says so
                if (hasEighth && (sixUnitItems.length === 0 || Math.random() < forceP)) {
                    for (let k = 0; k < 3; k++) {
                        events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                    }
                    remaining -= 6;
                    position += 6;
                    continue;
                }
            }

            let filteredForThisStep = available.filter(r =>
                r.units <= remaining && compoundValueLegalAt(r, position, remaining)
            );

            // L1 compound: no quarters, no 16ths, no lone/partial 8th groups
            filteredForThisStep = filteredForThisStep.filter(r =>
                r.key !== 'quarter' && r.key !== 'qrtrRest' &&
                r.units !== 1 && r.key !== '8thRest'
            );

            const sub = position % 6;
            if (sub !== 0) {
                // Mid big-beat: only finish an open 3×8th run (never start dotted-Q mid-beat after 8th)
                const last = events.length > 0 ? events[events.length - 1] : null;
                let trailing8 = 0;
                for (let ti = events.length - 1; ti >= 0; ti--) {
                    if (events[ti].key === 'eighth' && !events[ti].isRest && events[ti].units === 2) trailing8++;
                    else break;
                }
                if (last && last.key === 'eighth' && !last.isRest && trailing8 > 0 && trailing8 < 3) {
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        r.key === 'eighth' && r.units === 2 && !r.isRest
                    );
                } else {
                    // Not in an 8th run — only values that finish the remaining big-beat slice cleanly
                    // (should rarely happen if we only emit complete groups)
                    const need = 6 - sub;
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        r.units === need || (r.units < need && r.units !== 2)
                    );
                    filteredForThisStep = filteredForThisStep.filter(r => r.units !== 2);
                }
            } else {
                // Big beat: no 2u starters (3×8th only via force path above)
                filteredForThisStep = filteredForThisStep.filter(r => r.units !== 2);
            }

            const densityCtx = buildDensityContext(filteredForThisStep);
            const candidates = filteredForThisStep.map(r => {
                let weight = r.weight || 5;
                weight *= downbeatDensityMul(r, difficulty, position, downbeatBias, sophistication);
                weight *= compoundMeterDensityMul(r, difficulty, sophistication);
                if (remaining - r.units === 0 && r.isRest) weight *= 0.4;
                if (events.length > 0 && events[events.length - 1].key === r.key) weight *= 0.65;
                if (newAtThisLevel.has(r.key)) weight *= 1.45;
                weight = applyDifficultyToCandidateWeight(r, weight, difficulty, remaining, totalUnits, densityCtx, sophistication);
                return { rhythm: r, weight: Math.max(0.1, weight) };
            });

            if (candidates.length === 0) break;

            const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
            let rand = Math.random() * totalWeight;
            let chosen = candidates[0].rhythm;
            for (const c of candidates) {
                rand -= c.weight;
                if (rand <= 0) { chosen = c.rhythm; break; }
            }

            events.push({
                key: chosen.key,
                units: chosen.units,
                vexDur: chosen.vexDur,
                isRest: chosen.isRest,
                dots: chosen.dots || 0,
                label: chosen.label
            });
            remaining -= chosen.units;
            position += chosen.units;
        }
        let done = normalizeRestSequences(
            finalizeMeasureMath(events, totalUnits, curTimeSig, userPoolKeys),
            curTimeSig,
            userPoolKeys
        );
        if (!userEnabled16thRest) {
            done = (done || []).map(ev =>
                (ev && ev.key === '16thRest') ? makeRhythmEvent('sixteenth') : ev
            );
        }
        return done;
    }

    // Special path for Level 2 compound: quarter+8th pairs, 3×8th groups, dotted-Q big beats.
    // Easy: more dotted-Q / dotted-half; Hard: more quarter+8th and 3×8th.
    if (isCompound && curLevel === 2) {
        while (remaining > 0) {
            const atBigBeat = (position % 6 === 0);

            if (position === 0 && remaining === totalUnits) {
                const fullBar = tryPickFullMeasureValue(available, totalUnits, difficulty, sophistication);
                if (fullBar) {
                    events.push({
                        key: fullBar.key, units: fullBar.units, vexDur: fullBar.vexDur,
                        isRest: fullBar.isRest, dots: fullBar.dots || 0, label: fullBar.label
                    });
                    remaining = 0;
                    break;
                }
            }

            // Optional complete 3×8th group (density-scaled)
            if (atBigBeat && remaining >= 6 &&
                pool.some(r => r.key === 'eighth' && !r.isRest) &&
                Math.random() < shortGroupForceProbability(difficulty, sophistication) * 0.85) {
                for (let k = 0; k < 3; k++) {
                    events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                }
                remaining -= 6;
                position += 6;
                continue;
            }

            let filteredForThisStep = available.filter(r =>
                r.units <= remaining && compoundValueLegalAt(r, position, remaining)
            );

            filteredForThisStep = filteredForThisStep.filter(r => r.units !== 1 && r.key !== '8thRest'); // no 16ths or 8thRests in L2 compound (only 8th notes as paired)

            // Optional force of content quarter rest (custom L1/L2 checkbox)
            let forceQr = null;
            if (userPoolKeys.has('qrtrRest') && atBigBeat && remaining >= 6 &&
                Math.random() < advancedCustomRate(difficulty, 'forceSpecial')) {
                forceQr = available.find(r => r.key === 'qrtrRest') || makeRhythmEvent('qrtrRest');
            }

            const sub = position % 6;
            if (sub !== 0) {
                const last = events.length > 0 ? events[events.length - 1] : null;
                if (last && (last.key === 'quarter' || last.key === 'qrtrRest') && last.units === 4) {
                    // complete the pair with exactly one 8th note (never 8th rest at L2)
                    filteredForThisStep = filteredForThisStep.filter(r => r.key === 'eighth' && r.units === 2 && !r.isRest);
                } else if (last && last.key === 'eighth' && !last.isRest) {
                    // finish open 3×8 run only
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        r.key === 'eighth' && r.units === 2 && !r.isRest
                    );
                } else {
                    filteredForThisStep = filteredForThisStep.filter(r => r.units !== 2 && r.units < 6);
                }
            } else {
                // at big beat: no lone 8th *note* to start a beat (pair only after quarter; 3×8 via force)
                filteredForThisStep = filteredForThisStep.filter(r => !(r.units === 2 && !r.isRest));
            }

            const densityCtx = buildDensityContext(filteredForThisStep);
            const candidates = filteredForThisStep.map(r => {
                let weight = r.weight || 5;
                weight *= downbeatDensityMul(r, difficulty, position, downbeatBias, sophistication);
                weight *= compoundMeterDensityMul(r, difficulty, sophistication);
                // Hard: boost quarters (pair with 8th); Easy: boost dotted-Q / long
                if (r.key === 'quarter' && !r.isRest) {
                    weight *= (difficulty === 'hard' ? 1.6 : (difficulty === 'easy' ? 0.75 : 1.15));
                }
                // Custom / package quarter rest — must surface when checked
                if (r.key === 'qrtrRest') {
                    weight *= userSpecialWeightBoost(r, difficulty, !recommendedPackageKeys.has('qrtrRest'));
                    weight *= (difficulty === 'hard' ? 1.5 : 1.25);
                }
                if (remaining - r.units === 0 && r.isRest) weight *= 0.4;
                if (events.length > 0 && events[events.length - 1].key === r.key) weight *= 0.65;
                if (newAtThisLevel.has(r.key)) weight *= 1.45;
                if (events.length > 0) {
                    const last = events[events.length - 1];
                    if (last.units === 4 && r.units === 2 && !r.isRest) weight *= 2.0;
                }
                weight = applyDifficultyToCandidateWeight(r, weight, difficulty, remaining, totalUnits, densityCtx, sophistication);
                return { rhythm: r, weight: Math.max(0.1, weight) };
            });

            if (candidates.length === 0 && !forceQr) break;

            let chosen;
            if (forceQr) {
                chosen = forceQr;
            } else {
                const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
                let rand = Math.random() * totalWeight;
                chosen = candidates[0].rhythm;
                for (const c of candidates) {
                    rand -= c.weight;
                    if (rand <= 0) { chosen = c.rhythm; break; }
                }
            }

            events.push({
                key: chosen.key,
                units: chosen.units,
                vexDur: chosen.vexDur,
                isRest: chosen.isRest,
                dots: chosen.dots || 0,
                label: chosen.label
            });
            remaining -= chosen.units;
            position += chosen.units;

            // Force quarter OR quarter-rest paired with single 8th to complete the 6-unit big beat
            if ((chosen.key === 'quarter' || chosen.key === 'qrtrRest') && chosen.units === 4 &&
                atBigBeat && remaining >= 2) {
                const e = available.find(r => r.key === 'eighth' && !r.isRest) ||
                          pool.find(r => r.key === 'eighth' && !r.isRest) ||
                          { key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 };
                events.push({ key: e.key, units: 2, vexDur: e.vexDur || '8', isRest: false, dots: 0 });
                remaining -= 2;
                position += 2;
            }
        }
        let done = normalizeRestSequences(
            finalizeMeasureMath(events, totalUnits, curTimeSig, userPoolKeys),
            curTimeSig,
            userPoolKeys
        );
        if (!userEnabled16thRest) {
            done = (done || []).map(ev =>
                (ev && ev.key === '16thRest') ? makeRhythmEvent('sixteenth') : ev
            );
        }
        return done;
    }
    
    // Normal path for everything else (simple meters, L>2 compound, etc.)
    while (remaining > 0) {
        // User-checked advanced figures (triplets, etc.) — try BEFORE full-bar fill so
        // custom checkboxes (e.g. quarter triplets on L1) are not starved by whole notes.
        // When forced, skip ALL curriculum filters below so checkboxes always surface.
        let forceSpecial = tryPickUserEnabledSpecial(
            available, position, remaining, curTimeSig || timeSig, isCompound, difficulty,
            measureIndex, curriculumLevel
        );

        // Full-measure legal values (dotted half in 3/4, whole in 4/4, …) — only when not
        // forcing a special this step.
        if (!forceSpecial && position === 0 && remaining === totalUnits) {
            const fullBar = tryPickFullMeasureValue(available, totalUnits, difficulty, sophistication);
            if (fullBar) {
                events.push({
                    key: fullBar.key,
                    units: fullBar.units,
                    vexDur: fullBar.vexDur,
                    isRest: fullBar.isRest,
                    dots: fullBar.dots || 0,
                    label: fullBar.label
                });
                remaining = 0;
                break;
            }
        }

        let filteredForThisStep = forceSpecial
            ? [forceSpecial]
            : available.filter(r => r.units <= remaining);

        // === Universal measure-math + level hygiene (skipped for validated forceSpecial) ===
        if (!forceSpecial) {
        filteredForThisStep = filteredForThisStep.filter(r => {
            // Dotted 8th (3) + 16th (1) = 4
            if ((r.key === 'dotted8th' || r.key === 'dotted8thRest') && remaining < 4) return false;
            // Dotted quarter (6) + 8th (2) = 8 — simple & cut only (compound DQ is a full beat)
            if ((r.key === 'dottedQtr' || r.key === 'dottedQrtrRest') && !isCompound && remaining < 8) return false;
            // Dotted half / whole: only when units fit remaining (3/4 dotted half = full bar = OK)
            if ((r.key === 'dottedHalf' || r.key === 'dottedHalfRest') && r.units > remaining) return false;
            if ((r.key === 'whole' || r.key === 'wholeRest') && r.units > remaining) return false;
            // Don't start a lone 16th when we can't complete at least a pair
            if (r.key === 'sixteenth' && !r.isRest && remaining < 2 && !r.__autoCompleter) return false;
            return true;
        });
        
        if (isCompound) {
            // Big-beat alignment: ban quarter+dotted-half cross-beat writing, etc.
            filteredForThisStep = filteredForThisStep.filter(r =>
                compoundValueLegalAt(r, position, remaining)
            );
            const sub = position % 6;
            // Never allow a 3rd consecutive 8th rest anywhere (full empty compound beat = dotted quarter rest)
            let trailing8thRests = 0;
            for (let ti = events.length - 1; ti >= 0; ti--) {
                const e = events[ti];
                if (e && eventIsRest(e) && e.units === 2 && (e.key === '8thRest' || e.vexDur === '8r')) trailing8thRests++;
                else break;
            }
            if (trailing8thRests >= 2) {
                filteredForThisStep = filteredForThisStep.filter(r =>
                    !(r.key === '8thRest' || (r.isRest && r.units === 2))
                );
            }
            // Universal: open 8th-note run mid big-beat must finish with 8ths (sets of 3),
            // or 8th rest mid-group when user enabled 8th rests (→ 8 + 8r + 8).
            // Ban awkward 8th + dotted-quarter (and any other 6u) mid-beat — rare and ugly in real music.
            let trailing8Notes = 0;
            for (let ti = events.length - 1; ti >= 0; ti--) {
                const e = events[ti];
                if (e && e.key === 'eighth' && !e.isRest && e.units === 2) trailing8Notes++;
                else break;
            }
            if (sub !== 0 && trailing8Notes > 0) {
                if (userEnabled8thRest && trailing8Notes === 1 && remaining >= 4) {
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'eighth' && r.units === 2 && !r.isRest) ||
                        (r.key === '8thRest' && r.units === 2)
                    );
                } else {
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        r.key === 'eighth' && r.units === 2 && !r.isRest
                    );
                }
            }
            // At big beat: never start a lone 8th unless we can emit a full set of 3 (handled by emitters)
            // and never follow a previous incomplete idea with dottedQ after a single 8th residue
            if (sub === 0) {
                // Dotted quarter is a COMPLETE big beat — only legal at big-beat starts (already sub===0)
                // Lone 8th starters blocked below for low levels; L5+ emitters handle 3×8 bundles.
            }
            if (curLevel >= 5) {
                // L5+ compound (also used when custom pool has 16ths/dotted8 via groupLevel bump)
                // 8th rests between 8ths, 16ths in 2s/4s with 8ths, dotted8+16 pairs, 3×quarter
                const allowD8 = userEnabledDotted8 || curLevel >= 6;
                // 16th rests only when user checked them (never via auto-completer injection)
                const allow16r = userEnabled16thRest;
                const last = events.length > 0 ? events[events.length - 1] : null;
                let trailing16 = 0;
                for (let ti = events.length - 1; ti >= 0; ti--) {
                    if (events[ti].key === 'sixteenth' && !events[ti].isRest) trailing16++;
                    else break;
                }
                if (sub !== 0) {
                    if (last && (last.key === 'dotted8th' || last.key === 'dotted8thRest') && allowD8) {
                        // Complete dotted8 + 16th only — never a second dotted 8th
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'sixteenth' && !r.isRest) ||
                            (last.isRest && allow16r && r.key === '16thRest')
                        );
                    } else if (last && last.key === '16thRest' && allow16r) {
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'sixteenth' && !r.isRest) ||
                            (r.key === '16thRest') ||
                            (r.key === 'eighth' && !r.isRest) ||
                            (r.units >= 2)
                        );
                    } else if (last && last.key === 'sixteenth' && !last.isRest) {
                        // After d8+16 (trailing16===1 and prev was dotted8): only 8th to finish beat
                        const prev2 = events.length >= 2 ? events[events.length - 2] : null;
                        const afterD8 = prev2 && (prev2.key === 'dotted8th' || prev2.key === 'dotted8thRest');
                        if (afterD8 && trailing16 === 1) {
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                (r.key === 'eighth' && !r.isRest) ||
                                (r.key === '8thRest')
                            );
                        } else if (trailing16 < 6) {
                            // Continue toward 2 / 4 / 6 sixteenths in the big beat (L4 packs still legal on L5+)
                            // Even counts may also finish with an 8th (2×16+8 or 4×16+8)
                            const canFinish8 = (trailing16 === 2 || trailing16 === 4) && remaining >= 2;
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                (r.key === 'sixteenth' && !r.isRest) ||
                                (allow16r && r.key === '16thRest') ||
                                (canFinish8 && r.key === 'eighth' && !r.isRest)
                            );
                            // Never start dotted8 after a lone/mid 16th run
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                r.key !== 'dotted8th' && r.key !== 'dotted8thRest'
                            );
                        } else {
                            // Full set of 6 — no more free 16ths in this beat
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                (r.units !== 1 || (allow16r && r.key === '16thRest')) &&
                                r.key !== 'dotted8th' && r.key !== 'dotted8thRest'
                            );
                        }
                    } else if (last && last.key === 'eighth' && !last.isRest) {
                        // After 8th: more 8ths, 8th rest, or 16ths; dotted8 only at big-beat start (handled below)
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'eighth' && !r.isRest) ||
                            (r.key === '8thRest') ||
                            (r.key === 'sixteenth' && !r.isRest) ||
                            (allow16r && r.key === '16thRest') ||
                            (r.units > 2 && r.key !== 'dotted8th' && r.key !== 'dotted8thRest')
                        );
                    } else if (last && last.key === '8thRest') {
                        // 8th rest between 8ths → prefer another 8th note
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'eighth' && !r.isRest) || (r.units !== 2 || r.isRest)
                        );
                    } else if (last && last.key === 'quarter' && !last.isRest) {
                        // Quarter MUST be completed with one 8th (note or rest) — never dotted half etc.
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'eighth' && !r.isRest && r.units === 2) ||
                            (r.key === '8thRest' && r.units === 2)
                        );
                    }
                } else {
                    // Big beat: 16th needs pair room; dotted8 needs full figure room (d8+16+8 = 6 preferred)
                    filteredForThisStep = filteredForThisStep.filter(r => {
                        if (r.key === 'sixteenth' && !r.isRest) return remaining >= 2;
                        if (r.key === 'dotted8th' || r.key === 'dotted8thRest') {
                            // Prefer starting only when a full big-beat figure fits (3+1+2)
                            return (userEnabledDotted8 || curLevel >= 6) && remaining >= 6;
                        }
                        if (r.key === '16thRest') return userEnabled16thRest;
                        if (r.key === 'sixteenthTriplet') {
                            return poolKeys.has('sixteenthTriplet') && remaining >= 2;
                        }
                        if (r.key === '8thRest') return userEnabled8thRest && remaining >= 4;
                        return true;
                    });
                }
            } else if (sub !== 0) {
                const last = events.length > 0 ? events[events.length-1] : null;
                if (last && (last.key === 'quarter' || last.key === 'qrtrRest') && last.units === 4) {
                    // Complete big beat: exactly one 8th (note preferred; rest if enabled)
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'eighth' && !r.isRest && r.units === 2) ||
                        (r.key === '8thRest' && r.units === 2)
                    );
                } else if (last && last.key === 'eighth' && last.units === 2 && !last.isRest) {
                    // Finish 3×8, or allow 8th rest mid-group when enabled (→ 8 + 8r + 8)
                    let t8n = 0;
                    for (let ti = events.length - 1; ti >= 0; ti--) {
                        if (events[ti].key === 'eighth' && !events[ti].isRest && events[ti].units === 2) t8n++;
                        else break;
                    }
                    if (userEnabled8thRest && t8n === 1 && remaining >= 4) {
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'eighth' && r.units === 2 && !r.isRest) ||
                            (r.key === '8thRest' && r.units === 2)
                        );
                    } else {
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            r.key === 'eighth' && r.units === 2 && !r.isRest
                        );
                    }
                } else if (last && last.key === '8thRest' && last.units === 2 && userEnabled8thRest) {
                    // After content 8th rest mid-beat: prefer 8th note to finish the big beat
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'eighth' && r.units === 2 && !r.isRest) ||
                        (r.key === '8thRest' && trailing8thRests < 2)
                    );
                } else if (last && last.key === 'sixteenth' && last.units === 1 && curLevel === 4) {
                    filteredForThisStep = filteredForThisStep.filter(r => r.key === 'sixteenth' && r.units === 1);
                } else {
                    filteredForThisStep = filteredForThisStep.filter(r => {
                        if (r.units === 2) {
                            if (r.isRest || r.key === '8thRest') {
                                if (curLevel < 4 && !userEnabled8thRest) return false;
                                if (trailing8thRests >= 2) return false;
                                return userEnabled8thRest || curLevel >= 4;
                            }
                            // allow 8th note after quarter / quarter rest to complete the big beat
                            if (last && last.units === 4 && !r.isRest) {
                                return true;
                            }
                            return false;  // no lone 8th notes otherwise
                        }
                        // Never start dotted-half / dotted-Q mid big-beat
                        if (r.units >= 6) return false;
                        if (r.units === 1 && curLevel === 4 && isCompound) {
                            return false;  // no lone 16ths in L4 compound, only sets of 6 at big
                        }
                        // Custom 16th triplets in compound (2u each)
                        if (r.key === 'sixteenthTriplet') {
                            return poolKeys.has('sixteenthTriplet') && remaining >= 2;
                        }
                        return true;
                    });
                }
            }
        }
        if (isCompound && curLevel === 4) {
            // L4 compound: 16ths ONLY as complete sets of 6 on a big beat (one full dotted-quarter).
            // Mixed 2s/4s with 8ths are L5+.
            const sub = position % 6;
            let trailing16 = 0;
            for (let ti = events.length - 1; ti >= 0; ti--) {
                if (events[ti].key === 'sixteenth' && !events[ti].isRest && events[ti].units === 1) trailing16++;
                else break;
            }
            const last = events.length > 0 ? events[events.length - 1] : null;
            // No dotted-8 / 16th rests as free content at L4
            filteredForThisStep = filteredForThisStep.filter(r =>
                r.key !== 'dotted8th' && r.key !== 'dotted8thRest' &&
                !(r.units === 1 && r.isRest)
            );
            if (sub === 0) {
                filteredForThisStep = filteredForThisStep.filter(r => {
                    if (r.key === 'sixteenth' && !r.isRest) return remaining >= 6;
                    return true;
                });
            } else if (last && last.key === 'sixteenth' && !last.isRest) {
                // Must finish the set of 6 — never insert 8th mid-pack (that would be L5 mixed)
                if (trailing16 < 6) {
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        r.key === 'sixteenth' && r.units === 1 && !r.isRest
                    );
                } else {
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        !(r.key === 'sixteenth' && !r.isRest)
                    );
                }
            } else {
                // Mid-beat with no open 16th run: no 16ths
                filteredForThisStep = filteredForThisStep.filter(r =>
                    !(r.key === 'sixteenth' && !r.isRest)
                );
            }
        }
        if (isCompound && curLevel === 3) {
            filteredForThisStep = filteredForThisStep.filter(r => r.units !== 1 && r.key !== '8thRest'); // no 16ths or 8th rests in L3 compound
        }

        // Simple meter level-specific rules for 8ths/16ths
        // Cut time (2/2): half-note beat = 8 sixteenth-units. Subdivide that beat with 8ths.
        if (!isCompound) {
            if (timeSig === '2/2' && curLevel === 3) {
                // L3 cut: 8ths ONLY as exact sets of 4 beamed together (one full half-note beat).
                // Never pairs of 2. No lone 8ths. No 16ths.
                filteredForThisStep = filteredForThisStep.filter(r => r.units !== 1);
                const cutBeat = 8;
                const sub = position % cutBeat;
                let trailing8 = 0;
                for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i];
                    if (ev.key === 'eighth' && ev.units === 2 && !ev.isRest) trailing8 += 2;
                    else break;
                }
                if (sub === 0) {
                    // Only start 8ths if a full set of 4 (8 units) fits
                    filteredForThisStep = filteredForThisStep.filter(r => {
                        if (r.key === 'eighth' && !r.isRest) return remaining >= cutBeat;
                        return true;
                    });
                } else {
                    const last = events.length > 0 ? events[events.length - 1] : null;
                    if (last && last.key === 'eighth' && !last.isRest && trailing8 < cutBeat) {
                        // Must finish the set of 4
                        filteredForThisStep = filteredForThisStep.filter(r => r.key === 'eighth' && r.units === 2 && !r.isRest);
                    } else {
                        // Mid-beat with no open 8th run: no 8ths
                        filteredForThisStep = filteredForThisStep.filter(r => !(r.key === 'eighth' && !r.isRest));
                    }
                }
            } else if (timeSig === '2/2' && curLevel >= 4) {
                // L4+ cut: 8th patterns filling one half-note beat (8 units):
                //   1) four 8ths beamed
                //   2) two beamed 8ths + quarter
                //   3) quarter + two beamed 8ths
                //   4) 8th + quarter + 8th
                // L5 cut adds: dotted quarter + 8th; quarter-note triplets
                // L6 cut adds: 8th rests + 8th-note triplets (16th rests only if custom-checked)
                // Never lone 8ths. No dotted 8ths. No free 16ths unless user enabled them / 16th rests.
                filteredForThisStep = filteredForThisStep.filter(r => {
                    if (r.key === 'dotted8th' || r.key === 'dotted8thRest') return false;
                    if (r.units === 1) {
                        if (r.key === '16thRest') return userEnabled16thRest;
                        // 16th notes: free content if checked, or auto partners for 16th rests
                        if (r.key === 'sixteenth' && !r.isRest) {
                            return userEnabledSixteenth || userEnabled16thRest;
                        }
                        return false;
                    }
                    return true;
                });
                const cutBeat = 8;
                const sub = position % cutBeat;
                let trailing8 = 0;
                for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i];
                    if (ev.key === 'eighth' && ev.units === 2 && !ev.isRest) trailing8 += 2;
                    else break;
                }
                let trailing16cut = 0;
                for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i];
                    if ((ev.key === 'sixteenth' || ev.key === '16thRest') && ev.units === 1) trailing16cut += 1;
                    else break;
                }
                const last = events.length > 0 ? events[events.length - 1] : null;
                if (last && last.key === '16thRest' && userEnabled16thRest) {
                    // Complete 16r with 16th note (preferred) or another 16th rest within an even group
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'sixteenth' && !r.isRest) ||
                        (r.key === '16thRest') ||
                        (trailing16cut >= 2 && r.units >= 2)
                    );
                } else if (last && last.key === 'sixteenth' && last.units === 1 && !last.isRest &&
                           trailing16cut > 0 && trailing16cut < 2) {
                    // Finish a 2-unit 16th pair (note or rest)
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'sixteenth' && !r.isRest) ||
                        (userEnabled16thRest && r.key === '16thRest')
                    );
                } else if (sub === 0) {
                    // Start of half-note beat — pool keys (not curriculum level) gate custom specials
                    filteredForThisStep = filteredForThisStep.filter(r => {
                        if (r.key === 'eighth' && !r.isRest) return remaining >= 2;
                        if (r.key === 'quarterTriplet') {
                            return poolKeys.has('quarterTriplet') && remaining >= 8;
                        }
                        // Dotted Q = 6u; must have room for +8th (2u) = full half-note beat
                        if (r.key === 'dottedQtr' || r.key === 'dottedQrtrRest') {
                            return (userEnabledDottedQ || poolKeys.has('dottedQtr') || poolKeys.has('dottedQrtrRest') || curLevel >= 5) && remaining >= 8;
                        }
                        // 8th triplets when enabled (curriculum L6 or custom checkbox)
                        if (r.key === 'eighthNoteTriplet') {
                            return poolKeys.has('eighthNoteTriplet') && remaining >= 4;
                        }
                        if (r.key === '8thRest') return userEnabled8thRest || r.__autoCompleter;
                        // 16th rest: need room for 16r + 16th completer
                        if (r.key === '16thRest') return userEnabled16thRest && remaining >= 2;
                        if (r.key === 'sixteenth' && !r.isRest) {
                            return (userEnabledSixteenth || userEnabled16thRest) && remaining >= 2;
                        }
                        return true;
                    });
                } else if (last && (last.key === 'dottedQtr' || last.key === 'dottedQrtrRest') && last.units === 6) {
                    // Dotted quarter MUST be followed by an 8th (note or rest) to complete the beat
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'eighth' && !r.isRest) ||
                        (r.key === '8thRest') ||
                        (r.units === 2)
                    );
                } else if (last && last.key === '8thRest' && (curLevel >= 6 || userEnabled8thRest)) {
                    // After 8th rest: prefer 8th note to continue the figure
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'eighth' && !r.isRest) ||
                        (r.key === '8thRest') ||
                        (r.units >= 4)
                    );
                } else if (last && last.key === 'eighth' && !last.isRest) {
                    // Continuing / completing an 8th-based pattern
                    if (trailing8 === 2 && sub === 2) {
                        // After one 8th: allow quarter (→ pattern 4: 8+q+8) or another 8th (→ toward 2 or 4×8)
                        // L6: also 8th rest
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'eighth' && !r.isRest) ||
                            (r.key === 'quarter' && !r.isRest) ||
                            (curLevel >= 6 && r.key === '8thRest') ||
                            (r.units !== 2 && r.key !== 'eighth')
                        );
                    } else if (trailing8 === 4 && sub === 4) {
                        // After two 8ths: allow quarter (→ pattern 2) or two more 8ths (→ pattern 1)
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'eighth' && !r.isRest) ||
                            (r.key === 'quarter' && !r.isRest) ||
                            (curLevel >= 6 && r.key === '8thRest') ||
                            (r.units !== 2 && r.key !== 'eighth')
                        );
                    } else if (trailing8 > 0 && trailing8 < 8) {
                        // Finish a run of 8ths (up to 4 notes / 8 units)
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'eighth' && !r.isRest) ||
                            (curLevel >= 6 && r.key === '8thRest')
                        );
                    } else {
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            !(r.key === 'eighth' && !r.isRest) || curLevel >= 6
                        );
                    }
                } else if (last && last.key === 'quarter' && !last.isRest) {
                    // After quarter mid-beat: complete pattern 3 (q+2×8) or pattern 4 (8+q+8)
                    filteredForThisStep = filteredForThisStep.filter(r => r.key === 'eighth' && !r.isRest);
                } else {
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        !(r.key === 'eighth' && !r.isRest) ||
                        (curLevel >= 6 && r.key === '8thRest')
                    );
                }
            } else if (curLevel === 2) {
                // L2 simple (not cut-specific path above): 8ths only pairs or groups of 4; no 16ths.
                // 8th rests OK when user-enabled (e.g. L1 + custom 8th rest bumps groupLevel to 2).
                filteredForThisStep = filteredForThisStep.filter(r => r.units !== 1);
                const sub = position % 4;
                let trailingUnits = 0;
                for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i];
                    if (ev.key === 'eighth' && ev.units === 2) {
                        trailingUnits += 2;
                    } else {
                        break;
                    }
                }
                if (sub !== 0) {
                    const last = events.length > 0 ? events[events.length-1] : null;
                    if (last && last.key === 'eighth' && last.units === 2) {
                        let t = 0;
                        for (let i = events.length - 1; i >= 0; i--) {
                            const ev = events[i];
                            if (ev.key === 'eighth' && ev.units === 2) { t += 2; } else { break; }
                        }
                        if (t + 2 > 4) {
                            filteredForThisStep = filteredForThisStep.filter(r => !(r.key === 'eighth' && r.units === 2));
                        } else {
                            filteredForThisStep = filteredForThisStep.filter(r => r.key === 'eighth' && r.units === 2);
                        }
                    } else if (last && last.key === '8thRest' && last.units === 2) {
                        // Finish half-beat after content 8th rest: 8th note (preferred) or another 8th rest
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'eighth' && r.units === 2 && !r.isRest) ||
                            (r.key === '8thRest')
                        );
                    } else {
                        filteredForThisStep = filteredForThisStep.filter(r => !(r.units === 2 && !r.isRest));
                    }
                } else if (trailingUnits >= 4) {
                    filteredForThisStep = filteredForThisStep.filter(r => !(r.key === 'eighth' && r.units === 2 && !r.isRest));
                }
            } else if (curLevel === 3) {
                // L3 simple (4/4, 3/4, 2/4): 16ths ONLY as complete sets of 4 on the beat (1 e & a).
                // No mixed 16th forms (2×16+8, 8+2×16, 16+8+16, …) — those are L4+.
                // No dotted 8ths. 8ths still in pairs/groups; dottedQ always + 8th.
                filteredForThisStep = filteredForThisStep.filter(r =>
                    r.key !== 'dotted8th' && r.key !== 'dotted8thRest' &&
                    !(r.units === 1 && r.isRest)
                );
                const sub = position % 4;
                let trailing16 = 0;
                let trailing8 = 0;
                for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i];
                    if (ev.key === 'sixteenth' && ev.units === 1 && !ev.isRest) trailing16 += 1;
                    else break;
                }
                for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i];
                    if (ev.key === 'eighth' && ev.units === 2 && !ev.isRest) trailing8 += 2;
                    else break;
                }
                const last = events.length > 0 ? events[events.length - 1] : null;
                if (sub === 0) {
                    // Start 16ths only when a full set of 4 fits
                    filteredForThisStep = filteredForThisStep.filter(r => {
                        if (r.key === 'sixteenth' && !r.isRest) return remaining >= 4;
                        if (r.key === 'eighth' && !r.isRest) return remaining >= 2;
                        return true;
                    });
                } else if (last && last.key === 'sixteenth' && last.units === 1 && !last.isRest) {
                    // Finish the set of 4 — never insert 8th mid-group (that would be L4 mixed)
                    if (trailing16 < 4) {
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            r.key === 'sixteenth' && r.units === 1 && !r.isRest
                        );
                    } else {
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            !(r.key === 'sixteenth' && !r.isRest)
                        );
                    }
                } else if (last && last.key === 'dottedQtr' && last.units === 6) {
                    // Dotted quarter always paired with one 8th (2u left in the 8u span)
                    // Never 2×16 after dottedQ on L3 — that is L4 mixed content
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'eighth' && r.units === 2 && !r.isRest) ||
                        (r.key === '8thRest')
                    );
                } else if (last && last.key === '8thRest' && last.units === 2) {
                    // After 8th rest mid-beat: finish with 8th note/rest only — never 2×16
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'eighth' && r.units === 2 && !r.isRest) ||
                        (r.key === '8thRest') ||
                        (r.units >= 2 && r.key !== 'sixteenth' && !r.isRest)
                    );
                } else if (last && last.key === 'eighth' && last.units === 2 && !last.isRest) {
                    // Continue/complete 8th pairs (not 16ths mid-pair)
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        (r.key === 'eighth' && r.units === 2 && !r.isRest) ||
                        (trailing8 >= 2 && r.units !== 1)
                    );
                } else {
                    // Mid-beat with no open run: no lone 8ths or 16ths
                    filteredForThisStep = filteredForThisStep.filter(r =>
                        !((r.units === 2 && !r.isRest) || (r.key === 'sixteenth' && !r.isRest))
                    );
                }
            }
            if (!isCompound && timeSig !== '2/2') {
                // Triplets in simple meters: legal whenever enabled in the pool (curriculum or custom).
                // 8th trip = 1 beat (4u); 16th trip = ½ beat (2u); quarter trip = 2 beats (8u).
                const allow8t = poolKeys.has('eighthNoteTriplet');
                const allow16t = poolKeys.has('sixteenthTriplet');
                const allowQt = poolKeys.has('quarterTriplet');
                if (allow8t || allow16t || allowQt || curLevel >= 5) {
                    filteredForThisStep = filteredForThisStep.filter(r => {
                        if (r.key === 'eighthNoteTriplet') {
                            return allow8t && (position % 4 === 0) && remaining >= 4;
                        }
                        if (r.key === 'sixteenthTriplet') {
                            return allow16t && (position % 2 === 0) && remaining >= 2;
                        }
                        if (r.key === 'quarterTriplet') {
                            // 3 quarters in time of 2 → needs two quarter-beats of room
                            return allowQt && (position % 4 === 0) && remaining >= 8;
                        }
                        return true;
                    });
                }
            }
            if (!isCompound && curLevel >= 4 && timeSig !== '2/2') {
                // Subdivisions as complete primary beamed groups:
                //   4×16 | 2×16+8 | 8+2×16 | 16+8+16 | dotted8+16 | 16+dotted8 | 2×16 after dottedQ
                // Never a lone (unbeamed/flagged) 16th or lone dotted 8th.
                // 16th rests only when user enabled them (L6 package or custom) — not as dotted-8 partners.
                if (!userEnabled16thRest) {
                    filteredForThisStep = filteredForThisStep.filter(r => !(r.units === 1 && r.isRest));
                }
                const sub = position % 4;
                let trailing16 = 0;
                for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i];
                    if (ev.key === 'sixteenth' && ev.units === 1 && !ev.isRest) trailing16 += 1;
                    else break;
                }
                if (sub === 0) {
                    // At beat: only start 16ths / dotted8 if a full primary group can fit
                    filteredForThisStep = filteredForThisStep.filter(r => {
                        if (r.key === 'sixteenth' && r.units === 1) return remaining >= 2;
                        // dotted 8th (note or rest) + 16th completer = 4 units
                        if (r.key === 'dotted8th' || r.key === 'dotted8thRest') return remaining >= 4;
                        return true;
                    });
                }
                if (sub !== 0) {
                    const last = events.length > 0 ? events[events.length - 1] : null;
                    if (last && (last.key === 'dotted8th' || last.key === 'dotted8thRest')) {
                        // Complete G) with exactly one 16th NOTE (16th rest only if user enabled)
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'sixteenth' && r.units === 1 && !r.isRest) ||
                            (last.isRest && userEnabled16thRest && r.key === '16thRest')
                        );
                    } else if (last && last.key === '16thRest') {
                        // L6: after 16th rest, continue with 16th note (or another rest) within the beat
                        if (curLevel >= 6) {
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                (r.key === 'sixteenth' && !r.isRest) ||
                                (r.key === '16thRest') ||
                                (r.units >= 2)
                            );
                        }
                    } else if (last && last.key === 'sixteenth' && last.units === 1 && !last.isRest) {
                        const beforeIdx = events.length - trailing16 - 1;
                        const beforeRun = (beforeIdx >= 0) ? events[beforeIdx] : null;
                        let maxForThisRun = 4;
                        if (beforeRun && beforeRun.key === 'dottedQtr') maxForThisRun = 2;
                        if (beforeRun && beforeRun.key === 'eighth' && beforeRun.units === 2 && !beforeRun.isRest) maxForThisRun = 2;
                        if (beforeRun && (beforeRun.key === 'dotted8th' || beforeRun.key === 'dotted8thRest')) maxForThisRun = 1;
                        const freeRun = !(beforeRun && (beforeRun.key === 'eighth' || beforeRun.key === 'dottedQtr' ||
                            beforeRun.key === 'dotted8th' || beforeRun.key === 'dotted8thRest'));
                        // B finish MUST be checked before "fill more 16ths": trailing16=2 is < max 4,
                        // so the old order always forced A (4×16) and never allowed 2×16+8.
                        if (trailing16 === 2 && sub === 2 && remaining >= 2 && freeRun &&
                            allowed16Patterns.has('B')) {
                            // After two 16ths at beat start: 8th → B, or more 16ths → A
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                (r.key === 'eighth' && !r.isRest) ||
                                (r.key === 'sixteenth' && r.units === 1 && !r.isRest) ||
                                (userEnabled16thRest && r.key === '16thRest')
                            );
                        } else if (trailing16 === 1 && sub === 1 && remaining >= 3 && freeRun) {
                            // After a single 16th: 8th (→ F) or dotted8 (→ H) or continue 16ths
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                (r.key === 'eighth' && !r.isRest) ||
                                (r.key === 'dotted8th' && allowed16Patterns.has('H')) ||
                                (r.key === 'sixteenth' && r.units === 1) ||
                                (userEnabled16thRest && r.key === '16thRest')
                            );
                        } else if (trailing16 < maxForThisRun) {
                            // Mid 16th-run (not a B decision point): continue with 16ths
                            if (userEnabled16thRest) {
                                filteredForThisStep = filteredForThisStep.filter(r =>
                                    (r.key === 'sixteenth' && !r.isRest) || r.key === '16thRest'
                                );
                            } else {
                                filteredForThisStep = filteredForThisStep.filter(r => r.key === 'sixteenth' && r.units === 1);
                            }
                        } else {
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                (r.units !== 1 || (userEnabled16thRest && r.key === '16thRest')) &&
                                r.key !== 'dotted8th' && r.key !== 'dotted8thRest'
                            );
                        }
                    } else if (last && last.key === 'eighth' && last.units === 2 && !last.isRest) {
                        // 8 + 2×16, or mid F) 16+8+16 (next needs a 16th)
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'sixteenth' && !r.isRest) ||
                            (userEnabled16thRest && r.key === '16thRest')
                        );
                    } else if (last && last.key === '8thRest' && last.units === 2) {
                        // After 8th rest mid-beat: complete with 8th note (not 2×16 masquerading as d8 math)
                        // Remaining in beat is typically 2u — one 8th fills cleanly.
                        filteredForThisStep = filteredForThisStep.filter(r =>
                            (r.key === 'eighth' && !r.isRest && r.units === 2) ||
                            (r.units >= 2 && r.key !== 'sixteenth' && r.key !== 'dotted8th' && r.key !== 'dotted8thRest') ||
                            (userEnabled16thRest && r.key === '16thRest')
                        );
                    } else if (last && last.key === 'dottedQtr' && last.units === 6) {
                        // dotted quarter + two 16ths (always a pair)
                        filteredForThisStep = filteredForThisStep.filter(r => r.key === 'sixteenth' && r.units === 1 && !r.isRest);
                    } else {
                        // block lone 16ths / dotted8 mid-beat (L6 may start 16th rest mid-beat carefully)
                        if (curLevel >= 6) {
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                r.key !== 'dotted8th' && r.key !== 'dotted8thRest' &&
                                (!(r.key === 'sixteenth' && !r.isRest) || remaining >= 2)
                            );
                        } else {
                            filteredForThisStep = filteredForThisStep.filter(r =>
                                r.units !== 1 && r.key !== 'dotted8th' && r.key !== 'dotted8thRest'
                            );
                        }
                    }
                }

                // Avoid quarter (or 4u rest) immediately followed by dotted quarter in L4 simple
                const lastEv = events.length > 0 ? events[events.length - 1] : null;
                if (lastEv && lastEv.units === 4) {
                    filteredForThisStep = filteredForThisStep.filter(r => !(r.units === 6 && r.dots && r.key !== 'dotted8th'));
                }
            }
        }
        } // end if (!forceSpecial) — forced user specials skip all curriculum filters
        
        const densityCtx = buildDensityContext(filteredForThisStep);
        const candidates = filteredForThisStep.map(r => {
            let weight = r.weight || 5;
            weight *= downbeatDensityMul(r, difficulty, position, downbeatBias, sophistication);
            if (isCompound) {
                weight *= compoundMeterDensityMul(r, difficulty, sophistication);
                // Prefer dotted-quarter rest over spelling empty beats as 8th rests —
                // but do NOT crush content 8th rests when the user checked them (L4+ / custom).
                if ((position % 6 === 0) && r.key === 'dottedQrtrRest') weight *= 1.8;
                if ((position % 6 === 0) && (r.key === '8thRest' || (r.isRest && r.units === 2 && r.key === '8thRest'))) {
                    weight *= userEnabled8thRest ? 0.85 : 0.2;
                }
                if (events.length > 0) {
                    const last = events[events.length - 1];
                    if (last.units === 4 && !last.isRest && r.units === 4 && !r.isRest) {
                        weight *= 0.25; // discourage consecutive quarters
                    }
                    if (last.units === 4 && !last.isRest && r.units === 2 && !r.isRest) {
                        weight *= 2.2; // after quarter, complete with 8th
                    }
                    if (last.units === 2 && !last.isRest && r.units === 2 && !r.isRest) {
                        weight *= 1.7; // continue toward sets of 3
                    }
                    // Never reward awkward 8th → dottedQ
                    if (last.units === 2 && !last.isRest && r.units === 6 && r.dots) {
                        weight *= 0.05;
                    }
                    if (last.units === 6 && last.dots && r.units === 4 && !r.isRest) {
                        weight *= 0.3;
                    }
                }
            } else if (curTimeSig === '2/2' || timeSig === '2/2') {
                weight *= cutMeterDensityMul(r, difficulty);
            }
            if (r.units === 1 && events.length > 0 && events[events.length-1].units === 1) weight *= 0.55;
            if (remaining - r.units === 0 && r.isRest) weight *= 0.4;
            if (events.length > 0 && events[events.length-1].key === r.key) weight *= 0.65;
            if (newAtThisLevel.has(r.key)) weight *= 1.45;

            if (!isCompound && curLevel === 4) {
                const lastEv = events.length > 0 ? events[events.length - 1] : null;
                if (lastEv && lastEv.units === 4 && r.units === 6 && r.dots) {
                    weight *= 0.05; // strongly discourage quarter/rest + dottedQ combo in L4 simple (too complex)
                }
            }
            weight = applyDifficultyToCandidateWeight(r, weight, difficulty, remaining, totalUnits, densityCtx, sophistication);
            // After exactly 2 free 16ths mid-beat, strongly prefer 8th so B (2×16+8) actually lands
            if (!isCompound && curLevel >= 4 && timeSig !== '2/2' && r.key === 'eighth' && !r.isRest) {
                let t16 = 0;
                for (let ti = events.length - 1; ti >= 0; ti--) {
                    if (events[ti].key === 'sixteenth' && events[ti].units === 1 && !events[ti].isRest) t16++;
                    else break;
                }
                const subB = position % 4;
                if (t16 === 2 && subB === 2 && allowed16Patterns.has('B')) {
                    weight *= 3.2;
                }
            }
            // Never pick auto-completer 16ths as a primary choice (only for finishing dotted-8 pairs)
            if (r.__autoCompleter) weight *= 0.02;
            // Free sixteenths only when user-checked (auto partners stay off the primary picker)
            if (r.key === 'sixteenth' && !userEnabledSixteenth) weight *= 0.001;
            // Dotted-8: mild in-package boost; outside-package uses advancedCustomRate (via userSpecialWeightBoost)
            // — do NOT multiply by 2–3× here or L1 Easy + d8 rest floods the page.
            if ((r.key === 'dotted8th' || r.key === 'dotted8thRest') && userEnabledDotted8) {
                const inPackage = recommendedPackageKeys.has(r.key);
                if (inPackage) {
                    // Normal L4+ package material — modest presence
                    weight *= (r.key === 'dotted8thRest')
                        ? (difficulty === 'easy' ? 1.15 : 1.3)
                        : (difficulty === 'easy' ? 1.35 : 1.55);
                }
                // outside package: weight handled only by userSpecialWeightBoost below
            }
            // Cut time: dotted quarters should appear when enabled (always paired with 8th)
            if (curTimeSig === '2/2' && (r.key === 'dottedQtr' || r.key === 'dottedQrtrRest') && userEnabledDottedQ) {
                const dqOutside = !recommendedPackageKeys.has(r.key);
                weight *= dqOutside
                    ? advancedCustomRate(difficulty, 'weight')
                    : (difficulty === 'easy' ? 1.35 : 1.6);
            }
            // Package mild boost / custom advanced scales with Easy→Hard
            weight *= userSpecialWeightBoost(r, difficulty, !recommendedPackageKeys.has(r.key));
            // Forced pick: make weight dominate so weighted draw still selects it if list grows
            if (forceSpecial && r.key === forceSpecial.key) weight *= 50;
            return { rhythm: r, weight: Math.max(0.1, weight) };
        });
        
        if (candidates.length === 0) break;
        
        // Prefer not to pick auto-completers even if residual weight remains
        const primaryCands = candidates.filter(c => !c.rhythm.__autoCompleter);
        const useCands = primaryCands.length ? primaryCands : candidates;
        // If we forced a special, pick it directly (filters already skipped; list is [forceSpecial])
        let chosen;
        if (forceSpecial && useCands.some(c => c.rhythm.key === forceSpecial.key)) {
            chosen = forceSpecial;
        } else {
            const totalWeight = useCands.reduce((sum, c) => sum + c.weight, 0);
            let rand = Math.random() * totalWeight;
            chosen = useCands[0].rhythm;
            for (const c of useCands) {
                rand -= c.weight;
                if (rand <= 0) { chosen = c.rhythm; break; }
            }
        }

        // ------------------------------------------------------------------
        // Direct G-form inject: when dotted 8ths are enabled and we are on a
        // beat boundary with room, frequently emit dotted8+16 as one figure.
        // This is the ONLY reliable way to guarantee they appear — relying on
        // the random picker alone loses to 8th-rest / free-16th flood on Hard.
        // ------------------------------------------------------------------
        if (!forceSpecial && !isCompound && timeSig !== '2/2' && userEnabledDotted8 &&
            (position % 4 === 0) && remaining >= 4) {
            // Outside L4+ package (e.g. L1 + d8 rest): light inject scaled by Easy/Med/Hard.
            // Inside package: light nudge only — boundary picker already treats G as a peer of A/B/C.
            const d8OutsidePkg = !recommendedPackageKeys.has('dotted8th')
                && !recommendedPackageKeys.has('dotted8thRest');
            let gChance = d8OutsidePkg
                ? advancedCustomRate(difficulty, 'gInject')
                : (difficulty === 'hard' ? 0.08 : (difficulty === 'easy' ? 0.04 : 0.06));
            // When free 16ths are off, d8 is the short feature — allow a bit more inject
            if (!userEnabledSixteenth) gChance = Math.min(gChance + 0.10, d8OutsidePkg ? 0.14 : 0.22);
            if (Math.random() < gChance) {
                const asRest = preferDotted8RestForm(userPoolKeys, difficulty);
                const used = pushDotted8GForm(events, asRest, userEnabled16thRest);
                remaining -= used;
                position += used;
                continue;
            }
        }

        // Compound G-form inject: d8 + 16 (+ 8 to finish big beat). Ensures dotted-8 REST
        // heads appear when checked (normalize used to destroy them; emit here + preserve there).
        if (!forceSpecial && isCompound && userEnabledDotted8 && curLevel >= 5 &&
            (position % 6 === 0) && remaining >= 6) {
            const d8OutsidePkg = !recommendedPackageKeys.has('dotted8th')
                && !recommendedPackageKeys.has('dotted8thRest');
            let gChance = d8OutsidePkg
                ? advancedCustomRate(difficulty, 'gInject')
                : (difficulty === 'hard' ? 0.12 : (difficulty === 'easy' ? 0.06 : 0.09));
            if (!userEnabledSixteenth) gChance = Math.min(gChance + 0.06, d8OutsidePkg ? 0.16 : 0.20);
            // Only-rest checked → stronger inject so the checkbox is visible
            if (userEnabledDotted8Rest && !userEnabledDotted8Note) {
                gChance = Math.min(gChance + 0.10, 0.30);
            }
            if (Math.random() < gChance) {
                const asRest = preferDotted8RestForm(userPoolKeys, difficulty);
                events.push(makeRhythmEvent(asRest ? 'dotted8thRest' : 'dotted8th'));
                remaining -= 3;
                position += 3;
                if (asRest && userEnabled16thRest) {
                    events.push(makeRhythmEvent('16thRest'));
                } else {
                    events.push(makeRhythmEvent('sixteenth'));
                }
                remaining -= 1;
                position += 1;
                // Finish the big beat with an 8th (d8+16+8 = 6)
                if (remaining >= 2 && (position % 6) !== 0) {
                    events.push(makeRhythmEvent('eighth'));
                    remaining -= 2;
                    position += 2;
                }
                continue;
            }
        }

        // L5+ compound: occasional syncopated 3× quarter (12u = two big beats / full 6/8 bar).
        // Atomic emit — piece-wise quarter+8th rules would otherwise force Q+8 mid-set.
        if (!forceSpecial && isCompound && curLevel >= 5 &&
            (position % 6 === 0) && remaining >= 12 &&
            (poolKeys.has('quarter') || userPoolKeys.has('quarter') || userPoolKeys.has('qrtrRest')) &&
            Math.random() < (difficulty === 'hard' ? 0.11 : (difficulty === 'easy' ? 0.045 : 0.075))) {
            const allowQr = userPoolKeys.has('qrtrRest');
            for (let k = 0; k < 3; k++) {
                const asRest = allowQr && Math.random() < (difficulty === 'hard' ? 0.28 : 0.14);
                events.push(makeRhythmEvent(asRest ? 'qrtrRest' : 'quarter'));
                remaining -= 4;
                position += 4;
            }
            continue;
        }
        
        // Bundle for compound: 8th NOTES only in complete sets of 3 at big beats.
        // Density of *how often* 8ths are chosen is Easy/Med/Hard; once chosen, always finish the group.
        // When 8th rests are enabled, sometimes interleave rest: 8 + 8r + 8 (content rest figure).
        if (isCompound && chosen.key === 'eighth' && !chosen.isRest && chosen.units === 2 &&
            (position % 6 === 0) && remaining >= 6) {
            if (userEnabled8thRest && Math.random() < (difficulty === 'hard' ? 0.38 : (difficulty === 'easy' ? 0.18 : 0.28))) {
                events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                events.push({ key: '8thRest', units: 2, vexDur: '8r', isRest: true, dots: 0 });
                events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                remaining -= 6;
                position += 6;
            } else {
                for (let k = 0; k < 3 && remaining >= 2; k++) {
                    events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                    remaining -= 2;
                    position += 2;
                }
            }
        } else if (isCompound && chosen.key === '8thRest' && userEnabled8thRest && remaining >= 2) {
            // Compound content 8th rest (L4+ package or custom). Always pair with notes so
            // normalize does not collapse 3×8r into a dotted-quarter rest.
            const room = Math.min(remaining, 6 - (position % 6));
            const push8n = () => {
                events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                remaining -= 2; position += 2;
            };
            const push8r = () => {
                events.push({ key: '8thRest', units: 2, vexDur: '8r', isRest: true, dots: 0 });
                remaining -= 2; position += 2;
            };
            if ((position % 6 === 0) && room >= 6) {
                // Prefer 8r + 8 + 8 or 8 + 8r + 8
                if (Math.random() < 0.45) {
                    push8r(); push8n(); push8n();
                } else {
                    push8n(); push8r(); push8n();
                }
            } else if (room >= 4) {
                push8r();
                if (remaining >= 2) push8n();
                if (remaining >= 2 && (position % 6) !== 0 && Math.random() < 0.5) push8n();
            } else {
                push8r();
                if (remaining >= 2 && (position % 6) !== 0) push8n();
            }
        } else if (isCompound && chosen.key === 'sixteenthTriplet' && remaining >= 2 &&
                   (poolKeys.has('sixteenthTriplet') || userPoolKeys.has('sixteenthTriplet'))) {
            // Custom 16th-note triplets in compound (2u each). Prefer filling a big beat with 3.
            const push16t = () => {
                events.push({
                    key: 'sixteenthTriplet', units: 2, vexDur: '16', isRest: false, dots: 0,
                    label: '16th Note Triplet'
                });
                remaining -= 2; position += 2;
            };
            const room = Math.min(remaining, 6 - (position % 6));
            if ((position % 6 === 0) && room >= 6 && Math.random() < 0.65) {
                push16t(); push16t(); push16t();
            } else if (room >= 4 && Math.random() < 0.5) {
                push16t(); push16t();
                if (remaining >= 2 && (position % 6) !== 0) {
                    events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                    remaining -= 2; position += 2;
                }
            } else {
                push16t();
                if (remaining >= 2 && room >= 4 && Math.random() < 0.55) push16t();
            }
        } else if (isCompound &&
                   (chosen.key === 'quarter' || chosen.key === 'qrtrRest') && chosen.units === 4 &&
                   (position % 6 === 0) && remaining >= 6) {
            // L5+: syncopated 3× quarter (12u) crosses big-beat boundaries — full 6/8 bar,
            // or two sets in 12/8. Otherwise standard Q+8 completing one big beat.
            const threeQRate = difficulty === 'hard' ? 0.32 : (difficulty === 'easy' ? 0.14 : 0.22);
            if (curLevel >= 5 && remaining >= 12 && Math.random() < threeQRate) {
                const allowQr = userPoolKeys.has('qrtrRest');
                const preferRest = chosen.key === 'qrtrRest' || chosen.isRest;
                for (let k = 0; k < 3; k++) {
                    let asRest = false;
                    if (preferRest && allowQr) asRest = true;
                    else if (allowQr && Math.random() < (difficulty === 'hard' ? 0.28 : 0.14)) asRest = true;
                    events.push(makeRhythmEvent(asRest ? 'qrtrRest' : 'quarter'));
                    remaining -= 4;
                    position += 4;
                }
            } else {
                // Quarter + 8th to complete the big beat (never bare quarter then dotted half)
                const asRest = chosen.key === 'qrtrRest' || chosen.isRest;
                events.push({
                    key: asRest ? 'qrtrRest' : 'quarter',
                    units: 4,
                    vexDur: asRest ? 'qr' : 'q',
                    isRest: asRest,
                    dots: 0
                });
                remaining -= 4;
                position += 4;
                if (remaining >= 2) {
                    if (asRest && userEnabled8thRest && Math.random() < 0.35) {
                        events.push({ key: '8thRest', units: 2, vexDur: '8r', isRest: true, dots: 0 });
                    } else {
                        events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                    }
                    remaining -= 2;
                    position += 2;
                }
            }
        } else if (!isCompound && timeSig === '2/2' && curLevel === 3 &&
                   chosen.key === 'eighth' && !chosen.isRest && chosen.units === 2 &&
                   (position % 8 === 0) && remaining >= 8) {
            // L3 cut: ONLY exact sets of 4 eighth notes (one full half-note beat), always beamed together
            for (let k = 0; k < 4 && remaining >= 2; k++) {
                events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                remaining -= 2;
                position += 2;
            }
        } else if (!isCompound && chosen.key === 'quarterTriplet' && !chosen.isRest && remaining >= 8 &&
                   ((timeSig === '2/2' && (position % 8 === 0)) ||
                    (timeSig !== '2/2' && (position % 4 === 0)))) {
            // Quarter-note triplet (3 in time of 2 quarters = 8 sixteenth-units)
            // Simple: two quarter-beats; Cut: one half-note beat
            events.push({
                key: 'quarterTriplet',
                units: 8,
                vexDur: 'q',
                isRest: false,
                dots: 0,
                label: 'Quarter Note Triplet'
            });
            remaining -= 8;
            position += 8;
        } else if (!isCompound &&
                   (chosen.key === 'dottedQtr' || chosen.key === 'dottedQrtrRest') &&
                   remaining >= 8 && userEnabledDottedQ) {
            // Simple + cut: dotted quarter (6) + 8th (2) = 8 units. Always pair for measure math.
            // (Compound dotted-Q is a complete big beat and is not handled here.)
            const asRest = chosen.key === 'dottedQrtrRest' || chosen.isRest;
            events.push(makeRhythmEvent(asRest ? 'dottedQrtrRest' : 'dottedQtr'));
            remaining -= 6;
            position += 6;
            if (remaining >= 2) {
                // Note head → always 8th note; rest head → 8th rest only if user enabled
                if (asRest && userEnabled8thRest) {
                    events.push(makeRhythmEvent('8thRest'));
                } else {
                    events.push(makeRhythmEvent('eighth'));
                }
                remaining -= 2;
                position += 2;
            }
        } else if (!isCompound && timeSig === '2/2' && curLevel >= 4 &&
                   (chosen.key === 'eighth' || chosen.key === 'quarter') && !chosen.isRest) {
            // L4+ cut: complete half-note-beat patterns (8 units):
            //   1) four 8ths beamed
            //   2) two beamed 8ths + quarter
            //   3) quarter + two beamed 8ths
            //   4) 8th + quarter + 8th
            // L5 also keeps these, plus dottedQ+8 and quarter triplets (handled above).
            const cutBeat = 8;
            const isAtCutBeat = (position % cutBeat === 0);
            const lastEv = events.length > 0 ? events[events.length - 1] : null;

            const push8 = () => {
                events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                remaining -= 2;
                position += 2;
            };
            const pushQ = () => {
                events.push({ key: 'quarter', units: 4, vexDur: 'q', isRest: false, dots: 0 });
                remaining -= 4;
                position += 4;
            };

            let trailing8 = 0;
            for (let ti = events.length - 1; ti >= 0; ti--) {
                if (events[ti].key === 'eighth' && events[ti].units === 2 && !events[ti].isRest) trailing8 += 2;
                else break;
            }

            // After dotted quarter (note or rest), always complete with 8th note (rest only if enabled)
            if (lastEv && (lastEv.key === 'dottedQtr' || lastEv.key === 'dottedQrtrRest') && lastEv.units === 6 && remaining >= 2) {
                if (lastEv.isRest && userEnabled8thRest) {
                    events.push({ key: '8thRest', units: 2, vexDur: '8r', isRest: true, dots: 0 });
                    remaining -= 2;
                    position += 2;
                } else {
                    push8();
                }
            } else if (lastEv && lastEv.key === 'eighth' && !lastEv.isRest && trailing8 > 0 && trailing8 < 8) {
                // Finish an open 8th-based pattern
                if (trailing8 === 2 && remaining >= 6 && Math.random() < 0.45) {
                    // Pattern 4 completion path: already have 1×8 → quarter + 8
                    pushQ();
                    if (remaining >= 2) push8();
                } else if (trailing8 === 4 && remaining >= 4 && Math.random() < 0.5) {
                    // Pattern 2: already have 2×8 → quarter
                    pushQ();
                } else {
                    // Finish toward 4×8 (pattern 1) or 2×8 if only room for one more pair
                    const need = Math.min(8 - trailing8, remaining - (remaining % 2));
                    const n = Math.floor(need / 2);
                    for (let k = 0; k < n && remaining >= 2; k++) push8();
                }
            } else if (lastEv && lastEv.key === 'quarter' && !lastEv.isRest && (position % cutBeat !== 0) && remaining >= 2) {
                // After quarter mid half-beat: emit 2×8 (pattern 3) or 1×8 (pattern 4)
                const unitsIntoBeat = position % cutBeat;
                if (unitsIntoBeat === 4 && remaining >= 4) {
                    // Pattern 3: q + 2×8
                    push8();
                    if (remaining >= 2) push8();
                } else if (unitsIntoBeat === 6 && remaining >= 2) {
                    // Pattern 4: 8 + q + 8
                    push8();
                } else if (remaining >= 2) {
                    push8();
                    if (unitsIntoBeat + 2 < cutBeat && remaining >= 2) push8();
                }
            } else if (isAtCutBeat && remaining >= 8) {
                if (chosen.key === 'quarter') {
                    // Pattern 3: quarter + two 8ths
                    pushQ();
                    if (remaining >= 2) push8();
                    if (remaining >= 2) push8();
                } else {
                    // Pick pattern 1, 2, or 4 from an 8th start
                    const roll = Math.random();
                    if (roll < 0.34) {
                        // 1) four 8ths
                        for (let k = 0; k < 4 && remaining >= 2; k++) push8();
                    } else if (roll < 0.67) {
                        // 2) two 8ths + quarter
                        push8(); push8();
                        if (remaining >= 4) pushQ();
                    } else {
                        // 4) 8th + quarter + 8th
                        push8();
                        if (remaining >= 4) pushQ();
                        if (remaining >= 2) push8();
                    }
                }
            } else if (isAtCutBeat && remaining >= 4 && chosen.key === 'quarter') {
                pushQ();
            } else {
                // Safe non-8th fallback
                const fallback = available.find(r => r.units <= remaining && r.key !== 'eighth') ||
                                 available.find(r => r.units <= remaining);
                if (fallback) {
                    events.push({
                        key: fallback.key,
                        units: fallback.units,
                        vexDur: fallback.vexDur,
                        isRest: fallback.isRest,
                        dots: fallback.dots || 0,
                        label: fallback.label
                    });
                    remaining -= fallback.units;
                    position += fallback.units;
                } else {
                    break;
                }
            }
        } else if (!isCompound && timeSig !== '2/2' && (curLevel <= 2 || curLevel === 3) &&
                   chosen.key === 'eighth' && chosen.units === 2 && (position % 4 === 0) && remaining >= 4) {
            // Simple meter L2/L3: 8th notes in pairs or groups of 4 at quarter-beat boundaries
            const e = chosen;
            let trailingUnits = 0;
            for (let i = events.length - 1; i >= 0; i--) {
                const ev = events[i];
                if (ev.key === 'eighth' && ev.units === 2) {
                    trailingUnits += 2;
                } else {
                    break;
                }
            }
            let numToEmit = 2;
            const maxForThis = 4 - trailingUnits;
            if (maxForThis >= 4 && remaining >= 8 && Math.random() < 0.35) {
                numToEmit = 4;
            } else if (maxForThis < 2) {
                numToEmit = 0;
            } else {
                numToEmit = Math.min(2, maxForThis);
            }
            if (numToEmit >= 2) {
                events.push({
                    key: e.key,
                    units: 2,
                    vexDur: e.vexDur,
                    isRest: e.isRest,
                    dots: e.dots || 0,
                    label: e.label
                });
                remaining -= 2;
                position += 2;
                for (let k = 1; k < numToEmit && remaining >= 2; k++) {
                    events.push({ key: e.key, units: 2, vexDur: e.vexDur, isRest: false, dots: 0 });
                    remaining -= 2;
                    position += 2;
                }
            } else {
                events.push({
                    key: e.key,
                    units: 2,
                    vexDur: e.vexDur,
                    isRest: e.isRest,
                    dots: e.dots || 0,
                    label: e.label
                });
                remaining -= 2;
                position += 2;
            }
        } else if (!isCompound && curLevel === 3 && userEnabledSixteenth &&
                   chosen.key === 'sixteenth' && chosen.units === 1 &&
                   (position % 4 === 0) && remaining >= 4) {
            // L3 simple: 16ths only as full set of 4 at beat boundaries (always beamed together)
            for (let k = 0; k < 4 && remaining >= 1; k++) {
                events.push({ key: 'sixteenth', units: 1, vexDur: '16', isRest: false, dots: 0 });
                remaining -= 1;
                position += 1;
            }
        } else if (!isCompound && timeSig !== '2/2' &&
                   chosen.key === '8thRest' && userEnabled8thRest && remaining >= 2) {
            // Simple 8th rest. IMPORTANT measure math:
            //   • Dotted 8th rest (3) + ONE 16th (1) = full beat  — preferred when d8 rest enabled
            //   • Plain 8th rest (2) + TWO 16ths (1+1) = different figure — only if free 16ths on
            // Never treat 8r+2×16 as a substitute for dotted-8th rest + 16th.
            if (userEnabledDotted8Rest && (position % 4 === 0) && remaining >= 4 &&
                Math.random() < advancedCustomRate(difficulty, 'restUpgrade')) {
                // Occasional upgrade plain 8th-rest → true G-form rest (3+1); rare on Easy
                const used = pushDotted8GForm(events, true, userEnabled16thRest);
                remaining -= used;
                position += used;
            } else {
                events.push(makeRhythmEvent('8thRest'));
                remaining -= 2;
                position += 2;
                if ((position % 4) !== 0 && remaining >= 2) {
                    const roomInBeat = 4 - (position % 4);
                    if (roomInBeat === 2) {
                        // Prefer 8th note to finish the beat.
                        // 8r + 2×16 is an L4+ mixed figure — never on L3 (16ths only as full 4×16 packs).
                        // Prefer 8th NOTE over a second 8th rest: 8r+8r collapses to qrtrRest in
                        // normalize and hides content 8th rests (L1 + custom 8th rest case).
                        const useTwo16 = curLevel >= 4 && userEnabledSixteenth &&
                            !userEnabledDotted8Rest && // never when d8 rest is the lesson focus
                            Math.random() < (difficulty === 'hard' ? 0.12 : 0.05);
                        if (useTwo16) {
                            events.push(makeRhythmEvent('sixteenth'));
                            events.push(makeRhythmEvent('sixteenth'));
                            remaining -= 2;
                            position += 2;
                        } else {
                            // 8th note completer (user-checked or auto-injected by ensureMeasureMathCompleters)
                            events.push(makeRhythmEvent('eighth'));
                            remaining -= 2;
                            position += 2;
                        }
                    }
                }
            }
        } else if (!isCompound && timeSig !== '2/2' &&
                   chosen.key === 'eighthNoteTriplet' && !chosen.isRest &&
                   (position % 4 === 0) && remaining >= 4) {
            // 8th-note triplet on a quarter-note beat (curriculum L5+ or user-enabled)
            events.push({
                key: 'eighthNoteTriplet',
                units: 4,
                vexDur: '8',
                isRest: false,
                dots: 0,
                label: '8th Note Triplet'
            });
            remaining -= 4;
            position += 4;
        } else if (!isCompound && timeSig !== '2/2' &&
                   chosen.key === 'sixteenthTriplet' && !chosen.isRest &&
                   (position % 2 === 0) && remaining >= 2) {
            // L6 simple: 16th-note triplet (3 sixteenths in time of 2 = ½ beat)
            events.push({
                key: 'sixteenthTriplet',
                units: 2,
                vexDur: '16',
                isRest: false,
                dots: 0,
                label: '16th Note Triplet'
            });
            remaining -= 2;
            position += 2;
            // Often pair a second 16th-triplet to fill the rest of the quarter beat
            if ((position % 4 !== 0) && remaining >= 2 && Math.random() < 0.55) {
                events.push({
                    key: 'sixteenthTriplet',
                    units: 2,
                    vexDur: '16',
                    isRest: false,
                    dots: 0,
                    label: '16th Note Triplet'
                });
                remaining -= 2;
                position += 2;
            }
        } else if (!isCompound && timeSig !== '2/2' &&
                   chosen.key === '16thRest' && remaining >= 1 &&
                   userEnabled16thRest) {
            // 16th rests mixed with 16th notes — only when user enabled 16th rests
            const push16n = () => {
                events.push({ key: 'sixteenth', units: 1, vexDur: '16', isRest: false, dots: 0 });
                remaining -= 1; position += 1;
            };
            const push16r = () => {
                events.push({ key: '16thRest', units: 1, vexDur: '16r', isRest: true, dots: 0 });
                remaining -= 1; position += 1;
            };
            // Emit a short figure that stays within the current quarter beat
            const roomInBeat = 4 - (position % 4);
            const n = Math.max(1, Math.min(roomInBeat, remaining, 4));
            // Patterns inspired by Level Tab: 16r + 16s, 16 + 16r + 16 + 16, etc.
            const roll = Math.random();
            for (let k = 0; k < n && remaining >= 1; k++) {
                if (k === 0) {
                    push16r();
                } else if (roll < 0.4 && k === 2) {
                    push16r();
                } else {
                    push16n();
                }
            }
        } else if (!isCompound && timeSig === '2/2' &&
                   chosen.key === '16thRest' && remaining >= 2 &&
                   userEnabled16thRest) {
            // Cut time: rare advanced 16th rests (≈ 32nd rests vs half-note beat).
            // Always emit complete pairs so they survive filters/normalize (16r + 16th note).
            const push16n = () => {
                events.push({ key: 'sixteenth', units: 1, vexDur: '16', isRest: false, dots: 0 });
                remaining -= 1; position += 1;
            };
            const push16r = () => {
                events.push({ key: '16thRest', units: 1, vexDur: '16r', isRest: true, dots: 0 });
                remaining -= 1; position += 1;
            };
            // Stay inside current half-note beat (8u)
            const roomInCutBeat = 8 - (position % 8);
            const room = Math.min(remaining, roomInCutBeat);
            // Core figure: 16r + 16th (2u). Sometimes two pairs or 16r+16+8th.
            push16r();
            if (remaining >= 1) push16n();
            if (room >= 4 && remaining >= 2 && Math.random() < 0.40) {
                if (Math.random() < 0.45 && (poolKeys.has('eighth') || userPoolKeys.has('eighth'))) {
                    events.push(makeRhythmEvent('eighth'));
                    remaining -= 2; position += 2;
                } else {
                    // Another 16r+16 or 16+16 within the 8th-pulse
                    if (Math.random() < 0.35) push16r();
                    else push16n();
                    if (remaining >= 1) push16n();
                }
            }
        } else if (!isCompound && timeSig === '2/2' &&
                   chosen.key === 'eighthNoteTriplet' && !chosen.isRest &&
                   remaining >= 4 && (position % 4 === 0) &&
                   (poolKeys.has('eighthNoteTriplet') || curLevel >= 6)) {
            // Cut: 8th-note triplets (curriculum L6 or user-checked)
            events.push({
                key: 'eighthNoteTriplet',
                units: 4,
                vexDur: '8',
                isRest: false,
                dots: 0,
                label: '8th Note Triplet'
            });
            remaining -= 4;
            position += 4;
            // Often place a second triplet to complete the half-note beat
            if ((position % 8 !== 0) && remaining >= 4 && Math.random() < 0.5) {
                events.push({
                    key: 'eighthNoteTriplet',
                    units: 4,
                    vexDur: '8',
                    isRest: false,
                    dots: 0,
                    label: '8th Note Triplet'
                });
                remaining -= 4;
                position += 4;
            }
        } else if (!isCompound && timeSig === '2/2' &&
                   chosen.key === '8thRest' && remaining >= 2 &&
                   userEnabled8thRest) {
            // Cut: 8th rests only when user-enabled (L6 package or custom)
            events.push({ key: '8thRest', units: 2, vexDur: '8r', isRest: true, dots: 0 });
            remaining -= 2;
            position += 2;
            // Prefer following with an 8th note when possible
            if (remaining >= 2 && Math.random() < 0.65) {
                events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                remaining -= 2;
                position += 2;
            }
        } else if (!isCompound && curLevel >= 4 && timeSig !== '2/2' &&
                   ((chosen.key === 'sixteenth' && userEnabledSixteenth) ||
                    chosen.key === 'dotted8th' || chosen.key === 'dotted8thRest') &&
                   !(chosen.key === 'sixteenth' && chosen.isRest)) {
            // L4+ simple primary subdivisions. Always complete a beamed beat-group:
            //   A) four 16ths  B) 2×16+8  C) 8+2×16  D) after dottedQ  E) 8+2×16 mid
            //   F) 16+8+16  G) dotted8+16 (common)  H) 16+dotted8 (less common)
            // Free 16th packs require user-checked sixteenths (not d8 auto-partners alone).
            const isAtBoundary = (position % 4 === 0);
            const lastEv = events.length > 0 ? events[events.length - 1] : null;
            const isAfter8 = lastEv && lastEv.key === 'eighth' && lastEv.units === 2 && !lastEv.isRest;
            const isAfterDottedQ = lastEv && lastEv.key === 'dottedQtr' && lastEv.units === 6;
            const isAfterDotted8 = lastEv && (lastEv.key === 'dotted8th' || lastEv.key === 'dotted8thRest') && lastEv.units === 3;
            const wantRestD8 = chosen.key === 'dotted8thRest' || (chosen.isRest && chosen.units === 3);

            const push16 = () => {
                events.push({ key: 'sixteenth', units: 1, vexDur: '16', isRest: false, dots: 0 });
                remaining -= 1;
                position += 1;
            };
            const push16r = () => {
                events.push({ key: '16thRest', units: 1, vexDur: '16r', isRest: true, dots: 0 });
                remaining -= 1;
                position += 1;
            };
            // Dotted-8 note → always 16th note. Dotted-8 rest → 16th rest only if user enabled it.
            const pushD8Completer = (headIsRest) => {
                if (headIsRest && userEnabled16thRest) push16r();
                else push16();
            };
            const push8 = () => {
                events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                remaining -= 2;
                position += 2;
            };
            const pushDotted8 = (asRest) => {
                events.push(makeRhythmEvent(asRest ? 'dotted8thRest' : 'dotted8th'));
                remaining -= 3;
                position += 3;
            };
            /**
             * Emit G-form: dotted 8th (note or rest) + exactly ONE 16th completer.
             * mode: 'note' | 'rest' | 'auto'
             */
            const emitDotted8Pair = (mode) => {
                let useRestHead;
                if (mode === 'rest' || mode === true) useRestHead = true;
                else if (mode === 'note' || mode === false) useRestHead = false;
                else useRestHead = preferDotted8RestForm(userPoolKeys, difficulty);
                if (useRestHead && !userEnabledDotted8Rest) useRestHead = false;
                if (!useRestHead && !userEnabledDotted8Note && userEnabledDotted8Rest) useRestHead = true;

                const canG = allowed16Patterns.has('G') || userEnabledDotted8;
                // H (16 + dotted8) on medium/hard when free 16ths are on — peer of G, not a rarity
                const canH = allowed16Patterns.has('H') && !useRestHead
                    && userEnabledSixteenth
                    && (difficulty === 'hard' || difficulty === 'medium');
                const hRate = difficulty === 'hard' ? 0.42 : 0.32;
                const pickH = canH && canG && Math.random() < hRate;
                if (pickH) {
                    // H: 16 + dotted8 — needs free 16ths; still one completer math (1+3)
                    push16();
                    if (remaining >= 3) pushDotted8(preferDotted8RestForm(userPoolKeys, difficulty));
                } else if (canG || userEnabledDotted8) {
                    // Always: head (3) + single completer (1) = 4
                    pushDotted8(useRestHead);
                    if (remaining >= 1) pushD8Completer(useRestHead);
                } else if (userEnabledSixteenth) {
                    for (let k = 0; k < 4 && remaining >= 1; k++) push16();
                }
            };

            // Count trailing consecutive 16ths + what started this run
            let trailing16 = 0;
            for (let ti = events.length - 1; ti >= 0; ti--) {
                if (events[ti].key === 'sixteenth' && events[ti].units === 1 && !events[ti].isRest) trailing16++;
                else break;
            }
            const beforeRun = (trailing16 > 0 && events.length > trailing16)
                ? events[events.length - trailing16 - 1] : null;
            let maxForRun = 4;
            if (beforeRun && beforeRun.key === 'dottedQtr') maxForRun = 2;
            if (beforeRun && beforeRun.key === 'eighth' && !beforeRun.isRest) maxForRun = 2;
            if (beforeRun && (beforeRun.key === 'dotted8th' || beforeRun.key === 'dotted8thRest')) maxForRun = 1;

            if (isAfterDotted8 && remaining >= 1) {
                // Complete G) after a dotted 8th — 16th note (or 16th rest only if head is rest + enabled)
                pushD8Completer(!!(lastEv && lastEv.isRest));
            } else if ((chosen.key === 'dotted8th' || chosen.key === 'dotted8thRest') &&
                       isAtBoundary && remaining >= 4) {
                // Explicit pick → emit true G-form (note or rest as chosen)
                emitDotted8Pair(chosen.key === 'dotted8thRest' ? 'rest' : 'note');
            } else if (trailing16 === 2 && remaining >= 2 && chosen.key === 'eighth' &&
                       allowed16Patterns.has('B') &&
                       !(beforeRun && (beforeRun.key === 'eighth' || beforeRun.key === 'dottedQtr' ||
                         beforeRun.key === 'dotted8th' || beforeRun.key === 'dotted8thRest'))) {
                // Finish B: already have 2×16, chosen 8th completes the beat
                push8();
            } else if (trailing16 === 2 && remaining >= 2 && chosen.key === 'sixteenth' &&
                       allowed16Patterns.has('B') && maxForRun >= 4 &&
                       !(beforeRun && (beforeRun.key === 'eighth' || beforeRun.key === 'dottedQtr' ||
                         beforeRun.key === 'dotted8th' || beforeRun.key === 'dotted8thRest')) &&
                       Math.random() < 0.62) {
                // Prefer B over expanding 2×16 into A (4×16)
                push8();
            } else if (trailing16 > 0 && trailing16 < maxForRun && remaining >= 1 && chosen.key === 'sixteenth') {
                while (trailing16 < maxForRun && remaining >= 1) {
                    push16();
                    trailing16++;
                }
            } else if (isAfterDottedQ && remaining >= 2 && userEnabledSixteenth) {
                push16();
                push16();
            } else if (isAfter8 && remaining >= 2 && userEnabledSixteenth) {
                push16();
                if (remaining >= 1) push16();
            } else if (isAtBoundary && remaining >= 4) {
                const can = (p) => allowed16Patterns.has(p);
                // Roughly even mix; B gets a clear boost — was rare because mid-run always became A.
                // Complexity still gates which ids appear (Easy: no F/H; Medium: F/H slightly lighter).
                const opts = [];
                const even = 1.0;
                if (can('A') && !wantRestD8) {
                    opts.push({ id: 'A', w: even });
                }
                if (can('B') && poolKeys.has('eighth') && !wantRestD8) {
                    // B was underrepresented vs A/C/G — weight it up as a peer+ of the group
                    opts.push({ id: 'B', w: 1.85 });
                }
                if (can('C') && poolKeys.has('eighth') && !wantRestD8) {
                    // C also appears via post-8th E inject — slight underweight so it does not dominate
                    opts.push({ id: 'C', w: 0.85 });
                }
                if (can('F') && poolKeys.has('eighth') && !wantRestD8) {
                    opts.push({ id: 'F', w: difficulty === 'hard' ? even : 0.8 });
                }
                if (userEnabledDotted8 && (can('G') || userEnabledDotted8)) {
                    // In-package: peer of A/B. Outside package: mild bump so custom checkbox shows.
                    const d8Outside = !recommendedPackageKeys.has('dotted8th')
                        && !recommendedPackageKeys.has('dotted8thRest');
                    opts.push({
                        id: 'G',
                        w: d8Outside
                            ? (difficulty === 'easy' ? 1.35 : (difficulty === 'hard' ? 1.9 : 1.6))
                            : even
                    });
                }
                if (userEnabledDotted8 && can('H') && userEnabledSixteenth &&
                    (difficulty === 'hard' || difficulty === 'medium')) {
                    opts.push({ id: 'H', w: difficulty === 'hard' ? even : 0.8 });
                }
                if (opts.length === 0) {
                    if (userEnabledDotted8) opts.push({ id: 'G', w: 1 });
                    else opts.push({ id: 'A', w: 1 });
                }
                const tw = opts.reduce((s, o) => s + o.w, 0);
                let rr = Math.random() * tw;
                let pick = opts[0].id;
                for (const o of opts) { rr -= o.w; if (rr <= 0) { pick = o.id; break; } }
                if (pick === 'A') {
                    for (let k = 0; k < 4 && remaining >= 1; k++) push16();
                } else if (pick === 'B') {
                    push16(); push16();
                    if (remaining >= 2) push8();
                } else if (pick === 'C') {
                    push8();
                    if (remaining >= 1) push16();
                    if (remaining >= 1) push16();
                } else if (pick === 'F') {
                    push16();
                    if (remaining >= 2) push8();
                    if (remaining >= 1) push16();
                } else if (pick === 'G') {
                    emitDotted8Pair('auto');
                } else if (pick === 'H') {
                    push16();
                    if (remaining >= 3) pushDotted8(preferDotted8RestForm(userPoolKeys, difficulty));
                }
            } else if (isAtBoundary && remaining >= 2 && remaining < 4) {
                push16();
                if (remaining >= 1) push16();
            } else {
                const fallback = available.find(r => r.units <= remaining && r.units >= 2 &&
                        r.key !== 'sixteenth' && r.key !== 'dotted8th' && r.key !== 'dotted8thRest') ||
                    available.find(r => r.units <= remaining && r.key !== 'sixteenth' &&
                        r.key !== 'dotted8th' && r.key !== 'dotted8thRest');
                if (fallback) {
                    events.push({
                        key: fallback.key,
                        units: fallback.units,
                        vexDur: fallback.vexDur,
                        isRest: fallback.isRest,
                        dots: fallback.dots || 0,
                        label: fallback.label
                    });
                    remaining -= fallback.units;
                    position += fallback.units;
                } else {
                    break;
                }
            }
        } else if (isCompound && curLevel >= 5 &&
                   (chosen.key === 'sixteenth' || chosen.key === 'eighth' ||
                    chosen.key === 'quarter' || chosen.key === '8thRest' ||
                    chosen.key === '16thRest' || chosen.key === 'dotted8th' ||
                    chosen.key === 'dotted8thRest')) {
            // Compound mixed patterns (L5+ curriculum OR custom pool via groupLevel bump):
            //   • 16ths in complete 2s / 4s / 6s (full big beat), often with 8ths
            //   • dotted 8th + 16th pairs (G form preferred)
            //   • 8th rests between 8ths; optional 16th rests when enabled
            const big = 6;
            const atBig = (position % big === 0);
            const lastEv = events.length > 0 ? events[events.length - 1] : null;

            const push16 = () => {
                events.push({ key: 'sixteenth', units: 1, vexDur: '16', isRest: false, dots: 0 });
                remaining -= 1; position += 1;
            };
            const push16r = () => {
                events.push({ key: '16thRest', units: 1, vexDur: '16r', isRest: true, dots: 0 });
                remaining -= 1; position += 1;
            };
            const push8n = () => {
                events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
                remaining -= 2; position += 2;
            };
            const push8r = () => {
                events.push({ key: '8thRest', units: 2, vexDur: '8r', isRest: true, dots: 0 });
                remaining -= 2; position += 2;
            };
            const pushDotted8 = (asRest) => {
                events.push(makeRhythmEvent(asRest ? 'dotted8thRest' : 'dotted8th'));
                remaining -= 3; position += 3;
            };
            const pushQ = () => {
                events.push({ key: 'quarter', units: 4, vexDur: 'q', isRest: false, dots: 0 });
                remaining -= 4; position += 4;
            };

            let trailing16 = 0;
            for (let ti = events.length - 1; ti >= 0; ti--) {
                if (events[ti].key === 'sixteenth' && !events[ti].isRest) trailing16++;
                else break;
            }
            let trailingQ = 0;
            for (let ti = events.length - 1; ti >= 0; ti--) {
                const te = events[ti];
                if ((te.key === 'quarter' || te.key === 'qrtrRest') && te.units === 4) trailingQ += 4;
                else break;
            }

            const allowD8 = userEnabledDotted8 || curLevel >= 6;
            const allow16r = userEnabled16thRest;
            /**
             * Preferred compound dotted-8 figure filling one big beat (6u):
             *   dotted 8th (3) + 16th (1) + 8th (2)
             * NEVER two dotted 8ths in a row; NEVER 16 + dotted8 + dotted8.
             */
            const pushD8Then16Then8 = (asRest) => {
                pushDotted8(!!asRest);
                if (remaining >= 1) {
                    if (asRest && allow16r) push16r();
                    else push16();
                }
                // Finish the big beat with an 8th whenever possible
                if (remaining >= 2 && (position % big) !== 0) {
                    push8n();
                }
            };

            if (lastEv && (lastEv.key === 'dotted8th' || lastEv.key === 'dotted8thRest') && remaining >= 1) {
                // Completing open dotted-8: always 16th, then 8th to finish beat — never another dotted-8
                if (lastEv.isRest && allow16r) push16r();
                else push16();
                if (remaining >= 2 && (position % big) !== 0) push8n();
            } else if (lastEv && lastEv.key === 'sixteenth' && !lastEv.isRest && trailing16 === 1 &&
                       events.length >= 2 &&
                       (events[events.length - 2].key === 'dotted8th' || events[events.length - 2].key === 'dotted8thRest')) {
                // Just finished d8+16 → finish with 8th only (not another d8 or more 16ths)
                if (remaining >= 2) push8n();
                else if (remaining >= 1) push16();
            } else if (lastEv && lastEv.key === '16thRest' && allow16r && remaining >= 1) {
                push16();
                if (remaining >= 1 && Math.random() < 0.5) push16();
            } else if (lastEv && lastEv.key === 'sixteenth' && !lastEv.isRest && trailing16 > 0) {
                // Finish 16th set (2, 4, or full 6), then often attach 8th if room remains
                // Never start dotted-8 after a lone 16th (avoids 16 + dotted8 stacks)
                if (allow16r && Math.random() < 0.2 && remaining >= 1) {
                    push16r();
                    if (remaining >= 1) push16();
                } else {
                    const roomInBeat = big - (position % big);
                    // Prefer complete packs: 2, 4, or 6 (L4 full-beat sets remain legal on L5/L6)
                    let target;
                    if (trailing16 >= 6) {
                        target = trailing16;
                    } else if (roomInBeat + trailing16 >= 6 && trailing16 <= 4 && Math.random() < 0.32) {
                        target = 6;
                    } else if (trailing16 <= 2) {
                        const prefer4 = difficulty === 'hard' ? 0.55 : (difficulty === 'easy' ? 0.28 : 0.42);
                        target = Math.random() < prefer4 ? 4 : 2;
                        // If aiming 4 but room can hold 6 and roll says so, bump
                        if (target === 4 && roomInBeat + trailing16 >= 6 && Math.random() < 0.25) target = 6;
                    } else if (trailing16 <= 4) {
                        // Already 3–4: finish to 4, or extend to 6 when room allows
                        target = (roomInBeat + trailing16 >= 6 && Math.random() < 0.45) ? 6 : 4;
                    } else {
                        target = 6;
                    }
                    target = Math.min(target, trailing16 + roomInBeat, trailing16 + remaining);
                    while (trailing16 < target && remaining >= 1) {
                        const room = big - (position % big);
                        if (room < 1) break;
                        push16();
                        trailing16++;
                    }
                    if (remaining >= 2 && (position % big) !== 0 && Math.random() < 0.65) {
                        push8n();
                    }
                }
            } else if (lastEv && lastEv.key === '8thRest' && remaining >= 2) {
                push8n();
            } else if (lastEv && lastEv.key === 'eighth' && !lastEv.isRest) {
                const roll = Math.random();
                if (roll < 0.18 && remaining >= 2) {
                    push8r();
                } else if (allowD8 && roll < 0.40 && remaining >= 6 && (position % big === 0 || (6 - (position % big)) >= 6)) {
                    // Only start d8 figure with a full 6u of room → d8 + 16 + 8
                    pushD8Then16Then8(preferDotted8RestForm(userPoolKeys, difficulty));
                } else if (roll < 0.58 && remaining >= 2) {
                    push16();
                    if (remaining >= 1) push16();
                } else if (roll < 0.78 && remaining >= 4) {
                    for (let k = 0; k < 4 && remaining >= 1; k++) push16();
                } else if (remaining >= 2) {
                    push8n();
                }
            } else if (lastEv && (lastEv.key === 'quarter' || lastEv.key === 'qrtrRest') &&
                       trailingQ > 0 && trailingQ < 12 && remaining >= 4) {
                // Finish open syncopated 3× quarter group (12u)
                const allowQr = userPoolKeys.has('qrtrRest');
                const pushOneQ = () => {
                    const asR = allowQr && (lastEv.isRest || Math.random() < 0.2);
                    events.push(makeRhythmEvent(asR ? 'qrtrRest' : 'quarter'));
                    remaining -= 4; position += 4;
                };
                pushOneQ();
                if (trailingQ + 4 < 12 && remaining >= 4) pushOneQ();
            } else if (atBig && remaining >= 12 &&
                       (chosen.key === 'quarter' || chosen.key === 'qrtrRest') &&
                       Math.random() < 0.40) {
                // Atomic 3× quarter (syncopation): two big beats / full 6/8 measure
                const allowQr = userPoolKeys.has('qrtrRest');
                const preferRest = chosen.key === 'qrtrRest' || chosen.isRest;
                for (let k = 0; k < 3; k++) {
                    let asR = preferRest && allowQr;
                    if (!asR && allowQr && Math.random() < 0.15) asR = true;
                    events.push(makeRhythmEvent(asR ? 'qrtrRest' : 'quarter'));
                    remaining -= 4; position += 4;
                }
            } else if ((chosen.key === 'dotted8th' || chosen.key === 'dotted8thRest') && remaining >= 4 && allowD8) {
                // Preferred: d8 + 16 + 8 when a full big beat remains; else d8 + 16 only
                const asRest = chosen.key === 'dotted8thRest' || preferDotted8RestForm(userPoolKeys, difficulty);
                const roomInBeat = big - (position % big);
                if (roomInBeat >= 6 && remaining >= 6) {
                    pushD8Then16Then8(asRest);
                } else {
                    // Partial room: d8 + 16 only — never second dotted 8th after
                    pushDotted8(!!asRest);
                    if (remaining >= 1) {
                        if (asRest && allow16r) push16r();
                        else push16();
                    }
                    if (remaining >= 2 && (position % big) !== 0) push8n();
                }
            } else if (atBig && allow16r && chosen.key === '16thRest' && remaining >= 2) {
                push16r();
                push16();
                if (remaining >= 1) push16();
                if (remaining >= 1 && Math.random() < 0.5) push16r();
                else if (remaining >= 1) push16();
                if (remaining >= 2 && (position % big) !== 0) push8n();
            } else if (atBig && remaining >= 4 && chosen.key === 'sixteenth') {
                // Start complete 16th group at big beat: 2, 4, or full 6 (L4 set-of-6 still legal)
                const roll = Math.random();
                const room = Math.min(remaining, big - (position % big));
                if (allow16r && difficulty === 'hard' && roll < 0.12 && room >= 4) {
                    push16(); push16r(); push16(); push16();
                    if (remaining >= 2 && (position % big) !== 0) push8n();
                } else if (room >= 6 && roll < (difficulty === 'easy' ? 0.28 : 0.32)) {
                    // Full big beat of 6 sixteenths (same as L4 compound)
                    for (let k = 0; k < 6 && remaining >= 1; k++) push16();
                } else if (roll < (difficulty === 'easy' ? 0.55 : 0.58) && room >= 6) {
                    // 4 sixteenths + 8th
                    for (let k = 0; k < 4 && remaining >= 1; k++) push16();
                    if (remaining >= 2) push8n();
                } else if (roll < 0.78 && room >= 4 && poolKeys.has('eighth')) {
                    // 8th + 2×16, or 2×16 + 8th
                    if (Math.random() < 0.5) {
                        push8n();
                        if (remaining >= 1) push16();
                        if (remaining >= 1) push16();
                    } else {
                        push16();
                        if (remaining >= 1) push16();
                        if (remaining >= 2) push8n();
                    }
                } else if (room >= 4) {
                    // 4×16, or 2×16 + optional 8th
                    if (Math.random() < 0.55) {
                        for (let k = 0; k < 4 && remaining >= 1; k++) push16();
                    } else {
                        push16();
                        if (remaining >= 1) push16();
                        if (remaining >= 2 && poolKeys.has('eighth') && Math.random() < 0.7) push8n();
                        else { if (remaining >= 1) push16(); if (remaining >= 1) push16(); }
                    }
                } else if (room >= 2) {
                    push16();
                    if (remaining >= 1) push16();
                }
            } else if (atBig && remaining >= 6 && chosen.key === 'eighth') {
                // 8th with rest between, or set of 3 8ths, or 8+16 mixes (incl. rare 8+4×16)
                const roll = Math.random();
                if (roll < 0.28) {
                    // 8th + 8th rest + 8th
                    push8n();
                    if (remaining >= 2) push8r();
                    if (remaining >= 2) push8n();
                } else if (roll < 0.50) {
                    for (let k = 0; k < 3 && remaining >= 2; k++) push8n();
                } else if (roll < 0.68) {
                    push8n();
                    for (let k = 0; k < 4 && remaining >= 1; k++) push16();
                } else if (roll < 0.82 && remaining >= 6) {
                    // Full 6 sixteenths can also start after choosing 8th at big beat → prefer pure 6
                    for (let k = 0; k < 6 && remaining >= 1; k++) push16();
                } else {
                    push8n();
                    if (remaining >= 1) push16();
                    if (remaining >= 1) push16();
                }
            } else if (chosen.key === '8thRest' && remaining >= 2) {
                push8r();
            } else {
                // Generic push for other compound L5/L6 choices
                events.push({
                    key: chosen.key,
                    units: chosen.units,
                    vexDur: chosen.vexDur,
                    isRest: chosen.isRest,
                    dots: chosen.dots || 0,
                    label: chosen.label
                });
                remaining -= chosen.units;
                position += chosen.units;
            }
        } else if (isCompound && curLevel === 4 && chosen.key === 'sixteenth' && chosen.units === 1 && (position % 6 === 0) && remaining >= 6) {
            // L4 compound: 16th notes in sets of 6 at big-beat boundaries
            const e = chosen;
            // emit 6
            events.push({
                key: e.key,
                units: 1,
                vexDur: e.vexDur,
                isRest: e.isRest,
                dots: e.dots || 0,
                label: e.label
            });
            remaining -= 1;
            position += 1;
            for (let k = 1; k < 6 && remaining >= 1; k++) {
                events.push({ key: e.key, units: 1, vexDur: e.vexDur, isRest: false, dots: 0 });
                remaining -= 1;
                position += 1;
            }
        } else if (!chosen.isRest && chosen.key === 'sixteenth' && chosen.units === 1 && userEnabledSixteenth) {
            // Hygiene fallback: never emit a lone 16th — complete a legal beamed group only
            // Simple L3: sets of 4. Compound L4: sets of 6. Mixed 2/4 packs need L4 simple / L5 compound.
            let n = 0;
            if (isCompound && curLevel <= 4) {
                n = ((position % 6 === 0) && remaining >= 6) ? 6 : 0;
            } else if (!isCompound && curLevel < 4) {
                n = ((position % 4 === 0) && remaining >= 4) ? 4 : 0;
            } else if (isCompound) {
                // L5+ compound mixed: complete within big beat (2 or to end of beat)
                const room = Math.min(6 - (position % 6), remaining);
                n = room >= 4 ? 4 : (room >= 2 ? 2 : 0);
            } else {
                const room = Math.min(4 - (position % 4), remaining);
                n = room >= 4 ? 4 : (room >= 2 ? 2 : 0);
            }
            if (n >= 2) {
                for (let k = 0; k < n && remaining >= 1; k++) {
                    events.push(makeRhythmEvent('sixteenth'));
                    remaining -= 1;
                    position += 1;
                }
            } else {
                // Can't fit a legal group — use a longer value instead
                const fb = available.find(r => r.units <= remaining && r.units >= 2 && r.key !== 'sixteenth') ||
                    available.find(r => r.units <= remaining && r.key !== 'sixteenth');
                if (fb) {
                    events.push({
                        key: fb.key, units: fb.units, vexDur: fb.vexDur,
                        isRest: fb.isRest, dots: fb.dots || 0, label: fb.label
                    });
                    remaining -= fb.units;
                    position += fb.units;
                } else break;
            }
        } else if (!chosen.isRest && chosen.key === 'eighth' && chosen.units === 2 &&
                   !isCompound && timeSig !== '2/2' && (position % 4 === 0) && remaining >= 4 &&
                   curLevel >= 2 && Math.random() < (difficulty === 'easy' ? 0.75 : 0.45)) {
            // Prefer a beamed pair of 8ths (complete half-beat group) on Easy especially
            events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
            events.push({ key: 'eighth', units: 2, vexDur: '8', isRest: false, dots: 0 });
            remaining -= 4;
            position += 4;
        } else {
            events.push({
                key: chosen.key,
                units: chosen.units,
                vexDur: chosen.vexDur,
                isRest: chosen.isRest,
                dots: chosen.dots || 0,
                label: chosen.label
            });
            remaining -= chosen.units;
            position += chosen.units;
        }

        // Post-push: complete obligatory pairs if still open (all simple + cut meters)
        if (!isCompound && remaining >= 1) {
            const last = events.length > 0 ? events[events.length - 1] : null;
            if (last && needsImmediatePair(last, timeSig || curTimeSig)) {
                if ((last.key === 'dottedQtr' || last.key === 'dottedQrtrRest') && remaining >= 2) {
                    // Prefer 8th NOTE completer (2u); rest completer only if user enabled 8th rests
                    if (last.isRest && userEnabled8thRest) {
                        events.push(makeRhythmEvent('8thRest'));
                        remaining -= 2;
                        position += 2;
                    } else if (poolKeys.has('eighth') || userEnabled8thRest) {
                        events.push(makeRhythmEvent('eighth'));
                        remaining -= 2;
                        position += 2;
                    } else if (poolKeys.has('sixteenth') && remaining >= 2) {
                        events.push(makeRhythmEvent('sixteenth'));
                        events.push(makeRhythmEvent('sixteenth'));
                        remaining -= 2;
                        position += 2;
                    } else {
                        events.push(makeRhythmEvent('eighth')); // injected completer
                        remaining -= 2;
                        position += 2;
                    }
                } else if ((last.key === 'dotted8th' || last.key === 'dotted8thRest') && remaining >= 1) {
                    if (appendPairCompleter(events, last, timeSig || curTimeSig, userPoolKeys)) {
                        remaining -= 1;
                        position += 1;
                    }
                }
            }
        }

        // L4+ simple: after an 8th NOTE at a beat boundary, sometimes complete as 8 + 2×16
        // Pattern E — kept moderate so C does not drown A/B/G/H from the boundary picker
        if (!isCompound && curLevel >= 4 && timeSig !== '2/2' && chosen.key === 'eighth' && chosen.units === 2 &&
            !chosen.isRest && ((position - 2) % 4 === 0) && remaining >= 2 &&
            userEnabledSixteenth && allowed16Patterns.has('E') &&
            Math.random() < (difficulty === 'hard' ? 0.32 : (difficulty === 'easy' ? 0.18 : 0.24))) {
            for (let k = 0; k < 2 && remaining >= 1; k++) {
                events.push(makeRhythmEvent('sixteenth'));
                remaining -= 1;
                position += 1;
            }
        }

        // REMOVED: L3 compound force of lone 8th + dotted quarter — awkward, rare in real music,
        // and illegal for L1 (8ths must be complete sets of 3). Big beats stay complete groups.
    }
    
    // safety pad (now less likely to be needed, and restricted for L1 compound)
    if (remaining > 0) {
        const makeSafeFiller = (rem) => {
            let fits = pool.filter(r => r.units > 0 && r.units <= rem);
            if (isCompound) {
                const sub = position % 6;
                if (sub !== 0) {
                    // mid-beat safety: allow completing 8th (note or rest for L>=4)
                    if (curLevel >= 4) {
                        fits = fits.filter(r => r.units === 2 && (r.key === 'eighth' || r.key === '8thRest'));
                    } else {
                        fits = fits.filter(r => r.key === 'eighth' && r.units === 2);
                    }
                } else {
                    // at big beat: block lone 8th *note*; allow 8thRest for L4+ compound
                    fits = fits.filter(r => {
                        if (r.units === 2) {
                            if (r.isRest) return curLevel >= 4;
                            return false; // no lone 8th note at big in safety
                        }
                        return true;
                    });
                }
                if (curLevel <= 1) {
                    fits = fits.filter(r => !(r.key === 'eighth' && r.units === 2));
                } else if (curLevel === 2) {
                    // L2 compound: no 8th rests at all, and avoid lone 8th note unless completing quarter+8th
                    fits = fits.filter(r => r.key !== '8thRest');
                    const last = events.length > 0 ? events[events.length-1] : null;
                    if (!(last && last.key === 'quarter' && last.units === 4)) {
                        fits = fits.filter(r => !(r.key === 'eighth' && !r.isRest && r.units === 2));
                    }
                } else if (curLevel === 3) {
                    // L3 compound: no 8th rests (even in safety), only 8th NOTES
                    fits = fits.filter(r => r.key !== '8thRest' && !(r.units === 1));
                }
            }
            if (!isCompound && curLevel <= 2) {
                // For L2 simple, never use 8th or 16ths in safety (main gen handles fill or leaves rare unfilled)
                fits = fits.filter(r => r.units !== 1 && !(r.key === 'eighth' && r.units === 2));
            }
            if (!isCompound && curLevel === 3) {
                // L3: no lone 16ths or dotted 8 in safety (main gen only emits 4×16 packs)
                fits = fits.filter(r =>
                    r.units !== 1 &&
                    r.key !== 'dotted8th' &&
                    r.key !== 'dotted8thRest'
                );
            }
            if (!isCompound && curLevel >= 4 && curLevel < 6) {
                // L4–L5 simple: no 16th rests, no lone 16ths, no lone dotted 8ths in safety filler
                fits = fits.filter(r =>
                    !(r.units === 1 && r.isRest) &&
                    r.units !== 1 &&
                    r.key !== 'dotted8th'
                );
            }
            if (!isCompound && curLevel >= 6) {
                // L6 simple: allow 16th rests in safety; still avoid lone dotted8 / naked triplet seeds
                fits = fits.filter(r =>
                    r.key !== 'dotted8th' &&
                    r.key !== 'sixteenthTriplet' &&
                    r.key !== 'eighthNoteTriplet'
                );
            }
            if (timeSig === '2/2' && (curLevel === 3 || curLevel === 4)) {
                // Cut L3/L4: never use lone 8ths in safety (only complete patterns from main gen)
                fits = fits.filter(r => !(r.key === 'eighth' && !r.isRest));
            }
            if (fits.length === 0) return null;
            return fits.reduce((best, cur) => (cur.units > best.units ? cur : best), fits[0]);
        };
        while (remaining > 0) {
            const filler = makeSafeFiller(remaining);
            if (!filler) break;
            events.push({
                key: filler.key,
                units: filler.units,
                vexDur: filler.vexDur,
                isRest: filler.isRest,
                dots: filler.dots || 0
            });
            remaining -= filler.units;
        }
    }

    // Final safety net: force exact unit total so *every* measure has the precise number of beats
    // matching the time signature (totalUnits). Main picker + bundles + posts target this;
    // this only triggers on rare edge cases from strict mid-beat filters.
    if (remaining > 0) {
        while (remaining > 0) {
            let fits = pool.filter(r => r.units > 0 && r.units <= remaining && !r.__autoCompleter);
            // Never pad with heads that need partners (lone 16ths, dotted 8ths, incomplete dotted Q)
            fits = fits.filter(r =>
                r.key !== 'sixteenth' && r.key !== 'dotted8th' && r.key !== 'dotted8thRest' &&
                !(r.units === 1 && !r.isRest) &&
                !((r.key === 'dottedQtr' || r.key === 'dottedQrtrRest') && !isCompound && remaining < 8)
            );
            if (fits.length === 0) {
                fits = pool.filter(r => r.units > 0 && r.units <= remaining && r.isRest &&
                    r.key !== 'dotted8thRest' &&
                    !((r.key === 'dottedQrtrRest') && !isCompound && remaining < 8));
            }
            if (fits.length === 0) break;
            fits.sort((a, b) => b.units - a.units);
            const f = fits[0];
            events.push({
                key: f.key,
                units: f.units,
                vexDur: f.vexDur,
                isRest: f.isRest,
                dots: f.dots || 0
            });
            remaining -= f.units;
            // If we just pushed a head that needs a pair, complete it immediately
            if (needsImmediatePair(events[events.length - 1], curTimeSig) && remaining > 0) {
                const head = events[events.length - 1];
                if (appendPairCompleter(events, head, curTimeSig, userPoolKeys)) {
                    const added = events[events.length - 1];
                    remaining -= added.units || 0;
                }
            }
        }
    }
    
    // Comprehensive finalize: open pairs, short-group hygiene, exact unit total
    let finalized = finalizeMeasureMath(events, totalUnits, curTimeSig, userPoolKeys);
    finalized = normalizeRestSequences(finalized, curTimeSig, userPoolKeys);
    // Absolute last line of defense: never show 16th rests unless the user checked them
    if (!userEnabled16thRest && finalized && finalized.length) {
        finalized = finalized.map(ev => {
            if (ev && ev.key === '16thRest') return makeRhythmEvent('sixteenth');
            return ev;
        });
    }
    return finalized;
}

/**
 * Post-pass: never leave a single 16th (or incomplete short run) that would render as a lone flag.
 * NEVER invent 16th rests unless allow16thRest is true — use 16th notes / dotted-8 rewrites instead.
 */
function sanitizeShortNoteGroups(events, pool, isCompound, beatUnits, allow16thRest) {
    if (!events || !events.length) return events || [];
    const allow16r = !!allow16thRest;
    const out = [];
    let i = 0;
    while (i < events.length) {
        const ev = events[i];
        if (!ev) { i++; continue; }
        // Collect a maximal run of consecutive 16th notes
        if (ev.key === 'sixteenth' && !eventIsRest(ev)) {
            const run = [];
            let j = i;
            while (j < events.length && events[j] && events[j].key === 'sixteenth' && !eventIsRest(events[j])) {
                run.push(events[j]);
                j++;
            }
            if (run.length === 1) {
                // Lone 16th: keep if beamed with neighbor; else keep as 16th NOTE (never invent 16th rest)
                const prev = out.length ? out[out.length - 1] : null;
                const next = events[j] || null;
                const attachesPrev = prev && (
                    (prev.key === 'eighth' && !eventIsRest(prev)) ||
                    prev.key === 'dotted8th'
                );
                const attachesNext = next && (
                    (next.key === 'eighth' && !eventIsRest(next)) ||
                    (next.key === 'sixteenth' && !eventIsRest(next)) ||
                    next.key === 'dotted8th'
                );
                if (attachesPrev || attachesNext) {
                    out.push(run[0]);
                } else {
                    // Keep the 16th note — illegal rest is worse than a lone flag; measure math stays
                    out.push(run[0]);
                }
            } else if (run.length === 3) {
                // 3 sixteenths (3u) → dotted 8th note (same duration), avoids orphan + illegal rest
                out.push(makeRhythmEvent('dotted8th'));
            } else {
                // 2, 4, 5… keep complete pairs/packs; leftover 1 stays as 16th NOTE
                let k = 0;
                while (k < run.length) {
                    const left = run.length - k;
                    if (left >= 4) {
                        out.push(run[k], run[k + 1], run[k + 2], run[k + 3]);
                        k += 4;
                    } else if (left >= 2) {
                        out.push(run[k], run[k + 1]);
                        k += 2;
                    } else {
                        // leftover single 16th note — keep note, or rest only if user enabled
                        if (allow16r) {
                            out.push({ key: '16thRest', units: 1, vexDur: '16r', isRest: true, dots: 0 });
                        } else {
                            out.push(run[k]);
                        }
                        k += 1;
                    }
                }
            }
            i = j;
            continue;
        }
        // Strip illegal 16th rests if they appear as content
        if (ev.key === '16thRest' && !allow16r) {
            out.push(makeRhythmEvent('sixteenth'));
            i++;
            continue;
        }
        out.push(ev);
        i++;
    }
    return out;
}

// =====================================================
// VEXFLOW RENDERING — PROFESSIONAL QUALITY
// =====================================================

function drawPercussionClef(ctx, x, staffY, staffH) {
    const lineSpacing = staffH / 4;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 2.1;
    
    // Two thick vertical lines
    const leftX = x + 4;
    const rightX = x + 13;
    
    ctx.beginPath();
    ctx.moveTo(leftX, staffY + lineSpacing * 0.6);
    ctx.lineTo(leftX, staffY + staffH - lineSpacing * 0.55);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(rightX, staffY + lineSpacing * 0.6);
    ctx.lineTo(rightX, staffY + staffH - lineSpacing * 0.55);
    ctx.stroke();
    
    // Small circles (classic percussion clef look)
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(leftX + 4.5, staffY + lineSpacing * 1.05, 2.8, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(leftX + 4.5, staffY + lineSpacing * 2.95, 2.8, 0, Math.PI * 2);
    ctx.stroke();
}

// Render the actual notes/rests inside one measure with proper spacing and beaming
function renderMeasureRhythms(ctx, startX, staffY, measureW, staffH, events, timeSig) {
    if (!events || events.length === 0) return;
    
    const lineSpacing = staffH / 4;
    const centerY = staffY + lineSpacing * 2; // middle line of staff
    
    // Calculate positions proportionally
    const totalUnits = events.reduce((sum, e) => sum + e.units, 0);
    const unitsPerPixel = measureW / totalUnits;
    
    let x = startX;
    const notePositions = [];
    
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#0f172a';
    
    events.forEach((event, idx) => {
        const eventWidth = event.units * unitsPerPixel;
        const noteCenterX = x + eventWidth / 2;
        notePositions.push({ x: noteCenterX, event });
        
        const isRest = event.isRest;
        const stemUp = true; // For rhythm sheets we usually put stems up for clarity
        
        if (isRest) {
            drawRest(ctx, noteCenterX, centerY, lineSpacing, event.vexDur, event.dots);
        } else {
            drawNote(ctx, noteCenterX, centerY, lineSpacing, event.vexDur, event.dots, stemUp);
        }
        
        // === EDUCATION COUNTING LINES (primary pedagogical feature) ===
        // Small horizontal lines well below the staff for students to write counting
        const countY = staffY + staffH + 18;
        const lineHalfWidth = Math.max(7, Math.min(11, eventWidth * 0.32));
        
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(noteCenterX - lineHalfWidth, countY);
        ctx.lineTo(noteCenterX + lineHalfWidth, countY);
        ctx.stroke();
        
        // Very subtle vertical tick in the middle (helps with placement)
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(noteCenterX, countY - 2);
        ctx.lineTo(noteCenterX, countY + 3);
        ctx.stroke();
        
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#0f172a';
        
        x += eventWidth;
    });
    
    // Draw beams for groups of 8ths and 16ths (professional look)
    drawBeams(ctx, notePositions, centerY, lineSpacing);
}

// Draw individual note head + stem (improved proportions for better appearance)
function drawNote(ctx, cx, cy, lineSpacing, vexDur, dots, stemUp) {
    const stemLength = lineSpacing * 2.95;
    const stemX = cx + (stemUp ? 5.8 : -5.8);
    
    ctx.lineWidth = 1.4;
    
    if (vexDur === 'w') {
        // Whole note (open oval, Bravura-like proportions)
        ctx.beginPath();
        ctx.ellipse(cx, cy, 6.6, 4.7, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (vexDur === 'h') {
        // Half note (open head + stem)
        ctx.beginPath();
        ctx.ellipse(cx, cy, 6.1, 4.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(stemX, cy - 0.5);
        ctx.lineTo(stemX, cy - (stemUp ? stemLength : -stemLength));
        ctx.stroke();
    } else {
        // Quarter, 8th, 16th — filled head + stem (more Bravura-like oval)
        ctx.beginPath();
        ctx.ellipse(cx, cy, 5.7, 4.15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(stemX, cy - 0.5);
        ctx.lineTo(stemX, cy - (stemUp ? stemLength : -stemLength));
        ctx.stroke();
        
        // Flags for 8ths and 16ths (cleaner curves)
        if (vexDur === '8' || vexDur === '16') {
            const flagY = cy - (stemUp ? stemLength : -stemLength);
            ctx.lineWidth = 1.9;
            
            ctx.beginPath();
            if (stemUp) {
                ctx.moveTo(stemX, flagY + 0.5);
                ctx.quadraticCurveTo(stemX + 6.5, flagY + 6.5, stemX + 3.8, flagY + 13.5);
            } else {
                ctx.moveTo(stemX, flagY - 0.5);
                ctx.quadraticCurveTo(stemX - 6.5, flagY - 6.5, stemX - 3.8, flagY - 13.5);
            }
            ctx.stroke();
            
            if (vexDur === '16') {
                // Second flag for 16ths
                ctx.beginPath();
                if (stemUp) {
                    ctx.moveTo(stemX, flagY + 4.5);
                    ctx.quadraticCurveTo(stemX + 6.5, flagY + 10.5, stemX + 3.8, flagY + 17);
                } else {
                    ctx.moveTo(stemX, flagY - 4.5);
                    ctx.quadraticCurveTo(stemX - 6.5, flagY - 10.5, stemX - 3.8, flagY - 17);
                }
                ctx.stroke();
            }
            ctx.lineWidth = 1.4;
        }
    }
    
    // Dots (positioned better)
    if (dots > 0) {
        const dotX = cx + 10.2;
        ctx.beginPath();
        ctx.arc(dotX, cy - 0.8, 1.6, 0, Math.PI * 2);
        ctx.fill();
        if (dots === 2) {
            ctx.beginPath();
            ctx.arc(dotX + 4.8, cy - 0.8, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Draw rest symbols (improved for clearer appearance)
function drawRest(ctx, cx, cy, lineSpacing, vexDur, dots) {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#1e293b';
    
    if (vexDur === 'wr') {
        // Whole rest (small rectangle hanging from the 4th line)
        ctx.lineWidth = 1.0;
        ctx.fillRect(cx - 6.2, cy - lineSpacing * 0.58, 12.4, 5.2);
    } else if (vexDur === 'hr') {
        // Half rest (small rectangle sitting on the 3rd line)
        ctx.lineWidth = 1.0;
        ctx.fillRect(cx - 6.2, cy - lineSpacing * 0.22, 12.4, 5.2);
    } else if (vexDur === 'qr') {
        // Quarter rest (classic stylized squiggle, closer to Bravura)
        ctx.lineWidth = 2.35;
        ctx.beginPath();
        ctx.moveTo(cx - 0.5, cy - 8.5);
        ctx.quadraticCurveTo(cx + 6, cy - 3.5, cx - 1.5, cy + 3.5);
        ctx.quadraticCurveTo(cx + 5, cy + 9, cx - 2, cy + 13.5);
        ctx.stroke();
        ctx.lineWidth = 1.0;
    } else if (vexDur === '8r') {
        // 8th rest
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - 0.5, cy - 7.5);
        ctx.lineTo(cx + 5, cy + 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy + 1.5);
        ctx.quadraticCurveTo(cx + 2.5, cy + 7, cx - 2, cy + 6.5);
        ctx.stroke();
    } else if (vexDur === '16r') {
        // 16th rest (two flags)
        ctx.lineWidth = 1.55;
        ctx.beginPath();
        ctx.moveTo(cx - 0.5, cy - 7.5);
        ctx.lineTo(cx + 5, cy + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 4.5, cy + 1);
        ctx.quadraticCurveTo(cx + 2.5, cy + 5.5, cx - 2, cy + 5.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy + 5);
        ctx.quadraticCurveTo(cx + 3, cy + 9, cx - 1.5, cy + 9.5);
        ctx.stroke();
    }
    
    // Dots on rests (slightly larger and better positioned)
    if (dots > 0) {
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(cx + 9.5, cy + 0.5, 1.65, 0, Math.PI * 2);
        ctx.fill();
        if (dots === 2) {
            ctx.beginPath();
            ctx.arc(cx + 14.5, cy + 0.5, 1.65, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Professional beaming between consecutive short notes
function drawBeams(ctx, notePositions, centerY, lineSpacing) {
    if (notePositions.length < 2) return;
    
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.05;
    
    let i = 0;
    while (i < notePositions.length) {
        const current = notePositions[i];
        
        // Only beam 8ths and 16ths
        if (!['8', '16'].includes(current.event.vexDur) || current.event.isRest) {
            i++;
            continue;
        }
        
        // Find run of beamable notes
        let j = i;
        const beamGroup = [current];
        
        while (j + 1 < notePositions.length) {
            const next = notePositions[j + 1];
            if (['8', '16'].includes(next.event.vexDur) && !next.event.isRest) {
                beamGroup.push(next);
                j++;
            } else {
                break;
            }
        }
        
        if (beamGroup.length >= 2) {
            // Draw primary beam
            const yBeam = centerY - lineSpacing * 2.55;
            ctx.beginPath();
            ctx.moveTo(beamGroup[0].x + 5, yBeam);
            ctx.lineTo(beamGroup[beamGroup.length - 1].x + 5, yBeam);
            ctx.stroke();
            
            // Secondary beam for 16ths
            const has16th = beamGroup.some(n => n.event.vexDur === '16');
            if (has16th) {
                const yBeam2 = yBeam + 5.5;
                ctx.beginPath();
                ctx.moveTo(beamGroup[0].x + 5, yBeam2);
                ctx.lineTo(beamGroup[beamGroup.length - 1].x + 5, yBeam2);
                ctx.stroke();
            }
        }
        
        i = j + 1;
    }
}

// Measure widths weighted by duration density (like SRF: more symbols / shorter values → wider bar).
// Longer notes don't need much width; runs of 8ths/16ths do.
function calculateDynamicMeasureWidths(measuresInLine, totalAvailableWidth, minWidth = 120) {
    if (!measuresInLine || measuresInLine.length === 0) return [];
    
    const complexities = measuresInLine.map(events => {
        if (!events || events.length === 0) return 0.55;
        
        // Base + per-glyph cost; short durations cost more horizontal room
        let score = 2.2;
        events.forEach(ev => {
            if (ev.key && String(ev.key).includes('Triplet')) {
                // 3 notes in the space of 2 — needs room for heads + bracket
                const isQ = ev.key === 'quarterTriplet';
                const is16 = ev.key === 'sixteenthTriplet';
                score += isQ ? 9.5 : (is16 ? 7.5 : 8.5);
                return;
            }
            const u = ev.units || 4;
            // Duration-aware glyph cost: whole≈roomy but few glyphs; 16ths pack many
            if (u >= 16) score += 2.4;       // whole
            else if (u >= 12) score += 2.8;  // dotted half
            else if (u >= 8) score += 3.0;   // half
            else if (u >= 6) score += 3.4;   // dotted quarter
            else if (u >= 4) score += 3.6;   // quarter
            else if (u >= 3) score += 4.0;   // dotted 8th
            else if (u >= 2) score += 4.55;  // 8th
            else score += 5.5;               // 16th
            if (ev.dots) score += 0.7;
            if (ev.isRest) score += 0.15;
            if (ev.key && String(ev.key).includes('Triplet')) score += 3.0;
        });
        
        // Dense bars claim more line width (sparse neighbors stay compact)
        if (events.length >= 10) score *= 1.1;
        else if (events.length >= 7) score *= 1.05;
        const fineN = events.filter(e => e && (e.units <= 1 || e.key === 'sixteenth' ||
            (e.key && String(e.key).includes('Triplet')))).length;
        if (fineN >= 3) score *= 1.1;
        if (fineN >= 6) score *= 1.18;  // full 6-pack (or more) — give the bar room
        if (fineN >= 9) score *= 1.12;
        if (fineN >= 12) score *= 1.1;
        
        return Math.max(0.55, score);
    });
    
    const totalComplexity = complexities.reduce((a, b) => a + b, 0) || 1;
    const weights = complexities.map(c => c / totalComplexity);
    
    let widths = weights.map(w => Math.max(minWidth, Math.floor(totalAvailableWidth * w)));
    
    const currentSum = widths.reduce((a, b) => a + b, 0);
    let remaining = totalAvailableWidth - currentSum;
    
    if (Math.abs(remaining) > 1) {
        const sortedIdx = widths.map((w, i) => ({ w, i, c: complexities[i] }))
                               .sort((a, b) => b.c - a.c);
        for (const item of sortedIdx) {
            if (remaining === 0) break;
            const step = remaining > 0 ? Math.min(remaining, 8) : Math.max(remaining, -8);
            // Don't shrink below minWidth
            if (step < 0 && widths[item.i] + step < minWidth) continue;
            widths[item.i] += step;
            remaining -= step;
        }
        // Dump any leftover on the densest measure
        if (remaining !== 0 && sortedIdx.length) {
            widths[sortedIdx[0].i] += remaining;
        }
    }
    
    return widths;
}

// =====================================================
// PROFESSIONAL VEXFLOW RENDERING (Bravura + Dynamic Layout)
// This replaces all the old custom canvas drawing for true engraved quality.
// =====================================================

function estimateMeasureMinWidth(evs, isClefMeasure) {
    if (!evs || evs.length === 0) return 100;
    let symbolCount = 0;
    let fineCount = 0;
    let eighthCount = 0;
    let dottedCount = 0;
    let tripletGroups = 0;
    let quarterTriplets = 0;
    // Dense L5/L6 (16ths + triplets) need room to breathe — 2 bars/line is fine for complex writing.
    // Sparse L1–L3 still packs 3–4/line. Collision review still runs post-format.
    let w = 52;
    evs.forEach(ev => {
        if (ev.key && String(ev.key).includes('Triplet')) {
            symbolCount += 3;
            tripletGroups += 1;
            const isQ = ev.key === 'quarterTriplet';
            if (isQ) quarterTriplets += 1;
            w += (isQ ? 3 * 24 : 3 * 20) + 30;
        } else {
            symbolCount += 1;
            const u = ev.units || 4;
            const isFine = u <= 1 || ev.key === 'sixteenth' || ev.key === '16thRest';
            if (isFine) {
                fineCount += 1;
                w += 22;
            } else if (u <= 2) {
                eighthCount += 1;
                w += 18;
            } else if (u <= 4) {
                w += 16;
            } else if (u <= 8) {
                w += 14;
            } else {
                w += 12;
            }
            if (ev.dots) {
                dottedCount += 1;
                w += 8;
            }
            if (ev.isRest && u <= 2) w += 3;
        }
    });
    w += 24;
    if (isClefMeasure) w += 44;
    if (symbolCount >= 6) w += 14;
    if (symbolCount >= 9) w += 22;
    if (fineCount >= 4) w += 22;
    if (fineCount >= 6) w += 36;   // compound 6×16 packs need real width
    if (fineCount >= 8) w += 28;
    if (fineCount >= 12) w += 40;  // two 6-packs in one bar (12/8)
    if (eighthCount >= 3) w += 12;
    if (dottedCount >= 1) w += 5 * dottedCount;
    if (tripletGroups >= 1) w += 14;
    if (tripletGroups >= 2) w += 32;
    if (tripletGroups >= 3) w += 40;
    if (tripletGroups >= 4) w += 28;
    if (quarterTriplets >= 2) w += 40;
    // Extra air when a measure is mostly 16ths (L4 compound 6-packs)
    if (fineCount >= 6 && symbolCount > 0 && fineCount / symbolCount >= 0.55) w += 36;
    // Cap ~half a system: densest writing → 2 bars/line; never solo-only by default
    return Math.min(360, Math.max(118, w));
}

/**
 * Minimum horizontal gap (px) needed between consecutive note absolute-X positions
 * so heads / dots / flags don't stack. Used by post-format collision review.
 */
function minGapBetweenNotes(evA, evB, noteA, noteB) {
    // A bit more air for L5/L6 fine writing; still allows 2 dense bars per line
    let gap = 13.5;
    const uA = (evA && evA.units) || 4;
    const uB = (evB && evB.units) || 4;
    const fineA = uA <= 1 || (evA && (evA.key === 'sixteenth' || evA.key === '16thRest'));
    const fineB = uB <= 1 || (evB && (evB.key === 'sixteenth' || evB.key === '16thRest'));
    const eighthA = !fineA && uA <= 2 && evA && !eventIsRest(evA);
    const eighthB = !fineB && uB <= 2 && evB && !eventIsRest(evB);
    if (fineA || fineB) gap = 14.5;
    if (fineA && fineB) gap = 14;
    if (eighthA || eighthB) gap = Math.max(gap, 15.5);
    if (evA && evA.dots) gap += 6.5;
    if (evB && evB.dots) gap += 2;
    try {
        if (noteA && noteA.__isTripletNote) gap = Math.max(gap, 12);
        if (noteB && noteB.__isTripletNote) gap = Math.max(gap, 12);
    } catch (e) {}
    if (evA && eventIsRest(evA) && evB && !eventIsRest(evB)) gap = Math.max(gap, 14);
    if (evB && eventIsRest(evB) && evA && !eventIsRest(evA)) gap = Math.max(gap, 13.5);
    return gap;
}

/**
 * Post-format review: spread notes that are closer than minGap, then gently compress
 * only surplus space if the last glyph would cross the barline.
 * Returns true if any position was adjusted.
 */
function resolveRenderedNoteCollisions(staveNotes, noteSourceEvent, events, noteStartX, staveRightLimit) {
    if (!staveNotes || staveNotes.length < 2) return false;
    const n = staveNotes.length;
    const getAx = (note) => {
        try {
            if (typeof note.getAbsoluteX === 'function') return note.getAbsoluteX();
            if (typeof note.getX === 'function') return note.getX();
        } catch (e) {}
        return 0;
    };
    const setAx = (note, newAx) => {
        try {
            const curAx = getAx(note);
            const delta = newAx - curAx;
            if (Math.abs(delta) < 0.05) return;
            if (note.getTickContext && note.getTickContext()) {
                const tc = note.getTickContext();
                if (typeof tc.setX === 'function') {
                    tc.setX(tc.getX() + delta);
                    return;
                }
            }
            if (typeof note.setX === 'function') {
                const curX = (typeof note.getX === 'function') ? note.getX() : 0;
                note.setX(curX + delta);
            }
        } catch (e) {}
    };

    const xs = staveNotes.map(getAx);
    // Enforce left edge
    if (xs[0] < noteStartX + 2) xs[0] = noteStartX + 2;

    let changed = false;
    for (let i = 0; i < n - 1; i++) {
        const evA = (noteSourceEvent[i] != null) ? events[noteSourceEvent[i]] : null;
        const evB = (noteSourceEvent[i + 1] != null) ? events[noteSourceEvent[i + 1]] : null;
        const need = minGapBetweenNotes(evA, evB, staveNotes[i], staveNotes[i + 1]);
        if (xs[i + 1] < xs[i] + need) {
            xs[i + 1] = xs[i] + need;
            changed = true;
        }
    }

    // If we overflow the bar, shrink only surplus (gap above min) proportionally
    const lastExtent = xs[n - 1] + 12;
    if (lastExtent > staveRightLimit && n > 1) {
        const overflow = lastExtent - staveRightLimit;
        const mins = [];
        let surplus = 0;
        for (let i = 0; i < n - 1; i++) {
            const evA = (noteSourceEvent[i] != null) ? events[noteSourceEvent[i]] : null;
            const evB = (noteSourceEvent[i + 1] != null) ? events[noteSourceEvent[i + 1]] : null;
            const need = minGapBetweenNotes(evA, evB, staveNotes[i], staveNotes[i + 1]) * 0.88;
            mins.push(need);
            surplus += Math.max(0, (xs[i + 1] - xs[i]) - need);
        }
        if (surplus > 0.5) {
            let left = Math.min(overflow, surplus);
            for (let i = 0; i < n - 1 && left > 0.05; i++) {
                const gap = xs[i + 1] - xs[i];
                const room = Math.max(0, gap - mins[i]);
                if (room <= 0) continue;
                const take = Math.min(room, left * (room / surplus));
                // Shift all notes after i left by `take`
                for (let j = i + 1; j < n; j++) xs[j] -= take;
                left -= take;
                changed = true;
            }
        }
    }

    if (changed) {
        for (let i = 0; i < n; i++) setAx(staveNotes[i], xs[i]);
    }
    return changed;
}

/**
 * Half rest sits ON TOP of the single staff line; whole rest hangs BELOW it
 * (Sightreading Factory / classical single-line rhythm practice).
 * Quarter & shorter rests stay centered on the line.
 */
function placeRhythmRestOnStaffLine(note, vexDur) {
    if (!note || !vexDur) return;
    const d = String(vexDur);
    if (!d.includes('r') && !(note.isRest && note.isRest())) return;
    try {
        if (typeof note.getKeyLine !== 'function' || typeof note.setKeyLine !== 'function') return;
        const base = note.getKeyLine(0);
        // VexFlow: higher key-line → higher on page (via getYForNote)
        // Half rest (and dotted half): rest body above the line
        if (d === 'hr' || d === 'hdr' || d.startsWith('hr')) {
            note.setKeyLine(0, base + 0.55);
        } else if (d === 'wr' || d === 'wdr' || d.startsWith('wr')) {
            // Whole rest: hang under the line
            note.setKeyLine(0, base - 0.55);
        }
        // qr / qdr / 8r / 8dr / 16r: leave centered on the line
    } catch (e) {}
}

/**
 * Plan staff lines (SRF-like) with protected answer space:
 *  1. Prefer ~4 measures/line at comfortable scale
 *  2. If page full → denser horizontal pack (5–6 bars), then smaller notes
 *  3. NEVER shrink answer gap below a hard floor
 *  4. If still over budget → split across multiple letter pages
 */
function renderOneLineWithVexFlow(renderDiv, countingSvg, timeSig, lineRhythms, startMeasureIndex, measuresThisLine, isCompound, showClefAndTime = true, layoutOpts = {}) {
    const VF = VexFlow;
    // Engraving scale (SRF-like: modest, not page-filling). Horizontal = full line width.
    const S = (layoutOpts && layoutOpts.verticalScale) || 0.88;
    const fullLineW = (layoutOpts && layoutOpts.lineWidth) || 640;
    // Writable gap below staff for counting answers (floor ~0.36")
    const answerGapPx = (layoutOpts && layoutOpts.answerGapPx) || Math.round(0.42 * 96);
    const rowHeight = (layoutOpts && layoutOpts.rowHeight) || null;
    const isLastMusicLine = !!(layoutOpts && layoutOpts.isLastMusicLine);
    
    // Curriculum level (layout/spacing). Beaming uses per-measure content, not this alone.
    const levelEl = document.getElementById('dropdownLevel');
    const curLevel = (layoutOpts && layoutOpts.wsLevel) || (levelEl ? parseInt(levelEl.value) || 1 : 1);

    // Odd meters (5/8, 7/8): beam eighths/16ths by the felt GROUP (e.g. 2+3), not by quarter.
    const isOddMeter = (timeSig === '5/8' || timeSig === '7/8');
    const oddBeatUnits = (layoutOpts && layoutOpts.oddBeatUnits) ||
        (timeSig === '5/8' ? [4, 6] : (timeSig === '7/8' ? [4, 4, 6] : null));
    
    /** True if measure needs simple-meter L4-style mixed 8th/16th beaming */
    const measureNeedsMixedBeams = (evs) => {
        if (!evs || !evs.length) return false;
        let has16 = false, has8 = false, hasD8 = false;
        for (const ev of evs) {
            if (!ev || eventIsRest(ev)) continue;
            if (ev.key === 'sixteenth' || ev.vexDur === '16') has16 = true;
            if (ev.key === 'eighth' || (ev.vexDur === '8' && !(ev.dots > 0))) has8 = true;
            if (ev.key === 'dotted8th') hasD8 = true;
        }
        return has16 || hasD8 || (has8 && has16);
    };
    /** Compound: any short values that should share a beam within a big beat */
    const measureNeedsCompoundBeams = (evs) => {
        if (!evs || !evs.length) return false;
        return evs.some(ev => ev && !eventIsRest(ev) &&
            (ev.key === 'sixteenth' || ev.key === 'dotted8th' || ev.key === 'eighth' ||
             ev.vexDur === '16' || (ev.vexDur === '8' && !(ev.dots > 0))));
    };
    /** Cut time: beam 8ths (and any custom short values) by content */
    const measureNeedsCutBeams = (evs) => {
        if (!evs || !evs.length) return false;
        return evs.some(ev => ev && !eventIsRest(ev) &&
            (ev.key === 'eighth' || ev.key === 'sixteenth' || ev.key === 'dotted8th'));
    };
    
    // FULL horizontal width — music uses the staff line; generous end pad keeps last notes
    // inside the printable area (browser print was cropping the far right).
    const targetLineWidth = fullLineW;
    const END_NOTE_PAD = 34; // ~0.35" breathing room before barline / print margin
    const LEFT_PAD_CLEF = 50;
    const LEFT_PAD_NORMAL = 14;
    
    const dynamicWidths = calculateDynamicMeasureWidths(lineRhythms, targetLineWidth, 128);
    
    // Force the sum of widths on the line to be exactly the hard target.
    let sumW = dynamicWidths.reduce((a, b) => a + b, 0);
    if (dynamicWidths.length > 0) {
        dynamicWidths[dynamicWidths.length - 1] += (targetLineWidth - sumW);
    }
    
    // Clef first-measure extra (sum-preserving: take from last when possible).
    if (showClefAndTime && dynamicWidths.length > 0) {
        const extraForClefTs = 40;
        dynamicWidths[0] += extraForClefTs;
        if (dynamicWidths.length > 1) {
            const lastIdx = dynamicWidths.length - 1;
            dynamicWidths[lastIdx] = Math.max(100, dynamicWidths[lastIdx] - extraForClefTs);
        }
        const sum2 = dynamicWidths.reduce((a, b) => a + b, 0);
        dynamicWidths[dynamicWidths.length - 1] += (targetLineWidth - sum2);
    }
    
    const totalWidth = dynamicWidths.reduce((sum, w) => sum + w, 0) + 10;
    const svgW = Math.max(totalWidth + 6, fullLineW + 6);
    
    const renderer = new VF.Renderer(renderDiv, VF.Renderer.Backends.SVG);
    // Single-line staff + answer gap must fit inside the row height
    const lineH = rowHeight || (Math.round(38 * S) + answerGapPx + 10);
    renderer.resize(svgW, lineH);
    
    const ctx = renderer.getContext();
    
    // SINGLE-LINE rhythm staff (Sightreading Factory style): one visible line through noteheads.
    // Internally keep 5 lines so VexFlow barlines/clef/time-sig/getYForNote stay correct;
    // only the middle line is drawn (see setConfigForLine below).
    // Smaller spacing → smaller noteheads/stems (SRF notes are compact).
    const lineSpacingPx = Math.max(6.5, 7.5 * S);
    // Extra top inset so stems/beams clear previous system's answer band + header on line 1
    const staveY = Math.max(6, Math.round(8 * S));
    // Height through bottom of 5-line geometry (barlines span full height; only mid line visible)
    const staveH = Math.round(lineSpacingPx * 5 + 10);
    
    // Make SVG fluid so print/preview never crops the right edge
    try {
        const svgEl = renderDiv.querySelector('svg');
        if (svgEl) {
            svgEl.setAttribute('viewBox', `0 0 ${svgW} ${lineH}`);
            svgEl.setAttribute('width', '100%');
            svgEl.setAttribute('height', String(lineH));
            svgEl.style.width = '100%';
            svgEl.style.height = lineH + 'px';
            svgEl.style.maxWidth = '100%';
            svgEl.style.overflow = 'visible';
        }
    } catch (e) {}
    
    const staves = [];
    const voices = [];
    const allBeams = [];
    const measureNoteData = [];
    
    let x = 4;
    
    let tupletGroups = [];
    
    // b/4 sits on middle staff line (index 2) — the only visible line
    const RHYTHM_KEY = 'b/4';
    
    // First pass: create all staves (with proper padding)
    for (let i = 0; i < measuresThisLine; i++) {
      try {
        const mWidth = dynamicWidths[i];
        const events = lineRhythms[i] || [];   // declare early so it is available for both modes
        
        // VexFlow 5 option names are camelCase. snake_case (num_lines) is silently ignored → 5 lines.
        // L4–L6 need more room above for beams / tuplet brackets
        const spaceAbove = curLevel >= 5 ? Math.max(2.8, 3.6 * S)
            : curLevel >= 4 ? Math.max(2.5, 3.3 * S)
            : Math.max(2.2, 3.0 * S);
        const stave = new VF.Stave(x, staveY, mWidth, {
            numLines: 5,
            spacingBetweenLinesPx: lineSpacingPx,
            spaceAboveStaffLn: spaceAbove,
            spaceBelowStaffLn: Math.max(1.2, 1.6 * S)
        });
        // Hide all but the middle line → single-line rhythm staff, barlines still full height
        try {
            [0, 1, 3, 4].forEach(ln => stave.setConfigForLine(ln, { visible: false }));
        } catch (e) {
            // Fallback if API differs
            try { stave.setNumLines(1); } catch (e2) {}
        }
        
        const leftPad = (i === 0 && showClefAndTime) ? LEFT_PAD_CLEF : LEFT_PAD_NORMAL;
        
        if (i === 0 && showClefAndTime) {
            stave.addClef('percussion');
            stave.addTimeSignature(timeSig);
            // Slightly separate numerator / denominator so they don't visually collide
            try {
                const mods = (typeof stave.getModifiers === 'function') ? stave.getModifiers() : [];
                mods.forEach(m => {
                    if (!m || typeof m.topLine !== 'number' || typeof m.bottomLine !== 'number') return;
                    // TimeSignature defaults topLine=1, bottomLine=3 — widen vertical gap
                    const cat = (typeof m.getCategory === 'function') ? m.getCategory() : '';
                    if (cat === 'TimeSignature' || m.timeSpec != null || (m.topText && m.botText)) {
                        m.topLine = 0.55;
                        m.bottomLine = 3.45;
                    }
                });
            } catch (e) {}
        }
        
        // Final double barline (end bar) on the last measure of the last system
        if (isLastMusicLine && i === measuresThisLine - 1) {
            try {
                const endType = (VF.BarlineType && VF.BarlineType.END != null)
                    ? VF.BarlineType.END
                    : (VF.Barline && VF.Barline.type && VF.Barline.type.END);
                if (endType != null && typeof stave.setEndBarType === 'function') {
                    stave.setEndBarType(endType);
                }
            } catch (e) {}
        }
        
        // Note start is inset from the left barline; content must end END_NOTE_PAD before right barline.
        stave.setNoteStartX(x + leftPad);
        stave.setContext(ctx).draw();
        staves.push(stave);
        
        // HARD ceiling for formatter: notes + stems + flags + dots must fit entirely left of the barline.
        // This is the permanent fix for notes past the right margin.
        const effectiveContentWidth = Math.max(40, mWidth - leftPad - END_NOTE_PAD);
        
        // Build notes (write-the-counting worksheets)
        const staveNotes = [];
        // Maps each staveNotes index → source event index (triplets expand 1 event → 3 notes)
        const noteSourceEvent = [];
        // staveNotes indices that belong to a triplet (must NOT be re-beamed by L4 logic)
        const tripletNoteIndices = new Set();
        // Tuplets must be created BEFORE format so VexFlow shortens their ticks
        // (3 eighths in time of 2 = 1 beat, not 1.5). Otherwise notes overflow past the barline.
        const measureTuplets = [];
        
        {
            events.forEach((ev, evIdx) => {
                if (ev.key && String(ev.key).includes('Triplet')) {
                    // One logical beat (or half-beat for 16th trips): 3 notes in the time of 2
                    const isQuarterTrip = ev.key === 'quarterTriplet';
                    const is16Trip = ev.key === 'sixteenthTriplet';
                    const dur = isQuarterTrip ? 'q' : (is16Trip ? '16' : '8');
                    const notes = [];
                    for (let ti = 0; ti < 3; ti++) {
                        const note = new VF.StaveNote({
                            keys: [RHYTHM_KEY],
                            duration: dur,
                            autoStem: false,
                            clef: 'percussion'
                        });
                        note.setStemDirection(VF.Stem.UP);
                        // Mark so general beaming never treats these as plain 8ths
                        note.__isTripletNote = true;
                        note.__tripletKey = ev.key;
                        tripletNoteIndices.add(staveNotes.length);
                        noteSourceEvent.push(evIdx);
                        staveNotes.push(note);
                        notes.push(note);
                    }
                    // CRITICAL: register Tuplet BEFORE format so tick math = 1 beat for 8th triplets
                    // (3×8th without tuplet = 1.5 beats → notes spill past barline into next measure)
                    try {
                        // VexFlow 5: numNotes / notesOccupied (camelCase)
                        const tuplet = new VF.Tuplet(notes, {
                            numNotes: 3,
                            notesOccupied: 2,
                            bracketed: true,
                            ratioed: false
                        });
                        measureTuplets.push(tuplet);
                        tupletGroups.push({ notes, key: ev.key, beam: !isQuarterTrip, tuplet });
                    } catch (e) {
                        console.warn('[RhythmGen] tuplet create failed', e);
                        tupletGroups.push({ notes, key: ev.key, beam: !isQuarterTrip });
                    }
                    // Beam is created AFTER format (below) so VexFlow clears flags correctly.
                } else {
                    // Base duration (8, 8r, q, qr, h, hr, …) + Dot modifier for visible augmentation dots.
                    // Do NOT use native "8d"/"qd" codes alone — they set ticks but often draw no dot.
                    // Base duration only (h, q, 8, 8r, …). Visible dots via Dot.buildAndAttach.
                    // Native codes like "8d"/"qd" update ticks but often draw NO augmentation dot.
                    const vexDur = resolveVexDuration(ev);
                    const nDots = eventDotCount(ev);
                    const note = new VF.StaveNote({
                        keys: [RHYTHM_KEY],
                        duration: vexDur,
                        autoStem: false,
                        clef: 'percussion'
                    });
                    note.setStemDirection(VF.Stem.UP);
                    // Half rest on top of line; whole rest hanging below (SRF style)
                    if (ev.isRest || eventIsRest(ev)) placeRhythmRestOnStaffLine(note, vexDur);
                    
                    if (nDots > 0) {
                        try {
                            VF.Dot.buildAndAttach([note], { all: true });
                            if (nDots > 1) VF.Dot.buildAndAttach([note], { all: true });
                        } catch (e) {
                            console.warn('[RhythmGen] Dot.attach failed', e);
                        }
                    }
                    noteSourceEvent.push(evIdx);
                    staveNotes.push(note);
                }
            });
        }
        
        // Create voice
        const [numB, beatVal] = timeSig.split('/').map(Number);
        const voice = new VF.Voice({ numBeats: numB || 4, beatValue: beatVal || 4 });
        voice.setMode(VF.Voice.Mode.SOFT);
        if (staveNotes.length > 0) voice.addTickables(staveNotes);
        
        // === Format this measure INSIDE the stave (hard right boundary) ===
        // Tuplets already registered → three 8th-triplet notes occupy 1 quarter beat of ticks.
        // VexFlow format() can still overflow if minSpacing × noteCount > available width;
        // we retry with tighter spacing and verify the last note stays left of the barline.
        if (staveNotes.length > 0) {
            staveNotes.forEach(n => {
                try { n.setStave(stave); } catch (e) {}
            });
            
            const noteCount = staveNotes.length;
            const hasTriplets = staveNotes.some(n => n && n.__isTripletNote);
            const fineGlyphs = staveNotes.filter(n => {
                try {
                    const d = n.getDuration ? n.getDuration() : '';
                    return d === '16' || d === '16r';
                } catch (e) { return false; }
            }).length;
            // Available room from note-start to barline (authoritative for this stave)
            const noteStartX = (typeof stave.getNoteStartX === 'function')
                ? stave.getNoteStartX()
                : (stave.getX() + leftPad);
            const staveRight = stave.getX() + stave.getWidth();
            // Extra end pad when triplets or many 16ths are present
            const endPad = hasTriplets ? Math.max(END_NOTE_PAD, 28)
                : (fineGlyphs >= 6 ? Math.max(END_NOTE_PAD, 26) : END_NOTE_PAD);
            const hardLimit = staveRight - endPad;
            let targetWidth = Math.max(40, hardLimit - noteStartX);
            
            // OUTSIDE buffer only: pad the NEIGHBOR notes (not the triplet notes themselves).
            // Padding the triplet notes' left/rightDisplacedHeadPx stretched the "3" bracket
            // away from the heads — the opposite of what we want. Bracket stays tight to
            // the three notes; space lives between the group and adjacent material.
            const OUTSIDE_PAD = hasTriplets ? 16 : (fineGlyphs >= 4 ? 12 : 11);
            tupletGroups.forEach(group => {
                if (!group.notes || group.notes.length !== 3) return;
                const i0 = staveNotes.indexOf(group.notes[0]);
                const i1 = staveNotes.indexOf(group.notes[group.notes.length - 1]);
                if (i0 < 0 || i1 < 0) return;
                // Clear any prior inner displacement on the triplet notes (keep bracket snug)
                group.notes.forEach(n => {
                    try {
                        n.leftDisplacedHeadPx = 0;
                        n.rightDisplacedHeadPx = 0;
                        if (n.render_options) n.render_options.left_shift = 0;
                    } catch (e) {}
                });
                // Space BEFORE the triplet group → right pad on previous note
                if (i0 > 0) {
                    const prev = staveNotes[i0 - 1];
                    try {
                        prev.rightDisplacedHeadPx = (prev.rightDisplacedHeadPx || 0) + OUTSIDE_PAD;
                    } catch (e) {}
                }
                // Space AFTER the triplet group → left pad on following note
                if (i1 + 1 < staveNotes.length) {
                    const next = staveNotes[i1 + 1];
                    try {
                        next.leftDisplacedHeadPx = (next.leftDisplacedHeadPx || 0) + OUTSIDE_PAD;
                    } catch (e) {}
                }
            });
            
            // Duration-proportional spacing (SRF style): VexFlow 5 uses softmax on tick widths.
            // Lower factor when dense → more even gaps (16ths/triplets don't starve).
            const tripCount = staveNotes.filter(n => n && n.__isTripletNote).length;
            const baseSoftmax = (fineGlyphs + tripCount) >= 10 ? 9
                : (fineGlyphs + tripCount) >= 6 ? 11
                : fineGlyphs >= 4 ? 12
                : noteCount >= 10 ? 13
                : 17;
            
            const staveRightLimit = hardLimit;
            const maxNoteExtent = () => {
                let maxR = 0;
                staveNotes.forEach(n => {
                    try {
                        let ax = 0;
                        if (typeof n.getAbsoluteX === 'function') ax = n.getAbsoluteX();
                        else if (typeof n.getX === 'function') ax = n.getX();
                        // notehead extent only (bracket is drawn above, not wider than heads when snug)
                        if (ax + 12 > maxR) maxR = ax + 12;
                    } catch (e) {}
                });
                return maxR;
            };
            
            for (let attempt = 0; attempt < 6; attempt++) {
                // softmaxFactor is a Formatter constructor option in VF5 (not format())
                const sm = Math.max(6.5, baseSoftmax - attempt * 1.2);
                const singleFormatter = new VF.Formatter({ softmaxFactor: sm });
                singleFormatter.joinVoices([voice]);
                try {
                    if (typeof voice.setSoftmaxFactor === 'function') voice.setSoftmaxFactor(sm);
                } catch (e) {}
                // Prefer using full target width; only shrink slightly on retry
                const tryWidth = Math.max(48, targetWidth - attempt * 4);
                singleFormatter.format([voice], tryWidth, {
                    alignRests: true
                });
                if (maxNoteExtent() <= staveRightLimit) break;
            }

            // POST-FORMAT REVIEW: spread stacked notes/flags/dots, then soft-compress only surplus
            // if we still overflow. Prefer readable gaps over a hard uniform scale (which stacks glyphs).
            try {
                resolveRenderedNoteCollisions(
                    staveNotes, noteSourceEvent, events, noteStartX, staveRightLimit
                );
            } catch (e) {
                console.warn('[RhythmGen] collision review failed', e);
            }
            
            // HARD CLAMP (last resort only): if anything still past the barline after collision
            // review, scale into the legal range — but only when still over by a few px.
            const extent = maxNoteExtent();
            if (extent > staveRightLimit + 2 && staveNotes.length > 1) {
                const origin = noteStartX;
                const usable = Math.max(24, staveRightLimit - origin);
                const span = Math.max(1, extent - origin);
                const scale = Math.min(1, usable / span);
                // Never compress denser than ~78% — better a slight overshoot than a collision pile
                const safeScale = Math.max(0.78, scale);
                if (safeScale < 0.999) {
                    staveNotes.forEach(n => {
                        try {
                            if (typeof n.getAbsoluteX === 'function' && typeof n.setX === 'function') {
                                const ax = n.getAbsoluteX();
                                const newAx = origin + (ax - origin) * safeScale;
                                const curX = (typeof n.getX === 'function') ? n.getX() : 0;
                                const curAx = ax;
                                if (n.getTickContext && n.getTickContext()) {
                                    const tc = n.getTickContext();
                                    if (typeof tc.setX === 'function') {
                                        tc.setX(tc.getX() + (newAx - curAx));
                                    } else {
                                        n.setX(curX + (newAx - curAx));
                                    }
                                } else {
                                    n.setX(curX + (newAx - curAx));
                                }
                            }
                        } catch (e) {}
                    });
                    // Re-enforce min gaps after scale (scale can re-stack short runs)
                    try {
                        resolveRenderedNoteCollisions(
                            staveNotes, noteSourceEvent, events, noteStartX, staveRightLimit
                        );
                    } catch (e2) {}
                }
            }
            
            // Beam 8th/16th triplets AFTER format so flags are suppressed (no flag+beam double).
            // Each triplet group stays entirely inside this measure (never across barlines).
            tupletGroups.forEach(group => {
                if (!group.beam || !group.notes || group.notes.length !== 3) return;
                // Only beam groups whose notes belong to this measure's staveNotes
                if (group.notes[0] && staveNotes.indexOf(group.notes[0]) >= 0) {
                    try {
                        group.notes.forEach(n => {
                            try {
                                if (n.render_options) n.render_options.draw_flag = false;
                            } catch (e) {}
                        });
                        allBeams.push(new VF.Beam(group.notes));
                    } catch (e) {
                        console.warn('[RhythmGen] triplet beam failed', e);
                    }
                }
            });
        }
        
        voices.push(voice);
        
        // Beaming for compound meters: manually group 8ths in exact sets of 3 (basic packages).
        // Skip when measure has 16ths/dotted8 — mixed big-beat beamer handles those.
        if (isCompound && !measureNeedsCompoundBeams(events)) {
            // Beam groups of exactly 3 consecutive 8th NOTES (never rests, never across other durations or rests).
            // Purely event-driven for robustness (avoids any staveNotes index issues with triplets etc).
            const eighthNoteJs = [];
            for (let j = 0; j < events.length; j++) {
                const ev = events[j];
                if (ev && !ev.isRest) {
                    const d = (ev.vexDur || '').toString();
                    if (d === '8' || ev.key === 'eighth') {
                        eighthNoteJs.push(j);
                    }
                }
            }
            let ii = 0;
            while (ii < eighthNoteJs.length) {
                // find run of consecutive j's (no gaps = no intervening notes/rests/other)
                let runStart = ii;
                let runEnd = ii + 1;
                while (runEnd < eighthNoteJs.length && eighthNoteJs[runEnd] === eighthNoteJs[runEnd - 1] + 1) {
                    runEnd++;
                }
                const runLen = runEnd - runStart;
                for (let g = 0; g < runLen; g += 3) {
                    const gl = Math.min(3, runLen - g);
                    if (gl >= 2) {
                        // Prefer sets of 3; leftover pairs of 2 also beam (never leave 2–3 flagged)
                        const idxs = [];
                        for (let k = 0; k < gl; k++) idxs.push(eighthNoteJs[runStart + g + k]);
                        let group = idxs.map(jj => staveNotes[jj]).filter((n, gi) => {
                            const jj = idxs[gi];
                            return n && !(events[jj] && events[jj].isRest);
                        });
                        if (group.length >= 2) {
                            try { allBeams.push(new VF.Beam(group)); } catch (e) {}
                        }
                    }
                }
                ii = runEnd;
            }
        } else if (!isCompound && timeSig === '2/2' && (curLevel >= 3 || measureNeedsCutBeams(events))) {
            // Cut time beaming — content-aware (custom Level 1 + 8ths still beams).
            // Break beam runs at half-note beat boundaries (every 8 sixteenth-units).
            try {
                const eventToNoteStart = [];
                const eventStartPos = [];
                let sn = 0;
                let posAcc = 0;
                for (let ei = 0; ei < events.length; ei++) {
                    eventToNoteStart[ei] = sn;
                    eventStartPos[ei] = posAcc;
                    if (events[ei] && events[ei].key && String(events[ei].key).includes('Triplet')) sn += 3;
                    else sn += 1;
                    posAcc += (events[ei] && events[ei].units) ? events[ei].units : 0;
                }
                const CUT_BEAT = 8;
                const isCutBeamable = (ev) =>
                    ev && !eventIsRest(ev) && !String(ev.key || '').includes('Triplet') &&
                    (ev.key === 'eighth' || ev.key === 'sixteenth' || ev.key === 'dotted8th');
                let ei = 0;
                while (ei < events.length) {
                    const ev = events[ei];
                    if (!isCutBeamable(ev)) {
                        ei++;
                        continue;
                    }
                    const startEi = ei;
                    const beatOf = (eIdx) => Math.floor(eventStartPos[eIdx] / CUT_BEAT);
                    const homeBeat = beatOf(ei);
                    while (ei < events.length && isCutBeamable(events[ei]) && beatOf(ei) === homeBeat) {
                        ei++;
                    }
                    // One beam for the contiguous short-value run inside this half-note beat
                    if (ei - startEi >= 2) {
                        const group = [];
                        for (let k = startEi; k < ei; k++) {
                            const n = staveNotes[eventToNoteStart[k]];
                            if (n && !n.__isTripletNote) group.push(n);
                        }
                        if (group.length >= 2) {
                            try { allBeams.push(new VF.Beam(group)); } catch (e) {}
                        }
                    }
                }
            } catch (cutBeamErr) {
                console.warn('[RhythmGen] cut-time beam failed', cutBeamErr);
            }
        } else if (isOddMeter && oddBeatUnits) {
            // Odd meter: beam beamable notes within each felt group (2 or 3 eighths).
            try {
                const eventToNoteStartO = [];
                const eventStartPosO = [];
                let snO = 0, posO = 0;
                for (let ei = 0; ei < events.length; ei++) {
                    eventToNoteStartO[ei] = snO;
                    eventStartPosO[ei] = posO;
                    if (events[ei] && events[ei].key && String(events[ei].key).includes('Triplet')) snO += 3;
                    else snO += 1;
                    posO += (events[ei] && events[ei].units) ? events[ei].units : 0;
                }
                const isShortNoteO = (ev) => ev && !eventIsRest(ev) && !String(ev.key || '').includes('Triplet') &&
                    (ev.key === 'eighth' || ev.key === 'sixteenth' || ev.key === 'dotted8th' ||
                     ev.vexDur === '16' || (ev.vexDur === '8' && !(ev.dots > 0)));
                const isShortRestO = (ev) => ev && eventIsRest(ev) && (ev.units > 0 && ev.units <= 3);
                const isVfRestO = (n) => { try { return !!(typeof n.isRest === 'function' ? n.isRest() : n.isRest); } catch (e) { return false; } };
                // group boundaries in sixteenth-units
                const bounds = [0];
                for (let g = 0; g < oddBeatUnits.length; g++) bounds.push(bounds[bounds.length - 1] + oddBeatUnits[g]);
                for (let g = 0; g < oddBeatUnits.length; g++) {
                    const gs = bounds[g], ge = bounds[g + 1];
                    const idxs = [];
                    for (let ei = 0; ei < events.length; ei++) {
                        if (eventStartPosO[ei] >= gs && eventStartPosO[ei] < ge && (isShortNoteO(events[ei]) || isShortRestO(events[ei]))) idxs.push(ei);
                    }
                    let lo = 0; while (lo < idxs.length && isShortRestO(events[idxs[lo]])) lo++;
                    let hi = idxs.length - 1; while (hi >= lo && isShortRestO(events[idxs[hi]])) hi--;
                    if (hi - lo + 1 < 2) continue;
                    const full = idxs.slice(lo, hi + 1).map(ei => staveNotes[eventToNoteStartO[ei]]).filter(n => n && !n.__isTripletNote);
                    const notesOnly = full.filter(n => n && !isVfRestO(n));
                    if (notesOnly.length < 2) continue;
                    try {
                        const beam = new VF.Beam(notesOnly);
                        if (beam.renderOptions) beam.renderOptions.showStemlets = false;
                        const breakAt = [];
                        for (let i = 0; i < notesOnly.length - 1; i++) {
                            const a = full.indexOf(notesOnly[i]), b = full.indexOf(notesOnly[i + 1]);
                            if (a < 0 || b < 0 || b <= a + 1) continue;
                            let restBetween = false;
                            for (let j = a + 1; j < b; j++) { if (isVfRestO(full[j])) { restBetween = true; break; } }
                            if (restBetween) breakAt.push(i);
                        }
                        if (breakAt.length && typeof beam.breakSecondaryAt === 'function') beam.breakSecondaryAt(breakAt);
                        allBeams.push(beam);
                    } catch (e) {}
                }
            } catch (oddBeamErr) { console.warn('[RhythmGen] odd beam failed', oddBeamErr); }
        } else if (!isCompound && timeSig !== '2/2' && !measureNeedsMixedBeams(events)) {
            // Simple meter with pure 8ths (no 16ths/dotted8): beat-aware beaming for ALL levels.
            // CRITICAL: old logic only beamed runs of 4 or leftover pairs of 2 — runs of 3
            // consecutive 8ths got three separate flags. Beam every 2+ 8ths that *start*
            // in the same quarter-beat (max two 8ths per beat in simple meter).
            // Lone 8th after dotted-Q (syncopation) stays flagged — it starts alone in its beat.
            try {
                const eventToNoteStart8 = [];
                const eventStartPos8 = [];
                let sn8 = 0;
                let pos8 = 0;
                for (let ei = 0; ei < events.length; ei++) {
                    eventToNoteStart8[ei] = sn8;
                    eventStartPos8[ei] = pos8;
                    if (events[ei] && events[ei].key && String(events[ei].key).includes('Triplet')) sn8 += 3;
                    else sn8 += 1;
                    pos8 += (events[ei] && events[ei].units) ? events[ei].units : 0;
                }
                const isPlainEighth = (ev) =>
                    ev && !eventIsRest(ev) && ev.key === 'eighth' &&
                    !(ev.dots > 0) && !String(ev.key || '').includes('Triplet');
                let ei8 = 0;
                while (ei8 < events.length) {
                    if (!isPlainEighth(events[ei8])) {
                        ei8++;
                        continue;
                    }
                    const homeBeat = Math.floor(eventStartPos8[ei8] / 4);
                    const group = [];
                    let j = ei8;
                    while (j < events.length && isPlainEighth(events[j]) &&
                           Math.floor(eventStartPos8[j] / 4) === homeBeat) {
                        const n = staveNotes[eventToNoteStart8[j]];
                        if (n && !n.__isTripletNote) group.push(n);
                        j++;
                    }
                    if (group.length >= 2) {
                        try { allBeams.push(new VF.Beam(group)); } catch (e) {}
                    }
                    // If we somehow have 3+ in one beat (shouldn't in simple), already beamed as one group
                    ei8 = Math.max(j, ei8 + 1);
                }
            } catch (e8beam) {
                console.warn('[RhythmGen] simple 8th beam failed', e8beam);
            }
        }
        // L3-only 16th packs: only when curriculum is L3 and measure has no mixed 8th+16th
        // (mixed content uses the beat-aware beamer below with correct event→note mapping)
        if (!isCompound && !isOddMeter && curLevel === 3 && !measureNeedsMixedBeams(events)) {
            const eventToNoteStartL3 = [];
            let snL3 = 0;
            for (let ei = 0; ei < events.length; ei++) {
                eventToNoteStartL3[ei] = snL3;
                if (events[ei] && events[ei].key && String(events[ei].key).includes('Triplet')) snL3 += 3;
                else snL3 += 1;
            }
            let ei = 0;
            while (ei < events.length) {
                if (events[ei] && events[ei].key === 'sixteenth' && !eventIsRest(events[ei])) {
                    const run = [ei];
                    let t = ei + 1;
                    while (t < events.length && events[t] && events[t].key === 'sixteenth' && !eventIsRest(events[t])) {
                        run.push(t);
                        t++;
                    }
                    for (let g = 0; g + 4 <= run.length; g += 4) {
                        const group = run.slice(g, g + 4)
                            .map(eidx => staveNotes[eventToNoteStartL3[eidx]])
                            .filter(n => n && !n.__isTripletNote);
                        if (group.length === 4) {
                            try { allBeams.push(new VF.Beam(group)); } catch (e) {}
                        }
                    }
                    // Beam leftover pairs of 2
                    const rem = run.length % 4;
                    if (rem === 2) {
                        const base = run.length - 2;
                        const group = [run[base], run[base + 1]]
                            .map(eidx => staveNotes[eventToNoteStartL3[eidx]])
                            .filter(n => n && !n.__isTripletNote);
                        if (group.length === 2) {
                            try { allBeams.push(new VF.Beam(group)); } catch (e) {}
                        }
                    }
                    ei = t;
                } else {
                    ei++;
                }
            }
        }
        // Compound beaming: one primary beam per big beat (6u / dotted-quarter pulse).
        // Style (like professional 6/8 engraving):
        //   • Beam ALL short notes within a big beat together
        //   • Beam OVER internal rests (beams continue across mid-group rests)
        //   • Do NOT include leading or trailing rests in the beam (rest at start/end of the
        //     3-pulse group stands alone — see e.g. rest then beamed 16ths)
        if (isCompound && (curLevel >= 1 || measureNeedsCompoundBeams(events))) {
            try {
                // Short values that can sit under a primary beam within a big beat
                const isCompShortNote = (ev) =>
                    ev && !eventIsRest(ev) && !String(ev.key || '').includes('Triplet') &&
                    (ev.key === 'eighth' || ev.key === 'sixteenth' || ev.key === 'dotted8th' ||
                     ev.vexDur === '16' || (ev.vexDur === '8' && !(ev.dots > 0)));
                const isCompShortRest = (ev) =>
                    ev && eventIsRest(ev) &&
                    (ev.key === '8thRest' || ev.key === '16thRest' || ev.key === 'dotted8thRest' ||
                     ev.vexDur === '8r' || ev.vexDur === '16r' ||
                     (ev.units > 0 && ev.units <= 3));
                const isCompShortAny = (ev) => isCompShortNote(ev) || isCompShortRest(ev);

                const eventToNoteStart = [];
                const eventStartPos = [];
                let snC = 0;
                let posAcc = 0;
                for (let ei = 0; ei < events.length; ei++) {
                    eventToNoteStart[ei] = snC;
                    eventStartPos[ei] = posAcc;
                    if (events[ei] && events[ei].key && String(events[ei].key).includes('Triplet')) snC += 3;
                    else snC += 1;
                    posAcc += (events[ei] && events[ei].units) ? events[ei].units : 0;
                }

                const BIG = 6;
                // Bucket event indices by big-beat index
                const byBeat = new Map(); // beatIndex → [eventIdx, ...]
                for (let ei = 0; ei < events.length; ei++) {
                    const ev = events[ei];
                    if (!ev || !isCompShortAny(ev)) continue;
                    // Assign by start position; skip if value would span past a long-note boundary
                    // (we only include shorts; long notes are never in byBeat)
                    const b = Math.floor(eventStartPos[ei] / BIG);
                    if (!byBeat.has(b)) byBeat.set(b, []);
                    byBeat.get(b).push(ei);
                }

                byBeat.forEach((idxs) => {
                    if (!idxs || idxs.length < 1) return;
                    // Sort by position (should already be ordered)
                    idxs.sort((a, b) => a - b);

                    // Strip leading rests (rest at very start of the 3-pulse group)
                    let lo = 0;
                    while (lo < idxs.length && isCompShortRest(events[idxs[lo]])) lo++;
                    // Strip trailing rests (rest at very end of the 3-pulse group)
                    let hi = idxs.length - 1;
                    while (hi >= lo && isCompShortRest(events[idxs[hi]])) hi--;
                    if (hi - lo + 1 < 1) return;

                    const midIdxs = idxs.slice(lo, hi + 1);
                    // Need at least two notes (rests alone don't form a beam)
                    const noteCount = midIdxs.filter(i => isCompShortNote(events[i])).length;
                    if (noteCount < 2) return;

                    const group = midIdxs.map(i => staveNotes[eventToNoteStart[i]])
                        .filter(n => n && !n.__isTripletNote);
                    if (group.length < 2) return;

                    // Force ONE primary beam for the whole dotted-quarter beat.
                    //
                    // Critical engraving rule for internal rests (esp. 16th rests):
                    //   • Primary beam continues over the rest gap
                    //   • Secondary (16th) beam must NOT — only the bottom bar under the rest
                    //
                    // Including rests in the beam (beamRests) draws BOTH beam levels under the rest.
                    // breakSecondaryAt(restIndex) still ends the secondary ON the rest (still visible).
                    // Correct approach: beam NOTES ONLY so the primary spans the gap, then
                    // breakSecondaryAt(note before each rest gap) so secondary restarts after the rest.
                    const isVfRest = (n) => {
                        if (!n) return false;
                        try { return !!(typeof n.isRest === 'function' ? n.isRest() : n.isRest); }
                        catch (e) { return false; }
                    };
                    const makeCompoundBeam = (fullGroup) => {
                        // Preserve original order; beam only non-rests
                        const notesOnly = fullGroup.filter(n => n && !isVfRest(n));
                        if (notesOnly.length < 2) return null;
                        const beam = new VF.Beam(notesOnly);
                        try {
                            if (beam.renderOptions) beam.renderOptions.showStemlets = false;
                            // Break secondary beams wherever a rest sits between two beamed notes
                            // (indexes into notesOnly, not the full group).
                            const breakAt = [];
                            for (let i = 0; i < notesOnly.length - 1; i++) {
                                const a = fullGroup.indexOf(notesOnly[i]);
                                const b = fullGroup.indexOf(notesOnly[i + 1]);
                                if (a < 0 || b < 0 || b <= a + 1) continue;
                                let restBetween = false;
                                for (let j = a + 1; j < b; j++) {
                                    if (isVfRest(fullGroup[j])) { restBetween = true; break; }
                                }
                                if (restBetween) breakAt.push(i);
                            }
                            if (breakAt.length && typeof beam.breakSecondaryAt === 'function') {
                                beam.breakSecondaryAt(breakAt);
                            }
                        } catch (e) {}
                        return beam;
                    };
                    try {
                        const beam = makeCompoundBeam(group);
                        if (beam) {
                            allBeams.push(beam);
                        } else {
                            // Last resort: notes only without break logic
                            const notesOnly = midIdxs
                                .filter(i => isCompShortNote(events[i]))
                                .map(i => staveNotes[eventToNoteStart[i]])
                                .filter(n => n && !n.__isTripletNote);
                            if (notesOnly.length >= 2) allBeams.push(new VF.Beam(notesOnly));
                        }
                    } catch (e) {
                        try {
                            const notesOnly = midIdxs
                                .filter(i => isCompShortNote(events[i]))
                                .map(i => staveNotes[eventToNoteStart[i]])
                                .filter(n => n && !n.__isTripletNote);
                            if (notesOnly.length >= 2) allBeams.push(new VF.Beam(notesOnly));
                        } catch (e2) {}
                    }
                });
            } catch (compBeamErr) {
                console.warn('[RhythmGen] compound beam failed', compBeamErr);
            }
        }
        // Mixed 8th/16th beaming only when the measure actually has 16ths or dotted 8ths.
        // Pure-8th measures use the beat-aware beamer above (avoids double beams + 3-flag bugs).
        // Not gated by curriculum Level (custom L1 + 16ths must still beam).
        const useMixedBeams = staveNotes.length >= 2 && !isCompound && !isOddMeter && timeSig !== '2/2' &&
            measureNeedsMixedBeams(events);
        if (useMixedBeams) {
            // Beat-aware mixed beaming. NEVER beam triplet notes here (they already have
            // their own beam + tuplet, and 1 event → 3 staveNotes would corrupt index mapping).
            // Critical: two 16ths after a dotted quarter MUST share a beam (never two flags).
            const isL4BeamableEv = (ev) => {
                if (!ev || eventIsRest(ev)) return false;
                if (ev.key && String(ev.key).includes('Triplet')) return false;
                if (ev.key === 'sixteenth' || ev.key === 'eighth' || ev.key === 'dotted8th') return true;
                const d = (ev.vexDur || '').toString();
                return d === '16' || (d === '8' && !(ev.dots > 0) && !eventIsRest(ev));
            };

            try {
                // Map event index → starting staveNotes index (accounts for triplet expansion)
                const eventToNoteStart = [];
                let snCursor = 0;
                for (let ei = 0; ei < events.length; ei++) {
                    eventToNoteStart[ei] = snCursor;
                    if (events[ei].key && String(events[ei].key).includes('Triplet')) snCursor += 3;
                    else snCursor += 1;
                }

                let pos = 0;
                let i = 0;
                const beamedEv = new Set();

                while (i < events.length) {
                    const ev = events[i];
                    if (!isL4BeamableEv(ev)) {
                        pos += ev.units || 0;
                        i++;
                        continue;
                    }
                    const groupStartBeat = Math.floor(pos / 4);
                    const groupEvIdx = [];
                    let j = i;
                    let p = pos;
                    while (j < events.length && isL4BeamableEv(events[j])) {
                        // Only notes that *start* in this quarter-beat may share a beam
                        const noteBeat = Math.floor(p / 4);
                        if (noteBeat !== groupStartBeat) break;
                        groupEvIdx.push(j);
                        p += events[j].units || 0;
                        j++;
                    }
                    if (groupEvIdx.length >= 2) {
                        const group = groupEvIdx.map(ei => staveNotes[eventToNoteStart[ei]])
                            .filter(n => n && !n.__isTripletNote);
                        if (group.length >= 2) {
                            try {
                                allBeams.push(new VF.Beam(group));
                                groupEvIdx.forEach(ei => beamedEv.add(ei));
                            } catch (e) {}
                        }
                    }
                    if (groupEvIdx.length > 0) {
                        for (const ei of groupEvIdx) pos += events[ei].units || 0;
                        i = j;
                    } else {
                        pos += events[i].units || 0;
                        i++;
                    }
                }

                // Force-beam consecutive 16ths left unflagged — ONLY within the same quarter-beat
                // (never span beat boundaries; that caused beams running past the bar in 2/4 etc.)
                const eventStartPos = [];
                {
                    let pAcc = 0;
                    for (let ei = 0; ei < events.length; ei++) {
                        eventStartPos[ei] = pAcc;
                        pAcc += (events[ei] && events[ei].units) ? events[ei].units : 0;
                    }
                }
                let si = 0;
                while (si < events.length) {
                    if (events[si] && events[si].key === 'sixteenth' && !eventIsRest(events[si]) && !beamedEv.has(si)) {
                        const run = [si];
                        const homeBeat = Math.floor(eventStartPos[si] / 4);
                        let t = si + 1;
                        while (t < events.length && events[t] && events[t].key === 'sixteenth' &&
                               !eventIsRest(events[t]) && !beamedEv.has(t) &&
                               Math.floor(eventStartPos[t] / 4) === homeBeat) {
                            run.push(t);
                            t++;
                        }
                        if (run.length >= 2) {
                            const group = run.map(ei => staveNotes[eventToNoteStart[ei]]).filter(n => n && !n.__isTripletNote);
                            if (group.length >= 2) {
                                try {
                                    allBeams.push(new VF.Beam(group));
                                    run.forEach(ei => beamedEv.add(ei));
                                } catch (e) {}
                            }
                        }
                        si = t;
                    } else {
                        si++;
                    }
                }

                // Force-beam dotted8+16 / 16+dotted8 pairs (same beat only)
                for (let k = 0; k < events.length - 1; k++) {
                    if (beamedEv.has(k) || beamedEv.has(k + 1)) continue;
                    const a = events[k], b = events[k + 1];
                    if (!a || !b || eventIsRest(a) || eventIsRest(b)) continue;
                    const pairDotted8_16 = (a.key === 'dotted8th' && b.key === 'sixteenth');
                    const pair16_dotted8 = (a.key === 'sixteenth' && b.key === 'dotted8th');
                    if (!pairDotted8_16 && !pair16_dotted8) continue;
                    // Must start in the same quarter-beat
                    if (Math.floor(eventStartPos[k] / 4) !== Math.floor(eventStartPos[k + 1] / 4)) continue;
                    const group = [
                        staveNotes[eventToNoteStart[k]],
                        staveNotes[eventToNoteStart[k + 1]]
                    ].filter(n => n && !n.__isTripletNote);
                    if (group.length === 2) {
                        try {
                            allBeams.push(new VF.Beam(group));
                            beamedEv.add(k);
                            beamedEv.add(k + 1);
                        } catch (e) {}
                    }
                }
            } catch (beamErr) {
                console.warn('[RhythmGen] L4 simple beam failed', beamErr);
            }
        }
        
        // Track for counting / answer lines (noteSourceEvent lets callers map a
        // rendered notehead back to its source event for aligned syllable placement)
        let dataToStore = { staveNotes, events, realX: [], noteSourceEvent };
        
        measureNoteData.push(dataToStore);
        
        x += mWidth;
      } catch (measureErr) {
        // Keep rendering the rest of the line instead of blanking the whole line
        console.error('[RhythmGen] measure render failed on line slot', i, measureErr);
        try {
            // Ensure stave still advances so subsequent measures don't stack
            const mWidth = dynamicWidths[i] || 160;
            if (!staves[i]) {
                const stave = new VF.Stave(x, staveY, mWidth, { numLines: 5, spacingBetweenLinesPx: lineSpacingPx });
                try { [0, 1, 3, 4].forEach(ln => stave.setConfigForLine(ln, { visible: false })); } catch (e) {}
                stave.setContext(ctx).draw();
                staves.push(stave);
                voices.push(new VF.Voice({ numBeats: 4, beatValue: 4 }).setMode(VF.Voice.Mode.SOFT));
                measureNoteData.push({ staveNotes: [], events: lineRhythms[i] || [], realX: [] });
            }
            x += mWidth;
        } catch (e2) {
            x += (dynamicWidths[i] || 160);
        }
      }
    }
    
    // Draw voices (already individually formatted above)
    voices.forEach((voice, idx) => {
        if (voice.getTickables && voice.getTickables().length > 0) {
            voice.draw(ctx, staves[idx]);
        }
    });
    
    // Beams (including triplet beams created pre-format) — draw once
    allBeams.forEach(b => {
        try { b.setContext(ctx).draw(); } catch (e) {}
    });

    // Ties (within measure + across barline on same staff line). Flags from apply*Ties.
    // Drawn AFTER notes/beams so the curve sits cleanly on top.
    const drawStaveTie = (n0, n1) => {
        if (!n0 || !n1 || n0.__isTripletNote || n1.__isTripletNote) return;
        let tie = null;
        try {
            tie = new VF.StaveTie({
                firstNote: n0,
                lastNote: n1,
                firstIndexes: [0],
                lastIndexes: [0]
            });
        } catch (e1) {
            try {
                tie = new VF.StaveTie({
                    first_note: n0,
                    last_note: n1,
                    first_indices: [0],
                    last_indices: [0]
                });
            } catch (e2) {
                console.warn('[RhythmGen] StaveTie create failed', e2);
            }
        }
        if (tie) {
            try { tie.setContext(ctx).draw(); } catch (e3) {
                console.warn('[RhythmGen] StaveTie draw failed', e3);
            }
        }
    };

    try {
        // Within-measure ties
        for (let mi = 0; mi < measureNoteData.length; mi++) {
            const g = measureNoteData[mi];
            if (!g || !g.staveNotes || !g.events || g.events.length < 2) continue;
            const evs = g.events;
            const sns = g.staveNotes;
            // Map event index → starting staveNotes index (triplets expand 1→3)
            const eventToNoteStart = [];
            let sn = 0;
            for (let ei = 0; ei < evs.length; ei++) {
                eventToNoteStart[ei] = sn;
                if (evs[ei] && evs[ei].key && String(evs[ei].key).includes('Triplet')) sn += 3;
                else sn += 1;
            }
            for (let ei = 0; ei < evs.length - 1; ei++) {
                const a = evs[ei];
                const b = evs[ei + 1];
                if (!a || !b || !a.tieToNext || !b.tiedFromPrev) continue;
                if (eventIsRest(a) || eventIsRest(b)) continue;
                if (a.key && String(a.key).includes('Triplet')) continue;
                if (b.key && String(b.key).includes('Triplet')) continue;
                // Only draw if this pair is truly within-measure (next event is b, not across bar)
                // Across-barline: last of measure ties to first of next measure (handled below)
                const isLastOfMeasure = ei === evs.length - 1;
                if (isLastOfMeasure) continue;
                const n0 = sns[eventToNoteStart[ei]];
                const n1 = sns[eventToNoteStart[ei + 1]];
                drawStaveTie(n0, n1);
            }
        }

        // Across-barline ties (adjacent measures on this staff line)
        for (let mi = 0; mi < measureNoteData.length - 1; mi++) {
            const g0 = measureNoteData[mi];
            const g1 = measureNoteData[mi + 1];
            if (!g0 || !g1 || !g0.staveNotes || !g1.staveNotes) continue;
            const evs0 = g0.events || [];
            const evs1 = g1.events || [];
            if (!evs0.length || !evs1.length) continue;
            const lastEv = evs0[evs0.length - 1];
            const firstEv = evs1[0];
            if (!lastEv || !lastEv.tieToNext || !firstEv || !firstEv.tiedFromPrev) continue;
            if (eventIsRest(lastEv) || eventIsRest(firstEv)) continue;

            const n0 = g0.staveNotes[g0.staveNotes.length - 1];
            const n1 = g1.staveNotes[0];
            drawStaveTie(n0, n1);
        }
    } catch (tieErr) {
        console.warn('[RhythmGen] ties render failed', tieErr);
    }
    
    // Draw tuplet brackets/numbers only (tuplets already registered pre-format for tick math)
    tupletGroups.forEach(group => {
        const notes = Array.isArray(group) ? group : (group.notes || []);
        if (notes.length !== 3) return;
        try {
            if (group.tuplet) {
                group.tuplet.setContext(ctx).draw();
            } else {
                const tuplet = new VF.Tuplet(notes, {
                    numNotes: 3,
                    notesOccupied: 2
                });
                tuplet.setContext(ctx).draw();
            }
        } catch (e) {
            console.warn('[RhythmGen] tuplet draw failed', e);
        }
    });
    
    // Capture real absolute X for EVERY rendered note/rest (one answer line each).
    // Keep array aligned with staveNotes (push null if lookup fails, then interpolate).
    measureNoteData.forEach((group, gi) => {
        const stave = staves[gi];
        group.staveNotes.forEach(note => {
            let ax = null;
            try {
                if (typeof note.getAbsoluteX === 'function') ax = note.getAbsoluteX();
            } catch (e) {}
            if (ax == null || isNaN(ax)) {
                try {
                    const nx = (typeof note.getX === 'function') ? note.getX() : 0;
                    const ns = (stave && typeof stave.getNoteStartX === 'function')
                        ? stave.getNoteStartX()
                        : (stave ? stave.getX() + 20 : 20);
                    ax = ns + nx;
                } catch (e2) {}
            }
            group.realX.push((ax != null && !isNaN(ax)) ? ax : null);
        });
        // Interpolate any nulls between known neighbors
        const xs = group.realX;
        for (let i = 0; i < xs.length; i++) {
            if (xs[i] != null) continue;
            let prev = i - 1;
            while (prev >= 0 && xs[prev] == null) prev--;
            let next = i + 1;
            while (next < xs.length && xs[next] == null) next++;
            if (prev >= 0 && next < xs.length) {
                const t = (i - prev) / (next - prev);
                xs[i] = xs[prev] + t * (xs[next] - xs[prev]);
            } else if (prev >= 0) {
                xs[i] = xs[prev] + 14;
            } else if (next < xs.length) {
                xs[i] = xs[next] - 14;
            } else if (stave) {
                xs[i] = stave.getX() + stave.getWidth() / 2;
            } else {
                xs[i] = 40;
            }
        }
    });
    
    // Re-assert fluid SVG sizing after VexFlow finish (prevents print right-edge crop).
    // Must reuse the same svgW/lineH the drawing was laid out in — NOT re-derive it from
    // svgEl.width.baseVal.value. That property resolves a percentage width against the
    // element's current CSS box, so on a narrow (e.g. mobile) container it comes back as
    // the small rendered pixel width, not the wide coordinate space notes were placed in.
    // Feeding that back into viewBox shrinks the coordinate system to match the narrow
    // box without moving any already-placed glyphs, clipping everything past that width.
    try {
        const svgEl = renderDiv.querySelector('svg');
        if (svgEl) {
            svgEl.setAttribute('viewBox', `0 0 ${svgW} ${lineH}`);
            svgEl.setAttribute('width', '100%');
            svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
            svgEl.style.width = '100%';
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = lineH + 'px';
            svgEl.style.overflow = 'visible';
        }
    } catch (e) {}
    
    // Draw counting lines + measure numbers using the real rendered positions.
    // (Rhythm Board passes countingSvg=null and drives its own pulse strip instead.)
    if (countingSvg) {
        addCountingLinesWithRealPositions(countingSvg, staves, measureNoteData, staveY, staveH, answerGapPx, startMeasureIndex);
    }
    // Rhythm Board addition: hand back geometry so callers can flash real noteheads.
    return { staves: staves, measureNoteData: measureNoteData, svgW: svgW, lineH: lineH, staveY: staveY, staveH: staveH, dynamicWidths: dynamicWidths };
}

function addCountingLinesWithRealPositions(countingSvg, staves, measureNoteData, staveY, staveHeight, answerGapPx, startMeasureIndex) {
    countingSvg.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    
    const isDrawMode = false; // draw-in mode removed
    // Modest writable gap below the bottom staff line (~0.22")
    const gap = (answerGapPx != null && answerGapPx > 0) ? answerGapPx : Math.round(0.22 * 96);
    const measureStart = (startMeasureIndex != null && !isNaN(startMeasureIndex)) ? startMeasureIndex : 0;
    
    // One answer line per rendered note/rest head (realX includes each triplet notehead)
    const buildAnswerSlots = (data, stave) => {
        const events = data.events || [];
        const realXs = data.realX || [];
        const syllables = data.syllables || [];
        const slots = [];
        
        if (realXs.length > 0) {
            realXs.forEach((x) => {
                if (x == null || isNaN(x)) return;
                slots.push({ x, syllable: null });
            });
            if (isDrawMode && syllables.length && data.staveNotes && data.staveNotes.length) {
                let sn = 0;
                events.forEach((ev, ei) => {
                    const nNotes = (ev.key && String(ev.key).includes('Triplet')) ? 3 : 1;
                    if (slots[sn] && syllables[ei]) slots[sn].syllable = syllables[ei];
                    sn += nNotes;
                });
            } else if (isDrawMode && syllables.length === slots.length) {
                slots.forEach((s, i) => { s.syllable = syllables[i]; });
            }
            return slots;
        }
        
        // Fallback: blank staff (Draw mode) — expand triplets to 3 slots
        if (events.length === 0) return slots;
        const sx = stave.getX ? stave.getX() : 22;
        const w = stave.getWidth ? stave.getWidth() : 140;
        let totalSlots = 0;
        events.forEach(ev => {
            totalSlots += (ev.key && String(ev.key).includes('Triplet')) ? 3 : 1;
        });
        const step = (w - 44) / Math.max(1, totalSlots);
        let slotI = 0;
        events.forEach((ev, ei) => {
            const n = (ev.key && String(ev.key).includes('Triplet')) ? 3 : 1;
            for (let k = 0; k < n; k++) {
                slots.push({
                    x: sx + 22 + (slotI * step) + (step / 2),
                    syllable: (isDrawMode && k === 0) ? (syllables[ei] || null) : null
                });
                slotI++;
            }
        });
        return slots;
    };
    
    // Determine SVG height from parent row so answer lines stay inside the visible band
    let svgH = 120;
    try {
        const hAttr = countingSvg.style.height || countingSvg.getAttribute('height');
        if (hAttr) svgH = parseFloat(hAttr) || svgH;
    } catch (e) {}
    
    let drawn = 0;
    staves.forEach((stave, mIdx) => {
        const data = measureNoteData[mIdx] || { events: [], realX: [], staveNotes: [] };
        
        // Staff line positions
        let staffBottom = staveY + staveHeight;
        let staffTop = staveY + 8;
        try {
            if (typeof stave.getBottomY === 'function') staffBottom = stave.getBottomY();
            else if (typeof stave.getYForLine === 'function') staffBottom = stave.getYForLine(4);
            // Single visible line is middle (index 2); use top of stave geometry for numbers
            if (typeof stave.getYForLine === 'function') {
                staffTop = stave.getYForLine(0);
            } else if (typeof stave.getTopLineTopY === 'function') {
                staffTop = stave.getTopLineTopY();
            }
        } catch (e) {}
        
        // Answer lines in the writable gap below the staff
        let countY = staffBottom + gap;
        if (countY > svgH - 8) countY = Math.max(staffBottom + 12, svgH - 10);
        
        // Measure number: upper-left of measure — just after left barline, before notes,
        // slightly above the middle (notehead) line
        try {
            const mNum = measureStart + mIdx + 1;
            let numX = stave.getX() + 5;
            try {
                if (typeof stave.getNoteStartX === 'function') {
                    const nsx = stave.getNoteStartX();
                    // Early in the left pad (after barline, before first note)
                    numX = Math.max(stave.getX() + 4, Math.min(nsx - 3, stave.getX() + 10));
                }
            } catch (e2) {}
            let midY = staffTop + 22;
            try {
                if (typeof stave.getYForLine === 'function') midY = stave.getYForLine(2);
            } catch (e3) {}
            const measureNumY = midY - 10;
            const numText = document.createElementNS(ns, 'text');
            numText.setAttribute('x', String(numX));
            numText.setAttribute('y', String(measureNumY));
            numText.setAttribute('text-anchor', 'start');
            numText.setAttribute('dominant-baseline', 'auto');
            numText.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
            numText.setAttribute('font-size', '9');
            numText.setAttribute('font-weight', '600');
            numText.setAttribute('fill', '#64748b');
            numText.setAttribute('class', 'measure-number');
            numText.textContent = String(mNum);
            countingSvg.appendChild(numText);
        } catch (e) {}
        
        const slots = buildAnswerSlots(data, stave);
        const lineLen = 6.5;
        const measureIndex = measureStart + mIdx;
        
        slots.forEach((slot, slotInMeasure) => {
            const headX = slot.x;
            if (headX == null || isNaN(headX)) return;
            
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', headX - lineLen);
            line.setAttribute('y1', countY);
            line.setAttribute('x2', headX + lineLen);
            line.setAttribute('y2', countY);
            line.setAttribute('stroke', '#475569');
            line.setAttribute('stroke-width', '1.25');
            line.setAttribute('class', 'answer-line');
            // Seek metadata: click maps to this note/rest
            line.setAttribute('data-measure', String(measureIndex));
            line.setAttribute('data-slot', String(slotInMeasure));
            countingSvg.appendChild(line);
            drawn++;
        });
    });
    
    countingSvg.setAttribute('height', String(svgH));
    countingSvg.style.height = svgH + 'px';
    if (drawn === 0) {
        console.warn('[RhythmGen] No answer lines drawn — check realX capture');
    }
}

// =====================================================
// CORE GENERATION + RENDER PIPELINE
// =====================================================

function getMeterCategory(timeSig) {
    if (["6/8", "9/8", "12/8"].includes(timeSig)) return 'compound';
    if (["5/8", "7/8"].includes(timeSig)) return 'odd';
    if (timeSig === '2/2') return 'cut';
    return 'simple'; // 4/4, 3/4, 2/4 (and any other duple/simple)
}

function getRhythmsNewAtLevel(level, timeSig) {
    // Returns exactly the rhythms added at this precise level for the given meter (for boosting in generator).
    const cat = getMeterCategory(timeSig || '4/4');
    const adds = LEVEL_ADDITIONS[cat] || LEVEL_ADDITIONS.simple;
    return adds[level] || [];
}

function getDefaultRhythmsForLevel(level, timeSigOverride) {
    const tsEl = document.getElementById('dropdownTimeSignature');
    const timeSig = timeSigOverride || (tsEl ? tsEl.value : '4/4');
    const cat = getMeterCategory(timeSig);

    // Use the single shared LEVEL_ADDITIONS (prevents drift between UI presets and generation rules).
    const catAdd = LEVEL_ADDITIONS[cat] || LEVEL_ADDITIONS.simple;
    let keys = [];
    const maxL = Math.max(1, Math.min(6, level || 1));
    for (let l = 1; l <= maxL; l++) {
        if (catAdd[l]) keys = keys.concat(catAdd[l]);
    }

    // Dedupe and only include keys that exist in defs
    return [...new Set(keys)].filter(k => !!RHYTHM_DEFS[k]);
}

function applyLevelDefaults(level) {
    // Uncheck everything first
    document.querySelectorAll('#rhythmCheckboxes input').forEach(cb => cb.checked = false);
    
    const keysToCheck = getDefaultRhythmsForLevel(level);
    
    keysToCheck.forEach(k => {
        const el = document.getElementById(`rhythm-${k}`);
        if (el) el.checked = true;
    });
    
    // Curriculum package also suggests a presentation difficulty (user can still change it)
    const diffEl = document.getElementById('dropdownDifficulty');
    if (diffEl) {
        diffEl.value = defaultDifficultyForLevel(level);
    }
    updateLevelUI();
}

function setRecommendedRhythms() {
    const level = parseInt(document.getElementById('dropdownLevel').value);
    applyLevelDefaults(level);
    debouncedGenerate();
}


/**
 * Eyes Up demo video: shot list + English narration for scripts/video/build-video.mjs.
 *
 * Each segment is narrated line by line (macOS `say`); the segment lasts as long as its audio.
 * Visual per segment:
 *   type "card"  – full-frame HTML card (title, problem, how it was built, close).
 *   type "media" – media box on the left, kicker/heading/caption on the right.
 *     footage: [{ from, to }, …] clips of the frame folder passed with --footage. Ends are frame
 *              numbers or local wall-clock "HH:MM:SS" (matched to file mtimes). Played in order at
 *              `speed` (default 1, labelled when > 1). If a clip is missing or frozen (all frames
 *              identical), the per-line stills are used instead and the label switches to "Still".
 *     marks:   [{ rect: [x, y, w, h] in preview-crop px, label }] dashed callouts over live footage.
 *     gallery: seconds into the segment to export as a 1920x1080 gallery still.
 *     stills:  one entry per narration line (or one for all): { file, crop?: [x, y, w, h], note?, zoom? }
 *              file is relative to the repo root. zoom = { rect: [x, y, w, h], label } draws a
 *              magnified inset of that part of the still next to it.
 *
 * Honesty rules baked into the labels: footage = Lens Studio Interactive Preview, no device;
 * sounds synthesized locally; screenshot 03 had its hint window stretched for the capture.
 */

// Preview panel inside the Lens Studio window capture (1024x800 px window image, "Preview 2" layout).
export const CROP = { x: 142, y: 135, w: 876, h: 610 };

const S = 'devpost/screenshots';
// Portrait stills are 475x1400 crops of the tall stereo preview; show the band with the action.
const BAND = [0, 470, 475, 700]; // starts below the LEAF result line (y ≈ 445)

export const SEGMENTS = [
  {
    // Cycle 3 opening, part 1 (stills): hero cyan-halo frame with the title, then a 1.5 s drawn card (own illustration).
    // The disclosure is shown only for the first 2 s (28 px). Drawn card from 2.0 s, segment held to 3.5 s.
    id: '00a-open',
    type: 'card',
    card: 'open',
    tail: 0.2,
    minDuration: 3.5,
    states: [
      { at: 0, stage: 'hero', disclosure: true },
      { at: 2.0, stage: 'drawn' },
    ],
    lines: ['Rehearse at a laptop and your eyes drop.'],
  },
  {
    // Part 2 (live): Setup panel, pinch Start (frames 70-89 of the r9 capture, 1.5x into Talk length / Audience / Start),
    // then a 0.3 s cross-dissolve from the unlit audience to the lit halo (frames 111-119). The tag starts at the cut,
    // after the second caption has ended. Zoom keys are [t, zoom, centre x, centre y]; 'j0+s' = s after the first dissolve starts.
    id: '00b-open',
    type: 'cold',
    speed: 1.15,
    lead: 0.15,
    tail: 0.5,
    crop: [142, 195, 876, 493],
    zoom: [[0, 1.5, 438, 250], ['j0+0', 1.5, 438, 250], ['j0+0.9', 1, 438, 246.5]],
    states: [
      { at: 0, chip: 'Pick time, audience, Start' },
      { at: 3.0 }, // chip gone as the panel collapses after the pinch
      { at: 'j0', tag: 'You look \u2192 they light up' },
    ],
    footage: [{ from: 70, to: 89 }, { from: 111, to: 119, dissolve: 0.3 }],
    lines: [
      'Eyes Up seats a virtual audience in your room,',
      'and lights up whoever you turn toward.',
    ],
  },
  {
    id: '04-halo',
    type: 'media',
    kicker: 'Gaze',
    heading: 'Turn toward someone, they light up',
    // Frames 177-212 of the capture: starts after the pill ("es") has left the view, so no clipped text.
    footage: [{ from: 177, to: 212 }],
    gallery: 0.8,
    lines: [
      'A halo fills in about a second, then slowly cools.',
      'Here, head direction stands in for your gaze.',
    ],
    stills: [{ file: `${S}/02-audience-lit-halo.png`, crop: BAND }],
  },
  {
    id: '05-nudge',
    type: 'media',
    kicker: 'Nudge',
    heading: 'Ignore a side, get a tap',
    // Cycle 3: one clean nudge-then-clear (frames 226-256: left chevron appears at ~3 s, clears at ~5.7 s),
    // then a ~2 s "again" cut-away (frames 306-316: the right chevron taps in). Frames with the clipped pill ("Sc") are cut.
    footage: [{ from: 226, to: 256 }, { from: 306, to: 316 }],
    speed: 1,
    tail: 0.5,
    gallery: 0.9,
    lines: [
      'Ignore one side: a chime, then an amber chevron.',
      'Turn toward it and the chevron clears.',
      'Keep ignoring it and it taps you again.',
    ],
    stills: [
      {
        file: `${S}/03-nudge-chevron.png`,
        crop: BAND,
        note: 'Hint held longer than its 3 s for this capture',
        zoom: { rect: [40, 668, 80, 56], label: 'Amber chevron, left edge' },
      },
    ],
  },
  {
    id: '06-podium',
    type: 'media',
    kicker: 'Controls',
    heading: 'A podium only when you look down',
    // Cycle 3: only the Next-pinch beat (frames 355-391, ~8 s). The crop window (preview px y 0-395) ends above the
    // right chevron (it appears below the podium, y > 400), so the chevron stays outside the zoom.
    footage: [{ from: 355, to: 391 }],
    speed: 1,
    zoom: [[0, 1.55, 440, 198]],
    lines: [
      'Controls appear only when you look down, like a real podium.',
      'Slide count, timer, and a big Next button live there.',
    ],
    stills: [{ file: `${S}/05-podium.png`, zoom: { rect: [480, 780, 1330, 430], label: 'Podium: Prev, Next, Finish, timer' } }],
  },
  {
    id: '07-cue',
    type: 'media',
    kicker: 'Notes',
    heading: 'Notes only when you need them',
    // Cycle 3: pill "Eyes stay up" -> card "Why glasses" -> pill -> dwell -> card again with its countdown line (frames 426-476).
    footage: [{ from: 426, to: 476 }],
    speed: 1.3,
    gallery: 6.5,
    lines: [
      'Lost your place? Look at the pill for one second.',
      'The full card comes back, with a thin line counting down, then it gets out of the way again.',
    ],
    stills: [
      { file: `${S}/04-cue-card.png`, crop: BAND, zoom: { rect: [140, 596, 230, 104], label: 'Cue card above the audience' } },
      { file: `${S}/archive/07-preview-landscape.png`, note: 'The pill: "Screens pull eyes"', zoom: { rect: [372, 214, 132, 44], label: 'Pill above the audience' } },
    ],
  },
  {
    id: '08-summary',
    type: 'media',
    kicker: 'Finish',
    heading: 'Where your eyes went',
    // Scripted Summary capture (0:45 run: Balance 87, L 26 / C 32 / R 42, longest look-away 11 s, tip "look left more").
    // Slow zoom/pan over the still. Keys [t, zoom, centre x, centre y] in `base` px (image px minus the base origin);
    // t is seconds or 'cN+s' / 'cN-s' (seconds after narration line N starts). Callouts show while their line plays.
    gallery: 1,
    pan: {
      file: `${S}/06-summary.png`,
      base: [285, 195, 969, 675],
      // Cycle 3: full panel at zoom 1.0 (header visible) for the first 2 s, then the timeline only (window is image y 281-645: header and
      // timeline, above the bottom tiles), back to the full panel for the tip.
      keys: [
        [0, 1, 485, 368],
        [2, 1, 485, 368],
        [2.9, 1.85, 520, 268],
        ['c3-0.5', 1.85, 520, 268],
        ['c3+0.5', 1, 485, 368],
      ],
      callouts: [
        { cue: 2, rect: [613, 546, 105, 23], label: 'Longest look-away: 11 s' },
      ],
    },
    lines: [
      'Finish, applause, then where your eyes went.',
      'Balance eighty seven. Left twenty six, center thirty two, right forty two percent.',
      'The red block is your longest look-away.',
      'Next time, look left more.',
    ],
  },
  {
    // Cycle 3: three real before/after pairs, then the real Summary still with Again highlighted.
    // Pairs 1 and 2 are crops of devpost/screenshots/09-process-at-a-glance.png; pair 3 compares the first-build Setup
    // capture (archive/01-setup-panel-first-build.png, committed at dd6d471) with the current 01-setup-panel.png.
    // No second-run numbers and no outcome claims. Each caption is six words.
    id: '08b-pairs',
    type: 'card',
    card: 'pairs',
    lead: 0.3,
    gap: 0.2,
    tail: 0.6,
    pairs: [
      { tag: 'Halo', file: `${S}/09-process-at-a-glance.png`, crop: [78, 279, 542, 290] },
      { tag: 'Gaze hit area', file: `${S}/09-process-at-a-glance.png`, crop: [688, 246, 540, 290] },
      {
        tag: 'Setup panel',
        before: { file: `${S}/archive/01-setup-panel-first-build.png`, crop: [88, 662, 299, 225], label: 'First build' },
        after: { file: `${S}/01-setup-panel.png`, crop: [493, 175, 613, 458], label: 'Now' },
      },
    ],
    summary: { file: `${S}/06-summary.png`, crop: [500, 215, 600, 650], again: [572, 792, 136, 48] },
    lines: [
      'Three things glasses taught us.',
      'Pale halo became bold saturated cyan.',
      'Wide cone became exact pill rectangle.',
      'Faint panel became clear readable controls.',
      'Press Again and compare your balance.',
    ],
  },
  {
    id: '09-built',
    type: 'card',
    lead: 0.4,
    tail: 0.4,
    gallery: 5,
    card: 'built',
    lines: [
      'Built with CLAD and Lens Studio MCP.',
      'Ten LEAF scenarios pass.',
      '166 Node tests pass.',
    ],
  },
  {
    id: '10-close',
    type: 'card',
    card: 'close',
    lines: [
      'Everything here ran in the Lens Studio preview, not on a device.',
      'Spatial audio and the feel on real glasses are untested.',
    ],
  },
  {
    // Hero end frame: the cyan halo over the audience (same live frames as the opening) plus the tagline, held >= 2 s.
    id: '11-end',
    type: 'cold',
    hero: true,
    speed: 1,
    crop: [142, 195, 876, 493],
    footage: [{ from: 111, to: 131 }],
    lines: ['Eyes Up. Rehearse with your eyes on the room.'],
  },
];

export const LEAF_ROWS = [
  ['start_places_audience', '6 members at 250 ± 5 cm after Start'],
  ['gaze_fills_halo', 'halo ≥ 0.95 after 1.2 s of gaze'],
  ['neglect_triggers_nudge', 'left hint after 8.5 s on the right'],
  ['next_shows_card_then_pill', 'card, then pill 4.3 s later'],
  ['dwell_expands_pill', '1.1 s gaze re-opens the card'],
  ['finish_shows_summary', 'zones sum to 100 %, time m:ss'],
  ['repeated_nudge', 'nudges keep coming while you neglect'],
  ['finish_pulses_at_time', 'stage line pulses at the 60 s and 30 s marks'],
  ['neglect_disengages_then_recovers', 'ignored member slumps, recovers when looked at'],
  ['finish_gives_grade', 'Summary shows an S / A / B / C grade'],
];

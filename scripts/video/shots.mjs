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
    // Merged opening over live footage (frame numbers of the r9 capture).
    // Clip A: Setup panel -> pinch Start -> audience appears (cue card "The problem" cut out: its text is clipped inside the Lens).
    // Clip B: audience with the halo already lit and the pill "Screens pull eyes" (complete) from ~4.1 s, so the line
    // "lights up whoever you turn toward" and the caption "You look -> they light up" sit on the halo frame, before 0:08.
    // Disclosure banner only for the first ~2 s; after that only the PREVIEW pill. Zoom keys are [t, zoom, centre x, centre y].
    id: '00-open',
    type: 'cold',
    speed: 1,
    crop: [142, 195, 876, 493],
    zoom: [[0, 1.5, 438, 250], [2.5, 1.5, 438, 250], [3.9, 1, 438, 246.5]],
    states: [
      { at: 0, disclosure: true, lower: true },
      { at: 2.2, lower: true },
      { at: 2.5 },
      { at: 4.3, tag: 'You look \u2192 they light up' },
    ],
    lowerThird: 'Eyes Up - rehearsal coach for Spectacles',
    footage: [{ from: 70, to: 89 }, { from: 111, to: 131 }],
    lines: [
      'Rehearse at a laptop and your eyes drop.',
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
    // Clip A: left chevron appears, clears, appears again. Clip B: right chevron. Frames with the clipped pill ("Sc") are cut.
    footage: [{ from: 213, to: 256 }, { from: 299, to: 319 }],
    speed: 1.2,
    gallery: 2.2,
    lines: [
      'Ignore one side for eight seconds: a chime and an amber chevron.',
      'No pop-up. Turn toward that side and the chevron clears.',
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
    // Live: head pitched down shows the podium; pinch Next. The right chevron appears beside it, never on it.
    footage: [{ from: '06:21:00', to: '06:21:15' }],
    speed: 1.2,
    zoom: [[0, 1.45, 440, 350]],
    lines: [
      'Controls appear only when you look down, like a real podium.',
      'Your slide count, the time against your target, and a big Next button live there, and nowhere else.',
    ],
    stills: [{ file: `${S}/05-podium.png`, zoom: { rect: [480, 780, 1330, 430], label: 'Podium: Prev, Next, Finish, timer' } }],
  },
  {
    id: '07-cue',
    type: 'media',
    kicker: 'Notes',
    heading: 'Notes only when you need them',
    // Pinch Next → card "Why glasses" → pill "Eyes stay up" → dwell → card again with its countdown line.
    footage: [{ from: '06:21:19', to: '06:21:41' }],
    speed: 1.3,
    gallery: 6.5,
    lines: [
      'Lost your place? Look at the pill for one second.',
      'The full card comes back, with a thin line counting down, then it gets out of the way again.',
    ],
    stills: [
      { file: `${S}/04-cue-card.png`, crop: BAND, zoom: { rect: [140, 596, 230, 104], label: 'Cue card above the audience' } },
      { file: `${S}/07-preview-landscape.png`, note: 'The pill: "Screens pull eyes"', zoom: { rect: [372, 214, 132, 44], label: 'Pill above the audience' } },
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
      keys: [
        [0, 1, 485, 368],
        ['c0+1.2', 1.15, 485, 330],
        ['c1+0.2', 1.7, 505, 245],
        ['c1+3.2', 1.8, 505, 262],
        ['c2-0.25', 2.5, 410, 358],
        ['c2+3.6', 2.55, 410, 358],
        ['c3+0.1', 2.1, 505, 555],
      ],
      callouts: [
        { cue: 2, rect: [613, 546, 105, 23], label: 'Longest look-away: 11 s' },
      ],
    },
    lines: [
      'Finish, applause, then where your eyes went.',
      'Balance eighty seven. Left twenty six, center thirty two, right forty two percent.',
      'The red block is your longest look-away, eleven seconds.',
      'Next time, look left more.',
    ],
  },
  {
    id: '09-built',
    type: 'card',
    gallery: 8,
    card: 'built',
    lines: [
      'Built by an AI agent with CLAD skills and Lens Studio MCP tools.',
      'Eight LEAF scenarios pass in the Interactive Preview.',
      'One hundred thirty nine Node tests cover the core logic.',
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
];

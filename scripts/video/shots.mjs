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
    // 5-8 s cold open: the halo lighting up, then the nudge chevron, full-bleed live footage, before any title.
    id: '00-cold',
    type: 'cold',
    speed: 1.3,
    crop: [150, 185, 720, 405],
    footage: [{ from: 106, to: 137 }],
    lines: [
      'Look at someone, and they light up.',
      'Ignore a side, and it taps you on the shoulder.',
    ],
  },
  {
    id: '01-hook',
    type: 'card',
    card: 'hook',
    lines: [
      'When you rehearse a talk at your laptop, your eyes drop to the screen.',
      'On stage, the habit stays. You read your notes, or you lock onto one side of the room.',
    ],
  },
  {
    id: '02-title',
    type: 'card',
    card: 'title',
    lines: [
      'Eyes Up is a rehearsal coach for Snap Spectacles.',
      'It seats a small virtual audience in your own room, so you practice looking at people, not at notes.',
      'It is for students, founders, and anyone giving a talk in a second language.',
    ],
  },
  {
    id: '03-setup',
    type: 'media',
    kicker: 'Start',
    heading: 'An audience in your room',
    // Live real-camera capture 2026-11-01 06:20: Setup panel → pinch Start (06:20:07) → audience → card "The problem" → pill.
    footage: [{ from: '06:20:02', to: '06:20:15' }],
    // Zoom on the Setup panel (preview px), then ease out to the whole room when the audience appears.
    zoom: [[0, 2.1, 438, 300], [4.2, 2.1, 438, 300], [5.8, 1, 438, 305]],
    lines: [
      'You pick a length and a deck, then press Start with a pinch.',
      'Six audience members appear on the floor, two and a half meters ahead.',
      'Your first point floats above them, then shrinks to a three word pill.',
    ],
    stills: [
      { file: `${S}/01-setup-panel.png`, crop: BAND },
      { file: `${S}/07-preview-landscape.png`, note: 'Landscape preview, cue card shrunk to its pill' },
    ],
  },
  {
    id: '04-halo',
    type: 'media',
    kicker: 'Gaze',
    heading: 'Whoever you look at lights up',
    speed: 1.3,
    footage: [{ from: '06:20:14', to: '06:20:26' }],
    gallery: 0.8,
    lines: [
      'Whoever you look at lights up. Their halo fills in about a second, and slowly cools when you look away.',
      'It is a simple mirror of where your attention actually goes.',
    ],
    stills: [{ file: `${S}/02-audience-lit-halo.png`, crop: BAND }],
  },
  {
    id: '05-nudge',
    type: 'media',
    kicker: 'Nudge',
    heading: 'Ignore a side, get a tap',
    // Live: the head turns to the right side, the left chevron appears and clears when the head turns back; later the right one.
    footage: [{ from: '06:20:24', to: '06:20:43' }],
    gallery: 2.2,
    lines: [
      'Stare at one side for eight seconds, and you hear a soft chime, and a pulsing amber chevron appears at the edge of your view.',
      'No pop-up in your face. Keep ignoring that side and it taps you again, until you look over.',
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
    // Clean scripted Summary capture (0:45 run: Balance 87, Cards 1 of 5, Nudges 1): large still, read at full size.
    gallery: 2,
    lines: [
      'Finish, and the audience applauds. Then you see where your eyes went.',
      'A balance score, the split between left, center and right, and a timeline of your gaze, with every nudge marked.',
      'This forty five second run scored a balance of eighty seven, with forty two percent on the right and twenty six on the left. One nudge, one card, and the tip says it plainly: next time, look left more.',
    ],
    stills: [{ file: `${S}/06-summary.png`, crop: [445, 195, 650, 675] }],
  },
  {
    id: '09-built',
    type: 'card',
    gallery: 19,
    card: 'built',
    lines: [
      'Eyes Up was built in Lens Studio by an AI coding agent, through the Lens Studio MCP tools, following the CLAD skills.',
      'Eight scripted LEAF scenarios check the done criteria in the Interactive Preview. All eight pass.',
      'The core logic, gaze, halos, nudges and cue cards, is covered by one hundred thirty nine unit and integration tests in Node.',
    ],
  },
  {
    id: '10-close',
    type: 'card',
    card: 'close',
    lines: [
      'Everything shown here runs in the Lens Studio Interactive Preview, not on a device yet, and the sounds are synthesized locally.',
      'Spatial audio direction and the feel on real glasses are still untested.',
      'Eyes Up. Rehearse with your eyes on the room.',
    ],
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

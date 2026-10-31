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
    // Setup panel → pinch Start (23:45:30) → audience → first card "The problem" → pill (23:45:36).
    footage: [{ from: '23:45:19', to: '23:45:36' }],
    lines: [
      'You pick a length and a deck, here a five card pitch, and press Start with a pinch.',
      'Six audience members appear on the floor, two and a half meters ahead, in a half circle.',
      'Your first point floats above them for four seconds, then shrinks to a three word pill.',
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
    footage: [{ from: '23:45:37', to: '23:45:52' }],
    gallery: 4,
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
    // Held right from 23:45:53; the double chevron "« left" shows 23:45:55–58, 46:03–06, 46:11–12,
    // then the head turns left (23:46:15) and the left halos fill.
    speed: 1.5,
    footage: [{ from: '23:45:53', to: '23:46:21' }],
    marks: [{ rect: [222, 250, 62, 72], label: 'chevron pulses here' }],
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
    // 1 / 5, elapsed / target timer, pinch Next at 23:46:33 → 2 / 5.
    footage: [{ from: '23:46:29', to: '23:46:39' }],
    lines: [
      'Controls appear only when you look down, like a real podium.',
      'Your slide count, the time against your target, and a big Next button live there, and nowhere else.',
    ],
    stills: [{ file: `${S}/05-podium.png`, crop: [0, 380, 475, 700], zoom: { rect: [40, 690, 400, 155], label: 'Podium: Prev, Next, Finish, timer' } }],
  },
  {
    id: '07-cue',
    type: 'media',
    kicker: 'Notes',
    heading: 'Notes only when you need them',
    // Pill "Eyes stay up" → 1 s dwell (23:46:54) → card "Why glasses" with countdown line → pill (23:46:59).
    footage: [
      { from: '23:46:40', to: '23:46:43' },
      { from: '23:46:52', to: '23:47:00' },
    ],
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
    // Podium → Finish (23:47:20) → applause; 23:47:22–25 (camera on the floor) cut; Summary held to 23:47:45.
    footage: [
      { from: '23:47:19', to: '23:47:21' },
      { from: '23:47:26', to: '23:47:45' },
    ],
    gallery: 10,
    lines: [
      'Finish, and the audience applauds. Then you see where your eyes went.',
      'A balance score, the split between left, center and right, and a timeline of your gaze, with every nudge marked.',
      'This run: one minute forty nine, only fifteen percent on the left. The tip says it plainly: next time, look left more.',
    ],
    stills: [{ file: `${S}/06-summary.png`, crop: BAND, zoom: { rect: [96, 586, 284, 230], label: 'Rehearsal summary' } }],
  },
  {
    id: '09-built',
    type: 'card',
    gallery: 19,
    card: 'built',
    lines: [
      'Eyes Up was built in Lens Studio by an AI coding agent, through the Lens Studio MCP tools, following the CLAD skills.',
      'Seven scripted LEAF scenarios check the done criteria in the Interactive Preview. All seven pass.',
      'The core logic, gaze, halos, nudges and cue cards, is covered by one hundred twenty three unit and integration tests in Node.',
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
];

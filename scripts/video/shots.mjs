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
    // Setup → pinch Start → audience fades in. Frames 190–217 are a one-call camera glitch (cut).
    footage: [
      { from: '22:29:49', to: 189 },
      { from: 218, to: '22:30:08' },
    ],
    lines: [
      'You pick a length, and press Start with a pinch.',
      'Six audience members appear on the floor, two and a half meters ahead, in a half circle, with your first point above them.',
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
    speed: 1.25,
    footage: [
      { from: '22:30:58', to: '22:31:08' },
      { from: '22:31:49', to: '22:31:58' },
    ],
    gallery: 3.2,
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
    // Held right from 22:30:33; the "< left" hint shows 22:30:36–39, 44–47, 52–55 (every 8 s, 3 s each).
    speed: 1.5,
    footage: [{ from: '22:30:34', to: '22:31:00' }],
    marks: [{ rect: [226, 280, 56, 50], label: 'chevron appears here' }],
    gallery: 2.4,
    lines: [
      'Stare at one side for eight seconds, and you hear a soft chime, and a small amber chevron appears at the edge of your view.',
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
    footage: [{ from: '22:31:12', to: '22:31:22' }],
    lines: [
      'Controls appear only when you look down, like a real podium.',
      'Previous, next, finish, and the timer live there, and nowhere else.',
    ],
    stills: [{ file: `${S}/05-podium.png`, crop: [0, 380, 475, 700], zoom: { rect: [40, 690, 400, 155], label: 'Podium: Prev, Next, Finish, timer' } }],
  },
  {
    id: '07-cue',
    type: 'media',
    kicker: 'Notes',
    heading: 'Your next point, then out of the way',
    // Next → "Why glasses" card; later the pill "Eyes stay up" re-expands after a 1 s look (22:31:35→36).
    footage: [
      { from: '22:31:22', to: '22:31:28' },
      { from: '22:31:34', to: '22:31:43' },
    ],
    gallery: 3.0,
    lines: [
      'Your next point floats just above the audience for four seconds, then shrinks to a three word pill.',
      'Glance at the pill for one second, and the full card comes back.',
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
    footage: [{ from: '22:32:06', to: '22:32:24' }],
    gallery: 11,
    lines: [
      'When you finish, the audience applauds, and you get a summary.',
      'How long you spoke, how your gaze split between left, center and right, and your longest look away.',
      'This run: two minutes eleven, with the left side at twenty two percent.',
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
      'The core logic, gaze, halos, nudges and cue cards, is covered by ninety seven unit tests in Node.',
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

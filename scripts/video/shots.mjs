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
    // Merged opening (hook + title) over live footage: Setup panel -> pinch Start (06:20:07) -> audience -> halo.
    // Preview crop is 16:9; `zoom` keys are [t, zoom, centre x, centre y] in that crop. Pinch lands at ~7 s, audience by ~12 s.
    id: '00-open',
    type: 'cold',
    speed: 1,
    crop: [142, 195, 876, 493],
    zoom: [[0, 1.5, 438, 250], [5.2, 1.5, 438, 250], [7.8, 1, 438, 246.5]],
    lowerThird: 'Eyes Up - rehearsal coach for Spectacles',
    footage: [{ from: '06:20:02', to: '06:20:15' }],
    lines: [
      'Rehearse at a laptop and your eyes drop.',
      'Eyes Up seats a virtual audience in your room and lights up whoever you turn toward.',
      'In this preview, a test harness turns the head for us.',
    ],
  },
  {
    id: '04-halo',
    type: 'media',
    kicker: 'Gaze',
    heading: 'Turn toward someone, they light up',
    footage: [{ from: '06:20:15', to: '06:20:26' }],
    gallery: 0.8,
    lines: [
      'Turn toward someone and they light up. Their halo fills in about a second, and slowly cools when you turn away.',
      'Here the head direction stands in for your gaze.',
    ],
    stills: [{ file: `${S}/02-audience-lit-halo.png`, crop: BAND }],
  },
  {
    id: '05-nudge',
    type: 'media',
    kicker: 'Nudge',
    heading: 'Ignore a side, get a tap',
    // Live, real time: the head turns to the right side, the left chevron appears and clears when the head turns back; later the right one.
    footage: [{ from: '06:20:26', to: '06:20:47' }],
    gallery: 2.2,
    lines: [
      'Stare at one side for eight seconds, and you hear a soft chime, and a pulsing amber chevron appears at the edge of your view.',
      'No pop-up in your face. When you turn toward that side, the chevron clears.',
      'Keep ignoring a side and it taps you again, until you turn over.',
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

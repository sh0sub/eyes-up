# Spec matrix (artifact "specs" section vs running product)

Audit round 1, 2026-11-01. Evidence: live Lens Studio 5.24.1 preview via MCP (screenshots in the audit scratchpad `converge/eyes-up/live-*.png`), `npm run check` (123 tests pass, typecheck and lint clean), 6 LEAF scenarios PASSED live.

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| F1 | 05 MVP | State machine Setup, Placing, Rehearsal, Summary | match | tests/unit/AppStateMachine, live flow Start to Finish |
| F2 | 05 MVP | 6-person semicircle at 2.5 m, Re-place | match (round 1) | Podium button stays hidden during Rehearsal by plan; SummaryPanel now has a small Re-place (`SummaryReplaceButton`), test `EyesUpSession` 'Re-place from the Summary panel'; fix-r1/summary.png. Setup keeps Start only (Re-place there would start a rehearsal, same as Start) |
| F3 | 05 MVP | Gaze 7 deg, halo 1 s fill / 12 s decay, scale 1.05 | match | AttentionMeter.ts, LEAF gaze_fills_halo PASSED |
| F4 | 05 MVP | Nudge 8 s, spatial chime + edge chevron 3 s | match | LEAF neglect_triggers_nudge PASSED, devpost screenshots |
| F5 | 05 MVP | Cue card 4 s then pill, 1 s dwell re-expands | match | LEAF next_shows_card_then_pill, dwell_expands_pill PASSED |
| F6 | 05 MVP | Podium Prev/Next/Finish, counter, elapsed | match | live-podium.png: 1 / 5, 0:44 / 3:00, Next largest and cyan, Finish amber |
| F7 | 05 MVP | Summary: time, zone %, longest look-away, cards, balance, Again/Done | match | live-summary.png |
| F8 | 05 MVP | LEAF 6 scenarios plus 1 | match | 6 live PASSED; 9 scenario files present |
| F9 | 05 Should | Setup panel: length slider 3/5/10, audience 3/6/9, deck 2 samples | match (round 1) | segmented pinch buttons (slider substitution kept for pinch-only large targets, see SetupPanel.ts header); fix-r1/setup.png |
| F10 | 05 Should | Stage-line timer with 60/30 s pulses, amber at 0 | match | StageLine.ts, tests, line visible under podium |
| F11 | 05 Should | Finish clap pulse and SFX | match | ApplauseAudio in scene, EyesUpApp.ts |
| F12 | 05 Should | Icons, font, SFX | match | Assets/Icons, Fonts, GeneratedSFX |
| F13 | 05 Stretch | ASR filler counter | blocked | stretch, not implemented, optional, needs Snap login |
| F14 | 05 Stretch | Deck import text input | match (round 1) | `core/DeckImport.ts` + 4 tests; Setup 'Import text' opens the AR keyboard (TextInputSystem). Keyboard UI is device-only (does not open in Preview, per specs-keyboard skill), so the typing flow is unverified on device |
| S1 | 07 S1 Setup | Panel 40x30 with title, SETUP pill, subtitle, 3 segmented rows, Start rehearsal (mint, play icon), caption | match (round 1) | fix-r1/setup.png: title, pill, subtitle, segmented 3/5/10 and 3/6/9 (selected cyan), deck list (selected cyan), mint Start with play icon, caption. Panel is 40x30 centered 10 cm below eye level (EyesUpApp SETUP_BELOW_EYES_CM); deck buttons and an Import button share one row. Length is segmented, not the mockup's track slider (pinch-only targets) |
| S2 | 07 S2 Hero | Audience halos, pill "Why glasses", retical off, only info above audience | match (round 1) | halo lit color is now saturated cyan (W1), fix-r1/halo.png shows a clear cyan disc on the watched member; only 2 silhouettes in FOV as designed |
| S3 | 07 S3 Nudge | Amber double chevron + "left" caption at left edge | match | devpost 02/05, README |
| S4 | 07 S4 Podium + card | Card 50x18 with title and 2 bullets, countdown line; podium with Prev/Next/Finish | match | live-podium.png; card has title only in live-audience frame (bullets fade after pill) |
| S5 | 07 S5 Summary | Title, Balance badge, bars, timeline, 2 stat tiles, tip, Again/Done, Session complete chip | match | live-summary.png has all |
| S6 | 07 S6 Video keyframe | Lens Studio window with hierarchy, preview, inspector, logger | partial | demo video file built locally (`.local/video/eyes-up-demo.mp4`, not committed) from `scripts/video`; its Setup footage predates the segmented panel. Re-recording needs the Lens Studio window on screen (earlier run captured a frozen window) |
| R1 | 01 Submission | Public repo | blocked | cannot verify remote visibility offline |
| R2 | 01 Submission | Under 3 min YouTube video | blocked | video assembled locally by `scripts/video/build-video.mjs`; the public YouTube upload needs the entrant's YouTube account login, so no URL yet. README and devpost/submission.md say so |
| R3 | 01 Submission | Text: what, who, what you learned | match (round 1) | `devpost/submission.md` has what it does, who it is for, how it was built, what we learned, honest not-done list |
| R4 | 01 Skill pack | devpost/design-brief.md approved | match | status approved |
| R5 | 01 | Real device test | blocked | no Spectacles |
| R6 | tests | npm run check | match | 129/129 pass, typecheck and lint clean, 6 LEAF scenarios PASSED live after round 1 |

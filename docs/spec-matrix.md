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
| S6 | 07 S6 Video keyframe | Lens Studio window with hierarchy, preview, inspector, logger | match | demo video rebuilt 2026-11-01 (`.local/video/eyes-up-demo.mp4`, 2:35, not committed) from a fresh live demo_reel capture of the current build: segmented Setup panel, cyan halos, cue card/pill/dwell and the 0:42 Summary are live footage; nudge and podium use labelled stills (the scripted reel cannot turn the camera). Narration/test count (129) updated. Evidence: scripts/video/shots.mjs, scratchpad converge/eyes-up/fix-r2 |
| R1 | 01 Submission | Public repo | blocked | cannot verify remote visibility offline |
| R2 | 01 Submission | Under 3 min YouTube video | blocked | video assembled locally by `scripts/video/build-video.mjs`; the public YouTube upload needs the entrant's YouTube account login, so no URL yet. README and devpost/submission.md say so |
| R3 | 01 Submission | Text: what, who, what you learned | match (round 1) | `devpost/submission.md` has what it does, who it is for, how it was built, what we learned, honest not-done list |
| R4 | 01 Skill pack | devpost/design-brief.md approved | match | status approved |
| R5 | 01 | Real device test | blocked | no Spectacles |
| R6 | tests | npm run check | match | 129/129 pass, typecheck and lint clean, 6 LEAF scenarios PASSED live after round 1 |

## Audit round 2 (2026-11-01, full conformance)

Verified live: `npm run check` 129/129 pass, typecheck and lint clean; 6 LEAF done-criteria scenarios PASSED live via headless MCP session (12 scenarios registered). Screenshots reviewed: devpost/screenshots/01-setup-panel.png, 06-summary.png.

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| R2-T | tests | check, typecheck, lint, LEAF 6 | match | run this round |
| R2-S5a | 07 S5 Summary | two stat tiles readable (longest look-away, card expands) | gap (low) | 06-summary.png: tiles are small, "Card expands - Nudges 0 - 0" label cramped, tip bar tight against tiles |
| R2-S1a | 07 S1 Setup | readable labels on panel | gap (low) | 01-setup-panel.png: row labels (Talk length, Audience, Deck) low contrast over busy wall art |
| R2-D1 | 08 devpost/ tree | leaf-results.md, walkthrough/, learnings.md | gap (low) | LEAF results live inside build-notes.md, screenshots in devpost/screenshots; learnings.md (4 habits, 3 strengths, logic/feel table) missing as a file |
| R2-R2 | 01 Submission | public YouTube under 3 min | blocked | needs entrant YouTube login |
| R2-R1 | 01 Submission | public repo | blocked | remote visibility unverifiable offline (origin is github.com/sh0sub/eyes-up) |
| R2-R5 | 01 | real device | blocked | no Spectacles |

## Audit round 2b (confirmation pass, 2026-11-01)

Live headless MCP drive: Setup, Start pinch, audience view, Next pinch, card and pill. `npm run check` 129/129 pass.

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| C2-flow | 06 flow A/B | Setup -> Start -> stage -> Next -> card 4 s -> pill -> dwell re-expand | match | live: card "How it works" with 2 bullets and countdown bar, pill "Halo, chime, arrow", cyan halo on watched member |
| C2-podium | 07 S4 | podium hidden until head pitches down, Next largest | match | live: NextButton disabled until pitch >= 15 deg (by plan); devpost/screenshots/05-podium.png shows Prev, big cyan Next, amber Finish, 1 / 5, 0:05 / 3:00 |
| C2-logs | tests | no runtime errors | match | no E/F lines; only SceneMaterialBatcher "batching retries exhausted" warnings for text visuals, depth-format warning, editor network auth warnings |
| C2-warn | win | clean logger in demo footage | gap (low) | batcher warnings on 10 text visuals; cosmetic, not visible in the video unless the Logger panel is shown |
| C2-vid | 07 S6 / 01 | video matches current build | match (upload blocked) | video rebuilt from current-build footage (see S6), 154.9 s under 3 min; public YouTube upload still blocked (needs entrant YouTube login) |

## Audit round 3 (2026-11-01, full conformance)

Live headless MCP drive: scene hierarchy matches plan (SetupPanel, Audience_1..9, CueCard, StageLine, Podium, SummaryPanel, 3 audio sources); `npm run check` 129/129 pass, typecheck and lint clean; 12 LEAF scenarios PASSED live (6 done-criteria plus repeated_nudge, capture_*, finish_pulses_at_time, demo_reel). Screenshots: scratchpad converge/eyes-up/r3 (capture blobs under the session tool-results).

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| R3-T | tests | check, typecheck, lint, LEAF | match | 129/129, 12 PASSED |
| R3-S1 | 07 S1 | Setup panel contents | match | live capture: title, SETUP chip, subtitle, segmented 3/5/10 and 3/6/9, deck buttons + Import, mint Start with play icon, caption |
| R3-S2 | 07 S2 | audience halos, 6 members | match | live capture shows 6 members with halo rings, cue card above |
| R3-S3 | 07 S3 | amber chevron + "left" | match | devpost/screenshots/03-nudge-chevron.png |
| R3-S4 | 07 S4 | card + podium 2/5, 1:22 / 3:00, Prev/Next/Finish | match | live capture after Next |
| R3-S5a | 07 S5 | stat tiles readable | match | Tiles 4.8 -> 6.4 cm tall with Headline1 labels, panel 47 -> 53 cm and row gap 0.5 -> 1.3 cm so the tip bar clears the tiles; label now "Cards · Nudges" with "0 of 5 · 1" like the mockup (SummaryContext.cardCount, unit test). Live capture: scratchpad converge/eyes-up/fix-r3/summary.png, devpost/screenshots/06-summary.png |
| R3-D1 | 08 devpost tree | walkthrough/, leaf-results.md, learnings.md | match | devpost/walkthrough/01-setup..06-summary, devpost/leaf-results.md (12 scenarios), devpost/learnings.md; linked from submission.md |
| R3-win-learnings | 03 win | process and learnings narrative for judges | match | devpost/learnings.md: 4 habits mapping, 3 strengths, logic proven / feel unproven table |
| R3-S1-contrast | 07 S1 | row labels and caption legible | match | new TEXT_LABEL (alpha 0.95 vs 0.7) for Talk length / Audience / Deck / unit / subtitle; caption Subheadline -> Headline2. Live capture fix-r3/setup.png, devpost/screenshots/01-setup-panel.png |
| R3-R1/R2/R5 | 01 | public repo, YouTube, device | blocked | unchanged (needs YouTube login / Spectacles) |

## Audit round 4 (2026-11-01, independent full conformance)

Live headless MCP: scene roots present (EyesUp, SpectaclesInteractionKit, LEAF), 6 done-criteria LEAF scenarios PASSED (start_places_audience, gaze_fills_halo, neglect_triggers_nudge, next_shows_card_then_pill, dwell_expands_pill, finish_shows_summary), no E/F log lines. `npm run check`: typecheck and lint clean, 129/129 tests pass. Screenshots reviewed: devpost/screenshots/01-setup-panel.png, 06-summary.png.

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| R4-T | tests | check, typecheck, lint, LEAF 6 | match | 129/129, 6 PASSED live |
| R4-F-finish | 06 flow C | "Finish?" prompt at target + 30 s | match | EyesUpApp.ts:172, Tunables.ts:49 (reuses cue-card title, documented G8) |
| R4-S5a | 07 S5 | Summary buttons legible | match | SummaryPanel.ts: Re-place now 12 x 4.2 cm, Headline2 (same as Again/Done), gap 2; live capture fix-r4/summary.png, devpost/screenshots/06-summary.png |
| R4-S5b | 07 S5 | stat tiles clean | match | SummaryPanel.ts: both tiles 21.4 cm wide (equal, fill the 44 cm row), label Headline1 -> Headline2 so text clears borders; fix-r4/summary.png |
| R4-S1a | 07 S1 | Setup rows aligned | match | SetupPanel.ts: shared 8 cm left-aligned label column, all three rows 36 cm wide (deck buttons 9.5/9.5/6, unit cell fills the rest); fix-r4/setup.png, devpost/screenshots/01-setup-panel.png |
| R4-win-warn | win | clean demo | blocked/out of scope (low) | Editor-internal: SceneMaterialBatcher retries and "Failed to load compile data" come from Lens Studio, not project scripts; after recompile + preview restart the log shows no E/F and only 2 editor W lines (network auth, depth format). Not visible in the demo video (Logger panel not shown) |
| R4-R1/R2/R5 | 01 | public repo, YouTube, device | blocked | needs YouTube login / Spectacles |

## Audit round 5 (2026-11-01, independent full conformance)

Live headless MCP: 6 done-criteria LEAF scenarios PASSED (start_places_audience 2.6 s, gaze_fills_halo 4.3 s, neglect_triggers_nudge 11.8 s, next_shows_card_then_pill 7.6 s, dwell_expands_pill 7.9 s, finish_shows_summary 8.0 s), no E/F log lines. `npm run check`: 129/129 pass, typecheck and lint clean. Screenshots reviewed: devpost/screenshots/01-setup-panel.png, 02-audience-lit-halo.png, 06-summary.png.

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| R5-T | tests | check, typecheck, lint, LEAF 6 | match | 129/129, 6 PASSED live |
| R5-S1 | 07 S1 | Setup panel contents and states | match | 01-setup-panel.png: title, SETUP chip, subtitle, segmented rows (selected cyan), 2 decks + Import, mint Start with play icon, caption. Length is segmented not slider (documented) |
| R5-S1b | 07 S1 | Title and subtitle layout | gap (low) | Title "Eyes Up" is not left-aligned with row labels and the SETUP chip floats right; panel sits low over busy wall art so the lower rows overlap picture frames |
| R5-S2 | 07 S2 | halos, only 2 members in FOV, "Why glasses" pill | match | 02-audience-lit-halo.png: lit cyan/white halo on watched member, dim neighbor |
| R5-S2b | win | first-frame value visible in 3 min video | gap (low) | pill text in the hero capture is tiny at video scale; hero still reads mostly as two grey silhouettes |
| R5-S5 | 07 S5 | Summary content | match | 06-summary.png: Nice work, Balance badge, L/C/R bars, timeline with nudge and longest look-away, 2 tiles, tip, Again/Done/Re-place, Session complete chip |
| R5-S5b | 07 S5 | tile and tip legibility | gap (low) | stat tiles are translucent and the picture-frame art shows through their text; the tip bar text is amber on a busy background |
| R5-S3/S4/S6 | 07 | nudge, podium, video | match | unchanged since round 4 (LEAF nudge/card PASSED live, devpost/walkthrough/03-05) |
| R5-R1/R2/R5 | 01 | public repo, YouTube, device | blocked | needs YouTube login / Spectacles |

## Audit round 5b (confirmation pass, 2026-11-01)

Live headless MCP: 6 done-criteria LEAF scenarios PASSED (2.6, 4.3, 11.8, 7.6, 7.9, 8.0 s), no E/F lines (editor W lines only). `npm run check`: 129/129 pass, typecheck and lint clean. Reviewed devpost/screenshots 01, 03, 05, 06 against S1, S3, S4, S5.

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| R5b-T | tests | check, typecheck, lint, LEAF 6 | match | 129/129, 6 PASSED live |
| R5b-states | 05 MVP / 06 flow | all state-machine nodes and edges (Setup, Placing, Rehearsal, Nudge, CardExpanded, TimeUp, Finishing, Summary, Again/Done/Re-place) | match | EyesUpSession and AppStateMachine tests, rehearsal.integration, LEAF finish_shows_summary |
| R5b-S3a | 07 S3 | amber chevron + "left" clearly visible | gap (low, win) | 03-nudge-chevron.png: chevron and "left" are faint amber at low alpha over the wall, much weaker than the mockup; may not read at video scale |
| R5b-S4a | 07 S4 | clean podium still | gap (low, win) | 05-podium.png has a "[capture_podium] PASSED" LEAF log overlay at top and a stray floor-line bar; remove or crop before it is used in Devpost media |
| R5b-S5c | 07 S5 | tiles opaque enough | gap (low) | 06-summary.png tiles still translucent over picture-frame art (unchanged from R5-S5b) |
| R5b-ASR | 05 Stretch | ASR filler counter | blocked | stretch, needs Snap login, not implemented |
| R5b-sub | 01 Submission | public repo, YouTube URL in submission.md, device test | blocked | submission.md lines 65-66 still await the YouTube URL (entrant login); no Spectacles |

## Polish round 6 (2026-11-01, judge-visible gaps)

Live headless MCP: 8 LEAF scenarios PASSED (the 6 done criteria plus repeated_nudge and finish_pulses_at_time), no E/F lines. `npm run check`: 130/130 tests, typecheck and lint clean. Screenshots retaken: devpost/screenshots 01, 02, 03, 05, 06 and devpost/walkthrough 01, 02, 03, 05, 06. The demo video (.local/video) was not rebuilt: it still shows the earlier Setup, pill, nudge and Summary looks, so it now differs from the build and the screenshots.

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| R6-S1b | 07 S1 | title aligned with row labels, rows clear of wall art | match | SetupPanel.ts: title and subtitle left-aligned; EyesUpApp.ts: Setup panel now 10 cm above eye level (was 10 cm below). 01-setup-panel.png |
| R5b-S5c / R5-S5b | 07 S5 | stat tiles opaque, tip readable | match | EyesUpUI.ts BOX_SOLID / BOX_AMBER_SOLID / TEXT_TIP (brighter fills, pale tip text); Summary raised 17 cm so tiles and tip no longer sit over the picture frames (the display is additive, so only brightness and position help). 06-summary.png |
| R5-S2b | win | opening pill readable at video size | match | EyesUpApp.ts PILL_SCALE 0.9 -> 1.3, PILL_Y 5 -> 10 (clears the halo). 02-audience-lit-halo.png |
| R5b-S3a | 07 S3 | chevron and "left" clearly visible | match | EyesUpApp.ts: chevron 6 -> 10 cm, caption 90 -> 150, amber backing box, pulse floor 0.75 (NudgeController.chevronAlpha, unit test). 03-nudge-chevron.png |
| R5b-S4a | 07 S4 | clean podium still | match | 05-podium.png recaptured with no LEAF log overlay and cropped above the stray stage-line bar |

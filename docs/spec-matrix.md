# Spec matrix (artifact "specs" section vs running product)

Current state (2026-11-06, redesign): the rendering style of every screen deviates from the artifact mockups on purpose (see the last section, "Redesign: glass-native luminous line UI and volumetric audience"); layout, flow, information and copy still match the mockups. `npm run check` passes with 195 tests (typecheck and lint clean); 10 LEAF scenarios PASSED live in the Interactive Preview one at a time (see the section for the run). Preview only, gaze driven by LEAF, not tested on a Spectacles device. The sections below are dated history; where a row quotes colours, fills or sizes from an earlier cycle, the redesign section supersedes it.

Current state (2026-11-05, cycle 5; the list below is mostly history): `npm run check` 183 tests pass, typecheck and lint clean; 10 LEAF scenarios PASSED live in the Interactive Preview one at a time, no E/F lines from project scripts; screenshots 00 to 06, 09 to 11 and walkthrough 01 to 08 retaken or rebuilt from live captures that were looked at (last section below). Preview only, gaze driven by LEAF, not tested on a Spectacles device. The demo video under `.local/video/` (not committed) is rebuilt once at the end from the same pipeline (`scripts/video/`); rows about it below describe earlier cuts.

Earlier state (before cycle 3), kept for the record: (2026-11-04, game layer): `npm run check` 166 tests pass, typecheck and lint clean; 10 LEAF scenarios PASSED live in the Interactive Preview (8 earlier + `neglect_disengages_then_recovers`, `finish_gives_grade`); game layer rows are in the last section below; walkthrough and screenshots retaken (02 to 06, new 10 and 11). The demo video below was cut before the game layer and is unchanged. Earlier state (2026-11-03): `npm run check` 139 tests pass, typecheck and lint clean; 8 LEAF scenarios PASSED live in the Interactive Preview; demo video 1:33 (`.local/video/eyes-up-demo.mp4`, not committed; cycle-3 rebuild 2026-11-03: opening is the hero halo frame with the title, a 1.5 s drawn "Eyes drop" card, the live Setup pinch zoomed 1.5x with one chip and a 0.3 s cross-dissolve to the lit halo; one clean nudge plus a 2 s "again"; podium trimmed to the Next pinch with the chevron outside the crop; Notes shortened; Summary holds the full panel 2 s then zooms to the timeline with an arrow label; new card with three real before/after pairs and the Summary Again line; shorter build card; cycle-2 rebuild: disclosure once then PREVIEW pill, "You look -> they light up" caption on the halo frame by 0:08, clipped cue/pill footage trimmed out, CLAD/MCP/LEAF card with 8/8 and 139, close card with 36 px Shown / Not yet tested boxes and a halo end frame; cycle-3: end frame lower-third carries the repo link and "Preview only, LEAF 8/8"; submission.md reordered tagline, hero image, pitch, Judge box with real video times, plus a "What we would test next" list). Preview only, not tested on a Spectacles device.

Historical note, dated audit round 1 (2026-11-01, superseded): Evidence: live Lens Studio 5.24.1 preview via MCP (screenshots in the audit scratchpad `converge/eyes-up/live-*.png`), `npm run check` (123 tests pass, typecheck and lint clean), 6 LEAF scenarios PASSED live.

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
| S1 | 07 S1 Setup | Panel 40x30 with title, SETUP pill, subtitle, 3 segmented rows, Start rehearsal (mint, play icon), caption | match (round 1) | fix-r1/setup.png: title, pill, subtitle, segmented 3/5/10 and 3/6/9 (selected cyan), deck list (selected cyan), mint Start with play icon, caption. Panel is 40x30 centered 10 cm above eye level (EyesUpApp SETUP_BELOW_EYES_CM = -10, negative = above; first built below, moved above in R6-S1b); deck buttons and an Import button share one row. Length is segmented, not the mockup's track slider (pinch-only targets) |
| S2 | 07 S2 Hero | Audience halos, pill "Why glasses", retical off, only info above audience | match (round 1) | halo lit color is now saturated cyan (W1), fix-r1/halo.png shows a clear cyan disc on the watched member; only 2 silhouettes in FOV as designed |
| S3 | 07 S3 Nudge | Amber double chevron + "left" caption at left edge | match | devpost 02/05, README |
| S4 | 07 S4 Podium + card | Card 50x18 with title and 2 bullets, countdown line; podium with Prev/Next/Finish | match | live-podium.png; card has title only in live-audience frame (bullets fade after pill) |
| S5 | 07 S5 Summary | Title, Balance badge, bars, timeline, 2 stat tiles, tip, Again/Done, Session complete chip | match | live-summary.png has all |
| S6 | 07 S6 Video keyframe | Lens Studio window with hierarchy, preview, inspector, logger | match | demo video rebuilt 2026-11-01 (`.local/video/eyes-up-demo.mp4`, 2:35, not committed) from a fresh live demo_reel capture of the current build: segmented Setup panel, cyan halos, cue card/pill/dwell and the 0:42 Summary are live footage; nudge and podium use labelled stills (the scripted reel cannot turn the camera). Narration/test count (129) updated. Evidence: scripts/video/shots.mjs, scratchpad converge/eyes-up/fix-r2 |
| R1 | 01 Submission | Public repo | match | gh repo view sh0sub/eyes-up: PUBLIC (2026-11-01) |
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

Earlier state (before the game layer; now 166 tests and 10 LEAF scenarios): live headless MCP: 8 LEAF scenarios PASSED (the 6 done criteria plus repeated_nudge and finish_pulses_at_time), no E/F lines. `npm run check`: 130/130 tests, typecheck and lint clean. Screenshots retaken: devpost/screenshots 01, 02, 03, 05, 06 and devpost/walkthrough 01, 02, 03, 05, 06. The demo video was rebuilt in round 7 (below).

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| R6-S1b | 07 S1 | title aligned with row labels, rows clear of wall art | match | SetupPanel.ts: title and subtitle left-aligned; EyesUpApp.ts: Setup panel now 10 cm above eye level (was 10 cm below). 01-setup-panel.png |
| R5b-S5c / R5-S5b | 07 S5 | stat tiles opaque, tip readable | match | EyesUpUI.ts BOX_SOLID / BOX_AMBER_SOLID / TEXT_TIP (brighter fills, pale tip text); Summary raised 17 cm so tiles and tip no longer sit over the picture frames (the display is additive, so only brightness and position help). 06-summary.png |
| R5-S2b | win | opening pill readable at video size | match | EyesUpApp.ts PILL_SCALE 0.9 -> 1.3, PILL_Y 5 -> 10 (clears the halo). 02-audience-lit-halo.png |
| R5b-S3a | 07 S3 | chevron and "left" clearly visible | match | EyesUpApp.ts: chevron 6 -> 10 cm, caption 90 -> 150, amber backing box, pulse floor 0.75 (NudgeController.chevronAlpha, unit test). 03-nudge-chevron.png |
| R5b-S4a | 07 S4 | clean podium still | match | 05-podium.png recaptured with no LEAF log overlay and cropped above the stray stage-line bar |

## Polish round 7 (2026-11-01, verifier follow-ups)

Earlier state (before the game layer; now 166 tests and 10 LEAF scenarios): live headless MCP: 8 LEAF scenarios PASSED, no E/F lines. `npm run check`: 130/130 tests, typecheck and lint clean.

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| R7-S4 | 07 S4 | podium still has no stray bar | match | the bar was the StageLine floor strip entering the capture; 05-podium.png recaptured and cropped to 1600x745 above it (devpost/screenshots, walkthrough) |
| R7-S3 | 07 S3 | nudge box and opening pill do not touch | match | EyesUpApp.ts CHEVRON_X_CM 21, CHEVRON_DROP_CM 6.5: backing top sits 21 px below the pill in 03-nudge-chevron.png |
| R7-S5 | 07 S5 | Summary and Re-place buttons clear the picture frames | match | SUMMARY_ABOVE_EYES_CM 17 -> 20; 06-summary.png shows about 20 px of wall between the panel border and the frames |
| R7-S2 | win | gallery shows the larger pill clear of the halo | match | .local/screenshots/01-halo.png regenerated from the new video (gallery moment 0.8 s into the halo segment) |
| R7-S6 | 07 S6 | demo video matches the current build | match | .local/video/eyes-up-demo.mp4 (2:39, not committed) rebuilt from a fresh all-live real-camera capture (nudge, podium, cue, Summary all live; no stills); narration says 8 scenarios, 130 tests, 1:40 run with 16 % left. Previous file kept as eyes-up-demo-prev.mp4 |

## Polish round 8 (2026-11-01, chevron never covers a panel)

Earlier state (2026-11-01, before the game layer; now 166 tests and 10 LEAF scenarios): live headless MCP, 8 LEAF scenarios PASSED, no E/F lines. `npm run check`: 139/139 tests, typecheck and lint clean.

| id | artifact section | expected | status | evidence |
|---|---|---|---|---|
| R8-S3 | 07 S3 | nudge chevron stays at the view edge and never overlaps the podium, cue card/pill or any panel | match | core/ChevronPlacement.ts (placement rule, tests/unit/ChevronPlacement.test.ts): panels are projected into the chevron's view plane each frame; the chevron keeps its edge spot, else takes the nearest clear spot beside, above or below, else is hidden (chime still plays). Fixes the right chevron covering the podium's right edge in the video |
| R8-S6 | 07 S6 | demo video matches the current build | match | `.local/video/eyes-up-demo.mp4` (2:45, not committed) re-recorded live; frames checked around every nudge (left and right chevrons at the audience, beside/below the podium, beside the pill and card); narration says 1:55 run with 17 % left. Previous file kept as eyes-up-demo-prev.mp4 |
| R8-S3b | 07 S3 | nudge still | match | 03-nudge-chevron.png / walkthrough 03-nudge.png recaptured: chevron sits 0.8 cm lower, clear of the centered pill |
| R9-S5b | 07 S5 | stat tile labels unambiguous | match | The old "Cards · Nudges 1 of 5 · 1" tile is now three tiles: Longest look-away, "Cards 1 of 5", "Nudges 1" (the S5 spec lists Cards "2 of 5" and Nudges "1" separately). `summaryState.cardsLabel` / `nudgesLabel` unit-tested. Live check: nudge label sits clear of the axis and strip. 06-summary recaptured from `capture_summary` (0:45, Balance 87, 26/32/42), video rebuilt (2:52 at the time, since replaced by the current 2:14 cut: see header), 139 tests, 8/8 LEAF PASSED |

## Cycle 4: game layer (2026-11-04)

Verified live in the Lens Studio 5.24.1 Interactive Preview: `npm run check` 166/166 (158 when this round was first verified), 10 LEAF scenarios PASSED, no E/F lines from project scripts. Captures reviewed: `devpost/screenshots/02`, `03`, `04`, `05`, `06`, `10`, `11`. Preview only, gaze driven by LEAF, not tested on a device.

| id | source | expected | status | evidence |
|---|---|---|---|---|
| G1 | jury: low fun / emotional hook | Neglected members visibly disengage over time and recover when looked at | match | `core/Engagement.ts`, `core/AudienceLook.ts`, `AudienceRig.ts`; Node tests (decay after 5 s grace, 20 s to zero, 1.5 s recovery, perk-up under 0.7); LEAF `neglect_disengages_then_recovers` PASSED (Head y sinks, recovers); `walkthrough/07-engagement-slump.png`, `08-perk-up.png` |
| G2 | jury | Readable at 2.5 m, saturated colours on the additive display | match (preview) | silhouette tint (0.2, 0.6, 1.0, 0.72), desaturated grey-lavender when disengaged (cycle 5), amber phone glow, cyan burst; legibility on real optics still unverified |
| G3 | game layer | Small glanceable room meter, no clutter | match | `RoomMeter.ts`: 52 cm bar plus percent between heads and card, cyan / amber / coral; tone unit tested |
| G4 | game layer | Summary shows attention score and S/A/B/C grade from balance and engagement | match | `core/GameScore.ts` (score = balance x (0.35 + 0.65 x avg engagement); S 85, A 70, B 50); LEAF `finish_gives_grade` PASSED; `walkthrough/06-summary.png` |
| G5 | game layer | Best previous on replay, session memory only | match (unit tested) | `EyesUpSession` keeps `best` across Again / Re-place, resets with the Lens; label "New best! (was n)" / "Best so far n"; not shown live in a capture (needs a second full run) |
| G6 | game layer | Applause intensity scales with the score | match (unit tested) | `applauseAmplitude` 0.02 to 0.09, `applauseVolume` 0.3 to 1; audible difference unverified |
| G7 | jury: grey-on-grey | Less grey-on-grey silhouettes and halos | match | unlit halo ring alpha 0.15 to 0.3 and bluer, silhouettes saturated blue, cue card indigo with cyan frame; `walkthrough/02-audience.png` |
| G8 | jury: text too small | Larger cue card and tag text | match (preview) | card 84 x 34 cm, title 290, bullets 180, tag effective size 348 (was 312); `walkthrough/04-cue-card.png`; legibility on real optics unverified |
| G9 | video | Demo video shows the game layer | gap | video not re-cut this cycle; `submission.md` says so under "What is not done" |

## Cycle 5: judge-facing polish (2026-11-04)

Verified live in the Lens Studio 5.24.1 Interactive Preview with fresh window captures that were looked at: `npm run check` 166/166, 10 LEAF scenarios PASSED. Preview only, gaze driven by LEAF, not tested on a device. The demo video is not re-recorded in this cycle.

| id | source | expected | status | evidence |
|---|---|---|---|---|
| C1-1 | judge: slump unreadable in stills | Slump readable next to an engaged member in one frame | match (preview) | `core/AudienceLook.ts` (body desaturated to 0.66, 0.66, 0.74 @ 0.42, sink 22 to 30 cm, head roll 25 deg, `zzz` marker), `AudienceRig.ts` (rounded phone screen, stepped light cone, zzz text); 3-person capture in `capture_game`; `screenshots/10`, `11`; Node tests for tilt, zzz, desaturation |
| C1-2 | judge: Summary text too small, clipped | Grade is the hero, tip second, no sub-legible text, panel fits the frame | match (preview) | `SummaryPanel.ts`: target line, axis ticks and "nudge" word removed, Balance folded into the score tile, grade tile 14 x 13 cm at size 520 (was 260), tip Title2, panel scale 0.85; `screenshots/06`; `engagementShort` unit tested |
| C1-3 | judge: stale numbers and images | 10/10, 166 tests everywhere, no log text in the process card | match | `scripts/gallery/process-image.html` rebuilt (three fixes, no LEAF text); 07-preview-landscape, 01-setup-panel-first-build, 08-halo-cyan moved to `screenshots/archive/`; `shots.mjs` and `build-video.mjs` numbers and paths updated |
| C1-4 | judge: hero is a grey debug capture | New hero, 1800 px, no LEAF text, game hook visible | match | `scripts/gallery/hero.html` to `screenshots/00-hero-eyes-up.png`; README and `submission.md` point at it |
| C1-5 | judge: headline features buried | Hero, slump, perk-up, summary first, one truthful caption each | match | `submission.md` "Gallery order" |
| C1-6 | judge: meter covered, chevron overlaps | Meter readable, chevron an outline clear of heads | match (preview) | `RoomMeter.ts` label at the left end on a dark plate, meter 6 cm higher with the card lifted 6 cm; chevron is four outline bars plus a 12 % fill; `ChevronPlacement.ts` scans for free pockets; `EyesUpApp.ts` passes heads and the meter as obstacles with fallbacks; 3 new placement tests; `screenshots/02`, `03`, `04`. Limit: in the narrow preview view there is no free wall above the heads, so the chevron can still sit over a body |


## Cycle 2 (2026-11-04): fit the frame, readable Summary

Verified live in the Lens Studio 5.24.1 Interactive Preview with window captures that were looked at: `npm run check` 166/166, 10 LEAF scenarios PASSED. Preview only, gaze driven by LEAF, not tested on a device. Lens viewport and chevron rules: see `devpost/build-notes.md` "Cycle 2".

| id | source | expected | status | evidence |
|---|---|---|---|---|
| M1 | jury: right member hard-clipped | All members inside the frame with margin; 10 vs 11 readable | match (preview) | cause: the preview draws the lens in a viewport about 537 of 870 px wide (about +-72 cm at 2.5 m). `StagePlacer.ts` seats 3 or fewer 42 cm apart (`smallAudienceSpacingCm`, unit tested). `screenshots/02, 03, 04, 10, 11` and `walkthrough/02 to 08` retaken. 10: Room 43 %, two slumped. 11: mid-burst ring pulse, Room 83 % |
| M2 | jury: Summary unreadable at gallery size | Panel about 1.4x, one stats line, bigger zones, buttons on an opaque plate | match (preview) | `SummaryPanel.ts` scale 1.2, zone text 92, `statsLine` (unit tested), button plate, panel 29 cm above eyes; `screenshots/06-summary.png`, `06b-summary-grade-zones.png`, `walkthrough/06-summary.png`. The Again / Done row now sits about 15 px over the top of the picture frames in the capture, on its own opaque plate |
| M5 | jury: ghosts, capsule phone, boxed chevron | Muted blue slump, no chevron box, ring pulse | match (preview) | `core/AudienceLook.ts` BODY_DISENGAGED 0.44, 0.50, 0.82 @ 0.50 (about 58 % of engaged saturation), `pulseScale` / `pulseAlpha`; `AudienceRig.ts` ring of 24 bars; chevron box removed and silhouettes kept clear in `EyesUpApp.ts`; the phone was already a rounded rectangle with a light cone |
| M4 | jury: learning angle buried | Three-line opener, lessons, how it was built | match | `devpost/submission.md` top, `README.md` top |
| M6 | repo: stale numbers | 166 tests, 10/10 everywhere, history marked | match | grep of README, devpost, docs; earlier 130 / 139 / 8-scenario lines carry "Earlier state" |


## Cycle 3 (2026-11-04): learning line, trimmed gallery, framing

Verified live in the Lens Studio 5.24.1 Interactive Preview with window captures that were looked at: `npm run check` 168/168, 10 LEAF scenarios PASSED (`start_places_audience` now checks the new default of 3). Preview only, gaze driven by LEAF, not tested on a device.

| id | source | expected | status | evidence |
|---|---|---|---|---|
| S1 | judge: no stated learning goal | Bold goal / feedback / practice line plus the honest limit under the tagline | match | `devpost/submission.md` and `README.md` top |
| S2 | judge: weak last images | Gallery of 6 (hero, 10, 11, 06, 09, 03), the rest as text links | match | `devpost/submission.md` "Gallery order", `README.md` "Gallery" |
| S3 | clipped 6-member arc, slumped heads out of frame | Default room fits the viewport; slumped heads stay in frame | match (preview) | `DEFAULT_CONFIG.audienceCount` 3 (Setup shows 3 selected), `floorOffsetCm` 154 (stage 6 cm higher; 12 cm pushed the first card past the top of the view), tests in `StagePlacer.test.ts` and `PanelModels.test.ts`; LEAF scenarios that need members in every zone pick 6 (`setUp(6)`) |
| S4 | busy wall art behind heads, zzz on art, meter touching a halo | Quiet backdrop, zzz above the head, meter higher | match (preview) | faint dark plate (`AudienceScrim`, 35 % alpha, three non-overlapping quads, alpha-blended so no effect on additive optics), preview camera turned 175 cm toward the plain curtain wall (`MovePreviewCamera` lookAt (175, -12, -250), Setup uses (0, -12, -250)), `zzz` at head + (14, 32), meter 4 cm higher with the card 4 cm higher |
| S6 | repo: count drift | One test count everywhere | match | 168 in README, devpost, docs, `scripts/gallery/process-image.html`, `scripts/video/shots.mjs`; process card re-exported |


## Cycle 4 (2026-11-04): hook first, repeatable framing, Summary and meter legibility, learning loop

Verified in the Lens Studio 5.24.1 Interactive Preview with window captures that were looked at: `npm run check` 172/172, 10 LEAF scenarios PASSED from a refreshed preview at the canonical camera pose. Preview only, gaze driven by LEAF, not tested on a device.

| id | source | expected | status | evidence |
|---|---|---|---|---|
| A1 | judge: hero idea lands late | Tagline, one-line hook, hero and a 3-bullet Judge box on the first screen; no old-cut timestamps; README order matches | match | `devpost/submission.md` top, `README.md` top; "What I learned" and "How it was built" sit after "What it does" |
| D1 | preview state leaks; clipped heads | Fixed camera pose, repeatable framing, zzz above its own head, heads inside a 10 % margin tested | match (preview) | `scripts/video/preview-reset.sh`, `leaf-all.sh`; `core/Framing.ts` + `tests/unit/Framing.test.ts`; LEAF `start_places_audience` checks the projection; `AudienceRig.ts` zzz at x 0; chevron keeps clear of visible zzz. Stage height unchanged (154): raising it 5 cm cut the opening card at the top. Recaptured 00, 02 to 06, 10, 11 |
| A2 | learning claim is prose only | Run 1 vs Run 2 table with real numbers, labelled scripted and illustrative, plus a row on the process card | match | LEAF `capture_loop` log (leaf-results row 16); table in `submission.md`, `README.md`, `learnings.md`; `process-image.html` row; 09 re-exported |
| D3 | Summary payoff tiny | No toast, no stat line, zone text 120 (1.3x), timeline 15 cm / rows 3.4 cm (about 1.6x / 1.8x taller), buttons 5.6 cm, Again wide and primary | partial | `SummaryPanel.ts`: timeline is 1.6x taller (not the full 2x) to keep the panel in frame; panel 74 cm at scale 1.12. Recaptured 06 and 06b |
| D4 | Room meter reads weakly | Darker plate, 50 % tick, amber to cyan at 60 %, 20 px+ label | partial | tick, bright frame, lighter track, label 270 and `METER_GOOD_AT` 0.6 (unit tested) done. A darker plate is not possible: the Preview draws these quads additively (an opaque black plate was invisible), documented in `RoomMeter.ts` and `submission.md` |


## Cycle 5 (2026-11-05): Summary in frame, legible slump, comparison images, CLAD card

Verified in the Lens Studio 5.24.1 Interactive Preview with window captures that were looked at: `npm run check` 183/183, 10 LEAF scenarios from a refreshed preview at the canonical camera pose (see `devpost/leaf-results.md`). Preview only, gaze driven by LEAF, not tested on a device.

| id | source | expected | status | evidence |
|---|---|---|---|---|
| R1 | judge: Summary clipped at the top, grade payoff invisible | Whole Summary (header, grade) inside the viewport, top 8 to 16 % below its edge; grade larger, tip bar larger, Again the only filled button, Done and Move stage outlines, legend for the red block | match (preview) | `core/Framing.ts` `SUMMARY_*` + `summaryExtent`, test in `Framing.test.ts`; `SummaryPanel.ts` (50 x 78 cm, scale 1.08, centre 6.5 cm below eyes, grade 650, tip 148 / 116, legend), `EyesUpUI.ts` (`outline`, `subline`); `screenshots/06`, `06b`, `walkthrough/06` recaptured from `capture_summary` |
| R2 | judge: slump reads as blue blobs, phones cropped | Legible slump, phone glow inside the bottom 4 % | match (preview) | `AudienceLook.ts` (sink 34, tilt 30, dimmer body), `Tunables.floorOffsetCm` 149, `PHONE_Y_CM` 86; Framing unit test and LEAF `start_places_audience` assert the phone margin; `screenshots/00, 10, 11` recaptured. Limit: full torsos still do not fit the 1.6 m viewport |
| R3 | judge: no side-by-side learning proof | Run 1 vs Run 2 image, slump-to-perk-up image, who learns what | match | `12-run-compare.png`, `10b-slump-to-perk-up.png` (sources in `scripts/gallery/`), "Who it is for" in `submission.md`, "Who learns what" in `README.md` |
| R4 | judge: text-heavy first screen, file paths, defensive last bullet | Hero, hook, Learn / For, three inline images with captions; gallery references; disclosures grouped | match | `devpost/submission.md`, `README.md`, hero 00 re-exported with the Learn / For line |
| R5 | judge: small Setup, podium and cue-card text | About 1.3x text, bigger Start, opaque plates, meter 3 cm clear of the card | match (preview) | `SetupPanel.ts` (46 x 34 cm), `Podium.ts` (38 x 12.5 cm), `EyesUpApp.ts` card 100 x 26 cm, title 330, bullets 235, `CARD_LIFT_CM` 17, `EyesUpUI.ts` opaque `SURFACE_FILL`; `screenshots/01, 04, 05` recaptured. Legibility on real optics unverified |
| R6 | judge: no single-glance CLAD / MCP evidence; stray pill label | Card 13 with architecture, steps and real log lines; pill label "Pill hit area" | match | `13-clad-mcp.png`, `scripts/gallery/clad-mcp.html`, `process-image.html`; 09 re-exported |

## Cycle 6 (2026-11-05)

| Id | Judge issue | Change | Status | Evidence |
|---|---|---|---|---|
| D2 (A3, D3) | bodies hard-cut, no ground, slumped heads bigger than lit head | alpha fade over the lower body, soft floor shadow, slumped head scale capped at the lit head, meter and card raised for a 2 cm gap above the tallest head | match (preview) | `core/BodyFade.ts`, `tests/unit/BodyFade.test.ts`, stills 00, 02, 10, 10b, 11 |
| D1 | chevron and "left" on the first head | no-go rectangles around every head and halo | match (preview) | `ChevronPlacement.test.ts` (left member slumped), still 03 and walkthrough 03 |
| A2 | no wearer view or scale | `14-glasses-scale.png`, gallery image 3 | done | `scripts/gallery/glasses-scale.html` |
| A7 | no learner before/after | 3-row table and rationale under the loop | done | `devpost/submission.md` |
| A5 | long submission, stale text | judge block under the hero, Not claimed in 4 lines, 8 cm stage figure, URL placeholder marked last step | done | `devpost/submission.md`, `build-notes.md` |
| A4 | 29 s vs 28 s | log uses the Summary formatter, all images read 28 s | done | `13-clad-mcp.png`, `12-run-compare.png` |

`npm run check` 183 tests; 10 of 10 LEAF scenarios PASSED. Preview only, gaze driven by LEAF, not tested on a device.

## Design cycle 1 (2026-11-05): visual design

Verified in the Lens Studio 5.24.1 Interactive Preview with window captures that were looked at. `npm run check` 183/183, no logic changes. Preview only, gaze driven by LEAF, not tested on a device.

| id | screen | problem | change | status | evidence |
|---|---|---|---|---|---|
| D1 | all panels | pale grey-lavender square panels, broken-corner borders | shared panel material: navy #0B1230 at 78 %, rounded runtime meshes, 0.18 cm #7FB0FF 35 % stroke, cyan glow ring on the selected segment | partial (preview) | `EyesUpUI.ts` (`addRoundedSurface`), 01 / 04 / 05 / 06. On the additive Preview navy reads as a faint tint, not a dark plate; the chevron disc uses a luminous blue for that reason |
| D2 | all | inconsistent, tiny text | 4 steps: Title 104, Heading 72, Body 60, Caption 46 at 110 cm; SETUP chip and units at Caption or larger; primary actions one step up | match, with 2 deviations | Body 0.9 / Caption 0.7 cm instead of 0.8 / 0.6 (stills still small); Start, Next, Again are Heading / Title, not Body, so the one filled button leads. Summary hero sizes unchanged |
| D3 | perk-up, room meter | ring crossed the Room label, meter against the card, track like the card | ring mesh capped at scale 2.1, 2.6 cm gap, dark track + saturated fill, Room % in a capsule pill | match | 11-perk-up, 04, 10 |
| D4 | cue card, pill | title on the border, centred ragged bullets, pill = card | 2.8 cm padding, left-aligned Heading + cyan bar, Body bullets with cyan dots, n / N counter, capsule pill with cyan dot, 0.25 s fade + scale | match | 04-cue-card, 02, 10 |
| D9 | nudge chevron | small, amber on beige, weak caption | dark-blue backing disc with amber rim, "Look left" / "Look right", 1 Hz pulse, 3 s | partial | 03-nudge-chevron. Glyph 10 -> 7.6 cm (mark 11.2 cm with the disc): the viewport is +-28.9 cm wide at the 100 cm plane; x = +-21.5, not at the very edge |

Mockup deviations (artifact S1 to S5), kept because they read better on glasses:

- S1 Setup: panel corners rounded, SETUP chip kept but at Caption; segment values and Start are Heading (artifact: small); no other layout change.
- S3 Nudge: caption "Look left" / "Look right" (artifact: "left" / "right"), round dark disc behind the chevron (artifact: no backing).
- S4 Card: 110 x 28.5 cm (artifact 50 x 18, cycle 5: 100 x 26), left-aligned with accent bar, counter and dots (artifact: centred title and bullets).
- S5 Summary: rounded navy tiles and plate; Again leads with Heading, other buttons Body (artifact: one size).
- Room meter has no outer plate; "Room NN%" sits in its own capsule left of the track (cycle 4 note: no plate can be darker than the wall in the Preview).

## Design cycle 2 (2026-11-05): luminous dark material (E1)

Verified in the Interactive Preview, Interactive scene "Evening Room" (the darkest of the six; "Sunlit Room" washed every panel to grey-lavender). `npm run check` 183/183, 10 of 10 LEAF PASSED.

| id | screen | problem | change | status | evidence |
|---|---|---|---|---|---|
| E1 | all panels, buttons | panels read grey-lavender over a beige room, additive rule not met | `PANEL_FILL` #070D22 at 88 %, `PANEL_STROKE` #9CC4FF at 55 %, 0.24 cm (about 2 px). Idle button #101A3A with #5E86D6 0.18 cm stroke; selected segment #12324F with #5FD4FF 0.24 cm stroke and a 40 % cyan glow ring; 35 % black dimmer (`DIMMER_COLOR`) behind every panel (12 cm margin, `makePanel`) and behind the audience (the existing scrim, now pure black) | match, with 2 deviations | 01, 02, 03, 04, 05, 06, 10, 11 retaken |

Deviations: (1) the dimmer is a plate behind each panel and the audience, not one full-screen plane, so it never covers the room outside the UI. (2) The Preview draws these quads like an additive display, so a dark fill only shows as much as the room behind it is dark; the real gain comes from the Evening Room capture. On glasses black is clear anyway, so the dimmer costs nothing there. The Primary / amber / mint action buttons keep their cycle-1 faces. Stills 12 (run compare) and 13 (CLAD / MCP) still show the earlier look.

## Design cycle 3 (2026-11-06): F1 no dimmer, F8 one-capsule room meter

| id | screen | problem | change | status | evidence |
|---|---|---|---|---|---|
| F1 | Setup, slump, podium, Summary | stepped lighter / darker rectangles (full dimmer plates, audience scrim, stacked phone-glow rectangles) read as rendering bugs | `DIMMER_COLOR`, the per-panel "Dimmer" plate and the audience scrim are deleted. Each panel is one rounded unlit plate (`PANEL_FILL` #070D22 at 90 %, stroke ring) at fixed render order `PANEL_BACKDROP_ORDER` -10; every audience mesh (body, head, halo, phone, shadow) is set to `AUDIENCE_RENDER_ORDER` -20, so panels always draw over the audience. The phone's light cone is now nested ellipses instead of four stacked rectangles | match, 2 deviations | 01 to 06, 10, 11 retaken; no axis-aligned patch left except the flat floor-shadow bars |
| F8 | room meter | pill and bar differed in height, 1 px tick, off-centre, touching the lit head | one capsule (53 x 5.3 cm in stage space, the 24 x 2.4 cm spec scaled about 2.2x for the 2.5 m distance), centred on the audience, 4 cm above the lit head top; fill cyan at 70 % or above, amber below, coral below 40 % (`METER_GOOD_AT` 0.7, `METER_MID_AT` 0.4, unit tested); 1 cm (3 px) white tick at 70 % with a "target" caption; "Room NN%" is one caption line above the capsule's left end | match, 1 deviation | 02, 04, 10, 11 |

Deviations: (1) the audience is separated from panels by render order only, not a 0.5 cm depth offset: the silhouettes are 3D meshes that are billboarded at different depths, and fixed render order is what actually decides the draw order in the Preview (a depth offset would not survive the 2.5 m perspective). (2) The Preview draws all quads like an additive display, so a dark plate still reads as a faint lighter patch over the wall; on glasses it is clear. The label "Room NN%" sits above the capsule instead of inside it, so the fill stays one clean shape. Known: at the very peak of a perk-up burst the ring (about 26 cm from the head centre) can touch the capsule; the stills use the frame before the peak. Stills 12 and 13 are unchanged.

## Design cycle 4 (2026-11-06): G5 panel glow, G9 larger nudge chevron

Verified in the Interactive Preview (scene "Evening Room") with window captures that were looked at. `npm run check` 183/183. Preview only, not tested on a Spectacles device.

| id | screen | problem | change | status | evidence |
|---|---|---|---|---|---|
| G5 | Setup, cue card, podium, Summary | the material (navy #070D22 at 90 %, 0.24 cm #9CC4FF stroke at 55 %) was already shared, but panels had no light of their own and read as flat slabs over the room | `addPanelGlow` in `EyesUpUI.ts`: a 1 cm cyan (#5FD4FF) falloff outside the stroke, three stepped bands at 20 / 12 / 5 %, render order `PANEL_GLOW_ORDER` (-11, after the audience, before the panel fill); used by `makePanel` (Setup, podium, Summary) and the cue card | match (preview) | devpost 01, 04, 05, 06; walkthrough 01, 04, 05, 06 |
| G9 | nudge chevron | small disc beside the slumped heads | disc radius 5.6 -> 7 cm, icon 7.6 -> 9.4 cm, caption kept, 1 Hz pulse kept; the block is centred vertically on the frame and its outer edge sits 3 cm inside the Lens frustum edge (`CHEVRON_EDGE_GAP_CM`, computed from camera fov and aspect); `placeChevron` still moves it clear of heads, "zzz", meter, pill, podium; existing 3 s timeout and turn-to-dismiss unchanged | partial (preview) | 03-nudge-chevron.png |

Deviations and disclosures:
- Evening Room: the capture environment stays "Evening Room", the darkest of the six Interactive Preview scenes (it was chosen in cycle 2 because "Sunlit Room" washed panels to grey-lavender). It is a dark brown, not the bluer room asked for; a bluer preview environment is not available in this Lens Studio build. The submission therefore shows the panels over a dark brown room, as the Preview paints it.
- Glow is stepped bands, not a blur: Lens Studio's unlit material has no blur pass, so three concentric rounded rings at falling alpha approximate the 1 cm / 20 % spec. On the Preview it is faint over the brown room.
- Chevron "vertical centre": when a slumped head, "zzz" or the room meter occupies the frame centre (the usual case at the left and right members) the placement rule moves it to the nearest clear spot, so in the nudge still it sits just above the heads, not exactly at mid-height. Disc radius read as 7 cm (the old radius was 5.6 cm, so a 7 cm diameter would shrink it).
- The Preview paints the room wider than the Lens frustum (camera aspect 0.88), so the 3 cm edge gap is measured against the Lens frustum, which is the area the glasses display.

## Redesign: glass-native luminous line UI and volumetric audience (2026-11-06)

Why the style deviates from the mockups. The artifact mockups (07 S1 to S5) draw dark filled glass plates and flat-lit people on a dark scene. Spectacles and the Lens Studio Preview are ADDITIVE displays: black is transparent, so a dark fill cannot make anything darker than the room behind it, it only reads as a faint grey plate (measured in the Preview: the old navy #070D22 at 90 % lifted the room from about (43, 40, 39) to (68, 69, 76) RGB, a flat grey plate with no edge). Four colour-tweak cycles on the dark plates stalled at about 5.5 to 6 of 10 against the mockups for that reason, and the audience was one flat shape repeated. Rendering style therefore changed; layout, flow, information and copy did not. Real Spectacles lenses and visionOS use the same answer: luminous outlines, saturated colour, bright text.

| id | mockup / spec | expected | status | evidence |
|---|---|---|---|---|
| RD-A1 | 07 S1 to S5 panel material | dark filled glass plate | deviation (additive display) | `EyesUpUI.ts`: `PANEL_FILL` is a cool tint at 7 % alpha, `PANEL_STROKE` bright cyan-white at full alpha, one stroke width (`PANEL_STROKE_CM` 0.22 cm at 110 cm, `STAGE_STROKE_CM` 0.5 cm at the stage distance), five-band outer glow (`PANEL_GLOW_CM`), one radius per element class. Setup, podium, Summary, cue card, pill, room meter, nudge chevron and the per-person tags all use it. Evidence: `devpost/screenshots/01`, `04`, `05`, `06` |
| RD-A2 | UIKit BackPlate | not drawn in the hand-built surface | fixed | the BackPlate's own dark rounded rectangle does draw on the panel root in 5.24.1 and was the "flat grey plate / double border / square top" in the old podium and Summary; its visual is now switched off each frame (collider and layout kept), `makePanel` |
| RD-A3 | 07 S1 buttons | filled faces | deviation | buttons: 6 % tint, mid-cyan stroke; selected segment: cyan tint, bright stroke, glow; Start: mint; Next / Again: cyan; Finish: amber. Shared 4-step type scale unchanged |
| RD-A4 | 07 S1 Setup | aligned rows, no glyph defects | match | rows share one left edge and one exact width (`FlexJustify.Start`, 42 cm), Import button 6.5 cm so the Deck row ends where the other rows end; caption moved from Caption to Body size, which removes the missing "i" in "facing" |
| RD-A5 | 07 S4 podium | 30 x 8 cm, inside the field of view | match (was a gap) | the 38 cm panel was wider than the 32 degree view at 55 cm and was cut square at both sides by the lens frustum; now `PODIUM_W_CM` 30. Re-place 6.2 x 3.8 cm, Prev 6.8 x 4.2, Next 9.4 x 5.4, Finish 7.2 x 4.2 (all at least 3 cm) |
| RD-A6 | 07 S5 Summary | bars, timeline, legend, tip, buttons | match | capsule bars with a sheen (amber when out of range), rounded timeline segments, coral outlined look-away box, legend 84 (Body-step equivalent, was 80), no plate behind the buttons, Done 11.4 cm so icon and label no longer touch; the "beat your grade" subline on Again was removed (it rendered at an unreadable size) |
| RD-A7 | 07 S3 chevron | amber chevron and caption at the left edge | match | amber outline ring with glow, 1 Hz pulse unchanged. The placer now also keeps clear of the per-person tags when it can (`EyesUpApp.tagRects`); it still shows over a tag rather than hide, because a nudge must stay visible |
| RD-B1 | 07 S2 audience | human-like figures, each distinct | match | `core/Figure.ts`, `AudienceRig.ts`, `FigureMesh.ts`: torso with neck and shoulders (profile table), ellipse head, soft glow, base fill, two inner highlights, arm lines, two eye dots and a bright rim line, built as layered meshes (unlit, with the existing body fade texture) under the old Body / Head objects so lean, squash, sink and tilt maths are unchanged. Nine luminous hues, neighbouring seats at least 0.4 apart in RGB (unit test). Drained members cool toward periwinkle and drop alpha and rim, lit members get a cyan-white rim, a perk-up flashes cyan |
| RD-B2 | 07 S2 tags | "#n NN%" above each member | superseded by RD2-3 (first pass: tag under the head) | tag under the head on the shoulders, moving above the head once a member is slumped (hysteresis 40 % / 55 %), because the row above the heads is taken by the room meter and the cue card and the Preview frame is full. Text and tone follow the room meter (cyan from 70 %, amber from 40 %, coral below). The tag shows engagement (who you are losing), the same number the room meter averages; the mockup's number was the halo fill |
| RD-B3 | 07 S2 halo | ring above the head | match (ring around the head) | the halo is now a ring with a glow ring (it was a filled disc); width, colour and the 1.05 scale pop unchanged. Slump (head sinks, tilts, zzz, phone glow), perk-up (ring pulse, head lifts, flash) and the lit state remain clearly separate in `devpost/screenshots/02`, `10`, `11` |
| RD-B4 | draw order | audience behind panels | match | audience layers draw at fixed orders from -60 (`AUDIENCE_RENDER_ORDER`), panels from -10; the floor-shadow bars are hidden (the torso fades out by itself and the bars read as a grey band); the phone is one rounded glass screen with a rim |
| RD2-1 | all screens, fills | dark filled glass plates | fixed (deviation kept) | Cause found in round 2: UIKit's own visuals (every Button's rounded rectangle and the BackPlate, default dark grey `COLORS.darkGray`) were drawing under the hand-built surfaces, so chips, Start, Prev, Finish and the podium read as grey plates even at 6 % tint. `EyesUpUI.muteUiKitVisuals` now switches off every mesh under a panel that this UI did not create (collider and interaction untouched). All fills are tints of at most 15 % alpha (selected chip 10 %, Start 6 %, panel 5 %); selected and primary are a bright stroke plus a two-ring glow. Evidence: `devpost/screenshots/01`, `05`, `06` |
| RD2-2 | 07 S2 figures | volume without paper-doll fills | match | `core/Figure.ts`: torso and head fills 6 to 14 %, torso fades out toward the bottom (texture alpha), shoulder arm contours and a V collar as bright strokes, a thicker brighter rim line on the left (light) side of torso and head (`polyStrip`), collar only on engaged members, drained members keep a bright head rim so the head leads over the chest lines. Shoulders 78 % width (`TORSO_WIDTH_SCALE`) so three members 42 cm apart keep a margin inside the lens view (unit test). Phone screen is an outlined glass rectangle (22 % tint) |
| RD2-3 | 07 S2 tags | "#n NN%" above each member | match (was a deviation) | all tags stand on one world baseline above the lit halo tops (`TAG_BASELINE_Y` 182.2 cm), same size and 23 cm width (the member's 1.05 scale pop is cancelled), 17 cm apart, so they never touch a neighbour. A slumped member keeps its tag on the baseline; its zzz sits above its sunk head. To make room the audience stands 11 cm lower (`floorOffsetCm` 163), the halo ring is 32 cm across (was 36) and the meter keeps its place; the card keeps its place. `FRAME_MARGIN` 0.9 to 0.92 (heads inside 92 % of the viewport, not 90 %). Evidence: `02`, `10`, `11` |
| RD2-4 | 07 S4 podium | single outline, compact, equal buttons | match | 30 x 10.4 cm, one stroke with a glow, counter and timer in one compact row above the buttons, Prev / Next / Finish 4.4 cm tall with the same Title label size and the same outline style (cyan, brighter cyan primary, amber), no inner fill. The stage line is a 0.3 cm bright cyan line with two glow bands and a faint reflection nearer the viewer (was a 0.6 x 3 cm slab). Evidence: `05` |
| RD2-5 | 07 S3 chevron | thin ring, clear of pill and meter | match | whole block 0.8x, 0.3 cm ring, two thin glow rings (was one wide band), `CHEVRON_PANEL_MARGIN_CM` 2.5, edge gap 2. At the canonical pose a 3-member audience leaves no free wall between the lens edge and the first member, so the placer parks the chevron between the tag row and the sunk heads (clear of the pill, meter, tags and zzz) once both left members are slumped; `03` is taken that way with the camera at the canonical pose. Earlier in the hold the chevron still has to overlap a torso outline |
| RD2-6 | 07 S2 room meter | gap, readable target, thicker capsule | match | capsule 6.2 cm (was 5.3), tick 1.4 cm wide, `target` at Body size, saturated tones (cyan 0.1/0.95/1.0, amber, coral 1.0/0.3/0.28); the card's bottom edge is 3.6 cm above the label row. The tick still touches the bottom of the word "target" by about a pixel |
| RD2-7 | 07 S1 Setup | logo tile, one baseline, bigger helper | match | outline logo tile (eye with pupil and lashes) left of the title; SETUP pill and subtitle at Body or Heading size; units use the row label's Heading step and left align; helper caption 66 (above the Body step); Start and chips share radius 1.1 cm and one stroke width |
| RD2-8 | 07 S5 Summary | readable legend, roomy timeline, outline buttons | match, 1 deviation | legend "red: longest look-away / amber: nudge" at size 100, coloured like the marks; rows 3.6 cm with 1.2 cm gaps, the nudge is an amber line through all three rows with a ringed dot; Again / Done / Move stage are outlines with one Heading label size. Deviation: the "beat your grade" subline on Again is still not restored (panel height has no room at the framed size and the subline rendered unreadably small) |
| RD-T | tests | check, LEAF | match | `npm run check` 195 tests (194 after the first redesign pass) (11 new in `tests/unit/Figure.test.ts`: hue spread and saturation, torso and offset geometry, colour states, tag text and tones, the look carrying engagement and burst), typecheck and lint clean; LEAF 10 scenarios, see `devpost/leaf-results.md` |
| RD-S | stills | every still matches the new look | match | devpost/screenshots 00 to 06, 06b, 09, 10, 10b, 11, 12, 13, 14 and walkthrough 01 to 08 rebuilt from live captures that were looked at; no debug text; the nudge still is now taken at the canonical camera pose (see RD2-5) |
| RD-V | demo video | unchanged | open | the video was not re-recorded in this pass; it shows the earlier panel and silhouette look (stated in `devpost/submission.md`) |

# Eyes Up — LEAF results

Run in Lens Studio 5.24.1 Interactive Preview, driven through the Lens Studio MCP. Gaze is injected
with `ScriptedGazeProvider`. The first six are the done criteria of `design-brief.md`, one to one.
Final run (2026-11-04, game layer): `npm run check` passes (174 tests, typecheck, lint); the 10 LEAF scenarios
(rows 1 to 8, 13, 14) pass live with no runtime errors in the Logger. Rows 9 to 12 and 15 are capture helpers.
Cycle 2 re-run (2026-11-04, after the 3-member spacing, Summary and chevron changes): all 10 scenarios PASSED again one at a time, no E/F lines from project scripts.
Cycle 3 re-run (2026-11-04, default audience 3, stage 6 cm higher, backdrop plate, zzz moved): all 10 scenarios PASSED again one at a time, no E/F lines from project scripts. Scenarios that use members in every zone pick the 6-person Setup button first.
Cycle 4 re-run (2026-11-04, Summary re-layout, Room meter tick and frame, zzz above heads, canonical camera reset): every scenario starts from a refreshed preview and the camera pose of `scripts/video/preview-reset.sh` (`scripts/video/leaf-all.sh` runs all ten); `setUp` re-syncs the scripted gaze to the camera, closes a leftover Rehearsal or Summary and pinches the audience button explicitly. `start_places_audience` also asserts that all 3 heads project inside the viewport with a 10 % margin (`headFrameProblems`).
Cycle 5 re-run (2026-11-05, Summary inside the viewport, higher stage and phone, larger Setup / podium / card text): all 10 scenarios PASSED one at a time from a refreshed preview at the canonical pose (`finish_gives_grade` timed out once while Lens Studio was overloaded after hours of captures; it PASSED after a Lens Studio restart). `start_places_audience` also asserts that every phone glow ends inside the bottom 4 % of the viewport (`phoneBottomProblems`).
Preview only, not tested on a Spectacles device.

| # | Scenario | Checks | Result |
|---|---|---|---|
| 1 | `start_places_audience` | 0.6 s after Start with the Setup default (3 people since cycle 3), 3 members active at 250 ± 5 cm | PASSED |
| 2 | `gaze_fills_halo` | 1.2 s of gaze on #3: attention[3] ≥ 0.95, #1 ≤ 0.1 | PASSED |
| 3 | `neglect_triggers_nudge` | 8.5 s on the right: EdgeHint says "left", nudges 1. 0.5 s on the left: inactive | PASSED |
| 4 | `next_shows_card_then_pill` | Next shows "Why glasses", 4.3 s later it is a pill | PASSED |
| 5 | `dwell_expands_pill` | 1.1 s on the pill expands the card | PASSED |
| 6 | `finish_shows_summary` | Summary shows, zones sum to 100 ± 1, time as m:ss | PASSED |
| 7 | `repeated_nudge` | A second nudge fires after the cooldown on the same side | PASSED |
| 8 | `finish_pulses_at_time` | Finish button rests before the target time and pulses after it | PASSED |
| 9 | `capture_summary` | Capture helper (about 45 s run). Gave left 26 / center 32 / right 42, Balance 87, 1 card, 1 nudge | PASSED |
| 10 | `capture_nudge_hold` | Capture helper for `walkthrough/03-nudge.png` (3-person audience, chevron held 20 s) | PASSED |
| 11 | `capture_podium` | Capture helper for `walkthrough/04-cue-card.png` and `05-podium.png` (3-person audience, LEAF overlay hidden) | PASSED |
| 12 | `demo_reel` | About 71 s showcase for the video (the MCP call times out at 60 s, the scenario finishes) | PASSED |
| 13 | `neglect_disengages_then_recovers` | 17 s of gaze on #0: engagement[4] < 0.5, Head of #4 sank, room < 90 % and the meter text dropped. 1.8 s on #4: engagement 1.0, Head back up, room rose | PASSED (22 s) |
| 14 | `finish_gives_grade` | Short sweep, Finish: grade tile is S/A/B/C and equals the result, "Attention n" matches the score | PASSED (12 s) |
| 15 | `capture_game` | Capture helper for `walkthrough/02-audience.png`, `07-engagement-slump.png` and `08-perk-up.png` (3-person audience: members 0 and 1 slump while #2 is watched, then #1 perks up) | PASSED |
| 16 | `capture_loop` | Capture helper (about 65 s): Run 1 stares right, Again, Run 2 follows the tip. Logged: run1 grade C score 39 balance 46 room 76 % L0/C30/R70 longest 29 s left in the log (the Summary label shows 28 s), 3 nudges; run2 grade A score 84 balance 89 room 91 % L41/C26/R33 longest 12 s right, 1 nudge, new best. Scripted gaze, illustrative, not a user study | PASSED |

## Not tested

- Spatial audio direction (the chime coming from the correct side) and legibility at 2.5 m on real optics.
- Anything on a Spectacles device. None was available.
- The AR keyboard for deck import does not open in the preview. The outline parser is covered by Node tests.

## Node tests

`npm run check`: typecheck, ESLint and 174 Vitest tests (state machine, gaze zones, halo attention,
nudge rules, chevron placement, cue card, stage line, session stats, panel view models, deck import,
engagement decay and recovery, silhouette look, room meter tone, score, grade, best-previous compare,
applause strength).

Full log and per-pass details: `build-notes.md`.

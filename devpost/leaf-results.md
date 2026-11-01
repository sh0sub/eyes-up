# Eyes Up — LEAF results

Run in Lens Studio 5.24.1 Interactive Preview, driven through the Lens Studio MCP. Gaze is injected
with `ScriptedGazeProvider`. The first six are the done criteria of `design-brief.md`, one to one.
Final run (2026-11-01): `npm run check` passes (139 tests, typecheck, lint); the 8 LEAF scenarios
(rows 1 to 8) pass live with no runtime errors in the Logger. Rows 9 to 12 are capture helpers.
Preview only, not tested on a Spectacles device.

| # | Scenario | Checks | Result |
|---|---|---|---|
| 1 | `start_places_audience` | 0.6 s after Start, 6 members active at 250 ± 5 cm | PASSED |
| 2 | `gaze_fills_halo` | 1.2 s of gaze on #3: attention[3] ≥ 0.95, #1 ≤ 0.1 | PASSED |
| 3 | `neglect_triggers_nudge` | 8.5 s on the right: EdgeHint says "left", nudges 1. 0.5 s on the left: inactive | PASSED |
| 4 | `next_shows_card_then_pill` | Next shows "Why glasses", 4.3 s later it is a pill | PASSED |
| 5 | `dwell_expands_pill` | 1.1 s on the pill expands the card | PASSED |
| 6 | `finish_shows_summary` | Summary shows, zones sum to 100 ± 1, time as m:ss | PASSED |
| 7 | `repeated_nudge` | A second nudge fires after the cooldown on the same side | PASSED |
| 8 | `finish_pulses_at_time` | Finish button rests before the target time and pulses after it | PASSED |
| 9 | `capture_summary` | Capture helper. Gave left 7 / center 32 / right 61, Balance 58 | PASSED |
| 10 | `capture_nudge_hold` | Capture helper for `walkthrough/03-nudge.png` | PASSED |
| 11 | `capture_podium` | Capture helper for `walkthrough/05-podium.png` | PASSED |
| 12 | `demo_reel` | About 71 s showcase for the video (the MCP call times out at 60 s, the scenario finishes) | PASSED |

## Not tested

- Spatial audio direction (the chime coming from the correct side) and legibility at 2.5 m on real optics.
- Anything on a Spectacles device. None was available.
- The AR keyboard for deck import does not open in the preview. The outline parser is covered by Node tests.

## Node tests

`npm run check`: typecheck, ESLint and 139 Vitest tests (state machine, gaze zones, halo attention,
nudge rules, chevron placement, cue card, stage line, session stats, panel view models, deck import).

Full log and per-pass details: `build-notes.md`.

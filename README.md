# eyes-up

**Eyes Up** is a presentation rehearsal coach for Spectacles. It seats a small virtual audience in your room, lights up whoever you look at, nudges you toward the side you ignore, and hides your notes until you need them.

Built for Learn AR with SPECS (deadline 2026-11-09 PST). New Lens built with CLAD and the Lens Studio MCP skill pack; preview-only is acceptable, no device required.

- Audience placement with camera transform, gaze via head rotation
- Halo on the watched audience member, chime plus arrow for the neglected side
- Cue card on pinch only

## Status

- **Scene built** in Lens Studio 5.24.1, driven entirely through the Lens Studio MCP tools (no hand-edited scene files).
- **7 LEAF done criteria pass** in the Interactive Preview: `start_places_audience`, `gaze_fills_halo`,
  `neglect_triggers_nudge`, `next_shows_card_then_pill`, `dwell_expands_pill`, `finish_shows_summary`,
  `repeated_nudge`. Node checks: `npm run check` (typecheck, lint, vitest).
- **Preview-only.** Not run on a Spectacles device yet. Gaze is head rotation, simulated by LEAF in tests.
- **Demo video pending.** The `demo_reel` LEAF scenario is ready (`devpost/demo-reel-timeline.md`), but
  the screen recording hasn't been made yet.
- Build log and design decisions: `devpost/build-notes.md`. Screenshots: `devpost/screenshots/`.

## Scripts and tests

The pure logic (state machine, gaze, halo attention, nudge rules, cue card, stage-line timer, session
stats, panel view models) does not depend on Lens Studio, and Node tests it. Only `EyesUpApp.ts`,
`Podium.ts`, `SetupPanel.ts` and `SummaryPanel.ts` use Lens Studio APIs.

```bash
npm install
npm test           # vitest: unit + integration (tests/integration simulates a full rehearsal)
npm run typecheck  # tsc with a minimal Lens Studio shim (typings/), for Node-side checking only
npm run lint
npm run check      # all three
```

`tsconfig.json` is the Lens Studio-side config. `tsconfig.test.json` is the Node-side config.

## License

MIT

# Eyes Up — demo reel timeline (LEAF `demo_reel`)

Use this to sync the narration. Times are seconds from the scenario start (t = 0 is the first
frame after LEAF resets the lens, with the Setup panel already on screen). They come from the
run's own `[demo_reel] t=…` log lines on 2026-10-31 at 22:03 (pass 3). The script uses fixed
sleeps and event waits, so a re-run should land within a few frames. Only one run of this final
script was timed, so treat every value as ± 0.5 s.

How to replay: `run_leaf_scenario demo_reel` (preview) with
`{"__leaf__log_level": "ERROR", "__leaf__diagnostic_report_duration_ms": "0"}`. The MCP call
times out at ~60 s, but the scenario keeps running to the end. Lens log: `✅ Scenario demo_reel completed successfully`.

What's real: the app logic, gaze-driven halos, nudge, chime, cue card, pill dwell, applause and
Summary. Nothing is sped up or staged, and no tunable is changed. What's simulated: head gaze
(ScriptedGazeProvider) and pinches (LEAF interactor). The **amber diamond reticle** is a demo-only
marker for where the simulated head points. LEAF can't move the preview camera, so the view
itself stays still.

| t (s) | Event | On screen |
|---:|---|---|
| 0.0 | Reel starts | Setup panel: "Eyes Up", subtitle, Length / Audience / Deck, ▶ Start rehearsal |
| 5.1 | Gaze reads Length | reticle on "Length: 3 min" |
| 6.8 | Gaze reads Audience | reticle on "Audience: 6 people" |
| 8.5 | Gaze reads Deck | reticle on "Deck: Eyes Up pitch" |
| 10.3 | Gaze on Start | reticle on ▶ Start rehearsal |
| 12.1 | **Pinch Start** (simulated) | Start button tints, panel shrinks away in 0.3 s, start tick |
| 12.6 | Audience appears | 6 glassy silhouettes fade in, 2.5 m ahead in a half circle, stage line on the floor |
| 13.1 | Rehearsal begins | cue card "The problem" above the audience |
| 13.8 | Gaze → #3 (center) | halo fills in ~1 s |
| 15.5 | Gaze → #4 (center) | halo fills, #3 starts to drain |
| 17.1 | Gaze → #5 (right) | halo fills. The cue card shrinks to the pill "Screens pull eyes" (4 s) |
| 18.7 | **Long stare at the right side** (#6) | right halos lit, left side (#1, #2) dark |
| 21.2 | **Left neglect nudge** | chime from the **left** + amber "‹ left" chevron at the left edge |
| 23.0 | **Gaze moves left** (#2) | chevron clears immediately (nudge ended: looked) |
| 24.8 | Gaze → #1 | left halos lit |
| 26.9 | Gaze → #3 | — |
| 28.5 | Gaze → #5 | — |
| 30.1 | Look down | podium appears: "1 / 6", timer, ‹ Prev, › Next, ⚑ Finish |
| 32.5 | **Pinch Next** (simulated) | — |
| 32.6 | Cue card **"Why glasses"** | full card with its points above the audience |
| 32.7 | Gaze up to the card | podium hides (head level) |
| 36.6 | **Card shrinks to pill** "Eyes stay up" | 4 s after it opened |
| 37.4 | Gaze → #6 | — |
| 39.2 | Gaze → #2 | — |
| 41.1 | Gaze → #4 | — |
| 42.7 | **Gaze dwells on the pill** | reticle on the pill |
| 43.7 | **Card re-expands** "Why glasses" | after 1 s of dwell |
| 46.7 | Gaze → #1 | — |
| 47.7 | Card shrinks to pill again | 4 s after re-opening |
| 48.3 | Gaze → #5 | — |
| 49.9 | Gaze → #3 | — |
| 51.5 | Gaze → #6 | — |
| 53.1 | Look down | podium appears |
| 55.5 | **Pinch Finish** (simulated) | — |
| 55.7 | **Applause** | audience pulses three times (1.5 s), applause sound |
| 57.1 | **Summary panel** | 1.5 m ahead: time, zone bars **left 20 % / center 47 % / right 33 %**, longest look-away, card expands, balance, ↻ Again / ✓ Done. The audience and halos are hidden behind it |
| 71.2 | Reel ends | Summary still on screen. The LEAF overlay stays hidden for 15 s more |

Narration hooks: 0–12 s setup, 12–21 s "whoever you look at lights up", 21–23 s "ignore a side and
it taps you on the shoulder", 30–44 s "your next point floats above their heads, then gets out of
the way", 55–71 s "applause, then the numbers".

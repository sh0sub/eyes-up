---
status: draft
approved: false
note: >
  DRAFT written from docs/plan.md only (2026-10-27). NOT approved.
  The plan-lens interview (issue #2) has not happened yet because Lens Studio is not installed.
  Run plan-lens, make the decisions yourself, rewrite what you disagree with, and only then set
  status: approved. Do not hand this draft to CLAD as-is.
---

# Eyes Up — design brief (draft)

## The one spatial moment

You stand in your living room and rehearse a 3-minute talk. Six faceless, glassy audience
silhouettes sit in a half circle 2.5 m ahead of you. Whoever you look at lights up within a second.
If you ignore the left side for 8 seconds, a soft chime comes from the left and a small amber
chevron appears at the left edge of your view. Your next point floats 10 cm above the audience's
heads for 4 seconds, then shrinks to a three-word tag.

## Why it belongs on glasses

A laptop teleprompter pulls your eyes down to a screen, which is the habit you want to break.
Glasses keep the room in view and put the audience in it. It shares your view (it knows where you
look), draws in the world (halo, chevron, floor line on the audience), and leaves your body free
(stand, walk, gesture).

## Product or overlay

No real-world object recognition. The audience is virtual. The preview stand-in is the preview's
virtual room. The floor is 160 cm below the head, and a Re-place button re-seats the audience.

## Where things live

| Element | Placement |
|---|---|
| Setup panel (40×30 cm) | 1.1 m ahead, 10 cm below eye level, shown only in Setup |
| Audience ×6 (3/6/9) | Half circle 2.5 m ahead on the floor, 0.6 m apart, centered on start yaw |
| Cue card / pill | 10 cm above the audience heads at stage center, billboarded |
| Podium (Prev / Next / Finish, Re-place) | 55 cm ahead, 30 cm below the head, visible only when you look down about 12° |
| Stage line (timer) | On the floor under the audience feet |
| Edge chevron | Edge of the view on the neglected side |
| Summary panel (50×40 cm) | 1.5 m ahead at eye level |

## Hands and input

- Gaze (head rotation) is the main input: looking at people, looking at the pill for 1 s to reopen the card.
- Pinch: a few big targets. Start, Prev / Next / Finish, Again / Done, deck toggle. Buttons are 3.0 cm
  or more at 55 cm.
- No voice in the MVP. If the Stretch ASR filler counter ships, it is OFF by default and every voice
  action has a button twin.

## When things show

- Setup panel only before the rehearsal. It shrinks away in 0.3 s on Start.
- Cue card for 4 s at each section start, then a three-word pill. Looking at the pill for 1 s reopens it for 4 s.
- Chime and chevron only after 8 s of neglect. They disappear the moment you look at that side, or after 3 s.
- Podium only when you look down. Timer digits live only there. The audience side shows only the floor line.
- Floor line pulses once at 60 s left, twice at 30 s left, and turns amber at 0 s (you can keep going).
  At target + 30 s a "Finish?" prompt appears.
- Summary only after Finish, following a 1.5 s applause pulse.

## Done criteria

All of these can be checked in Interactive Preview with mouse look and clicks. Each one maps 1:1 to a LEAF scenario.

1. `start_places_audience`: 0.6 s after Start, 6 audience members are active at 250 ± 5 cm.
2. `gaze_fills_halo`: after 1.2 s of scripted gaze on #3, attention[3] ≥ 0.95 and #1 ≤ 0.1.
3. `neglect_triggers_nudge`: after 8.5 s of gaze on the right zone, the EdgeHint is active and says "left", with nudge count 1. After 0.5 s of gaze on the left, it is inactive.
4. `next_shows_card_then_pill`: Next shows "Why glasses", and 4.3 s later it is a pill.
5. `dwell_expands_pill`: 1.1 s of gaze on the pill expands the card.
6. `finish_shows_summary`: Finish shows the Summary. Zone percentages sum to 100 ± 1, and the time is shown as `m:ss`.

Not tested: spatial audio direction and legibility (readability at 2.5 m).

## Out of scope

Real audience or face tracking, body posture, two-hand or custom gestures, persistence across
sessions, Connected Lenses, deck import (Stretch), and LLM feedback (excluded).

## Risks

- Lens Studio learning curve (no prior experience). CLAD builds the scene, and I write design notes.
- MCP/CLAD setup. If the loop does not run by the D2 evening, cut the MVP to no Setup panel and 3 audience members.
- Preview limits: LEAF cannot move the camera, so gaze is injected through `ScriptedGazeProvider`.
- Audience visual quality: faceless translucent silhouettes are an intentional style.

## Build notes for CLAD

- Script logic already exists in `Assets/Scripts/` and is unit-tested in Node (`npm test`).
  `EyesUpApp.ts` is the root component. Wire its `@input`s to the scene objects listed in its header.
- Gaze goes through `GazeProvider` (`CameraGazeProvider` normally, `ScriptedGazeProvider` when
  `useScriptedGaze` is on for LEAF).
- Units are cm. Never use black (the display is additive). Use dark backgrounds with light text. No head-locked panels.
- Generate the SFX (chime, tick, applause, time-up tone) with build-sfx. No copyrighted audio.

## After the build

Walk around in Interactive Preview and answer the 3 questions (use of the field of view? spatial
placement? hands and eyes free?). Do a comfort check. Label the result "logic proven / feel unproven".
Change things through design notes, not code edits, and record before/after in `build-notes.md`.

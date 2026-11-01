# Eyes Up — Devpost submission text

Hackathon: Learn AR with SPECS. Deadline 2026-11-09 PST.

## Tagline

Rehearse your talk with your eyes on the room, not on your notes.

## What it does

Eyes Up is a presentation rehearsal coach for Spectacles. Pinch Start and a small virtual audience
(3, 6 or 9 glassy silhouettes) takes a seat in a half circle 2.5 m ahead of you. Whoever you look at
lights up in cyan within a second, so you can see where your attention is going. If you ignore one
side for 8 seconds, a soft chime plays from that side and an amber double chevron appears at the
edge of your view. Your next talking point floats above the audience for 4 seconds, then shrinks to
a three-word tag you can glance at (look at it for a second and it opens again). Look down like a
wristwatch to see the podium: Prev, Next, Finish, a section counter and the talk timer. When you
finish, the audience applauds and a summary shows your left / center / right split, a gaze timeline,
your longest look-away, how often you used the cards and a one-line tip.

Setup is three pinches: talk length (3 / 5 / 10 min), audience size (3 / 6 / 9), deck (two samples,
or type your own outline on the AR keyboard), then Start rehearsal.

## Who it is for

Anyone who has to speak to a room and keeps staring at slides, a phone or a script: students giving
a thesis defence, founders pitching, teachers, people with a job interview coming up. A laptop
teleprompter pulls your eyes down to a screen, which is the habit you want to break. Glasses keep
the room in view, know where you look, and draw in the world, so this only makes sense on glasses.

## How it was built

A new Lens built with CLAD and the Lens Studio MCP skill pack, driven end to end through the Lens
Studio MCP tools. The scene uses UIKit panels and buttons, the audience, halo, nudge and cue card
are TypeScript components. All logic (state machine, gaze zones, halo attention, nudge rules, cue
card, stage-line timer, session stats, panel view models, deck import parser) is plain TypeScript
with no Lens Studio dependency, so Node tests it: 139 unit and integration tests, typecheck and
lint all pass. Eight LEAF scenarios pass in the Interactive Preview (start places the audience,
gaze fills the halo, neglect triggers a nudge, card then pill, dwell expands the pill, finish shows
the summary, repeated nudge, the Finish button pulses once the talk length is reached). The nudge
chevron follows a placement rule: it keeps its spot at the edge of the view, and each frame the
podium and cue card are projected into the same plane so it slides aside, or is hidden (the chime
still plays), instead of ever covering a panel (unit tested).

## What we learned

- Design for the glasses first. The 40 x 30 cm Setup panel, 10 cm below eye level, is the only
  thing on screen during setup. Keeping the world uncluttered mattered more than adding features.
- Additive displays punish pale colors. A cyan-white halo washed out to a grey disc on the
  preview, so the lit state is now saturated cyan (red channel kept low) and reads in seconds.
- Gaze is a head ray, so every target needs a generous hit area. We hit-test the real pill
  rectangle instead of a cone, which stopped the dwell from latching on the center audience.
- UIKit on Lens Studio 5.24.1 did not draw its rounded backplates, so panels use plain quads for
  surfaces while UIKit keeps layout, colliders and pinch input. Documented in build-notes.md.
- Test the logic away from the editor. The pure TypeScript core let us iterate on timing rules
  (8 s nudge, 4 s card, 1 s dwell) in milliseconds, and LEAF scenarios checked the real Lens.

## What is not done (honest list)

- Preview only, not tested on a Spectacles device (none available). Gaze is head rotation, simulated
  in preview. Spatial direction of the chime and legibility at 2.5 m on real optics are unverified.
- The video shows the Lens Studio Interactive Preview. Gaze and pinches in it are driven by the LEAF
  test harness (head ray and pinch simulated), and the narration and sounds are synthesized locally.
- Voice features (filler-word counter) are not in this build.
- The AR keyboard for deck import does not open in the Lens Studio preview. The outline parser is
  unit tested and the sample decks cover the demo.

## Links

- Repository: this repository (MIT).
- Demo video (2:45, under 3 min, narrated and captioned, built by `scripts/video/build-video.mjs`):
  YouTube URL: **TODO_PASTE_PUBLIC_YOUTUBE_URL_HERE** (upload needs the entrant's YouTube account;
  set it to Public or Unlisted before submitting).
- Walkthrough: `devpost/walkthrough/` (01-setup to 06-summary). Learnings: `devpost/learnings.md`. LEAF log: `devpost/leaf-results.md`. Screenshots: `devpost/screenshots/`. Build log: `devpost/build-notes.md`. Design brief:
  `devpost/design-brief.md`. Spec check against the plan: `docs/spec-matrix.md`.

## Built with

Lens Studio 5.24.1, TypeScript, UIKit, Spectacles Interaction Kit, LEAF, CLAD, Lens Studio MCP.
Started from the SPECS base template (template, SIK and UIKit are standard Snap packages). Sound
effects are generated locally and the narration is macOS text to speech, so there is no third-party
music. No logos or trademarks are shown in the video. Not used: Remote Service Gateway, SnapML, ASR.

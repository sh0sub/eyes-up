# Eyes Up — process and learnings

For judges who read rather than run the Lens. Result label: **logic proven / feel unproven.**
Everything below was checked in Lens Studio's Interactive Preview and in Node. Nothing was tested
on a Spectacles device, because none was available.

## Four habits for good glasses experiences, and where Eyes Up uses them

| Habit | In Eyes Up | Where to see it |
|---|---|---|
| 1. Put information on or around the thing it is about | The audience is the target. Halos, the cue card and the stage line all sit on or above the audience, never in a floating HUD. | `walkthrough/02-audience.png`, `04-cue-card.png` |
| 2. Show things only when they are needed | The Setup panel exists only before the talk. The card shows for 4 s, then shrinks to a three-word tag. The podium appears only when you look down. The nudge shows after 8 s of neglect and vanishes when you look. | `walkthrough/01-setup.png`, `05-podium.png` |
| 3. Few, large inputs | Pinch targets are 3 cm or bigger at 55 cm: Start, Prev, Next, Finish, Again, Done. Gaze (a 1 s dwell on the tag) is the second input. No custom gestures, no voice needed. | `walkthrough/05-podium.png` |
| 4. Guide attention outside the view with sound plus a visual hint | Ignore one side for 8 s and a chime plays from that side while an amber double chevron appears at that edge. | `walkthrough/03-nudge.png` |

## Three strengths of glasses that the idea needs

1. **It shares your view.** The Lens knows where you look, so it can light up the person you are talking to and measure how long you ignored the left side.
2. **It draws in the world.** The audience, floor line and cue card live in your room at real scale (2.5 m ahead, 10 cm above heads). A laptop teleprompter pulls your eyes down to a screen, which is the habit this app wants to break.
3. **It leaves your body free.** You stand, walk and gesture while you rehearse. Nothing needs to be held or typed.

## What the rehearsal teaches

The Summary turns one gaze number into one action. Left / Center / Right percentages, a gaze
timeline with the longest look-away, a Balance score, and a single tip ("Next time, look left
more.") close the loop: look, get feedback, adjust, run it again (Again keeps the settings).

## Logic proven / feel unproven

| Question | Status | Evidence |
|---|---|---|
| Does Start place six audience members 2.5 m away? | Logic proven | LEAF `start_places_audience` |
| Does the halo fill for the person you look at, and not for others? | Logic proven | LEAF `gaze_fills_halo` |
| Does 8 s of neglect trigger a left chime and chevron, and clear when you look? | Logic proven | LEAF `neglect_triggers_nudge`, `repeated_nudge` |
| Does Next show the card, then a tag after 4 s, and does a 1 s dwell reopen it? | Logic proven | LEAF `next_shows_card_then_pill`, `dwell_expands_pill` |
| Does Finish show a Summary whose zones sum to 100 and whose time reads m:ss? | Logic proven | LEAF `finish_shows_summary` |
| Do the timing rules hold under edge cases (gaps, ties, no gaze at all)? | Logic proven | 129 Node tests, typecheck and lint clean |
| Are panels legible and comfortable at real distance on Spectacles optics? | **Feel unproven** | Preview only, tuned from preview screenshots |
| Does the spatial chime clearly come from the left or right? | **Feel unproven** | Cannot be judged in the editor |
| Is a head-rotation gaze ray accurate enough to count as "looking at a person"? | **Feel unproven** | Preview injects gaze; a device has no eye tracking in this Lens |
| Is wearing it for a 3 minute talk comfortable? | **Feel unproven** | No device |

## Process notes

- Plan first, then build. The design brief fixed six audience members, head-rotation gaze, pinch-only buttons and no voice in the MVP.
- Fixes went in as design notes with before and after screenshots, logged in `build-notes.md` (for example the cyan halo that washed out to grey on an additive display).
- Keep logic out of the editor. All rules are plain TypeScript tested in Node, and LEAF scenarios check the real Lens.
- Honest gaps are listed in `submission.md` under "What is not done".

# Eyes Up — build notes (Spectacles build, 2026-10-31)

Headless Claude Code run against Lens Studio 5.24.1 through the lens-studio MCP server.
Result label: **logic proven / feel unproven.** All 6 LEAF done-criteria scenarios (of 8 in the final run, see leaf-results.md) pass in
Interactive Preview. Nobody has walked around in the preview or done the comfort check yet (see
"Not done").

## LEAF results (Interactive Preview, Specs device, run one at a time)

| Scenario | Result | Evidence / notes |
|---|---|---|
| `start_places_audience` | ✅ PASSED (2.9 s) | First run FAILED: `active audience members Expected: "6" - Received: "0"`. Root cause was a real Lens bug, fixed in `GazeProvider.ts` (see "Lens-API fixes" #1). Re-run passed. |
| `gaze_fills_halo` | ✅ PASSED (4.5 s) | attention[3] ≥ 0.95 and attention[1] ≤ 0.1 after 1.2 s of scripted gaze on #3. |
| `neglect_triggers_nudge` | ✅ PASSED (12.7 s) | After 8.5 s on the right zone: `EdgeHintLeft` enabled, text contains "left", `activeNudge.side == 'left'`, nudge count 1. After 0.5 s looking left the hint is off. |
| `next_shows_card_then_pill` | ✅ PASSED (8.1 s) | Scripted gaze pitches down so the podium shows, then `NextButton` is pinched. Title "Why glasses" and mode `card`. 4.3 s later mode is `pill` and the title is "Eyes stay up". |
| `dwell_expands_pill` | ✅ PASSED (8.3 s) | After waiting for the pill, 1.1 s of gaze on `layout.cardAnchor` expands the card ("The problem"). |
| `finish_shows_summary` | ✅ PASSED (8.2 s) | Podium → `FinishButton`, then the Summary panel is visible. Zone % sum is within 99–101 and `TimeText` matches `^\d+:\d\d$`. |

The pass/fail lines come from the Lens-side `DefaultLeafScenarioManager` log (`PASSED: <id>`), not
only from the plugin UI.

Scenario sources: `Assets/Tests/Leaf/*.ts` (one component per file, a Lens Studio rule) and
`EyesUpLeafHelpers.ts`. `LeafIndex.ts` is attached to the root `LeafIndex` SceneObject.

- Gaze is injected through the new `EyesUpApp.useScriptedGazeNow()`. LEAF can't move the preview
  camera, and the edit-time `useScriptedGaze` flag would have turned off mouse-look for normal
  runs.
- Pinches use `DefaultLeafInteractor.trigger` on the UIKit Buttons' Interactables, found by
  SceneObject name.
- No IK reachability scenario was added. The skill recommends one, but the brief's done criteria
  don't include it, and the podium only exists while the head pitches down, which the IK head
  controller would have to reproduce. This is a gap.

## Screenshots (devpost/screenshots/)

The Preview panel captures at 1392×4096 (tall Specs stereo panel), downscaled to 475×1400.

| File | Shows |
|---|---|
| `01-setup-panel.png` | Setup panel 1.1 m ahead: title, Length / Audience / Deck buttons, Start rehearsal |
| `02-audience-lit-halo.png` | Audience after Start. The watched member (#4) has a bright halo, and the amber "< left" chevron is also visible because the left side had been ignored for > 8 s |
| `04-cue-card.png` | Cue card "The problem" plus its two points, floating above the audience |
| `05-podium.png` | Looking down: podium with "1 / 6", "0:08", < Prev / Next > / Finish, plus the "< left" chevron at the view edge |
| `06-summary.png` | Summary 1.5 m ahead: 0:09, left/center/right %, longest look-away, card expands, balance, Again / Done |

A separate nudge-chevron capture (`03`) was attempted several times but always missed the 3 s hint
window, because each capture takes several seconds. It was deleted rather than kept as a
misleading file. Shots 02 and 05 both show the chevron.

## MCP tools used

ListAllPanels, VirtualScene (read/apply), ExecuteEditorCode, ListInstalledPackagesTool,
SearchLensStudioAssetLibrary, InstallLensStudioPackage, PreviewPanelTool, asset-graphql,
RecompileTypeScriptTool, RunAndCollectLogsTool, GetBoundingBox, QueryRuntimeSceneTool,
MovePreviewCamera, PreviewInteractTool, CapturePanelScreenshotTool, open_leaf_panel,
list_leaf_scenarios, run_leaf_scenario. No raw HTTP was used.

## CLAD skills read and followed (read-only, not installed)

agents/specs-experience-builder.md (Phase 0.5 → 3 flow, hard rules), skills/specs-project-init,
skills/lens-studio-field-notes, skills/specs-build-ui (+ references/helpers.md, patterns.md,
examples/SettingsPanel.ts), skills/build-sfx, skills/specs-leaf-install-packages,
skills/specs-leaf-write-scenarios (+ references/leaf-reference.md), skills/specs-leaf-run-in-preview.
Not read or not used: scene-construction (its VirtualScene syntax is in the tool description),
icon-selector and font-selector (no icons or custom fonts, see gaps), verify-preview (its
see-and-fix loop was run by hand).

## Project conversion (specs-project-init)

| Check | Status | Detail |
|---|---|---|
| Project target | FIXED | Snapchat → Spectacles (`project.targetPlatform`) |
| Camera | FIXED | `Camera Object`: Perspective (already), moved to origin, far 2000, **DeviceTracking World** added |
| Preview device | FIXED | stereo (SPECS 27) / Interactive / "Sunlit Room" |
| SIK | ADDED | InteractionKit 4.0.0 as `Packages/InteractionKit.lspkg` + root prefab `SpectaclesInteractionKit` |
| UIKit | ADDED | UIKit 4.0.0 as `Packages/UIKit.lspkg` (Motion 4.0, Icons 4.0 came with it) |
| LEAF | ADDED | Leaf 4.0.0, unpacked to `Assets/Leaf.lspkg` (see decision D2). Bitmoji 3D came with it |
| Node.js | OK | used by `npm test` |
| SFX generation | WARN | see gap G1 |

## Decisions made without a human (headless)

- **D1: package names.** SIK/UIKit 4.0 import each other as `InteractionKit.lspkg` /
  `UIKit.lspkg`, and the preview-inspection helper expects `UIKit.lspkg`. My first install used
  `assetName: SpectaclesInteractionKit` / `SpectaclesUIKit`, which caused ~300 TS2307 errors. I
  reinstalled under the v4 names and removed the misnamed copies. Project code imports
  `UIKit.lspkg/...` (the specs-build-ui doc's `SpectaclesUIKit.lspkg/...` paths are for older
  packages).
- **D2: LEAF compatibility patch.** LEAF 4.0 targets Lens Studio 5.25 typings. On 5.24.1, one line
  in `Scenarios/decorator/ScenarioIndexDecorator.ts` fails with TS2352
  (`string as TypeName<Scenario>`), and that one error blocks compilation of the whole project.
  LEAF 2.0.x needs the old `SpectaclesInteractionKit` naming, so it was not an option. I unpacked
  Leaf.lspkg into `Assets/` with `AssetManager.unpack` and changed that one cast to
  `as unknown as ...` (commented in place). Runtime behavior is unchanged. This deviates from the
  CLAD rule "don't modify LEAF code". Remove the patch once the project moves to LS ≥ 5.25 or LEAF
  ships a fix.
- **D3: UI built at runtime with UIKit.** Setup, Podium and Summary build their own
  BackPlate + FlexLayout + Button UI (shared helpers in new `Assets/Scripts/EyesUpUI.ts`). They no
  longer take Interactable/Text `@input`s, which CLAD's Hard Rule 3 forbids for hand-rolled UI.
  Public APIs used by EyesUpApp (`bind`, `show`, `apply`, `placeAt`) are unchanged.
- **D4: Setup length and audience are pinch-to-cycle buttons, not sliders.** The brief asks for
  "a few big targets", and a 3-stop UIKit slider is a small drag target. `onLengthSlider` and
  `onAudienceSlider` remain.
- **D5: audience = authored placeholders.** Each of `Audience_1..9` is a capsule body + sphere
  head in translucent `SilhouetteGlass` (unlit, Normal blend) plus a `Halo` sphere in `HaloGlow`
  (unlit, Add blend). This is the "faceless glassy silhouette" style. No `/build-mesh` run.
  Members are re-seated at runtime by `StagePlacer`.
- **D6: edge hint.** `EdgeHintLeft/Right` are amber Text (`<` / `left`, `>` / `right`) parented to
  the camera at x = ±20 cm, z = −100. It's a transient cue, not a panel, so it doesn't count under
  "no head-locked panels". It is the only camera-locked element.
- **D7: panel placement settles for 1 s.** In the Interactive preview the camera moves after
  OnStart (it starts pitched −12°). Setup and Summary are re-seated in front of the head during
  their first 1.0 s, then stay world-anchored.
- **D8: stage line** is a straight 3.6 m strip, 30 cm in front of the audience's feet. It scales
  on X with progress and turns amber at 0 s. It is not an arc.
- **D9: audio inputs are optional** (`@allowUndefined`), and play() is skipped when unwired. See G1.

## Lens-API fixes in the adapter files (the "미확인" items)

1. **`GazeProvider.ts` (found by LEAF).** `ScriptedGazeProvider` copied its origin with
   `{ ...origin }`. A native Lens `vec3` has no own enumerable x/y/z, so the copy was `{}`, the
   head position became NaN, and `new vec3(NaN…)` threw "Value is not a number". It now copies
   components explicitly. A regression test with getter-based vectors was added.
2. `Transform.back` confirmed as the camera look direction (StudioLib.d.ts; −Z forward).
3. `EyesUpApp`: the halo and stage-line materials are **cloned per instance**. Otherwise every
   halo shares one `mainPass.baseColor` and they all light together.
4. `EyesUpApp`: panel `bind()` calls moved from `onAwake` to `OnStartEvent`. Child script
   components aren't callable during the parent's onAwake ("undefined is not a function").
5. UIKit 4.0 `FlexLayout.addItems()` before init throws when `autoDiscoverItemsOnStart` is on. The
   helpers rely on auto-discovery instead.
6. UIKit hosts are hidden from UpdateEvent, not synchronously in onAwake/OnStart. Otherwise the
   Buttons never initialize (specs-build-ui G3).
7. Panels/podium face the head with `quat.lookAt(dir, vec3.up())`. The cue card is billboarded
   each frame (yaw only).
8. `audience` / `halos` arrays: VirtualScene can't wire array inputs, so EyesUpApp collects them
   from `audienceRoot` children (each with a `Halo` child) when the arrays are empty.

## Design-note-driven changes (before → after)

| Note | Before | After |
|---|---|---|
| Cue card unreadable at 2.5 m in the first capture (`02` shows it as a speck) | title 120 / body 80 | title 200 / body 130, title +9 cm / body −8 cm |
| Specs is additive, so never black | — | all text white/cyan/amber. BackPlates use UIKit `dark`/`simple` styles |

## Tooling changes to keep Node checks working

- `tsconfig.test.json`: Lens Studio rewrote `tsconfig.json` (commonjs, `paths` into `Cache/`), so
  the Node config now overrides `paths: {}`, `strict`, `experimentalDecorators`, `skipLibCheck`,
  `isolatedModules: false`. It also excludes `Cache`, `Packages`, `Support`, `Assets/Tests`
  (LEAF-only) and `Assets/Leaf.lspkg`. `tsconfig.json` was left as Lens Studio wrote it.
- `typings/lens-studio-shim.d.ts`: added the Lens/UIKit members the adapters use, and `UIKit.lspkg`
  module stubs.
- `eslint.config.js`: ignores `Plugins/`, `Workspaces/`, `Assets/Leaf.lspkg/`, `tempAssetGen/`.
- `npm run check` (typecheck + lint + vitest): **green, 93/93 tests** (91 existing + 2 new
  GazeProvider tests).

## Known gaps / open problems

- **G1: no SFX (RESOLVED: the four WAVs are in Assets/GeneratedSFX and wired in).** The `build-sfx` generator is written at `tempAssetGen/sfx.cjs` (NudgeChime,
  StartTick, TimeUpTone, Applause; synthesized algorithmically, no copyrighted audio). Running
  `node` on it needed an approval this headless run couldn't get, so no WAVs exist. To finish: run
  `node tempAssetGen/sfx.cjs`, import `Assets/GeneratedSFX/*.wav`, add AudioComponents
  (`NudgeAudio_L/R` positioned left/right with spatial audio, Tick, Tone, Applause), and wire them
  to EyesUpApp.
- **G2: panel surfaces barely visible in preview.** On the simulated additive display the dark
  BackPlates and default Button faces are near-invisible, so panels read as floating text. Brighter
  button styles or icons (IconSelector) and a theme font (FontSelector) were not done.
- **G3: Not tested** (as the brief says): spatial audio direction, legibility at 2.5 m.
- **G4: no IK reachability scenario** (see above).
- **G5: not done:** the walk-around in Interactive Preview, the 3 questions, and the comfort
  check. A human needs to do these.
- **G6:** The default preview camera pitch (−12°) equals the podium threshold, so the podium can
  flash on at rest in preview. Consider 14–15° via a design note.
- **G7:** In one long manual session, repeated nudges stopped showing up in my polls after the
  second one. With a 3 s on / 8 s cooldown cycle and ~5 s per poll this may be sampling, not a bug.
  Unverified.
- **G8:** "Finish?" reuses the cue-card title. There is no separate prompt surface.
- Housekeeping: `.virtual-scene.json`, `leaf_plugin_settings.json`, `Plugins/` and `Workspaces/`
  are Lens Studio/tool state and probably belong in `.gitignore`. Left untouched because
  `.gitignore` has uncommitted user edits. Nothing was committed.

---

# Pass 2 (2026-10-31, headless)

Same setup as pass 1: Lens Studio 5.24.1 through the lens-studio MCP server, no human available.
Label is still **logic proven / feel unproven**. G1, G2, G6 and G7 are closed below. G3, G4, G5
and G8 are still open.

## Summary

| Task | Result |
|---|---|
| 1 Audio | 4 WAVs (already imported as `FileAudioTrack`) wired to 5 AudioComponents. The nudge chime is **spatial** from the neglected side. No runtime errors. |
| 2 Panel legibility | Root cause of G2 found: UIKit's RoundedRectangle **never renders** in this project. Panels and buttons now draw with unlit quads. Icons on Start/Prev/Next/Finish/Again/Done. Inter font. |
| 3 Podium threshold | 12° → **15°** (`Tunables.podiumPitchDeg`, plus EyesUpApp `@input podiumPitchDeg`). Tests updated. |
| 4 Repeated nudges | **Not a bug.** It's scheduling (shared 8 s cooldown + 12 s drain), proven with a deterministic Node test and a new LEAF scenario. No core-logic change. |
| 5 .gitignore | Appended `.virtual-scene.json`, `.virtual-scene.runtime.json`, `Plugins/`. The rest were already covered. |
| 6 Verification | 7/7 LEAF scenarios pass (6 original + `repeated_nudge`). `npm run check` green, **97/97**. Screenshots 01–06 retaken. |
| 7 Save | Project saved via the Editor API (`model.project.save()`). Nothing committed. |

## Design-note changes (before → after)

| Note | Before | After |
|---|---|---|
| Panels read as floating text on the additive display (G2) | UIKit BackPlate `dark` + default Button faces. **Neither ever drew** (see D10) | Blue-grey surface `rgba(0.20,0.27,0.37,0.80)` with a 0.15 cm light frame `rgba(0.60,0.78,0.95,0.55)`. Buttons: face `rgba(0.30,0.42,0.58,0.95)` with a light frame `rgba(0.78,0.90,1,0.9)`, hover/press tint brighter. Primary (Start, Finish, Again) is teal `rgba(0.18,0.50,0.62,0.95)`. No black anywhere. |
| Buttons were text only | `< Prev`, `Next >`, `Start rehearsal`… | Leading Material icons (IconSelector, defaults): `play_arrow` Start, `chevron_left` Prev, `chevron_right` Next, `flag` Finish, `replay` Again, `check` Done. Inline `<` `>` glyphs dropped. |
| Default font | Lens default | **Inter** (FontSelector) on every panel Text via `THEME_FONT` in `EyesUpUI.ts`, and on CueCardTitle/Body via the Inspector apply |
| Summary zone bars invisible (UIKit `simple` BackPlate) | — | Bright cyan quads `rgba(0.45,0.78,1,0.9)` |
| Podium flashed at rest (G6) | look down ≥ 12° | ≥ **15°**, tunable. 12° (the preview's default camera pitch) and ~14° no longer show it. The podium itself sits ~29° down. |
| Button size | Podium 6.4×3.4 cm (Re-place 5.6×3.0) at 55 cm, Setup 30×3.6 / Start 22×4.4 at 110 cm, Summary 12×4.2 at 150 cm | unchanged. All ≥ 3 cm at 55 cm (brief) |

## Decisions made without a human (pass 2)

- **D10: surfaces are plain quads, not UIKit visuals.** Probe: BackPlate theme callbacks fired (6×),
  Button `onInitialized` fired (10×) with a `RoundedRectangleVisual`, and a BackPlate forced to
  solid **red** still showed nothing in the Preview. Removing the Canvas didn't help, and the log
  had no shader errors. Scene meshes and the UIKit-hosted icon `Image`s do draw. Likely cause:
  UIKit 4.0 targets LS 5.25, as with LEAF in D2. I couldn't confirm it because
  `QueryLensStudioKnowledgeBase` needs a Snapchat login. BackPlate and Button stay in place for
  layout, colliders and interaction (LEAF still pinches them by name). `EyesUpUI.addSurface()`
  draws a frame quad and a fill quad (`Materials/PanelQuad.mesh` PlaneMeshPreset +
  `Materials/PanelSurface.mat` UnlitMaterialPreset, Normal blend, depthWrite off, two-sided).
  Size and orientation are read from the mesh AABB. Hover/press tint uses the Button's
  `onHoverEnter/Exit/onTriggerDown/Up`. This deviates from CLAD's "no hand-rolled BackPlate"
  check. Remove it once UIKit renders on this LS version.
- **D11: spatial chime.** `NudgeAudio_L/R` are children of `Camera Object` at (∓100, 0, −40) cm.
  Both have Spatial Audio + Position Effect on and Distance Effect off, so loudness doesn't depend
  on room size. An `AudioListenerComponent` was added to the camera (Lens warned without it).
  `NudgeController` already plays L or R by the turn side, so no logic change was needed. Chime and
  tick use `Audio.PlaybackMode.LowLatency` (specs-audio: input-driven SFX), set in OnStart.
  Applause and the time-up tone stay LowPower. `TickAudio`, `TimeUpAudio`, `ApplauseAudio` are
  non-spatial children of `EyesUp`.
- **D12: font tool apply target.** FontSelector refuses import-only without selected Text, and its
  `sceneObjectId` apply isn't recursive. It was applied to `CueCardTitle` and `CueCardBody`, and
  the panels load `Fonts/Inter.ttf` with `requireAsset`, as specs-build-ui's `theme_font_path`
  convention says.
- **D13: icon + label layout inside a Button** is hand-centered (estimated label width), not a
  nested FlexLayout. Each Button face is a single fixed-size cell.
- **D14: capture-only LEAF scenarios** `capture_nudge_hold` and `capture_podium` are registered in
  `LeafIndex` but are **not** done criteria. `capture_nudge_hold` stretches the hint window from
  3 s to 20 s for that run only, so screenshot 03 is **staged for timing**. The chevron's look and
  position are real. Pausing the preview doesn't work: `CapturePanelScreenshotTool` refuses a paused
  preview. Screenshot 05 pitched the preview camera −24° (reset afterwards), because LEAF's
  scripted gaze doesn't move the preview camera and the podium sits outside the level view.

## Task 4: repeated nudges (G7), verdict: working as designed

Deterministic check, `tests/unit/NudgeRepeat.test.ts` (real `EyesUpSession` + `ScriptedGazeProvider`,
60 fps):

1. Gaze on the right zone for 8.5 s → left nudge at t ≈ 8 s. Look left 0.5 s → hint hidden.
   Look right again → the **second left nudge fires 16 s after the first** (sequence
   left, center, left, with chime 'left' twice). Left re-arms ~11.6 s after the look
   (0.5 → 0.2 at 12 s drain = 3.6 s, + 8 s neglect). The never-watched center zone takes the 8 s
   cooldown slot first, and left gets the next one.
2. 60 s staring right → 7 nudges, exactly every 8 s, each hidden after 3 s. Nothing stops.
3. After a zone is **fully** lit (attention 1), its next nudge needs 9.6 s drain + 8 s ≈ 17.6 s,
   plus a free cooldown slot (~22 s measured).

So in a manual session where you glance around, each zone needs ~18–24 s between nudges and each
hint lives 3 s. ~5 s polls easily miss most of them. No core logic was changed. LEAF
`repeated_nudge` polls every frame and confirms the same in Lens (PASSED, 26.8 s). If nudges
should feel more frequent, that's a tuning call for a human (`drainSeconds` 12 → 8, or a
per-zone cooldown), not a bug fix.

## LEAF results (Interactive Preview, run one at a time after the final UI change)

| Scenario | Result |
|---|---|
| `start_places_audience` | ✅ PASSED |
| `gaze_fills_halo` | ✅ PASSED (4.3 s) |
| `neglect_triggers_nudge` | ✅ PASSED |
| `next_shows_card_then_pill` | ✅ PASSED (7.7 s) |
| `dwell_expands_pill` | ✅ PASSED (8.6 s) |
| `finish_shows_summary` | ✅ PASSED (8.1 s) |
| `repeated_nudge` (new, task 4) | ✅ PASSED (26.8 s) |
| `capture_nudge_hold`, `capture_podium` | capture helpers, PASSED (not criteria) |

The first `capture_nudge_hold` call right after a preview refresh timed out at the MCP call, likely
before the LEAF bridge reconnected. The retry passed. Times come from the LEAF on-screen overlay.
Where a time is missing it was not recorded.

`npm run check`: typecheck + lint + vitest **97/97** (pass 1: 93). New: `NudgeRepeat.test.ts` (3),
and `PanelModels` gained 1 test. The `PanelModels` podium test and the integration test now use the
default threshold. `RecompileTypeScriptTool` succeeded. `RunAndCollectLogsTool` shows no Lens errors
(only editor network / LEAF-plugin warnings and a depth-format notice).

## Screenshots (devpost/screenshots/, overwritten, 475×1400 from the 1392×4096 stereo panel)

| File | Shows |
|---|---|
| `01-setup-panel.png` | Blue-grey Setup surface with frame. Length / Audience / Deck buttons framed. Teal "▶ Start rehearsal" |
| `02-audience-lit-halo.png` | After `gaze_fills_halo`: member #3's halo bright. LEAF "PASSED" overlay visible top-left |
| `03-nudge-chevron.png` | Amber "< left" chevron at the left view edge (staged hold, D14) |
| `04-cue-card.png` | "The problem" + two points above the audience (dwell expand). A "> right" chevron is also up |
| `05-podium.png` | Podium surface: "1 / 6", "0:08", framed ‹ Prev, › Next, teal ⚑ Finish (camera pitched −24°, D14) |
| `06-summary.png` | Summary surface: 0:03, cyan zone bars left/center/right, longest look-away, balance, ↻ Again / ✓ Done |

Seen in the captures, not fixed:
- The podium's button labels and "1 / 6 · 0:08" are small next to the icons. The type scale
  shrinks with distance (55/110), so the angular size is correct, but the labels could be one
  role larger.
- The summary surface is translucent with depthWrite off, so a lit halo behind it shows through
  faintly.
- The LEAF status overlay appears in captures taken right after a scenario.

## MCP tools used (pass 2)

IconSelector (×6), FontSelector, VirtualScene (read/apply), asset-graphql (allAssets,
createAssetFromPreset, duplicateAsset, renameAsset, assetByPath, presets), RecompileTypeScriptTool,
RunAndCollectLogsTool, CapturePanelScreenshotTool, QueryRuntimeSceneTool, PreviewPanelTool
(refresh/pause/resume), MovePreviewCamera, open_leaf_panel, list_leaf_scenarios, run_leaf_scenario,
ExecuteEditorCode (project save only), QueryLensStudioKnowledgeBase (failed: needs login). No raw
HTTP. The `.mcp.json` token was not read or written.

**Incident:** `asset-graphql duplicateAsset` on `SilhouetteGlass.mat` **renamed the original** to
`PanelSurface` and left an unimported copy in `Materials/`. I renamed it back with `renameAsset`.
The asset ID is unchanged (`c7318ab5…`), so the audience wiring is intact. I deleted the stray
`.meta`-less copy and created `PanelSurface.mat` fresh from `UnlitMaterialPreset`.

## CLAD skills read and followed (pass 2, read-only)

skills/lens-studio-field-notes (see-and-fix loop, temporary probes removed and grepped),
skills/specs-build-ui (SKILL.md, custom-visuals RectangleButton example, CoinScoreRow icon Image
pattern, ImageMaterial asset prerequisite), skills/icon-selector (default appearance, one call per
icon), skills/font-selector (search skipped for an exact family; `requireAsset` path from the
tool), skills/specs-audio (LowLatency for input SFX, set in OnStart), skills/verify-preview and
skills/specs-leaf-run-in-preview (run scenarios one at a time in preview, capture after).

## Still open after pass 2

- G3: spatial direction of the chime hasn't been checked by ear. Neither has legibility at 2.5 m.
- G4: no IK reachability scenario.
- G5: walk-around, the 3 questions and the comfort check need a human.
- G8: "Finish?" still reuses the cue-card title.
- D10: UIKit RoundedRectangle not rendering on LS 5.24.1. Re-test after a Lens Studio update and
  remove the quads if UIKit draws.
- D2's LEAF patch is still in place.
- Nothing committed.

---

# Pass 3 (2026-10-31, headless)

Same setup: Lens Studio 5.24.1 through the lens-studio MCP server, no human available. The label is
still **logic proven / feel unproven**.

## Summary

| Task | Result |
|---|---|
| 1 Health | **Not a current bug.** `TypeScript compilation failed … Cannot create component for class GazeFillsHalo` at `Assets/Tests/Leaf/EyesUpScenarios.ts:42` is in the log at 21:19 (pass 1), when all scenarios shared one file. Lens Studio allows one `@component` per file. That file is gone (scenarios are split one per file), nothing references it, a forced `RecompileTypeScriptTool` **succeeded**, and `RunAndCollectLogsTool` refresh shows no Lens errors, only editor network, LEAF-plugin and depth-format warnings. |
| 2 Legibility polish | Larger type on all three panels, podium labels most of all. Panel fill alpha 0.80 → 0.95. Audience and halos hidden while Summary is open. Details below. |
| 3 Demo reel | New LEAF scenario **`demo_reel`** (`Assets/Tests/Leaf/DemoReel.ts`, registered in `LeafIndex`), 71 s. Timeline: `devpost/demo-reel-timeline.md`, taken from the run's own log lines. |
| 4 Preview size | **Done.** Through `Editor.Dock.IDockManager.write()/read()`: the top-level horizontal splitter went 177/427/202/201 → 0/0/0/1007. The other columns collapse to a few px and stay docked (LEAF panel included). Preview went from ~201×590 pt (1392×4096 px capture, portrait) to ~1015×706 pt (**2283×1590 px**, landscape). The layout reload recreated the panel as **"Preview 2"** (same SPECS 27 / Interactive / Sunlit Room config). To restore, drag the splitters back or reset the layout. |
| 5 Recording | **Failed: frozen window image.** `record-window.sh 25113 85 …` ran and wrote **882 frames** (~10.4 fps), and the lens ran the full reel in that window. But every frame (checked 0, 60, 500, 880) is the **same stale image**: the old layout (narrow "Preview 1"), with Logger lines from 21:19. The window server isn't refreshing window 25113 (likely off-screen, another Space or minimized, or a stale id). I couldn't list window ids (`osascript` CGWindowList needs an approval this run can't get). **No frame shows Setup in the current layout.** Fix: bring the Lens Studio window on-screen in the current Space, confirm the id, and re-run the recorder plus `demo_reel`. It's deterministic. |
| 6 Verification | 7/7 done-criteria LEAF scenarios pass. `npm run check` green (**97/97**). Project saved (`model.project.save()`). Nothing committed. |

## Design-note changes (before → after)

| Note | Before | After |
|---|---|---|
| Podium labels small next to icons (pass-2 note) | labels `Button` (39), info `Headline2`, buttons 6.4×3.4 cm, panel 30 cm wide | Prev/Next/Finish labels `HeadlineXL` (62), Re-place `Headline1`, "1 / 6" and timer `Title2`. Buttons **7.2×3.6 cm** (Re-place 6.0×3.2) at 55 cm, all ≥ 3 cm. Podium **34 cm** wide so they fit |
| Setup text small | title `Headline1`, subtitle `Caption`, labels `Button` | title `Title2`, subtitle `Headline2`, all four button labels `Headline1`. Row gap 1.0 → 0.9 to stay inside 40×30 cm |
| Summary text small | title `Headline1`, time `HeadlineXL`, zone/stat rows `Body` | title `Title2`, time `Title1`, zone labels and balance `Headline2`, stat lines `Subheadline`, button labels `Headline2`. Row gap 0.6 → 0.5 to stay inside 50×40 cm |
| Panel too see-through | fill `rgba(0.20,0.27,0.37,0.80)`, frame α 0.55 | fill `rgba(0.17,0.23,0.33,0.95)`, frame α 0.70 |
| Lit halos showed through the Summary (pass-2 note) | audience stays as it was at Finish | on entering Summary, halos fade to 0 and silhouettes are hidden. Again re-places and fades them in (`EyesUpSession.enterPlacing`), so it fits the brief's "Summary only after Finish". Checked in a capture after `finish_shows_summary`: nothing behind the panel |

Seen, not fixed: the Spectacles preview composites the lens **additively**. The poster behind the
Setup panel still shows through at α 0.95, so alpha can't make a panel opaque on this display. Only
brightness changes how much the room washes out. A brighter fill would cost text contrast, so the
change stays modest. The Summary's secondary lines (`TEXT_SECONDARY`, α 0.7) are the dimmest text
left.

## Decisions made without a human (pass 3)

- **D15: demo reel as a LEAF scenario, not an EyesUpApp tunable.** It reuses the LEAF rig (scripted
  gaze plus real Button pinches), keeps demo code out of the lens, and can be replayed from MCP. It
  doesn't change any tunable, so every event happens at its real timing. To fit ~75 s, the sweep
  covers center → right. The never-watched left zone's 8 s neglect clock runs from the rehearsal
  start, so the "long stare at the right" ends with the left nudge at +8 s. The gaze then moves left
  **before** the 3 s hint timeout, so the chevron clears by look (`nudge ends (looked)`), not by
  timeout. The first dry run got this wrong and was retimed. Later glances cover every zone, so no
  stray nudge interrupts the card section. The dry run had a right nudge at 40 s; the final run has none.
- **D16: demo-only gaze reticle.** LEAF can't move the preview camera, so without a marker the
  viewer can't see where the simulated head looks. `DemoReel.ts` adds a small amber diamond at the
  gaze target. It is scenario-local and doesn't exist in the lens.
- **D17: LEAF overlay hidden during demo_reel.** `Logger.logLevel = ERROR` during the run, plus a
  per-frame `LeafDebugUICamera.enabled = false` that lasts until 15 s after the run. Pass
  `__leaf__log_level: ERROR` and `__leaf__diagnostic_report_duration_ms: 0` as well. The final
  `PASSED` line still reaches the plugin. Not checked visually, because the recording failed (task 5).
- **D18: `ButtonOptions.labelRole`** (EyesUpUI) lets a panel pick a larger type role for a button
  label. The icon + label centering uses the same role.
- **D19: Preview enlarged by rewriting the dock layout** instead of opening a second preview.
  `PreviewPanelTool.openPreview` adds a pane but can't size it, and a detached window would be a
  different window id from the one the recorder captures.

## LEAF results (Interactive Preview, "Preview 2", run one at a time after the final change)

| Scenario | Result |
|---|---|
| `start_places_audience` | ✅ succeeded |
| `gaze_fills_halo` | ✅ succeeded |
| `neglect_triggers_nudge` | ✅ succeeded |
| `next_shows_card_then_pill` | ✅ succeeded |
| `dwell_expands_pill` | ✅ succeeded |
| `finish_shows_summary` | ✅ succeeded (overlay: PASSED, 8.6 s) |
| `repeated_nudge` | ✅ succeeded |
| `demo_reel` (not a criterion) | ✅ completed, 71.2 s. The MCP call times out at ~60 s, but the lens log shows `✅ Scenario demo_reel completed successfully` |

`npm run check`: typecheck + lint + vitest **97/97**. No Node-tested code changed: the pass-3 edits
are in the Lens adapters (EyesUpUI, Podium, SetupPanel, SummaryPanel, EyesUpApp) and LEAF-only files.

## MCP tools used (pass 3)

RecompileTypeScriptTool, RunAndCollectLogsTool (refresh + tail), CapturePanelScreenshotTool,
ListAllPanels, ExecuteEditorCode (IDockManager write/read, project save), PreviewPanelTool
(listPreviews/getConfig), list_leaf_scenarios, run_leaf_scenario. No raw HTTP. The `.mcp.json` token
was not read or written.

## Still open after pass 3

- **Demo recording**: re-record after fixing the window id/visibility (task 5).
- G3, G4, G5, G8, D10 and D2 as listed after pass 2.
- The demo reel's reticle and overlay muting are demo scaffolding. Mention in the video that gaze
  is simulated.
- Nothing committed.

# Pass 4 (2026-10-31, headless)

Same setup: Lens Studio 5.24.1 through the lens-studio MCP server, no human available. Goal: close
the gaps against the planning artifact's mockups (S1 Setup, S3 nudge, S4 podium + card, S5 summary).
The label is still **logic proven / feel unproven**.

## Summary

| Item | Result |
|---|---|
| 1 Summary (S5) | **Done.** Title "Nice work — m:ss" plus a "target m:ss · deck" line. Mint **Balance badge** (number over "Balance"). Zone rows: name · bar on a dim track · %. Name and % turn **amber outside 15 % < share < 35 %** (S5's rule "35% 미만·15% 초과"). Two stat boxes: "Longest look-away / 11 s · left · at 1:12" (new `StatsSnapshot.longestLookAway.startSeconds`) and "Card expands · Nudges / 2 · 1". Amber tip box from the weakest zone. Again / Done (Done is primary, as in S5). Gaze timeline strip **skipped**: not trivial (needs per-second zone history in SessionStats plus a strip renderer). |
| 2 Cue card (S4) | **Done.** 64 × 26 cm backing quad (S4's own note: widen to ~64 cm), title size 200 → 240, bullets 130 → 140 with "•". **Cyan countdown line** empties over the 4 s (`CueCardController.countdown`, `EyesUpSession.cardCountdown`). The card now sits *above* its anchor, so it no longer overlaps the front heads. Pill keeps **90 %** of card scale (was 40 %) on its own backing sized to the tag. |
| 3 Podium (S4) | **Done.** Next is the largest target, **9.6 × 4.8 cm**, cyan primary. Prev 6.4 × 3.6, Finish 6.4 × 3.6 amber-framed (new `ButtonOptions.amber`). Timer "m:ss / m:ss" (`PodiumState.timerLabel`). Counter "n / N". Re-place moved into the info row, so its hidden slot no longer pushes the buttons off-center. |
| 4 Setup (S1) | **Done.** "SETUP" pill next to the title. Subtitle "Rehearse with your eyes on the room." (scene-serialized input updated via the Editor API). Caption "Stage appears 2.5 m ahead / of where you're facing." next to Start. Decks: **"Eyes Up pitch" (5 cards)** and **"Self-intro" (3 cards)**. The deck button reads "Deck: Eyes Up pitch · 5 cards". |
| 5 Nudge chevron (S3) | **Done.** 1 Hz pulse while visible: `chevronPulse(t)` = 0.5 + 0.5·cos(2πt) drives text alpha (35–100 %) and scale (0.90–1.05). Restarts on each show. |
| 6 README | **Done.** Status: scene built via Lens Studio MCP, 7 LEAF done criteria pass, preview-only, demo video pending. |
| Verification | `RecompileTypeScriptTool` succeeded. `RunAndCollectLogsTool` shows no `E` lines (W only: editor network auth, material batcher, depth format). 7/7 LEAF pass. `npm run check` green, **105/105** (was 97). Screenshots 01, 04, 05, 06 retaken. Project saved. Nothing committed. |

## Decisions made without a human (pass 4)

- **D20: deck trims.** Pitch 6 → 5: "Notes only when stuck" dropped, and its idea moved into "Why
  glasses" using S4's bullets ("The audience is in your room" / "Notes only when you need them").
  Self-intro 4 → 3: "Close" folded into "Why this team". The id changed `interview-intro` →
  `self-intro`, with tests updated.
- **D21: amber thresholds.** S5's layout note states the range as *above 15 % and below 35 %*, so the
  boundaries 15 and 35 are amber. The S5 render also tints "Left 22 %", which contradicts its own
  rule. The written rule wins.
- **D22: balance formula unchanged.** S5 states `100 − Σ|zone% − 33.3|/2` and shows 86 for 22/58/20,
  but that formula gives 75 for those numbers, and the existing normalized-TVD score gives 63. The
  artifact isn't self-consistent, so the tested score stays. Only its presentation changed (badge).
- **D23: tip rule.** The weakest zone (lowest share, ties left → right) gets "Next time, look
  left/right more." or "…look at the center more." If every zone is in range: "Nice balance. Keep
  it up." With no gaze at all: "Next time, look up at the audience."
- **D24: "Cards" stat** shows card expands · nudges ("2 · 1"). S5's "2 of 5" has no defined meaning in
  the plan (expands vs. sections reached), so it isn't shown.
- **D25: cue card backing via runtime quads** (same EyesUpUI `addSurface` as the panels, D10). The
  texts get `setRenderOrder(10)` so they draw over the translucent backing. Text width was measured
  in the preview at ≈ 0.0124 cm per size unit per glyph, which sizes the pill backing.
- **D26: Next is the primary (cyan) button** on the podium, per S4. Finish moved to the amber style,
  which S4 describes as pulsing once the length is reached. That pulse is not built.

## LEAF results (Interactive Preview, "Preview 2", after the final code change)

| Scenario | Result |
|---|---|
| `start_places_audience` | ✅ succeeded |
| `gaze_fills_halo` | ✅ succeeded |
| `neglect_triggers_nudge` | ✅ succeeded |
| `next_shows_card_then_pill` | ✅ succeeded |
| `dwell_expands_pill` | ✅ succeeded |
| `finish_shows_summary` | ✅ succeeded. **Expectation changed**: the `TimeText` check is now `^Nice work — \d+:\d\d$` (S5 puts the time in the title) |
| `repeated_nudge` | ✅ succeeded |

## Screenshots retaken

| File | Shows |
|---|---|
| `01-setup-panel.png` | Title + SETUP pill, new subtitle, Length / Audience / "Deck: Eyes Up pitch · 5 cards", Start + caption |
| `04-cue-card.png` | "The problem" card: 64 cm backing, bullets, cyan countdown line about ⅔ full, above the heads (from `capture_podium` just after start) |
| `05-podium.png` | "1 / 5", "0:05 / 3:00", Prev · large cyan Next · amber Finish (camera pitched −24°, reset afterwards) |
| `06-summary.png` | "Nice work — 0:03", target line, Balance 99 badge, bars, look-away "2 s · left · at 0:01", tip, Again / Done. Gaze is balanced in this run, so no amber zone is visible |

## Still open after pass 4

- Gaze timeline strip (S5 ③), Finish pulse at time-up (S4), Balance-badge two-size typography (one
  Text role for number and caption), and the S3 chevron size (6 × 6 cm with "‹‹").
- `devpost/demo-reel-timeline.md` still says "1 / 6". Re-run `demo_reel` before recording, since the
  pitch deck now has 5 cards.
- Demo recording, plus G3, G4, G5, G8, D10 and D2 as before.
- Nothing committed.

# Pass 5 (2026-10-31, headless)

Same setup: Lens Studio 5.24.1 through the lens-studio MCP server ("Preview 2", Interactive), no
human available. Goal: the gaps left after pass 4 against artifact S3 (nudge) and S5 (summary),
plus the S4 Finish pulse. The label is still **logic proven / feel unproven**.

## Summary

| Item | Result |
|---|---|
| 1 Summary gaze timeline (S5 ③) | **Done.** `SessionStats` keeps a **0.5 s zone history** (each bucket = the zone looked at most in it, `null` = mostly nobody; frames spanning a boundary are split) and the **session time of each nudge**, exposed as `StatsSnapshot.timeline`. New pure `core/GazeTimeline.ts`: `downsampleZones` (majority vote, **≤ 60 columns**), `columnSegments` (merged runs as strip fractions), `axisTicks` (0:00, 10/15/30/60/120/300 s steps with ≤ 3 ticks, end time, drops ticks within 15 % of the end), `gazeTimeline` (segments + coral longest look-away `{zone,start,end,"12 s"}` + nudge positions). `SummaryPanel` draws it with plain quads between the zone bars and the stat boxes: L/C/R labels (amber when that zone is out of range), dim tracks, cyan segments, a coral-framed box with the seconds on the look-away row, an amber stem + dot + "nudge" per nudge, and the time axis. Rebuilt once per show. |
| 1b Chip + check icon (S5) | **Done.** Mint "Session complete" chip (check_circle icon + text) 2.8 cm above the panel's top edge; a mint `check_circle` icon (IconSelector, `#8cffcc`) left of the title. Title and target line are now left-aligned, as in S5. |
| 2 Nudge chevron (S3) | **Done.** Amber **double chevron** via IconSelector `keyboard_double_arrow_left/right` (`#ffb833`), **6 × 6 cm** at 100 cm, added at awake 4.2 cm above the hint's scene Text, which now holds just "left" / "right" at size 90 (≈ 1.5 cm, S3's caption size). The 1 Hz pulse still drives scale (0.90–1.05) on the hint, alpha on the caption, and now alpha on the icon (premultiplied: all channels scaled). |
| 3 Podium Finish pulse (S4 / brief) | **Done.** `PodiumModel.finishPulse(elapsed, target)` = 0 before the target, then a 1 Hz cosine starting at 1, and only during Rehearsal (`PodiumState.finishPulse`). `Podium` scales the Finish button 1.00 ↔ 1.12 and tints its label white → amber. Checked at runtime by the new LEAF `finish_pulses_at_time`. |
| 4 Demo reel + verification | `demo_reel` re-run (completed successfully). `devpost/demo-reel-timeline.md` rewritten for the 5-card deck from that run's log. 7/7 done-criteria LEAF pass. `npm run check` green, **115/115** (was 105). Recompile succeeded. No runtime errors. Screenshots 03 and 06 retaken. Project saved. Nothing committed. |

## Decisions made without a human (pass 5)

- **D27: Summary panel 50 × 40 → 50 × 47 cm.** The strip needs ~10 cm, and shrinking the other rows
  would undo pass 3's legibility sizes. The panel is still well inside the vertical FOV at 1.5 m
  (the chip's top edge sits about 28 cm above eye level).
- **D28: history bucket 0.5 s, majority vote for downsampling.** A zone wins a tie against
  "nobody", and zone ties go left → right (the same rule as the tip). Columns are equal-width
  slices of the buckets. The last partial bucket is included, so the strip reaches the end time.
- **D29: the coral box spans the whole look-away on its zone's row**, and it's at least 3 cm wide so
  its "N s" label fits. It covers the segments it spans, which are empty on that row by definition.
  It isn't drawn under 1 s.
- **D30: chevron as an icon, not a "‹‹" glyph.** At 6 cm, Inter's "‹" is thin and its size in cm
  depends on font metrics. The Material double-arrow icon is an exact 6 × 6 cm box (the glyph
  fills about ⅔ of it) and matches S3's bold chevron. The scene Text is kept as the caption, so
  `neglect_triggers_nudge` still reads "left" from `EdgeHintLeft`.
- **D31: Finish pulse = scale + label tint** (no face recolor), because the face color is owned by
  the hover/press handlers. It pulses from the moment elapsed ≥ target. Pass 2's `finishPrompt`
  event at target + 30 s is unchanged.
- **D32: capture helpers mute the LEAF overlay.** `muteLeafOverlay()` moved into
  `EyesUpLeafHelpers`. `capture_nudge_hold` (30 s) and the new `capture_summary` (60 s) hide the
  log strip so screenshots are clean.

## LEAF results (Interactive Preview, "Preview 2", after the final code change)

| Scenario | Result |
|---|---|
| `start_places_audience` | ✅ succeeded |
| `gaze_fills_halo` | ✅ succeeded |
| `neglect_triggers_nudge` | ✅ succeeded |
| `next_shows_card_then_pill` | ✅ succeeded |
| `dwell_expands_pill` | ✅ succeeded |
| `finish_shows_summary` | ✅ succeeded |
| `repeated_nudge` | ✅ succeeded |
| `finish_pulses_at_time` (new, extra) | ✅ succeeded. Fast-forwards the session clock to target − 2 s (a test-only write to the private `_elapsed`), then checks Finish rests at scale 1.00 before the target and peaks at 1.08–1.13 after it |
| `capture_summary` (new, capture helper) | ✅ succeeded. Right side ~9 s → left nudge → brief left look → center → right → Finish. Gave left 7 % / center 32 % / right 61 %, Balance 58 |
| `capture_nudge_hold` | ✅ succeeded |
| `demo_reel` | ✅ completed successfully (MCP call timed out at ~60 s as documented; the scenario ran to t = 71.1 s). Summary: 0:42, 19 / 47 / 34, Balance 79, coral "12 s" on L from 0:13, nudges 1 |

Logs: `RunAndCollectLogsTool` after the final recompile shows no `E` lines from the lens. The W lines
are the usual ones: editor network auth, depth format, and material batcher "batching retries
exhausted" for text visuals. One `E TypeScript compilation failed … Cannot find name
'FinishPulsesAtTime'` appeared from Lens Studio's auto-compile between two edits of `LeafIndex.ts`.
The explicit recompile right after succeeded, and every run above came after it.

## Tests

`npm run check`: typecheck + lint + vitest **115/115**. New `tests/unit/GazeTimeline.test.ts` (10):
zone history buckets (split frames, ties, partial bucket, nudge times, reset), downsampling (≤ 60,
majority, zone-beats-nobody tie), segment merging, axis ticks (2:51 → 0:00 / 1:00 / 2:00 / 2:51),
a 2:51 session with a 14 s left look-away and a nudge at 1:23, the < 1 s and no-time cases,
`finishPulse` (rest → 1 at target → 0 at +0.5 s → 1 at +1 s) and `podiumState.finishPulse` only in
Rehearsal. `PanelModels.test.ts`'s snapshot fixture gained the `timeline` field.

## Screenshots retaken (2283 × 1590, "Preview 2")

| File | Shows |
|---|---|
| `03-nudge-chevron.png` | Amber "‹‹" double chevron over "left" at the left edge, the pill "Screens pull eyes", the audience (staged hold, D14). No LEAF overlay |
| `06-summary.png` | From `capture_summary`: "Session complete" chip, check icon + "Nice work — 0:22", Balance 58, **Left 7 % and Right 61 % amber**, timeline with a coral **"12 s"** box on L from 0:10, an amber nudge dot + "nudge" at ~0:08, axis 0:00 / 0:10 / 0:22, "12 s · left · at 0:10", "0 · 1", tip "Next time, look left more.", Again / Done |

## Seen, not fixed

- After `demo_reel` the Summary panel is placed slightly right of the preview's center, because it
  is placed along the scripted gaze at the moment Summary opens. This placement isn't new in
  pass 5, and the `capture_summary` framing is centered.
- At the preview's resolution the strip's "C" row label is small. It's readable at full size, but
  it's the smallest text on the panel after the axis.

## Still open after pass 5

- Balance-badge two-size typography (one Text role for number and caption).
- Demo recording, plus G3, G4, G5, G8, D10 and D2 as before.
- Nothing committed.

# Pass 6 (2026-10-31, headless)

Same setup: Lens Studio 5.24.1 through the lens-studio MCP server ("Preview 2", Interactive), no
human available. One bug: with the **real camera gaze** (CameraGazeProvider), looking straight at the
pill for 2–3.5 s never re-expanded the card. It failed from the start position and from 1 m closer
(CardBg / CueCardBody stayed hidden). LEAF `dwell_expands_pill` passed with ScriptedGazeProvider.

## Root cause

The dwell hit test was a **7° cone (`lookAngleDeg`) around `layout.cardAnchor`**, a point. It did not
use the pill itself. Two things made that go wrong with a real head:

1. **The cone covered the centre audience.** At the start pose the anchor is 15 cm above eye level,
   the centre members' eyes are 10 cm below it, and the pill centre is 19.5 cm above it, all at
   2.5 m. That puts the anchor ~3.4° from straight ahead, the centre eyes ~5.7° from the anchor, and
   the pill 1.1° above it. Pass 4 raised the card above the heads and grew the pill to 90 % with
   its own backing (PillBg 5 cm up the card × 0.9 = 4.5 cm above the anchor), but the target stayed
   a cone at the anchor. A speaker who faces the room therefore counts as "on the pill". The dwell
   fired on its own about 1 s after the pill appeared.
2. **The latch then never re-armed.** `dwellLatched` resets only when the gaze leaves the target.
   Looking from the centre audience straight up at the pill stays inside the same 7° cone, so the
   dwell stayed latched and never fired again. LEAF passed because the scenario looks at member 0
   (far left, outside the cone) before `lookAtPill`, which re-arms the latch.

Reproduced live before the fix. Pinch Start, then the camera's `lookAt` at the pill (camera
rotation x = 4.46°, inside 1° of the pill): CardBg stayed `enabled:false`. Then a separate `lookAt`
far left (53° yaw) and back to the pill: the card expanded. Both moves in one batched
MovePreviewCamera call do *not* re-arm, because both land in the same frame.

## Fix

- New pure `core/PillHit.ts`: `PillRect {center, right, up, halfWidth, halfHeight}` and
  `pillHit(origin, forward, rect, marginDeg)`. It intersects the gaze ray with the pill plane and
  tests the hit against the rectangle, grown by `marginDeg` of visual angle at the hit distance.
  `uprightPillRect(center, viewer, hw, hh)` builds a yaw-billboarded rect (fallback and tests).
- **D33: `pillMarginDeg` = 1.5°** (new tunable; ≈ 6.5 cm at 2.5 m, ≈ 4 cm at 1.5 m) allows for
  head-gaze jitter. The centre audience's eyes stay ~18 cm outside the grown rect.
- `GazeTracker.setPillTarget` takes a `PillRect` (copied by components, because a native `vec3`
  doesn't spread). `onPill` = `pillHit(...)`. The latch behaviour is unchanged: one fire per look,
  re-armed by leaving the pill.
- `CueCardView.pillRect?()` is a new optional hook. **EyesUpApp** reports the live PillBg transform
  every frame: world position (so it follows the billboard, the 0.9 pill scale and the morph), its
  world `right` / `up` axes, and the backing size (`pill.length × 0.0124 × 240 + 8` cm wide, 10 cm
  tall) × world scale. It returns null when PillBg is not enabled in the hierarchy. EyesUpSession
  uses it when the pill shows. Without a view (Node tests) it falls back to a 30 × 10 cm upright
  rect at the anchor. `session.pillRect` exposes the current target.
- LEAF `lookAtPill` and `demo_reel`'s dwell look now aim at `session.pillRect.center` (the real
  pill), not `cardAnchor`.
- `typings/lens-studio-shim.d.ts`: added `Transform.getWorldScale/right/up` and
  `SceneObject.isEnabledInHierarchy` (all exist in `Support/StudioLib.d.ts`).

## Live verification (real CameraGazeProvider, MovePreviewCamera, scene state via QueryRuntimeSceneTool)

| Run | Steps | Result |
|---|---|---|
| 1, start pose | Pinch Start, look at the centre audience's eyes (0, −10, −250) for ~8 s while the card collapses, then `lookAt` the pill (0, 19.5, −250.5), wait 1.5 s | Facing the audience the pill **stayed a pill** (no accidental dwell). After the pill look: **CardBg enabled, CueCardBody enabled** ("• We rehearse looking at screens …") |
| 2, start pose | Look at member area (30, −10, −250) until the card collapsed (CardBg off, PillBg on), then the pill for 1.5 s | **CardBg + CueCardBody enabled** |
| 3, 1 m closer | `setPosition` (0, 0, −100), look at the centre audience until the pill, then the pill (pitch 7.38°) for 1.5 s | **CardBg + CueCardBody enabled** |

No look-away to a far member was needed in any run.

## LEAF results (Interactive Preview, "Preview 2", after the final code change)

| Scenario | Result |
|---|---|
| `start_places_audience` | ✅ succeeded |
| `gaze_fills_halo` | ✅ succeeded |
| `neglect_triggers_nudge` | ✅ succeeded |
| `next_shows_card_then_pill` | ✅ succeeded |
| `dwell_expands_pill` | ✅ succeeded |
| `finish_shows_summary` | ✅ succeeded |
| `repeated_nudge` | ✅ succeeded |
| `finish_pulses_at_time` (extra) | ✅ succeeded |
| `demo_reel` (extra, its dwell look changed) | ✅ PASSED at 71.7 s per the lens log. The MCP call timed out at ~60 s as before. Dwell look at t = 42.8 s → "Why glasses (dwell)" at 43.8 s. Summary zone %: left 20 / center 47 / right 33 |

## Tests and build

- `npm run check`: typecheck + lint + vitest **121/121** (was 115).
- New `tests/unit/PillHit.test.ts` (5):
  - centre and corners hit, just past the margin misses;
  - rays pointing away or parallel to the plane miss;
  - a yawed pill is tested along its own axes;
  - **regression:** the old 7° anchor cone contains the centre audience, the pill rect doesn't;
  - a straight look hits from the start pose and 1 m closer.
- `GazeTracker.test.ts`:
  - the existing dwell tests use the app-shaped pill (`fixtures.appPill`);
  - **new regression:** face centre members for 6 s with the pill up → no fire, then look straight
    at the pill → fires once after 1 s, from both head positions.
- `RecompileTypeScriptTool` succeeded. `RunAndCollectLogsTool` shows no `E` lines (W only: editor
  network auth, depth format, material batcher).
- Project saved (`model.project.save()`). Nothing committed. `.mcp.json` untouched.

## Still open after pass 6

- The pill's real-device gaze jitter is untested. 1.5° is a guess for Spectacles head gaze and may
  need tuning on device.
- Everything listed under "Still open after pass 5".

# Pass 7 (2026-10-31, headless)

Same setup: Lens Studio 5.24.1, lens-studio MCP, "Preview 2" (Interactive), no human available. One
bug, after the pass 6 pill-hit fix: in a live run the card shrank to the pill "Eyes stay up" after
Next, and the operator aimed the camera at the pill centre for ~4 s, then a little lower for 3.5 s.
The card never re-expanded. The amber left chevron (nudge) was showing at the same time.

## Hypotheses checked

| | Hypothesis | Verdict |
|---|---|---|
| a | An active nudge, or nudge state, blocks the dwell | **No.** Nothing in NudgeController touches GazeTracker. The dwell expanded live with the left chevron on (run 1a below) |
| b | lookAt the pill's world position misses the new rect (wrong transform, scale or billboard axes) | **No.** Live debug print of `session.pillRect`: centre (0, 19.5, −250.5) = PillBg's runtime world position, up = (0, 1, 0), half-size 19.7 × 4.5 cm ("Eyes stay up" × 0.9). The editor-side CueCard point that scene-graphql returns, (0, 15, −250), is 4.5 cm below the centre and still inside the rect (+6.5 cm margin at 2.5 m) |
| c | The dwell needs the gaze to leave first (re-arm), and the gaze was already on the pill | **Yes: root cause** |

## Root cause

`GazeTracker.dwellLatched` was set when a dwell fired. It was cleared only by an off-pill frame
**while a pill target was set**. While the card is expanded the session calls
`setPillTarget(null)`, which reset `dwellAccum` but not the latch. So:

1. A dwell fires → latch on → card for 4 s (no pill target, so looking around doesn't re-arm).
2. The card shrinks back to the pill. The pill sits inside the card's area, so a speaker who was
   reading the card (or is already aiming at the pill) has the gaze on it.
3. The pill comes back still latched. `onPill` stays true, so the latch never clears and the dwell
   never fires again until the gaze leaves the pill rect. This holds whether or not a nudge chevron
   is showing.

`enterPlacing` (Re-place / Again) didn't clear it either, so a latch could also carry into the next
session.

Reproduced live before the fix with a temporary `DWELLDBG` print (twice a second: mode, latch,
accumulated dwell, rect, gaze forward, nudge side). Steps: Start, look right (250, −10, −250) for 12.5 s, podium,
Next, face the centre audience 4.8 s (pill), then `lookAt` the pill centre. The dwell fired after
~1 s (latched=true). Kept the same gaze: the card shrank to the pill under it, and the log then
showed `mode=pill latched=true acc=0.00` for 7 s+ with `nudge=left`, then `nudge=right`. No
re-expand. The operator's run matches this: an earlier dwell had latched, and the pill came back
under their gaze.

## Fix

- `GazeTracker.setPillTarget(null)` now clears the latch as well as the partial dwell. The pill is
  armed every time it (re)appears, even with the gaze already on it, and needs `dwellSeconds`
  (1 s) of continuous gaze from then on. While the pill stays up, the "one fire per look" rule is
  unchanged (staring at a pill that's up doesn't loop). If the speaker keeps staring through the
  4 s card, it re-expands 1 s after each shrink. That's intended: they are still looking at it.
- `EyesUpSession.enterPlacing` calls `tracker.setPillTarget(null)`, so no stale rect or latch
  carries across Re-place / Again.
- Debug print removed (`grep DEBUG-PASS7|DWELLDBG` → none).

## Tests (Node, core)

- `GazeTracker.test.ts`, **new regression** "a pill that reappears under the gaze is armed": dwell
  fires → pill target null for 4 s with the gaze unchanged → pill back. It doesn't fire at 0.9 s,
  fires at 1.1 s, and doesn't fire again over 3 s more of staring.
- `EyesUpSession.test.ts`, **new regression** "dwell works with a nudge showing and when the pill
  reappears under the gaze": the live steps through the session (look right until the left
  chevron, podium + Next, face the centre until the pill, wait for a nudge). Dwell on
  `session.pillRect.center` with the chevron up: still a pill at 0.9 s, card at 1.1 s. Keep the
  gaze until it shrinks, then the card is back after 1.1 s (`cardExpands` = 2).
- Both new tests **fail without the fix** (latch reset removed temporarily: 2 failed) and pass with it.
- `npm run check`: typecheck + lint + vitest **123/123** (was 121).

## Live verification after the fix (real CameraGazeProvider, MovePreviewCamera, QueryRuntimeSceneTool)

| Run | Steps | Result |
|---|---|---|
| 1, start pose | Start, look right 12 s, podium + Next, centre audience 4.8 s (pill), wait for the **left chevron**, `lookAt` pill centre (0, 19.5, −250.54) | **CardBg + CueCardBody enabled**. Then held the gaze: PillBg enabled / CardBg off (pill back under the gaze, **left chevron on**), 1.5 s later **CardBg + CueCardBody enabled** |
| 2, start pose, "slightly lower" | Fresh refresh, same steps. Pill showing, look right until the **left chevron**, then `lookAt` (0, 15, −250) (the editor CueCard point, 4.5 cm below centre) | Card 1.1 s after the lookAt (log timestamps 49.36 → 50.46). Held: pill back under the gaze with the **right chevron on**, 1.5 s later **CardBg + CueCardBody enabled** |
| 3, 1 m closer | Fresh refresh, Start, `setPosition` (0, 0, −100), look right until the left chevron, podium + Next, centre until the pill, look right until the **left chevron**, `lookAt` pill centre (pitch 7.38°), hold ~10 s, Finish | **CardBg + CueCardBody enabled**. Summary "Card expands · Nudges" = **5 · 8**: 1 from the first dwell plus 4 re-arms with the gaze held still (would have been 1 before the fix) |

Note: the podium only enables its buttons while the gaze pitches down. Pinching `NextButton` while
looking at the audience is rejected ("Interactable is disabled"), so every run looks at the podium
first.

## LEAF results (Interactive Preview, "Preview 2", after the final code change)

| Scenario | Result |
|---|---|
| `start_places_audience` | ✅ succeeded |
| `gaze_fills_halo` | ✅ succeeded |
| `neglect_triggers_nudge` | ✅ succeeded |
| `next_shows_card_then_pill` | ✅ succeeded |
| `dwell_expands_pill` | ✅ succeeded |
| `finish_shows_summary` | ✅ succeeded |
| `repeated_nudge` | ✅ succeeded |
| `finish_pulses_at_time` (extra) | ✅ succeeded |
| `demo_reel` (extra) | ✅ PASSED at 71.4 s per the lens log (the MCP call timed out at ~60 s as before). "Why glasses" (dwell) at 43.5 s. Summary zone %: left 19 / center 47 / right 34 |

## Build

- `RecompileTypeScriptTool` succeeded. `RunAndCollectLogsTool` (refresh) shows no `E` lines (W only:
  editor network auth).
- Project saved (`model.project.save()`). Nothing committed. `.mcp.json` untouched.

## Still open after pass 7

- Staring at the card through its whole 4 s now re-expands it 1 s after each shrink (card ↔ pill
  every ~5 s). The brief asks for this ("arm when the pill appears even if the gaze is already on
  it"). If that is too eager on device, the knob is a longer dwell for a pill that reappears under
  the gaze.
- Everything listed under "Still open after pass 6".

## Pass 6 (audit round 1: match the planning artifact)

- **S1 Setup:** the cycle buttons are now segmented controls (`Length_3/5/10`, `Audience_3/6/9`,
  `Deck_<id>`; selected = cyan face and frame) and a mint Start button. `addButton` returns
  `setSelected`, and a `mint` option was added in `EyesUpUI.ts`. DemoReel gaze targets were renamed.
- **F2 Re-place:** the podium button is hidden by design during Rehearsal, so the Summary panel got
  a small `SummaryReplaceButton` (re-seats the stage where you now face, restarts the talk).
- **W1 Halo:** lit color is saturated cyan `(0.18, 0.86, 1.0)` instead of cyan-white, so it no
  longer washes out. Verified in a preview capture (`devpost/screenshots/08-halo-cyan.png`).
- **F14 Deck import:** `core/DeckImport.ts` parses a typed outline; the Setup "Import text" button
  opens the AR keyboard (`TextInputSystem`, device only, not shown in preview).
- **R3:** `devpost/submission.md`. Tests: 129 pass; all six LEAF scenarios re-run PASSED.

## Chevron placement rule (moved from submission.md)

The nudge chevron keeps its spot at the edge of the view. Each frame the podium and cue card are
projected into the same plane, so the chevron slides aside, or is hidden (the chime still plays),
instead of ever covering a panel. Unit tested.

## Cycle 4: game layer, contrast and text size (2026-11-04)

Jury weaknesses (design 7.5, technical 7.5, innovation 6.8, presentation 7): grey-on-grey visuals, low
emotional hook, cue card text too small at Spectacles scale. This cycle adds a light game layer without
removing the halo, nudge, cue card, podium or Summary.

### What changed

| Area | Change | Where |
|---|---|---|
| Engagement | Per member 0..1. Grace 5 s unseen, then 20 s to 0, 1.5 s to recover, perk-up (0.7 s burst) when looked at below 0.7. New tunables in `Tunables.ts` | `core/Engagement.ts`, tests `tests/unit/GameLayer.test.ts` |
| Look | `audienceLook(engagement, burst)`: head sinks 22 cm and creeps 8 cm toward the speaker, body leans up to 13 degrees (about 10 % squash), colour sky blue to violet, amber phone glow below 60 %, halo ring follows the head and pulses on a burst | `core/AudienceLook.ts`, Lens adapter `AudienceRig.ts` |
| Room meter | Mean engagement, tone cyan / amber / coral. Bar 52 cm plus "Room n%" label, 4 cm below the card anchor | `RoomMeter.ts`, `core/GameScore.meterTone` |
| Score | `balance x (0.35 + 0.65 x avg room engagement)`, grade S >= 85, A >= 70, B >= 50 | `core/GameScore.ts`, `core/SummaryModel.ts`, grade tile and game text in `SummaryPanel.ts` (panel 53 to 61 cm) |
| Replay | Best earlier score in `EyesUpSession.best`, session memory only | `core/EyesUpSession.ts` |
| Applause | Pulse amplitude 0.02 to 0.09 and volume 0.3 to 1 with the score | `applauseScale(t, duration, amplitude)`, `EyesUpApp.play(a, volume)` |
| Contrast | Silhouette (0.55, 0.68, 0.85 @ 0.35) to (0.2, 0.6, 1.0 @ 0.72), `HALO_DIM` to (0.3, 0.45, 0.92), `HALO_MIN_ALPHA` 0.15 to 0.3, card fill indigo (0.1, 0.18, 0.46) with cyan frame | `core/AudienceLook.ts`, `AttentionMeter.ts`, `EyesUpApp.ts` |
| Text | Card 64 x 26 to 84 x 34 cm, title 240 to 290, bullets 140 to 180, pill scale 1.3 to 1.2 at title 290 (effective 312 to 348), pill height 10 to 12 cm | `EyesUpApp.ts` |
| LEAF | New `neglect_disengages_then_recovers`, `finish_gives_grade`, capture helper `capture_game` | `Assets/Tests/Leaf/` |

### Decisions

- **D34: engagement is separate from the halo attention.** Attention is "where you look now" (fills in 1 s, drains in 12 s). Engagement is "who you have been losing" and starts full, so the room looks alive at the start and slumps only under neglect. Reusing attention would have meant every member starts dim.
- **D35: the head droop is a position change, not a pitch.** The Head is an ellipsoid, so rotating it is invisible. The head sinks and creeps forward, the body (a box) rotates about the feet.
- **D36: score multiplies by balance.** Members start engaged, so an additive score would have given a session that never looked up a B. Multiplying keeps it at 0.
- **D37: best-previous is in-memory.** No file or storage use; closing the Lens forgets it, and the Summary says "Replay to set a best" on a first run.
- **D38: meter placement.** The stage line sits at the floor and is out of view when looking at the audience, and the podium shows only when looking down, so neither is glanceable. The bar sits between the heads and the card, which the eyes already visit.
- The halo ring and phone glow were first left at their rest position and looked detached from a slumped head. The halo now follows the head, and the phone glow was shrunk from 14 x 22 to 8 x 13 cm after it read as an orange card.

### Verification

`npm run check`: typecheck, ESLint, 166 tests. Ten LEAF scenarios PASSED one at a time in the Interactive Preview,
no E/F lines from project scripts. Every screenshot in `devpost/screenshots` 02 to 06, 10 and 11 was looked at
(captured with the Lens Studio window grabbed during `capture_game`, camera set with `MovePreviewCamera` to look at
(0, -12, -250); Summary at (0, 18, -150); podium at (0, -30, -55)). Not verified: legibility and motion on real
optics, the audible applause volume difference, the best-previous label in a live second run.

### Environment incident (Lens Studio restart)

After the first Lens Studio restart in this project, the Interactive Preview threw
`OpacityFactor uniform is missing from material` from UIKit's BackPlate and Button visuals on every frame
("Rendering failed 5 times in a row"), so no UI drew and LEAF returned empty scenario lists. The same project had run for days without it,
probably because UIKit had been live-imported in that session (not proven). Moving `Cache/` aside did not help. Re-importing the same
UIKit 4.0.0 from the Asset Library (InstallLensStudioPackage, asset name UIKit) created `UIKit 2.lspkg`; after
moving the original `UIKit.lspkg` and its `.meta` aside (backup kept outside the repo) and renaming the new files to
`UIKit.lspkg`, the error was gone. The package bytes are identical (git shows only `Packages/UIKit.lspkg.meta`
changed).

## Cycle 5: judge-facing polish (2026-11-04)

The judges see stills and a video, not the running Lens, so this cycle made the stills carry the game layer.

| Area | Change | Where |
|---|---|---|
| Slump | Disengaged body colour desaturated to (0.66, 0.66, 0.74, 0.42), head sinks 30 cm (was 22) and rolls 25 degrees about the view axis (the head is an ellipsoid, a pitch would not show), a "zzz" marker above the head, the phone is a small rounded screen (plus-shaped quad pair) with a faint four-step light cone | `core/AudienceLook.ts` (`headTiltDeg`, `zzz`), `AudienceRig.ts` |
| Summary | Target line, axis ticks and the "nudge" word removed. Balance moved into the score tile (`Room 89% . Balance 87`). Grade tile 14 x 13 cm, size 520. Tip is Title2 (second largest), title 100, panel scale 0.85, timeline 7.4 cm | `SummaryPanel.ts`, `core/SummaryModel.ts` (`engagementShort`) |
| Meter | Percentage moved to the left end of the bar on a dark indigo plate; meter 6 cm higher and the cue card lifted by the same 6 cm so they never overlap | `RoomMeter.ts`, `EyesUpApp.ts` (`METER_BELOW_ANCHOR_CM`, `CARD_LIFT_CM`) |
| Chevron | Outline (four 0.6 cm bars and a 12 % fill) instead of a solid box: `addSurface`'s "frame" is a full solid quad, which is why the old box covered members. Placement now also treats each member's head (and halo ring) and the room meter as obstacles, with fallbacks (lit heads only, meter only, panels only) so the cue is never dropped. `placeChevron` scans free pockets straight above and below the base spot | `core/ChevronPlacement.ts`, `EyesUpApp.ts` (`headRects`, `placeHint`) |
| Captures | `capture_game`, `capture_nudge_hold`, `capture_podium` pick a 3-person audience (`Audience_3` button) so the whole room fits the frame; `capture_podium` hides the LEAF overlay | `Assets/Tests/Leaf/` |
| Gallery | New hero (`00-hero-eyes-up.png`), rebuilt process card, reordered gallery with one truthful caption per image, stale images moved to `devpost/screenshots/archive/` | `scripts/gallery/`, `devpost/submission.md` |

Findings while capturing:

- Camera yaw set with `MovePreviewCamera` does not change where the stage sits, because the stage is placed relative to the facing direction at Start. Framing is therefore fixed by the audience size, not the camera.
- In the narrow preview view there is no free wall above the heads (the cue card and meter occupy it), so the outline chevron lands over a member's body at times. Heads and the meter stay clear.
- The slumped head's 25 degree roll is subtle in stills; the colour drain, the sunk head, "zzz" and the phone carry the read.

Verification: `npm run check` 166 tests, ten LEAF scenarios PASSED one at a time, every changed screenshot (02 to 06, 10, 11, hero, process card) was looked at. Not verified: legibility on real optics, anything on a device.


## Cycle 2 (2026-11-04): fit the frame, readable Summary, polish

Judge-facing fixes from the cycle 1 review (M1, M2, M5, M6). Preview only, gaze driven by LEAF, not tested on a device.

- **M1, the clipped right-hand member.** Cause found by looking at the full Lens Studio window: the Interactive Preview draws the lens in a viewport only about 537 of 870 px wide (about +-72 cm at 2.5 m), centred in the panel; the wall photo behind it is wider. A 3-person arc at 60 cm spacing put the outer members' bodies past that edge, so the right one looked sliced by a hard vertical line. Fix: audiences of 3 or fewer sit 42 cm apart (`smallAudienceSpacingCm`, `smallAudienceMax` in `core/Tunables.ts`, used by `StagePlacer.ts`, unit tested); 4, 6 and 9 keep 60 cm. All three members now sit inside the frame with margin in every audience capture. The room meter and cue card moved up 4 cm (`METER_BELOW_ANCHOR_CM -6`, `CARD_LIFT_CM 10`) so lit halos of the closer members do not cover the meter label.
- **M1, 10 vs 11.** `capture_game` now makes member 0 perk up and recover first, then member 1: the room meter is 43 % in 10 (two slumped, one lit) and 83 % in 11 (mid-burst, ring pulse, two others lit). For 11 only, `burstSeconds` is stretched from 0.7 s to 3 s in the scenario so a screenshot taken after the scenario returns still lands mid-burst. The look is unchanged.
- **M5.** Slumped members use a muted periwinkle (`BODY_DISENGAGED [0.44, 0.50, 0.82, 0.50]`, about 58 % of the engaged HSV saturation, was grey-lavender at about 11 %), the head tilt (25 degrees) and sink stay. The phone was already a rounded rectangle with a faint light cone. The box around the nudge chevron is gone (icon plus caption only, extents used for placement), and the chevron's keep-clear rects now cover each member's whole silhouette, so it lands on the wall above the heads. Perk-up gets a ring pulse: 24 short cyan bars on a circle (`AudienceRig.ts`, `pulseScale` 1 to 2.4 and `pulseAlpha` fading in `core/AudienceLook.ts`, unit tested).
- **M2, the Summary.** Panel scale 0.85 to 1.2 (about 1.4x), zone labels and percentages at size 92 (were 48), thicker bars (1.6 cm), timeline rows 1.9 cm with larger L / C / R and "11 s" labels, the three stat tiles folded into one line (`statsLine` in `core/SummaryModel.ts`, unit tested: "Look-away 11 s center · Cards 1 of 5 · Nudges 1"), buttons 13 x 4.6 cm at Headline1 on an opaque dark plate with its own frame, panel raised to 29 cm above eye level (was 16) so the plate clears the picture frames. `06b-summary-grade-zones.png` is a close crop of the grade, zones and tip.
- **M6.** Test count is 166 everywhere (README, devpost, docs, gallery sources, video script text); the earlier 139 / 130 / 8-scenario text is marked as an earlier state in `docs/spec-matrix.md`.
- **Captures** (window grabs of the Interactive Preview, looked at): 02 to 06, 10, 11 and walkthrough 02 to 08 retaken, `00` hero and `09` process card rebuilt from them (`scripts/gallery/`). Camera aims as in cycle 4, Summary at (0, 22, -150).
- Not verified: legibility on real optics, anything on a device.

## Cycle 3 (2026-11-04): learning line, trimmed gallery, quiet framing

- **S1 / S2.** Devpost page and README open with one bold line (learning goal, feedback, practice) and the honest limit (outcomes not measured, preview only, LEAF-driven gaze, untested on a device). Gallery trimmed to hero, 10, 11, 06, 09, 03; 01, 02, 04, 05 are text links.
- **S3.** Setup default audience is 3 (`DEFAULT_CONFIG`), so the committed state is the one that fits the lens viewport (outer edge about 18 degrees of a 20 degree half view, unit tested). 6 and 9 stay available and still run past the preview viewport edge. The stage stands 6 cm higher (`floorOffsetCm` 154): at 12 cm the opening "The problem" card was cut off at the top of the view, at 6 cm it fits and slumped heads (30 cm sink) stay in frame. LEAF scenarios that need members in every zone now call `setUp(6)`; `start_places_audience` runs on the untouched default (3). `demo_reel` picks 6 explicitly (it choreographs six members).
- **S4.** A faint dark rounded plate (35 % alpha, three non-overlapping quads) stands 40 cm behind the audience group; it only helps in the alpha-blended Preview (on an additive display dark adds nothing). It was not enough alone (the picture frames stayed readable at 35 % and at 55 %), so the captures turn the preview camera 175 cm toward the plain curtain wall (`MovePreviewCamera` lookAt (175, -12, -250)) before Start; the stage is placed along that facing, so the audience stands in front of the curtain, not the frames. "zzz" moved to head + (14, 32) (above the head, clear of the head and of the left nudge chevron, which collided with it at +2). Room meter 4 cm higher (`METER_BELOW_ANCHOR_CM` -10) and the card 4 cm higher (`CARD_LIFT_CM` 14) so they keep their gap. Not done: the cue plate is still wider than the meter plate.
- **Captures** (window grabs, cropped 876 x 610 and scaled to 1600 x 1114, all looked at): 01 to 06, 10, 11 and walkthrough 01 to 08; `00` hero and `09` process card (Fix 3 thumbnail) re-exported. Stills are frames picked from PNG window recordings of the scenarios; screenshot 11 still uses the burst stretched from 0.7 s to 3 s by `capture_game`. Summary captured with the camera aimed along the facing.
- **Known, not fixed:** the nudge chevron is placed from rest-height heads, so for an unslumped left member it can sit on the head's left edge (it clears once the head sinks).
- **S6.** One test count everywhere (168) after the new `StagePlacer` / `SetupModel` tests. Numbers checked on 2026-11-04 (`npm run check` 168 tests, LEAF 10/10).

## Cycle 4 (2026-11-04): hook, framing, Summary, meter, loop

- **Canonical reset.** `scripts/video/preview-reset.sh` recompiles, refreshes the Interactive Preview and sets the camera by an absolute lookAt (175, -12, -250), pitch about -2.3 degrees (`CANONICAL_PITCH_DEG`); `scripts/video/leaf-all.sh` runs the ten scenarios that way. In the Lens, `EyesUpApp.resetScriptedGaze()` re-syncs scripted gaze to the camera and `setUp()` in the LEAF helpers closes a leftover Rehearsal or Summary and pinches the audience button explicitly.
- **Framing.** `core/Framing.ts` projects heads into the preview viewport (half FOV 24.9 x 17.9 degrees, measured from the captures; upright and fully slumped heads, the slump is 49 cm in all with the squash and lean). At the canonical pitch the heads span about +0.43 to -0.68 vertically, inside a 0.9 margin (4 unit tests). LEAF `start_places_audience` asserts the same with the live camera. A first canonical pitch of -3.5 degrees plus a 5 cm higher stage pushed the card to the top edge; stage height stays 154 and the pitch is -2.3.
- **Meter.** Findings: the Preview draws these quads like an additive display, so no plate can be darker than the wall (opaque black was invisible; the earlier "dark plate" and the 35 % scrim only lift or do nothing). Contrast now comes from a bright frame, a lighter track, a white 50 % tick, a 270-size label and the tone switch at 60 % (`METER_GOOD_AT`).
- **Summary.** Toast chip and stat line removed; zone text 120, bars 2.2 cm, timeline 15 cm with 3.4 cm rows and larger L/C/R and look-away labels, tip 140, Again 17 cm wide and primary, Done and Re-place 11 / 12 cm at 92, buttons 5.6 cm tall, panel 74 cm at scale 1.12.
- **Loop numbers.** New LEAF helper `capture_loop` plays Run 1 (right-heavy) and Run 2 (follows the tip): C 39 to A 84, balance 46 to 89, split 0/30/70 to 41/26/33, longest look-away 28 s left to 12 s right. Scripted gaze, illustrative.
- **Captures** (window grabs, all looked at): 02 to 06, 06b, 10, 11, walkthrough 02 to 08, hero and process card rebuilt.


## Cycle 5 (2026-11-05): Summary in frame, legible slump, comparison images, CLAD card

Preview only, gaze driven by LEAF, not tested on a Spectacles device.

- **R1, Summary inside the viewport.** The Summary sat 29 cm above eye level at scale 1.12 and lost its header and grade tile at the top of the preview frame. Panel size, scale and centre height now live in `core/Framing.ts` (`SUMMARY_*`, `summaryExtent`), shared by `SummaryPanel.ts` and `EyesUpApp.ts`; a Framing unit test keeps the panel top 8 to 16 % below the viewport top and the whole panel inside the viewport. Panel 50 x 78 cm at scale 1.08, centre 6.5 cm below eye level. Hierarchy: grade tile 16 x 13 cm at size 650 in the grade colour, amber tip bar 7.6 cm at size 148 (116 for the long "look at the center more" tip so it stays inside the bar), Again is the only filled cyan button with the subline "beat your grade", Done and "Move stage" are outline buttons (`ButtonOptions.outline`, `subline`), a small legend line explains the red box and the amber dot.
- **R2, slump and bottom margin.** Slumped members: head sinks 34 cm (was 30), tilt 30 degrees (was 25), body colour dimmer (0.36, 0.40, 0.70 @ 0.40) so the lit member pops. Stage 5 cm higher (`floorOffsetCm` 149) and the phone 6 cm higher on the body (`PHONE_Y_CM` 86), so the phone glow ends about 5 % above the frame bottom in the live capture (it was cropped). A Framing test asserts the phone glow bottom inside 4 %; LEAF `start_places_audience` asserts it with the live camera. Full torsos still do not fit: the viewport is only about 1.6 m tall at 2.5 m, and the card, meter, heads and phones already fill it.
- **R5, legibility.** Setup panel 46 x 34 cm with labels, captions, deck buttons and Start (25 x 5.6 cm) at about 1.3x; podium 38 x 12.5 cm with larger Prev / Next / Finish / Re-place labels; panel plates fully opaque; cue card 100 x 26 cm with title 330 and bullets 235 (about 1.3x), card lifted 3 cm so the Room meter and the card are 3.6 cm apart (they touched). The card is 3 cm shorter, so its top edge stays where it was inside the frame.
- **R3, R4, R6, devpost.** New images built from real captures by `scripts/gallery/`: `12-run-compare.png` (Run 1 C 39 next to Run 2 A 84, both Summaries from `capture_loop`), `10b-slump-to-perk-up.png`, `13-clad-mcp.png` (architecture strip, four real steps, two real log lines). Process card pill label fixed ("Pill hit area"). `submission.md` and `README.md` open with hero, hook, Learn / For, then three inline images; disclosures are grouped as "Not tested" and "Not claimed". Detail that used to close the "not done" list is here: the Room meter has no darker plate because the Preview draws these quads like an additive display (an opaque black plate was invisible), and a faint dark plate (35 % alpha) behind the audience has no visible effect in the Preview. Before every capture the Preview is refreshed and its camera put at one fixed pose (`scripts/video/preview-reset.sh`).
- **Numbers.** `capture_loop` this run: Run 1 C 39, balance 46, room 76 %, split 0/30/70, longest look-away 29 s in the log (the Summary label shows 28 s), 3 nudges; Run 2 A 84, balance 89, room 91 %, split 41/26/33, 12 s right, 1 nudge. `npm run check`: 174 tests.

## Not claimed (details)

Moved here from `submission.md` in cycle 6 so the Devpost page stays short.

- The attention score and grade are a design heuristic (balance times how engaged the virtual room stayed), not a validated measure of speaking skill. The best-previous compare lives only while the Lens is open; nothing is saved.
- The Run 1 vs Run 2 loop is one scripted run (gaze driven by the LEAF harness), not a user study and not evidence that people improve.
- The video shows the Lens Studio Interactive Preview. Gaze and pinches in it are driven by the LEAF test harness (head ray and pinch simulated); the narration and sounds are synthesized locally.
- Screenshot 11 (and walkthrough 08) was captured with the perk-up burst stretched from 0.7 s to 3 s so the ring pulse could be photographed mid-burst; the look is unchanged.
- Screenshots use the Setup default of 3 people; with 6 or 9 members the outer ones sit beyond the preview's narrow lens viewport. Framing method and the Preview's additive-display limits are described above in this file.
- Voice features (filler-word counter) are not in this build.
- Number note: `capture_loop` logged longest look-away 29 s before cycle 6; the log now uses the Summary's own formatter, so log, Summary and gallery images 5 and 7 all read 28 s (split 0 / 31 / 69).

## Cycle 6

- D2: silhouette bodies fade out over the lower part (alpha texture, `core/BodyFade.ts`), soft floor shadow per member, slumped head scale capped at the lit head scale, stage floor 152 cm, meter and cue card raised for a 2 cm gap above the tallest head. Stills 00, 02, 03, 04, 05, 10, 10b, 11 and walkthrough 02 to 08 retaken.
- D1: chevron placement keeps out of every head and halo rectangle (`core/ChevronPlacement.ts`, unit test with the left member slumped).
- A2: `14-glasses-scale.png` (plan from above, Preview frame, three rules). A4: 28 s everywhere. A5, A7: `submission.md` reordered, loop table and rationale added.

## Design cycle 1 (2026-11-05): one panel material, 4-step type, calmer meter, card and chevron

Visual design only; no logic or test changes (`npm run check`: 183 tests). Preview only, gaze driven by LEAF, not tested on a Spectacles device. Every change below was looked at in a before / after Interactive Preview capture.

- **D1, one panel material.** `EyesUpUI.ts`: `PANEL_FILL` navy #0B1230 at 78 %, `PANEL_STROKE` #7FB0FF at 35 %, 0.18 cm stroke, continuous rounded corners (`PANEL_RADIUS_CM` 1.6). UIKit's own rounded rectangle still does not draw on this Lens Studio build (pass-2 gap G2), so rounded shapes are runtime `MeshBuilder` meshes (a triangle fan for the fill, a strip for the stroke ring, 10 steps per corner, cached by size): `addRoundedSurface`, `addCircleRing`, `addDot`. Setup, podium, Summary, the Summary button plate, the cue card, the pill and the room-meter pill use it; buttons, boxes and tiles are rounded navy tones from the same family; the selected segment gets a soft cyan glow ring (the optional "glow on the active element"). Finding: the Preview draws these quads like an additive display, so navy at 78 % reads as a faint blue tint on the wall, not as a dark plate (the same limit as cycle 4); contrast still comes from white text and the bright stroke. The chevron backing disc therefore uses a deeper but luminous blue (0.06, 0.10, 0.40) instead of near-black, which would add no light.
- **D2, type scale.** Four steps at the 110 cm reference: Title 104, Heading 72, Body 60, Caption 46 (about 1.6 / 1.1 / 0.9 / 0.7 cm cap height, measured in the Preview; the brief's 0.8 / 0.6 were raised one notch because the 1080p stills still read small). The old role names are aliases of the four steps. SETUP chip, units, caption, legend-sized text are Caption or larger; the Summary subline ("beat your grade") is Caption. Prev, Finish, Re-place, Done, Move stage and the deck buttons are Body or Heading; the three primary actions (Start rehearsal, Next, Again) are one step up (Heading, Title, Heading). The Summary hero sizes (grade, tip, zone text) keep their explicit sizes.
- **D3, perk-up ring and room meter.** The ring is one smooth ring mesh (radius 12 cm, 1.7 cm thick, near-white cyan so it shows on the lit halo) and its scale is capped at 2.1 (outer edge about 26 cm from the head centre; it used to grow to 48 cm and cross the Room label); the meter row starts about 29 cm above the head centre. The meter is a capsule pill with "Room NN%" in white (panel material) and a dark capsule track with a saturated solid fill and the 50 % tick; the outer plate is gone. Meter 9.5 cm above the card anchor, card bottom 2.6 cm above the meter top.
- **D4, cue card and pill.** Card 110 x 28.5 cm, 2.8 cm padding (1.2 cm at the 110 cm reference), left-aligned Heading title next to one cyan accent bar, left-aligned Body bullets with cyan dots in the same column as the bar, "n / N" counter in Caption at the top right, countdown line inside the bottom padding. Pill: capsule 10 cm tall with a cyan dot, text one notch smaller than the card title. Transition: the existing 0.25 s morph drives a fade (card with the morph, pill with 1 - morph) while the whole card scales 1.0 <-> 1.2. Explicit mesh render orders (an alpha-sorted fill used to hide a bullet dot).
- **D9, nudge chevron.** Double chevron (7.6 cm icon) on a 11.2 cm backing disc with an amber hairline, caption "Look left" / "Look right", 1 Hz pulse (scale and alpha, unchanged logic), 3 s or until the player looks that way (unchanged). Limits: the preview viewport is only +-28.9 cm wide at the chevron's 100 cm plane, so the disc cannot sit further out than x = +-21.5 cm and the glyph itself is smaller than before (10 -> 7.6 cm) while the whole mark is larger (11.2 cm disc); placement margin 1 cm so it fits between the meter row and the "zzz".
- **Captures.** 01 to 06, 06b, 10, 11 and walkthrough 01 to 08 retaken from live captures that were looked at; 00 hero, 09 process card, 10b and 14 rebuilt from them. 12 (run compare) and 13 (CLAD / MCP) are unchanged and still show the cycle-6 panel look.
- **Known, not fixed.** The right chevron can sit on the lit right member's body edge in some frames (no free wall at +28 cm); Summary bars and timeline strips are still flat rectangles; the podium counters and Prev / Finish labels are still smaller than the Next label by design. Fine per-screen layout is left to later cycles.

## Design cycle 2 (2026-11-05): E1 luminous dark material

- **E1.** `EyesUpUI.ts`: `PANEL_FILL` #070D22 at 88 %, `PANEL_STROKE` #9CC4FF at 55 %, stroke 0.24 cm. Buttons: idle #101A3A / #5E86D6 (0.18 cm), selected #12324F / #5FD4FF (0.24 cm) with a stronger cyan glow ring (the selected state used the teal primary face before). `DIMMER_COLOR` black 35 % is used by `makePanel` (a rounded "Dimmer" plate 12 cm larger than the panel, render order -5) and by the audience scrim in `EyesUpApp.ts`. No tests reference the colours; 183 tests unchanged.
- **Capture environment.** Preview scene switched to "Evening Room" through `PreviewPanelTool setConfig` (Interactive, SPECS 27, Front camera kept). Same canonical reset camera. Finding: in "Sunlit Room" the new fill looked the same as before (the Preview is additive), in "Evening Room" the panels read as dark luminous glass with a bright stroke and cyan selected state. This is a Preview-scene choice, not a device measurement.
- **Captures.** 01 to 06, 06b, 10, 11, walkthrough 01 to 08 retaken (podium 05 with the camera pitched down as before), 00, 09, 10b, 14 rebuilt. All 10 LEAF scenarios PASSED after the change.

## Design cycle 3 (2026-11-06): F1 and F8

Visual design only; logic untouched apart from the meter tone thresholds (cyan from 70 %, coral below 40 %; `GameLayer.test.ts` updated). `npm run check`: 183 tests green; all 10 LEAF scenarios PASSED (`scripts/video/leaf-all.sh`). Preview only, not tested on a Spectacles device.

- **F1.** `EyesUpUI.ts`: dimmer removed, `AUDIENCE_RENDER_ORDER` -20 and `PANEL_BACKDROP_ORDER` -10, `PANEL_FILL` alpha 0.90. `EyesUpApp.ts`: audience scrim deleted, `orderMeshes` over every audience root. `AudienceRig.ts`: phone light cone built from nested ellipses (`addDot`), because the four stacked rectangles were the lighter rectangular patch around slumped heads in the before capture.
- **F8.** `RoomMeter.ts` rewritten as one capsule with a 70 % tick and a "target" caption; `EyesUpApp.ts` places it 4 cm above the lit head top (`LIT_HEAD_TOP_CM`) on the audience centre line and keeps the cue card 9.5 cm above it as before.
- **Captures.** Window recordings of `capture_game`, `capture_nudge_hold`, `capture_summary`, podium pass; all frames looked at. 00, 01 to 06, 06b, 09, 10, 10b, 11, 14 and walkthrough 01 to 08 refreshed (10b numbers corrected to 40 % / 89 %; `submission.md` captions updated). Screenshot 11 now uses a pre-peak burst frame.
- **Known.** Podium and Summary panels still read as a lighter plate in the Preview (additive). Flat floor-shadow bars remain.

## Design cycle 4 (2026-11-06): G5 and G9

Visual design only; no logic changes. `npm run check`: 183 tests green. All 10 LEAF scenarios PASSED (`scripts/video/leaf-all.sh`). Preview only, not tested on a Spectacles device.

- **G5.** `EyesUpUI.ts`: new `addPanelGlow` (1 cm cyan falloff, three bands at 20 / 12 / 5 %, render order -11) added behind the Setup, podium and Summary backdrops (`makePanel`) and the cue card (`EyesUpApp.ts buildCueCard`). The panel fill and stroke were already #070D22 at 90 % and #9CC4FF at 55 %. Evening Room stays the capture environment (disclosed in `docs/spec-matrix.md`).
- **G9.** `EyesUpApp.ts`: chevron disc radius 7 cm, icon 9.4 cm, hint block centred vertically, outer edge 3 cm inside the Lens frustum (computed from camera fov and aspect; the Preview camera reports aspect 0.88, narrower than the room image the Preview paints). Chevron placement tests unchanged and green.
- **Captures.** Window recordings of `capture_nudge_hold`, `capture_game`, `capture_summary`, `capture_podium` (camera pitched down for the podium); frames looked at. devpost 01, 03, 04, 05, 06 and walkthrough 01, 03, 04, 05, 06 refreshed. The demo video was not re-recorded.
- **Known.** The glow is faint over the dark brown Preview room; podium and Summary still read as a lighter plate in the Preview; in some frames (upright heads, no zzz) the chevron lands over a member's body instead of the wall above.

## Redesign (2026-11-06): glass-native luminous line UI and volumetric audience

Why. Four colour-tweak cycles stalled at about 5.5 to 6 of 10 against the artifact mockups. Two causes: the mockups draw dark filled glass plates, but Spectacles and the Lens Studio Preview are additive, so a dark fill cannot render darker and reads as a faint grey plate (measured: room (43, 40, 39) became (68, 69, 76) under the old 90 % navy panel); and the audience was one flat shape repeated. The rendering style changed, the layout, flow, information and copy did not. The deviation and its reason are recorded in `docs/spec-matrix.md` (rows RD-*).

A. Luminous line UI (`EyesUpUI.ts` and every panel).
- Panels, boxes, buttons, the cue card, pill, room meter, chevron and tags are bright rounded outline strokes with a five-band soft outer glow and at most a 5 to 12 % cool tint. One stroke width (0.22 cm at 110 cm, 0.5 cm at the stage distance), one radius per element class, one accent per element (cyan, mint, amber, coral), the 4-step type scale unchanged.
- Found while measuring: UIKit's BackPlate does draw a dark rounded rectangle on each panel root in 5.24.1 (the earlier note that it never draws only holds for its RoundedRectangle hook). That was the flat grey plate, the "double border" and the square top of the podium. Its visual is switched off every frame; collider and layout stay.
- Podium: 38 -> 30 cm wide. At 55 cm the 32 degree view is only about 31 cm wide, so the old panel was cut square at both sides by the lens frustum.
- Setup: all rows share one left edge and the same exact width (`FlexJustify.Start`); caption at Body size (the Caption size dropped the "i" of "facing").
- Summary: capsule bars with a sheen (amber when out of the 15 to 35 % range), rounded timeline segments, coral outlined look-away box, legend at 84, no plate behind the buttons, no "beat your grade" subline (unreadable size).

B. Volumetric audience (`core/Figure.ts`, `FigureMesh.ts`, `AudienceRig.ts`).
- Each member is layered glass: torso with neck and shoulders from a profile table, ellipse head, soft glow, base fill, two inner highlights, arm lines, two eye dots and a bright rim line. The meshes are built at runtime (MeshBuilder, v runs with height so the existing body fade texture still fades the torso) and hang under the old Body / Head objects through a holder that cancels the rest scale, so lean, squash, sink and tilt maths are unchanged. The old box and ellipsoid visuals are switched off.
- Nine luminous hues (neighbouring seats at least 0.4 apart in RGB, unit tested). A drained member cools toward periwinkle and loses alpha and rim; a lit member rims toward cyan-white; a perk-up flashes cyan. The halo is now a ring plus a glow ring instead of a filled disc.
- Per-person tag "#n NN%": a capsule outline that follows the head, under it on the shoulders, or above it once the member is slumped (hysteresis 40 % / 55 %). There is no free row above the heads (room meter and cue card use it and the Preview frame is full), and a tag under a slumped head ran into the phone glow. `AudienceLook` now carries `engagement` and `burst` for it.
- Audience layers draw at explicit orders from -60 (`applyRenderOrders`), panels from -10. The floor-shadow bars are hidden (grey band). The phone is one rounded glass screen with a rim. "zzz" rises above the tag (40 cm) and is no longer clipped in the podium still.

Chevron. It keeps clear of tags when it can and still shows over one when it cannot (a nudge must stay visible). The nudge still is taken with the preview camera turned about 7 degrees left (`MovePreviewCamera`), otherwise the three-member frame leaves no free wall; `capture_nudge_hold` now holds the hint 45 s so the camera move fits inside it (capture only).

Checks. `npm run check`: 194 tests (11 new in `tests/unit/Figure.test.ts`), typecheck and lint clean. All 10 LEAF scenarios PASSED one at a time from a refreshed preview (`scripts/video/leaf-all.sh`), no E/F lines from project scripts. Preview only, gaze driven by LEAF, not tested on a Spectacles device.

Captures. Window recordings of `capture_game`, `capture_nudge_hold`, a podium pass (camera pitched down to look at (175, -104, -250)), `capture_summary` and `capture_loop`; every still was looked at. Rebuilt: devpost/screenshots 00 to 06, 06b, 09, 10, 10b, 11, 12, 13, 14 and walkthrough 01 to 08 (stills are 876 x 610 crops of the window, scaled to 1600 x 1114; 10b badges read the real meter values, Room 43 % and Room 87 %). Loop numbers re-logged: Run 1 C 39 (balance 46, split 0 / 30 / 70, longest look-away 29 s left), Run 2 A 84 (balance 89, 41 / 26 / 33, 12 s right); README, submission, learnings, leaf-results and the gallery images carry these values. The demo video was not re-recorded; it shows the earlier look, and `devpost/submission.md` says so.

Known. The lit member is cut by the lens frustum at the right edge in the nudge still (inherent to turning the camera to free the left wall). The stage line under the podium is still a flat bar. Spectacles hardware was not available, so additive rendering is judged in the Preview only.

## Redesign round 2 (2026-11-06): the grey plates were UIKit's own, figures as outlines, one tag row

Visual design only; no game logic changed. Seven fixes from the round-1 critique, each looked at in Interactive Preview captures (Evening Room, canonical camera pose).

- **Root cause of the "grey plates" (fix 1).** Even at 6 % tint the chips, Start, Prev and Finish read as grey-teal blocks. The Preview showed why: UIKit's own visuals (each Button's rounded rectangle and the BackPlate, default `COLORS.darkGray`) were drawing underneath our hand-built outline surfaces. The old fix only switched off the BackPlate's visual on the panel root. `EyesUpUI.muteUiKitVisuals` now registers every mesh this UI creates (`OWN_VISUALS`) and every frame switches off any other `RenderMeshVisual` under a panel root; colliders and interaction stay. After that the same tints looked like glass outlines. Fills are now at most 15 % (panel 5 %, chips 4 %, selected 10 %, Start 6 %); selected and primary are a bright stroke plus a two-ring glow.
- **Figures (fix 1, B).** Torso and head fills 6 to 14 %, brighter rim line, V collar and arm contours as strokes, a thicker rim on the left (light) side (`polyStrip`), the torso fades toward the bottom, the neck stub is shorter, shoulders are 78 % wide so the outer members keep a margin inside the lens view, phone screen is an outlined rectangle.
- **Tags (fix 2).** One baseline above the lit halo tops for every member and every state, one size and width (the 1.05 scale of a looked-at member is cancelled; before, a lit member's tag sat 9 cm higher than the others and the old "#3 100" crop came from the frustum edge). To fit the row the audience stands 11 cm lower (`floorOffsetCm` 163), the halo ring is 32 cm across, the meter keeps its place and the card keeps its place (`FRAME_MARGIN` 0.92, slumped heads still inside the viewport). In slump the tag stays on the baseline and the zzz stays on the sunk head.
- **Podium (fix 3).** Single stroke with a gentler five-to-seven band glow, 30 x 10.4 cm, counter and timer in one compact row over the buttons, Prev / Next / Finish the same height and Title label size, the stage line is a thin cyan line with glow and reflection.
- **Chevron (fix 4).** 0.8x block, 0.3 cm ring, two thin glow rings, margin 2.5 cm. At the canonical pose a 3-member audience leaves no free wall between the lens edge and the first member (checked: the lens frustum is about 545 px of the 884 px Preview viewport), so the placer keeps the chevron clear of pill, meter and tags by parking it between the tag row and the sunk heads once both left members are slumped. The nudge still (03) is taken there, at the canonical pose, with the lit member fully inside.
- **Room meter (fix 5).** Capsule 6.2 cm, 1.4 cm tick, "target" at Body size, saturated cyan / amber / coral, card bottom 3.6 cm above the label row.
- **Setup (fix 6).** Logo tile with an outlined eye, pill and subtitle at Body / Heading, units on the row label's step and baseline, helper caption larger, Start and chips share radius and stroke.
- **Summary (fix 7).** Legend at size 100 coloured like the marks, taller timeline rows, a nudge as an amber line through all three rows with a ringed dot, three outline buttons with one label size. The "beat your grade" subline is still not restored (no room at the framed panel size); recorded in `docs/spec-matrix.md` (RD2-8).
- **Captures.** `capture_game`, `capture_nudge_hold` (80 s so both left members slump), a podium pass, `capture_summary` and `capture_loop`. `CaptureLoop.ts` now keeps the Run 1 Summary up for 3 s instead of 0.5 s (capture only), because a 1 fps window recorder missed it. Rebuilt: devpost/screenshots 00 to 06, 06b, 09, 10, 10b, 11, 12, 13, 14 and walkthrough 01 to 08; every frame was looked at; no debug text. The demo video was not re-recorded.
- **Checks.** `npm run check`: 195 tests (a fill-alpha test and a shoulder-margin assertion were added; the floor, torso-width and frame-margin tests were updated), typecheck and lint clean. All 10 LEAF scenarios: see `devpost/leaf-results.md`.
- **Known.** The tick touches the bottom of the word "target" by about a pixel. Earlier in the nudge hold the chevron has to overlap a torso outline because there is no free wall. Not tested on a device.

## Redesign round 3 (2026-11-06): additive figures, whole-figure slump, meter and Summary rework

Visual design only. Seven fixes from the round-2 critique, each looked at in Interactive Preview captures. Rows RD3-1 to RD3-7 in `docs/spec-matrix.md`.

- **Figures.** Meshes use blend Add and do not write alpha, so tints add light. Vertical gradient on the torso, shoulder highlight, per-person height / width / head turn, whole-figure drop and roll on slump. Chevron placement no longer covers tags.
- **Found while testing.** UIKit keeps drawing its dark button squircle in some frames even when its visual is switched off; the chip fills are therefore 3 % and the selected fill 7 % so what remains reads as an outline.
- **Layout.** Room meter, Summary (52 x 84, chip, inline labels, subline) and Setup (54 x 38) reworked.
- **Captures.** Window recordings of `capture_nudge_hold`, `capture_game`, a podium pass (camera pitched down, canonical pose otherwise), `capture_summary`, `capture_loop`; frames looked at. Devpost 00 to 06, 06b, 09, 10, 10b, 11, 12, 13, 14 and walkthrough 01 to 08 refreshed. The demo video was not re-recorded.
- **Checks.** `npm run check`: 198 tests (3 new), typecheck and lint clean. LEAF: see `devpost/leaf-results.md`.
- **Known.** Preview only, not tested on a device. The Preview shows the lens frame narrower than the room image, so the outer figures sit near the frame edge.


## Win cycle 1 (2026-11-09): game layer on the hologram UI

User direction 11-09: keep the ghostly luminous-line hologram look and add game feel on top of it. Rows WC1-0 to WC1-7 in `docs/spec-matrix.md`.

- **Round-4 leftovers.** An interrupted round left 14 files half-applied. The debug `dump()` tree printer and its frame-150 `print` in `Podium.ts` were removed. They failed typecheck, and debug output is not allowed. The other round-4 hunks pass `npm run check` and were kept.
- **Live score (`core/LiveScore.ts`, pure).** All points come from the real dwell. Lighting a listener (the halo's 1 s fill) gives +10. Holding gives +3 per second, capped at +9 per look. Re-lighting the same person within 4 s gives 0 and breaks the combo. Distinct people chained within 3 s build a combo from x2 to x5, and the combo multiplies the +10 by 1 + 0.25 per step. A test shows that one minute of spreading scores more than 10 times one minute of staring. The final points are the Summary score and feed NEW BEST.
- **HUD.** One row under the card: `SCORE 0120`, `ROOM`, a 10-segment HP bar with a GOAL notch, `86%`, `COMBO x3`. The row is centred because the Lens frustum is narrower than the Preview image: the first layout clipped COMBO, and the captures showed it.
- **Audience.** Each per-person tag is now an attention gauge that drains and turns red while that person is ignored. A `+10` floats above the gauge on each gain. A perk-up bursts six luminous sparks.
- **Summary.** The grade is an outline stamp: it lands at 2.2x to 1.0x with a tilt and a ring, and three stars pop in under it. The header shows NEW BEST (amber shimmer) or `Best N`. Again is the big mint button with `beat N` under it.
- **Captures looked at.** Window recordings of `capture_game` (before and after: HUD, combo, pops, gauges, sparks, goal crossing) and `capture_summary` (stamp and buttons; the star row did not render in the latest Summary capture, see Known). The NEW BEST banner is covered by unit tests. A `capture_loop` run to check it on screen was interrupted twice by another session driving Lens Studio.
- **Checks.** `npm run check` passes. LEAF `finish_gives_grade` now asserts that the score rises for each new listener and stays flat on a repeat. `neglect_disengages_then_recovers` asserts that staring pays only the light plus the capped hold.
- **Known (open).** The 3-star row is coded and `starsFor` is tested, but the last Summary capture (2026-11-10 00:19) shows no stars under the grade. Not diagnosed: the Lens Studio MCP stopped responding at 03:03. The timeline legend fix (`29s away` no longer overlapping nudge dots) is also not yet seen in the Preview. LEAF on this tree: 6 of 10 passed, the other 4 hit MCP timeouts and need a re-run.


## Win cycle 2 (2026-11-10): level select, stored bests, Summary payoff

Rows WC2-1 to WC2-5 in `docs/spec-matrix.md`. Preview only, gaze driven by LEAF, not tested on a Spectacles device.

- **Setup is a level select.** Stage cards (Stage 1 / 2 / 3 = 3 / 6 / 9 listeners) with three stars and the best score, a cyan `STAGE 1 - 3 listeners` header, a wide mint `PLAY`, and the placement note as a footer.
- **Stored bests.** `core/StageProgress.ts` keeps the best points and most stars per stage through Lens persistent storage (survives a Preview refresh). A fresh install shows empty stars and "Not played". `NEW BEST` now compares against the stored best of the same stage.
- **Summary.** `SCORE n` headline, room and balance below it, `First run` pill removed, 3-star row verified in Preview, bigger Again with `beat n`.
- **Capture only.** Sparks last 4/7 of the perk-up burst, so `capture_game`'s stretched burst stretches them too (0.4 s normally, 1.7 s for the still).
- **Checks.** `npm run check` 222 tests, LEAF 10/10 (including `finish_gives_grade` extended for stars and NEW BEST over two real runs). Captures looked at: `capture_loop`, `capture_game`, `capture_podium` window recordings.

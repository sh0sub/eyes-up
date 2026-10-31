# Eyes Up — build notes (Spectacles build, 2026-10-31)

Headless Claude Code run against Lens Studio 5.24.1 through the lens-studio MCP server.
Result label: **logic proven / feel unproven.** All 6 LEAF done-criteria scenarios pass in
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

- **G1: no SFX.** The `build-sfx` generator is written at `tempAssetGen/sfx.cjs` (NudgeChime,
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

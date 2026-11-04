Sources of the composed gallery images (1800x1200). All are plain HTML rendered by headless Chrome from the real Interactive Preview captures in `devpost/screenshots/`.

- `devpost/screenshots/00-hero-eyes-up.png` (gallery image 1): `hero.html`.
- `devpost/screenshots/09-process-at-a-glance.png`: `process-image.html`. `before-halo-pale.png` is the real 2026-10-31 preview capture (commit dd6d471) used for the halo "before" crop; `halo-cyan-prev.png` is the pre-game capture (the old hero) used for the halo "after" crop and the game-layer "before" crop.

Rebuild (from the repo root):

```
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --hide-scrollbars --window-size=1800,1200 --allow-file-access-from-files --screenshot=$PWD/devpost/screenshots/00-hero-eyes-up.png file://$PWD/scripts/gallery/hero.html
"$CHROME" --headless=new --hide-scrollbars --window-size=1800,1200 --allow-file-access-from-files --screenshot=$PWD/devpost/screenshots/09-process-at-a-glance.png file://$PWD/scripts/gallery/process-image.html
```

The numbers in `process-image.html` (10 LEAF scenarios, 183 tests) must match `npm run check` and `devpost/leaf-results.md`.

Cycle 5 images (same Chrome command, `--disable-gpu` helps; render one at a time):

- `compare.html` -> `12-run-compare.png`: Run 1 (C 39) next to Run 2 (A 84). Sources `src/run1-summary.png`, `src/run2-summary.png` are Interactive Preview frames from LEAF `capture_loop` (cropped 1600x1114 like every still).
- `slump-perk.html` -> `10b-slump-to-perk-up.png`: `10-engagement-slump.png` beside `11-perk-up.png` with annotations.
- `clad-mcp.html` -> `13-clad-mcp.png`: architecture strip, four steps, two real log lines from the Lens Studio log.
- `_base.css` is shared by those three.

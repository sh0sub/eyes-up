#!/bin/bash
# Canonical preview reset (Cycle 4, D1). Run before every LEAF scenario capture and every video shot so the framing is repeatable:
#   1. recompile the scripts and refresh the Interactive Preview (a cold Lens: no leftover engagement, cards or Summary),
#   2. put the preview camera at the fixed pose facing the plain curtain wall (absolute lookAt, never relative moves).
# The camera pose is yaw toward (245, -12, -250) from the origin, pitch about -2.3 degrees = CANONICAL_PITCH_DEG in
# Assets/Scripts/core/Framing.ts (unit tested: all 3 default heads inside a 10 % viewport margin).
# usage: scripts/video/preview-reset.sh [extra instructions for the same MCP run, e.g. a LEAF scenario to run]
# Drives Lens Studio only through the lens-studio MCP (claude -p with .mcp.json); never print .mcp.json.
cd "$(dirname "$0")/../.." || exit 1
timeout 150 claude -p "Using only the lens-studio MCP tools, in this order: (1) RecompileTypeScriptTool once; (2) PreviewPanelTool refresh with waitForReady; (3) MovePreviewCamera with an absolute lookAt of (245, -12, -250) from position (0, 0, 0). $* Reply with one short line per step." \
  --mcp-config .mcp.json --strict-mcp-config < /dev/null 2>&1 | tail -6

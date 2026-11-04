#!/bin/bash
# Runs the 10 done-criterion LEAF scenarios one at a time, each from a cold preview and the canonical camera pose
# (scripts/video/preview-reset.sh). Prints one PASSED/FAILED line per scenario. Needs Lens Studio open with this project.
cd "$(dirname "$0")/../.." || exit 1
for id in start_places_audience gaze_fills_halo neglect_triggers_nudge next_shows_card_then_pill dwell_expands_pill finish_shows_summary repeated_nudge finish_pulses_at_time neglect_disengages_then_recovers finish_gives_grade; do
  echo "== $id"
  bash scripts/video/preview-reset.sh "Then call run_leaf_scenario for $id exactly ONCE. If it times out do not retry. Reply with a last line 'RESULT $id PASSED' or 'RESULT $id FAILED <failure text>'." | grep "RESULT\|FAILED\|imeout"
done
echo ALLDONE

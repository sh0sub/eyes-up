import { pillHit, uprightPillRect } from '../../Assets/Scripts/core/PillHit';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { add, angleDeg, normalize, sub, v3 } from '../../Assets/Scripts/core/math';
import { HEAD, appPill, defaultLayout } from '../helpers/fixtures';

const MARGIN = DEFAULT_TUNABLES.pillMarginDeg;

const dir = (from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => normalize(sub(to, from));

describe('pillHit (pass 6)', () => {
  it('hits the centre and just inside the corners; misses just outside the margin', () => {
    const rect = appPill();
    const c = rect.center;
    const dist = Math.hypot(c.x - HEAD.x, c.y - HEAD.y, c.z - HEAD.z);
    const m = dist * Math.tan((MARGIN * Math.PI) / 180);
    expect(pillHit(HEAD, dir(HEAD, c), rect, MARGIN)).toBe(true);
    expect(pillHit(HEAD, dir(HEAD, add(c, v3(25.9, 4.4, 0))), rect, MARGIN)).toBe(true);
    expect(pillHit(HEAD, dir(HEAD, add(c, v3(-25.9, -4.4, 0))), rect, MARGIN)).toBe(true);
    expect(pillHit(HEAD, dir(HEAD, add(c, v3(0, 4.5 + m + 0.5, 0))), rect, MARGIN)).toBe(false);
    expect(pillHit(HEAD, dir(HEAD, add(c, v3(26 + m + 0.5, 0, 0))), rect, MARGIN)).toBe(false);
  });

  it('never hits a ray pointing away from the pill or parallel to its plane', () => {
    const rect = appPill();
    expect(pillHit(HEAD, normalize(sub(HEAD, rect.center)), rect, MARGIN)).toBe(false);
    expect(pillHit(HEAD, v3(1, 0, 0), rect, MARGIN)).toBe(false);
  });

  it('uses the rect axes: a yawed pill is tested in its own plane', () => {
    const viewer = v3(200, 160, 0); // off to the right, the billboard turns toward it
    const rect = uprightPillRect(v3(0, 180, -250), viewer, 26, 4.5);
    expect(pillHit(viewer, dir(viewer, rect.center), rect, MARGIN)).toBe(true);
    // ~320 cm away → margin ≈ 8.4 cm. 20 cm along the pill's own (yawed) right axis is still on it,
    // 16 cm up is off it.
    const along = (k: number) => add(rect.center, v3(rect.right.x * k, rect.right.y * k, rect.right.z * k));
    expect(Math.abs(rect.right.z)).toBeGreaterThan(0.5);
    expect(pillHit(viewer, dir(viewer, along(20)), rect, MARGIN)).toBe(true);
    expect(pillHit(viewer, dir(viewer, along(40)), rect, MARGIN)).toBe(false);
    expect(pillHit(viewer, dir(viewer, add(rect.center, v3(0, 16, 0))), rect, MARGIN)).toBe(false);
  });

  it('regression: the centre audience is not "on the pill", but the old 7° anchor cone said it was', () => {
    const layout = defaultLayout(6);
    const rect = appPill(layout.cardAnchor);
    const centreEyes = v3(0, layout.eyeTargets[2].y, layout.eyeTargets[2].z);
    const toAudience = dir(HEAD, centreEyes);
    // Old test (pre pass 6): angle to cardAnchor <= lookAngleDeg.
    expect(angleDeg(toAudience, sub(layout.cardAnchor, HEAD))).toBeLessThan(DEFAULT_TUNABLES.lookAngleDeg);
    expect(pillHit(HEAD, toAudience, rect, MARGIN)).toBe(false);
    for (const i of [2, 3]) expect(pillHit(HEAD, dir(HEAD, layout.eyeTargets[i]), rect, MARGIN)).toBe(false);
  });

  it('looking straight at the pill hits from the start position and 1 m closer', () => {
    const layout = defaultLayout(6);
    for (const head of [HEAD, v3(0, 160, -100)]) {
      const rect = appPill(layout.cardAnchor, head);
      expect(pillHit(head, dir(head, rect.center), rect, MARGIN)).toBe(true);
    }
  });
});

import { CameraGazeProvider, ScriptedGazeProvider, SwitchableGazeProvider } from '../../Assets/Scripts/GazeProvider';
import { length } from '../../Assets/Scripts/core/math';

describe('GazeProvider (#12)', () => {
  it('ScriptedGazeProvider defaults to origin looking -Z', () => {
    const g = new ScriptedGazeProvider();
    expect(g.origin).toEqual({ x: 0, y: 0, z: 0 });
    expect(g.forward).toEqual({ x: 0, y: 0, z: -1 });
  });

  it('setForward normalizes; lookAt points at a world point', () => {
    const g = new ScriptedGazeProvider({ x: 0, y: 160, z: 0 });
    g.setForward({ x: 3, y: 0, z: -4 });
    expect(length(g.forward)).toBeCloseTo(1, 9);
    expect(g.forward.x).toBeCloseTo(0.6, 9);
    g.lookAt({ x: 0, y: 160, z: -250 });
    expect(g.forward.z).toBeCloseTo(-1, 9);
  });

  it('copies origin so callers cannot mutate it afterwards', () => {
    const o = { x: 1, y: 2, z: 3 };
    const g = new ScriptedGazeProvider(o);
    o.x = 99;
    expect(g.origin.x).toBe(1);
  });

  it('copies a vec3 whose x/y/z are prototype getters (native Lens vec3, found by LEAF)', () => {
    class NativeLikeVec3 {
      constructor(private readonly v: [number, number, number]) {}
      get x() {
        return this.v[0];
      }
      get y() {
        return this.v[1];
      }
      get z() {
        return this.v[2];
      }
    }
    const g = new ScriptedGazeProvider(new NativeLikeVec3([4, 5, 6]));
    expect(g.origin).toEqual({ x: 4, y: 5, z: 6 });
    g.setOrigin(new NativeLikeVec3([7, 8, 9]));
    expect(g.origin).toEqual({ x: 7, y: 8, z: 9 });
  });

  it('SwitchableGazeProvider delegates to the current provider and can swap at runtime', () => {
    const cam = new ScriptedGazeProvider({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 });
    const scripted = new ScriptedGazeProvider({ x: 1, y: 2, z: 3 }, { x: 1, y: 0, z: 0 });
    const g = new SwitchableGazeProvider(cam);
    expect(g.forward).toEqual({ x: 0, y: 0, z: -1 });
    g.use(scripted);
    expect(g.source).toBe(scripted);
    expect(g.origin).toEqual({ x: 1, y: 2, z: 3 });
    expect(g.forward).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('CameraGazeProvider reads position and Transform.back from a transform-like object', () => {
    const fakeTransform = {
      getWorldPosition: () => ({ x: 10, y: 150, z: 5 }),
      back: { x: 0, y: 0, z: -2 },
    };
    const g = new CameraGazeProvider(fakeTransform);
    expect(g.origin).toEqual({ x: 10, y: 150, z: 5 });
    expect(g.forward).toEqual({ x: 0, y: 0, z: -1 });
  });

  it('CameraGazeProvider follows the camera as it rotates (mouse look in preview)', () => {
    const t = { getWorldPosition: () => ({ x: 0, y: 0, z: 0 }), back: { x: 0, y: 0, z: -1 } };
    const g = new CameraGazeProvider(t);
    t.back = { x: -1, y: 0, z: 0 };
    expect(g.forward).toEqual({ x: -1, y: 0, z: 0 });
  });
});

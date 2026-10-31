/**
 * GazeProvider.ts — where the head is and where it points (plan: interface GazeProvider { origin; forward }).
 *
 * LEAF cannot move the preview camera, so gaze is injected through this interface:
 * - CameraGazeProvider: reads the preview/device camera Transform (normal runs).
 * - ScriptedGazeProvider: tests and LEAF set `forward` directly (test-only).
 *
 * No Lens Studio globals are referenced, so this file also runs in Node tests.
 */
import { Vec3Like, normalize, sub, v3 } from './core/math';

export interface GazeProvider {
  /** Head position in world space (cm). */
  readonly origin: Vec3Like;
  /** Unit look direction in world space. */
  readonly forward: Vec3Like;
}

/**
 * The subset of Lens Studio `Transform` that CameraGazeProvider uses.
 * A real `Transform` satisfies it structurally.
 */
export interface CameraTransformLike {
  getWorldPosition(): Vec3Like;
  /**
   * Lens Studio cameras look down their local -Z, which `Transform.back` returns in world space.
   * Checked in Lens Studio 5.24.1: `Transform.back: vec3` exists in StudioLib.d.ts, and a camera
   * with identity rotation faces world -Z (AGENTS.md), so `back` is the look direction.
   */
  readonly back: Vec3Like;
}

export class CameraGazeProvider implements GazeProvider {
  constructor(private readonly cameraTransform: CameraTransformLike) {}

  get origin(): Vec3Like {
    return this.cameraTransform.getWorldPosition();
  }

  get forward(): Vec3Like {
    return normalize(this.cameraTransform.back);
  }
}

/**
 * Delegates to whichever provider is current. EyesUpApp hands this to the session once, so a LEAF
 * scenario can swap the live camera for a ScriptedGazeProvider at runtime (LEAF cannot move the
 * preview camera, and the `useScriptedGaze` @input is fixed at edit time).
 */
export class SwitchableGazeProvider implements GazeProvider {
  constructor(private current: GazeProvider) {}

  get origin(): Vec3Like {
    return this.current.origin;
  }

  get forward(): Vec3Like {
    return this.current.forward;
  }

  get source(): GazeProvider {
    return this.current;
  }

  use(provider: GazeProvider): void {
    this.current = provider;
  }
}

/** Test/LEAF provider: forward is set by the scenario. Defaults to the Lens Studio camera pose (origin, looking -Z). */
export class ScriptedGazeProvider implements GazeProvider {
  private _origin: Vec3Like;
  private _forward: Vec3Like;

  // Copies use explicit components, not `{ ...origin }`: a native Lens `vec3` has no own enumerable
  // x/y/z, so spreading it yields `{}` (found by LEAF start_places_audience in Lens Studio 5.24.1).
  constructor(origin: Vec3Like = v3(0, 0, 0), forward: Vec3Like = v3(0, 0, -1)) {
    this._origin = v3(origin.x, origin.y, origin.z);
    this._forward = normalize(forward);
  }

  get origin(): Vec3Like {
    return this._origin;
  }

  get forward(): Vec3Like {
    return this._forward;
  }

  setOrigin(origin: Vec3Like): void {
    this._origin = v3(origin.x, origin.y, origin.z);
  }

  setForward(forward: Vec3Like): void {
    this._forward = normalize(forward);
  }

  /** Point the gaze at a world-space point. */
  lookAt(point: Vec3Like): void {
    this._forward = normalize(sub(point, this._origin));
  }
}

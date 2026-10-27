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
   * (미확인: Lens Studio에서 확인 — SIK의 카메라 방향 헬퍼가 `back`을 쓰는 것으로 알고 있으나 실행 확인 전)
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

/** Test/LEAF provider: forward is set by the scenario. Defaults to the Lens Studio camera pose (origin, looking -Z). */
export class ScriptedGazeProvider implements GazeProvider {
  private _origin: Vec3Like;
  private _forward: Vec3Like;

  constructor(origin: Vec3Like = v3(0, 0, 0), forward: Vec3Like = v3(0, 0, -1)) {
    this._origin = { ...origin };
    this._forward = normalize(forward);
  }

  get origin(): Vec3Like {
    return this._origin;
  }

  get forward(): Vec3Like {
    return this._forward;
  }

  setOrigin(origin: Vec3Like): void {
    this._origin = { ...origin };
  }

  setForward(forward: Vec3Like): void {
    this._forward = normalize(forward);
  }

  /** Point the gaze at a world-space point. */
  lookAt(point: Vec3Like): void {
    this._forward = normalize(sub(point, this._origin));
  }
}

/**
 * FigureMesh.ts — runtime meshes for the audience figures (redesign): a filled polygon and a stroke ring along a polygon, both with a
 * v coordinate that runs 0 at `vMin` to 1 at `vMax` (the body fade texture ramps alpha by height through v). Built with MeshBuilder,
 * cached by key. Polygons are smooth and star-shaped about their centroid (see core/Figure.ts).
 */
import { Pt, centroid, offsetPts } from './core/Figure';

const cache = new Map<string, RenderMesh>();

/** Counter-clockwise copy of `pts` (the UI faces +Z, so front faces wind counter-clockwise). */
function ccw(pts: readonly Pt[]): Pt[] {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area >= 0 ? pts.slice() : pts.slice().reverse();
}

function build(verts: number[][], indices: number[]): RenderMesh {
  const mb = new MeshBuilder([
    { name: 'position', components: 3 },
    { name: 'texture0', components: 2 },
  ]);
  mb.topology = MeshTopology.Triangles;
  mb.indexType = MeshIndexType.UInt16;
  mb.appendVerticesInterleaved(verts.flat());
  mb.appendIndices(indices);
  mb.updateMesh();
  return mb.getMesh();
}

export interface VRange {
  /** Body-local y that maps to v = 0 and v = 1. */
  yMin: number;
  yMax: number;
}

function uvOf(p: Pt, r: VRange | null): [number, number] {
  if (!r) return [0.5, 0.5];
  return [0.5, Math.min(1, Math.max(0, (p[1] - r.yMin) / (r.yMax - r.yMin)))];
}

export function polyFill(key: string, pts: readonly Pt[], r: VRange | null): RenderMesh {
  const hit = cache.get(key);
  if (hit) return hit;
  pts = ccw(pts);
  const c = centroid(pts);
  const n = pts.length;
  const verts: number[][] = [[c[0], c[1], 0, ...uvOf(c, r)]];
  pts.forEach((p) => verts.push([p[0], p[1], 0, ...uvOf(p, r)]));
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(0, 1 + i, 1 + ((i + 1) % n));
  const mesh = build(verts, idx);
  cache.set(key, mesh);
  return mesh;
}

/** A band of width `stroke` just inside `pts` (the outer edge is `pts` itself). */
export function polyRing(key: string, pts: readonly Pt[], stroke: number, r: VRange | null): RenderMesh {
  const hit = cache.get(key);
  if (hit) return hit;
  pts = ccw(pts);
  const inner = offsetPts(pts, -stroke);
  const n = pts.length;
  const verts: number[][] = [];
  pts.forEach((p) => verts.push([p[0], p[1], 0, ...uvOf(p, r)]));
  inner.forEach((p) => verts.push([p[0], p[1], 0, ...uvOf(p, r)]));
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(i, j, n + j, i, n + j, n + i);
  }
  const mesh = build(verts, idx);
  cache.set(key, mesh);
  return mesh;
}

/**
 * A band of width `stroke` along an open polyline, offset toward `toward` (so the outer edge is the polyline itself): the brighter rim
 * on the light side of a figure and its collar line.
 */
export function polyStrip(key: string, pts: readonly Pt[], stroke: number, toward: Pt, r: VRange | null): RenderMesh {
  const hit = cache.get(key);
  if (hit) return hit;
  const n = pts.length;
  const inner: Pt[] = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    let nx = -ty / len;
    let ny = tx / len;
    if (nx * (toward[0] - p[0]) + ny * (toward[1] - p[1]) < 0) {
      nx = -nx;
      ny = -ny;
    }
    return [p[0] + nx * stroke, p[1] + ny * stroke];
  });
  const verts: number[][] = [];
  pts.forEach((p) => verts.push([p[0], p[1], 0, ...uvOf(p, r)]));
  inner.forEach((p) => verts.push([p[0], p[1], 0, ...uvOf(p, r)]));
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) idx.push(i, i + 1, n + i + 1, i, n + i + 1, n + i, i, n + i + 1, i + 1, i, n + i, n + i + 1);
  const mesh = build(verts, idx);
  cache.set(key, mesh);
  return mesh;
}

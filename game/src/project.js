// Chase camera and 3D -> 2D projection for Nusantara Sky Run.
// The camera sits behind and above the plane, looks ahead of it, and
// rolls with the plane's bank so the horizon tilts like a real chase
// view. All drawing is plain Canvas 2D.
import { CAMERA } from './config.js';
import { degToRad } from './random.js';

export class Camera {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    const fov = degToRad(CAMERA.fovDeg);
    this.focal = (height / 2) / Math.tan(fov / 2);
    this.horizonY = height * 0.42;
  }

  // pos: {x,y,z} plane position; yaw/pitch/roll in radians.
  update(pos, yaw, pitch, roll) {
    const fx = Math.sin(yaw) * Math.cos(pitch);
    const fy = Math.sin(pitch);
    const fz = Math.cos(yaw) * Math.cos(pitch);
    // Camera behind the plane along its forward vector.
    this.pos = {
      x: pos.x - fx * CAMERA.chaseDistance,
      y: pos.y + CAMERA.chaseHeight - fy * CAMERA.chaseDistance * 0.4,
      z: pos.z - fz * CAMERA.chaseDistance,
    };
    // Look point ahead of the plane.
    const look = {
      x: pos.x + fx * CAMERA.lookAhead,
      y: pos.y + fy * CAMERA.lookAhead,
      z: pos.z + fz * CAMERA.lookAhead,
    };
    // Forward = look - camPos, normalised.
    let fwd = norm3({
      x: look.x - this.pos.x,
      y: look.y - this.pos.y,
      z: look.z - this.pos.z,
    });
    // World up, rolled around the forward axis by the bank angle.
    const up0 = { x: 0, y: 1, z: 0 };
    const right = norm3(cross3(fwd, up0));
    let up = cross3(right, fwd);
    // Apply roll: rotate right/up around fwd.
    const c = Math.cos(roll);
    const s = Math.sin(roll);
    const r2 = {
      x: right.x * c + up.x * s,
      y: right.y * c + up.y * s,
      z: right.z * c + up.z * s,
    };
    const u2 = {
      x: up.x * c - right.x * s,
      y: up.y * c - right.y * s,
      z: up.z * c - right.z * s,
    };
    this.fwd = fwd;
    this.right = r2;
    this.up = u2;
  }

  // Project a world point to screen space. Returns null when behind.
  project(p) {
    const dx = p.x - this.pos.x;
    const dy = p.y - this.pos.y;
    const dz = p.z - this.pos.z;
    const cz = dx * this.fwd.x + dy * this.fwd.y + dz * this.fwd.z;
    if (cz < 2) return null;
    const cx = dx * this.right.x + dy * this.right.y + dz * this.right.z;
    const cy = dx * this.up.x + dy * this.up.y + dz * this.up.z;
    const scale = this.focal / cz;
    return {
      x: this.width / 2 + cx * scale,
      y: this.horizonY - cy * scale,
      depth: cz,
      scale,
    };
  }

  // Screen-space size of a world-sized object at the given depth.
  sizeAt(worldSize, depth) {
    return (worldSize * this.focal) / Math.max(depth, 2);
  }

  // Is a world point inside the view (rough frustum test)?
  visible(p, margin = 200) {
    const s = this.project(p);
    if (!s) return false;
    return (
      s.x > -margin && s.x < this.width + margin &&
      s.y > -margin && s.y < this.height + margin
    );
  }
}

function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function norm3(v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

// World rendering for Nusantara Sky Run: sky, sun, sea, the terrain
// mesh, runway markings, trees, buildings, clouds and rings — all
// drawn with Canvas 2D from the projected 3D world. The camera rolls
// with the plane, so the horizon tilts when the aircraft banks.
import { WORLD, COLORS, RUNWAY } from './config.js';
import { clamp, lerp } from './random.js';
import { terrainHeight, terrainColor, isRunway, makeTrees, makeBuildings, makeClouds } from './world.js';

const trees = makeTrees();
const buildings = makeBuildings();
const clouds = makeClouds();
const GRID = 40; // terrain cells per side in the drawn patch
const CELL = (WORLD.gridHalf * 2) / GRID;

function rgb(c, fog = 0) {
  // Fog blends a colour toward the horizon haze.
  const haze = [188, 217, 245];
  const r = Math.round(lerp(c[0], haze[0], fog));
  const g = Math.round(lerp(c[1], haze[1], fog));
  const b = Math.round(lerp(c[2], haze[2], fog));
  return `rgb(${r},${g},${b})`;
}

export function renderWorld(ctx, W, H, cam, f, mission, time) {
  drawSky(ctx, W, H, cam, time);
  drawSea(ctx, W, H, cam);
  drawTerrain(ctx, W, H, cam, f);
  drawRunwayMarkings(ctx, cam);
  drawBuildings(ctx, cam);
  drawTrees(ctx, cam, f);
  drawClouds(ctx, cam, time);
  drawRings(ctx, cam, mission);
  drawPlaneShadow(ctx, cam, f);
}

function drawSky(ctx, W, H, cam, time) {
  // Sky gradient follows the camera horizon so it tilts with the roll.
  const hy = cam.horizonY;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(Math.max(0, hy / H - 0.12), COLORS.skyTop);
  g.addColorStop(Math.min(1, hy / H + 0.02), COLORS.skyHorizon);
  g.addColorStop(1, '#7fae7d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Sun: fixed in the east sky.
  const sun = cam.project({ x: 6000, y: 1600, z: -2500 });
  if (sun) {
    const glow = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 130);
    glow.addColorStop(0, 'rgba(255, 246, 200, 0.95)');
    glow.addColorStop(0.25, 'rgba(255, 220, 130, 0.55)');
    glow.addColorStop(1, 'rgba(255, 220, 130, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sun.x - 140, sun.y - 140, 280, 280);
    ctx.fillStyle = '#fff7cf';
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSea(ctx, W, H, cam) {
  // The sea is the flat band between the horizon and the terrain.
  const hy = cam.horizonY;
  const g = ctx.createLinearGradient(0, hy, 0, H);
  g.addColorStop(0, COLORS.seaShallow);
  g.addColorStop(1, COLORS.seaDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, hy, W, H - hy);
  // Sun glitter on the water: faint, sparse.
  ctx.fillStyle = 'rgba(255, 240, 190, 0.10)';
  for (let i = 0; i < 14; i++) {
    const x = ((i * 173 + 60) % W);
    const y = hy + 12 + ((i * 47) % Math.max(40, H - hy - 20));
    ctx.fillRect(x, y, 22 + (i % 3) * 10, 2);
  }
}

function drawTerrain(ctx, W, H, cam, f) {
  // Draw the terrain patch around the camera, far cells first.
  const cx = Math.round(cam.pos.x / CELL) * CELL;
  const cz = Math.round(cam.pos.z / CELL) * CELL;
  const half = (GRID / 2) * CELL;
  const cells = [];
  for (let ix = 0; ix < GRID; ix++) {
    for (let iz = 0; iz < GRID; iz++) {
      const x0 = cx - half + ix * CELL;
      const z0 = cz - half + iz * CELL;
      const mx = x0 + CELL / 2;
      const mz = z0 + CELL / 2;
      const d = Math.hypot(mx - cam.pos.x, mz - cam.pos.z);
      cells.push({ x0, z0, d });
    }
  }
  cells.sort((a, b) => b.d - a.d);
  const hCache = new Map();
  const heightAt = (x, z) => {
    const k = `${x},${z}`;
    if (!hCache.has(k)) hCache.set(k, terrainHeight(x, z));
    return hCache.get(k);
  };
  for (const { x0, z0, d } of cells) {
    const x1 = x0 + CELL;
    const z1 = z0 + CELL;
    const p00 = cam.project({ x: x0, y: heightAt(x0, z0), z: z0 });
    const p10 = cam.project({ x: x1, y: heightAt(x1, z0), z: z0 });
    const p11 = cam.project({ x: x1, y: heightAt(x1, z1), z: z1 });
    const p01 = cam.project({ x: x0, y: heightAt(x0, z1), z: z1 });
    if (!p00 || !p10 || !p11 || !p01) continue;
    // Skip cells entirely off-screen.
    const minX = Math.min(p00.x, p10.x, p11.x, p01.x);
    const maxX = Math.max(p00.x, p10.x, p11.x, p01.x);
    const minY = Math.min(p00.y, p10.y, p11.y, p01.y);
    const maxY = Math.max(p00.y, p10.y, p11.y, p01.y);
    if (maxX < -50 || minX > W + 50 || maxY < -50 || minY > H + 50) continue;
    const mx = x0 + CELL / 2;
    const mz = z0 + CELL / 2;
    const h = heightAt(mx, mz);
    // Skip only when the whole cell is under water (corners included),
    // so the shoreline never leaves a hole in the mesh.
    const hMax = Math.max(heightAt(x0, z0), heightAt(x1, z0), heightAt(x1, z1), heightAt(x0, z1));
    if (hMax < 0.5 && !isRunway(mx, mz)) continue; // open sea, already drawn
    const fog = clamp((d - 600) / 1500, 0, 0.85);
    // Slope shading: darker on the far side of a rise.
    const slope = heightAt(x1, mz) - heightAt(x0, mz);
    const shade = clamp(1 - slope * 0.012, 0.82, 1.08);
    const base = terrainColor(mx, mz, h);
    const col = [base[0] * shade, base[1] * shade, base[2] * shade];
    ctx.fillStyle = rgb(col, fog);
    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRunwayMarkings(ctx, cam) {
  // Centreline dashes + threshold bars, projected onto the strip.
  const dashes = 9;
  for (let i = 0; i < dashes; i++) {
    const t = (i + 0.5) / dashes;
    const x = RUNWAY.cx - RUNWAY.length / 2 + t * RUNWAY.length;
    const a = cam.project({ x: x - 18, y: 7.2, z: RUNWAY.cz });
    const b = cam.project({ x: x + 18, y: 7.2, z: RUNWAY.cz });
    if (!a || !b) continue;
    ctx.strokeStyle = COLORS.runwayMark;
    ctx.lineWidth = Math.max(1, cam.sizeAt(3, a.depth));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Runway numbers "09" at the west threshold, "27" at the east.
  const nW = cam.project({ x: RUNWAY.cx - RUNWAY.length / 2 + 55, y: 7.2, z: RUNWAY.cz });
  if (nW && nW.depth < 1500) {
    ctx.fillStyle = COLORS.runwayMark;
    ctx.font = `800 ${Math.max(10, cam.sizeAt(26, nW.depth))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('09', nW.x, nW.y);
  }
  const nE = cam.project({ x: RUNWAY.cx + RUNWAY.length / 2 - 55, y: 7.2, z: RUNWAY.cz });
  if (nE && nE.depth < 1500) {
    ctx.fillStyle = COLORS.runwayMark;
    ctx.font = `800 ${Math.max(10, cam.sizeAt(26, nE.depth))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('27', nE.x, nE.y);
  }
}

function drawBuildings(ctx, cam) {
  for (const b of buildings) {
    const d = Math.hypot(b.x - cam.pos.x, b.z - cam.pos.z);
    if (d > 1400) continue;
    const top = cam.project({ x: b.x, y: b.y + b.hgt, z: b.z });
    const base = cam.project({ x: b.x, y: b.y, z: b.z });
    if (!top || !base) continue;
    const w = cam.sizeAt(b.w, top.depth);
    const h = (base.y - top.y) * (b.hgt / Math.max(1, b.hgt));
    const fog = clamp((d - 900) / 1600, 0, 0.7);
    ctx.fillStyle = rgb([185, 179, 164], fog);
    ctx.fillRect(top.x - w / 2, top.y, w, Math.max(2, base.y - top.y));
    ctx.fillStyle = rgb([122, 72, 52], fog);
    ctx.beginPath();
    ctx.moveTo(top.x - w / 2, top.y);
    ctx.lineTo(top.x, top.y - Math.max(2, w * 0.35));
    ctx.lineTo(top.x + w / 2, top.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawTrees(ctx, cam, f) {
  const near = trees.filter((t) => {
    const d = Math.hypot(t.x - cam.pos.x, t.z - cam.pos.z);
    return d < 950;
  });
  near.sort((a, b) => {
    const da = Math.hypot(a.x - cam.pos.x, a.z - cam.pos.z);
    const db = Math.hypot(b.x - cam.pos.x, b.z - cam.pos.z);
    return db - da;
  });
  for (const t of near) {
    const s = cam.project({ x: t.x, y: t.y + t.s, z: t.z });
    const b = cam.project({ x: t.x, y: t.y, z: t.z });
    if (!s || !b) continue;
    const h = b.y - s.y;
    if (h < 2) continue;
    const fog = clamp((s.depth - 700) / 1200, 0, 0.6);
    // Trunk.
    ctx.strokeStyle = rgb([90, 60, 35], fog);
    ctx.lineWidth = Math.max(1, h * 0.08);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(s.x, b.y - h * 0.35);
    ctx.stroke();
    // Canopy: two stacked triangles.
    ctx.fillStyle = rgb([46, 107, 47], fog);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - h * 0.42, b.y - h * 0.3);
    ctx.lineTo(s.x + h * 0.42, b.y - h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgb([58, 128, 58], fog);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + h * 0.22);
    ctx.lineTo(s.x - h * 0.34, b.y - h * 0.08);
    ctx.lineTo(s.x + h * 0.34, b.y - h * 0.08);
    ctx.closePath();
    ctx.fill();
  }
}

function drawClouds(ctx, cam, time) {
  for (const c of clouds) {
    // Slow drift with time.
    const x = c.x + Math.sin(time * 0.008 + c.z) * 40;
    const s = cam.project({ x, y: c.y, z: c.z });
    if (!s || s.depth > 4200) continue;
    const r = cam.sizeAt(c.s, s.depth);
    if (r < 6) continue;
    // A cloud is a cluster of soft puffs, never one hard disc.
    for (const [ox, oy, orr] of [[0, 0, 1], [-0.55, 0.12, 0.62], [0.55, 0.1, 0.68], [0.1, -0.18, 0.55]]) {
      const g = ctx.createRadialGradient(s.x + ox * r, s.y + oy * r, 1, s.x + ox * r, s.y + oy * r, r * orr);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.38)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(s.x + ox * r, s.y + oy * r, r * orr, r * orr * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRings(ctx, cam, mission) {
  for (const r of mission.rings || []) {
    const c = cam.project({ x: r.x, y: r.y, z: r.z });
    if (!c || c.depth < 4) continue;
    const rad = cam.sizeAt(r.r, c.depth);
    if (rad < 3) continue;
    // Glow + ring circle + inner disc.
    const col = r.done ? COLORS.ringDone : COLORS.ring;
    ctx.save();
    ctx.globalAlpha = r.done ? 0.35 : 0.9;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(2, rad * 0.12);
    ctx.beginPath();
    ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = r.done ? 0.12 : 0.3;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(c.x, c.y, rad * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (!r.done && rad > 14) {
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${Math.max(11, rad * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(r.refuel ? 'FUEL' : String(r.index + 1), c.x, c.y + rad * 0.16);
    }
  }
}

function drawPlaneShadow(ctx, cam, f) {
  if (f.onGround) return;
  const groundY = terrainHeight(f.x, f.z);
  if (groundY < 1 || f.y - groundY > 260) return;
  const s = cam.project({ x: f.x, y: groundY + 1, z: f.z });
  if (!s) return;
  // Size from the true camera distance, not the forward component:
  // a point almost below the camera has a tiny forward depth, which
  // would blow the ellipse up to an oil slick.
  const dist = Math.hypot(f.x - cam.pos.x, groundY - cam.pos.y, f.z - cam.pos.z);
  const w = Math.min(240, cam.sizeAt(26, dist));
  const fade = 1 - (f.y - groundY) / 300;
  ctx.fillStyle = `rgba(10, 30, 50, ${(0.30 * fade).toFixed(2)})`;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, w, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

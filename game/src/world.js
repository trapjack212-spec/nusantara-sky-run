// World generation for Nusantara Sky Run: three islands in a blue sea,
// a town, a river, a runway, trees, buildings and clouds. Everything is
// a pure function of the seed, so the world never changes between runs.
import { WORLD, RUNWAY, TOWN, RIVER, COLORS } from './config.js';
import { mulberry32, fbm, clamp, lerp } from './random.js';

export const SEED = 20261126;

// Island centres: [x, z, radius, peak height].
const ISLANDS = [
  [0, -100, 1500, 130],
  [1850, 1250, 720, 90],
  [-1650, 1150, 620, 75],
];

function islandFalloff(x, z) {
  let h = 0;
  for (const [cx, cz, r, peak] of ISLANDS) {
    const dx = (x - cx) / r;
    const dz = (z - cz) / r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= 1) continue;
    const t = 1 - d2;
    h += peak * t * t * (3 - 2 * t);
  }
  return h;
}

// Terrain height in metres at world (x, z). Below 0 is sea.
export function terrainHeight(x, z) {
  const base = islandFalloff(x, z);
  if (base <= 0.5) return base - 4; // open sea floor, well below water
  const n = fbm(x * 0.0016, z * 0.0016, SEED);
  let h = base * (0.75 + 0.35 * n);
  // Flatten the runway strip and the town apron so they read as built.
  h = flattenNear(h, x, z, RUNWAY.cx, RUNWAY.cz, 520, 6);
  h = flattenNear(h, x, z, TOWN.cx, TOWN.cz, 300, 9);
  return h;
}

function flattenNear(h, x, z, cx, cz, radius, target) {
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d >= radius) return h;
  const t = 1 - d / radius;
  const w = t * t;
  return lerp(h, target, w * 0.92);
}

export function isRunway(x, z) {
  // Runway runs east-west (along x) centred on RUNWAY.
  const dx = x - RUNWAY.cx;
  const dz = z - RUNWAY.cz;
  return Math.abs(dx) <= RUNWAY.length / 2 && Math.abs(dz) <= RUNWAY.width / 2;
}

export function isRoad(x, z) {
  // One road from the town to the runway threshold, plus a coast road.
  const d1 = Math.abs(z - (TOWN.cz + 40)) < 14 && x > -600 && x < 900;
  const d2 = Math.abs(x - 620) < 14 && z > -700 && z < 500;
  return d1 || d2;
}

export function isRiver(x, z) {
  // A river ribbon from the hills to the south coast.
  const t = (x - RIVER.x0) / (RIVER.x1 - RIVER.x0);
  if (t < 0 || t > 1) return false;
  const rz = RIVER.z0 + (RIVER.z1 - RIVER.z0) * t;
  return Math.abs(z - rz) < RIVER.width / 2;
}

// Colour of one terrain cell, by height and feature. Returns [r,g,b].
export function terrainColor(x, z, h) {
  if (h < 1.5) return hex(COLORS.sand);
  if (isRiver(x, z)) return hex(COLORS.seaShallow);
  if (isRunway(x, z)) return hex(COLORS.runway);
  if (isRoad(x, z)) return hex(COLORS.road);
  // Farm plots near the town: a subtle checker of two close greens.
  const fx = Math.floor(x / 90);
  const fz = Math.floor(z / 90);
  const nearTown = Math.hypot(x - TOWN.cx, z - TOWN.cz) < 550;
  if (nearTown && h < 45 && (fx + fz) % 2 === 0) return hex(COLORS.fieldA);
  if (nearTown && h < 45) return hex(COLORS.fieldB);
  if (h > 95) return hex(COLORS.rock);
  if (h > 55) return hex(COLORS.forest);
  // Grass with a slow variation so the ground is not one flat tone.
  const n = fbm(x * 0.004, z * 0.004, SEED + 31);
  const base = hex(n > 0.1 ? COLORS.grassLow : COLORS.grassHigh);
  return base;
}

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

// Trees: billboards scattered on the main island's grass.
export function makeTrees() {
  const rng = mulberry32(SEED + 5);
  const trees = [];
  let guard = 0;
  while (trees.length < 420 && guard++ < 6000) {
    const x = (rng() * 2 - 1) * 1900;
    const z = (rng() * 2 - 1) * 1900;
    const h = terrainHeight(x, z);
    if (h < 6 || h > 60 || isRunway(x, z) || isRoad(x, z) || isRiver(x, z)) continue;
    if (Math.hypot(x - TOWN.cx, z - TOWN.cz) < 240) continue;
    trees.push({ x, z, y: h, s: 9 + rng() * 9 });
  }
  return trees;
}

// Buildings: boxes around the town centre.
export function makeBuildings() {
  const rng = mulberry32(SEED + 9);
  const out = [];
  for (let i = 0; i < 46; i++) {
    const a = rng() * Math.PI * 2;
    const r = 40 + rng() * TOWN.radius;
    const x = TOWN.cx + Math.cos(a) * r;
    const z = TOWN.cz + Math.sin(a) * r * 0.8;
    if (isRoad(x, z) || isRiver(x, z)) continue;
    const h = terrainHeight(x, z);
    out.push({ x, z, y: h, w: 14 + rng() * 16, d: 12 + rng() * 14, hgt: 8 + rng() * 22, rot: rng() * Math.PI });
  }
  return out;
}

// Clouds: soft puffs high above the islands.
export function makeClouds() {
  const rng = mulberry32(SEED + 21);
  const out = [];
  for (let i = 0; i < 26; i++) {
    out.push({
      x: (rng() * 2 - 1) * 2600,
      z: (rng() * 2 - 1) * 2600,
      y: 340 + rng() * 180,
      s: 90 + rng() * 160,
    });
  }
  return out;
}

// The golden ring course: a loop over the valley, the coast and the sea.
export function ringCourse() {
  return [
    { x: 150, z: -900, y: 150 },
    { x: 800, z: -1100, y: 180 },
    { x: 1300, z: -500, y: 150 },
    { x: 1100, z: 300, y: 200 },
    { x: 400, z: 800, y: 170 },
    { x: -500, z: 900, y: 190 },
    { x: -1100, z: 200, y: 160 },
    { x: -700, z: -600, y: 150 },
  ];
}

// Dash destination: the far island's strip.
export const DASH_TARGET = { x: 1850, z: 1250, y: 60 };

// Refuel rings on the dash route.
export function dashRefuels() {
  return [
    { x: 900, z: 350, y: 170 },
    { x: 1400, z: 850, y: 160 },
  ];
}

export function clampToWorld(v) {
  return clamp(v, -WORLD.gridHalf, WORLD.gridHalf);
}

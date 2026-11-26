// The three missions of Nusantara Sky Run. Each one is a different
// goal over the same islands: rings in order, a gentle runway
// landing, and a timed courier dash with refuel rings. The mission
// owns the banner text, the rings, the timer and the scoring.
import { MISSIONS, RUNWAY } from './config.js';
import { clamp, angleDelta } from './random.js';
import { ringCourse, dashRefuels, DASH_TARGET, terrainHeight, isRunway } from './world.js';
import { altitudeFt } from './physics.js';

export function newMission(id) {
  const base = {
    id,
    banner: '',
    bannerColor: '#ffffff',
    rings: [],
    nextRing: 0,
    score: 0,
    timeLeft: null,
    done: false,
    doneText: '',
    attemptsLeft: 0,
    landed: false,
  };
  if (id === 'rings') {
    base.rings = ringCourse().map((r, i) => ({ ...r, r: 26, index: i, done: false }));
    base.timeLeft = MISSIONS.rings.timeLimitS;
    base.banner = 'RING 1/8 — FOLLOW THE GOLD';
  } else if (id === 'landing') {
    base.attemptsLeft = MISSIONS.landing.attempts;
    base.banner = 'LINE UP ON THE RUNWAY — GEAR DOWN';
  } else if (id === 'dash') {
    base.rings = dashRefuels().map((r, i) => ({ ...r, r: 24, index: i, done: false, refuel: true }));
    base.timeLeft = MISSIONS.dash.timeLimitS;
    base.banner = 'DELIVER TO THE FAR ISLAND — WATCH THE FUEL';
  }
  return base;
}

// Starting pose per mission, so each one opens on a good shot.
export function missionStart(id) {
  if (id === 'rings') {
    return { x: -600, y: 220, z: -1400, yaw: Math.PI / 2, speedKt: 110, throttle: 0.6, fuel: 100 };
  }
  if (id === 'landing') {
    // On final approach from the EAST, 1.4 km out, 300 ft, lined up
    // on the runway — the approach runs over the sea, not the hills.
    return { x: RUNWAY.cx + 1400, y: 90, z: RUNWAY.cz, yaw: -Math.PI / 2, speedKt: 95, throttle: 0.42, fuel: 100 };
  }
  // Dash: off the main runway, heading for the far island.
  return { x: 500, y: 200, z: -300, yaw: Math.PI / 4, speedKt: 120, throttle: 0.7, fuel: MISSIONS.dash.fuelStart };
}

function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function updateMission(m, f, game, dt, sfx) {
  if (m.done) return;
  if (m.timeLeft !== null) {
    m.timeLeft -= dt;
    if (m.timeLeft <= 0) {
      m.timeLeft = 0;
      if (m.id === 'rings' || m.id === 'dash') {
        m.done = true;
        m.doneText = m.id === 'rings' ? 'TIME UP — RINGS MISSED' : 'OUT OF TIME — DELIVERY FAILED';
        game.over = true;
      }
    }
  }
  if (m.id === 'rings') updateRings(m, f, game, dt, sfx);
  else if (m.id === 'landing') updateLanding(m, f, game, dt, sfx);
  else if (m.id === 'dash') updateDash(m, f, game, dt, sfx);
}

function updateRings(m, f, game, dt, sfx) {
  const ring = m.rings[m.nextRing];
  if (!ring) return;
  const d = dist3(f, ring);
  const dGround = Math.hypot(f.x - ring.x, f.z - ring.z);
  if (d < ring.r + 14) {
    ring.done = true;
    m.nextRing += 1;
    const pts = 100 + Math.max(0, Math.round(60 - d));
    game.score += pts;
    sfx.chime();
    if (m.nextRing >= m.rings.length) {
      const bonus = Math.round(m.timeLeft) * 2;
      game.score += bonus;
      m.done = true;
      m.doneText = `RING RUN COMPLETE — TIME BONUS +${bonus}`;
      game.over = true;
      game.won = true;
    } else {
      m.banner = `RING ${m.nextRing + 1}/8 — ${Math.round(dGround)}m AHEAD`;
    }
  } else if (m.nextRing < m.rings.length) {
    const bearing = Math.atan2(ring.x - f.x, ring.z - f.z);
    const off = angleDelta(f.yaw, bearing);
    const arrow = off > 0.25 ? '↱' : off < -0.25 ? '↰' : '↑';
    m.banner = `RING ${m.nextRing + 1}/8 ${arrow} ${Math.round(d)}m`;
  }
}

function updateLanding(m, f, game, dt, sfx) {
  const dRunway = Math.hypot(f.x - RUNWAY.cx, f.z - RUNWAY.cz);
  if (f.onGround && !m.landed) {
    m.landed = true;
    // Score the touchdown: vertical speed, centreline, alignment.
    const vs = Math.abs(f.vspeedMs);
    const centre = Math.abs(f.z - RUNWAY.cz);
    // Westbound landing: runway heading is -PI/2 (runway 27).
    const align = Math.abs(angleDelta(f.yaw, -Math.PI / 2));
    const vsScore = clamp(1 - vs / 6, 0, 1) * 200;
    const centreScore = clamp(1 - centre / (RUNWAY.width / 2), 0, 1) * 150;
    const alignScore = clamp(1 - align / 0.3, 0, 1) * 150;
    const total = Math.round(vsScore + centreScore + alignScore);
    game.score += total;
    m.done = true;
    m.doneText = total >= 400 ? `BUTTER LANDING! +${total}` : total >= 250 ? `DOWN SAFE +${total}` : `ROUGH BUT DOWN +${total}`;
    game.over = true;
    game.won = total >= 250;
    sfx.thud();
  } else if (!f.onGround) {
    const alt = Math.round(altitudeFt(f));
    if (dRunway < 2600) {
      m.banner = `FINAL — ${alt} FT — KEEP HER STRAIGHT`;
    } else {
      m.banner = 'LINE UP ON THE RUNWAY — GEAR DOWN';
    }
  }
  // Landing is scored in updateLanding when the wheels touch; a crash
  // spends an attempt in main.js, not here (this runs every frame).
}

function updateDash(m, f, game, dt, sfx) {
  // Refuel rings along the route.
  for (const r of m.rings) {
    if (r.done) continue;
    if (dist3(f, r) < r.r + 14) {
      r.done = true;
      f.fuel = clamp(f.fuel + 35, 0, 100);
      game.score += 50;
      sfx.chime();
      m.banner = 'FUEL TOPPED UP — KEEP GOING';
    }
  }
  const d = Math.hypot(f.x - DASH_TARGET.x, f.z - DASH_TARGET.z);
  if (d < 220 && f.y < 120) {
    const bonus = Math.round(m.timeLeft) * 2 + Math.round(f.fuel);
    game.score += 300 + bonus;
    m.done = true;
    m.doneText = `DELIVERED! +300 + BONUS ${bonus}`;
    game.over = true;
    game.won = true;
    sfx.chime();
  } else {
    m.banner = `FAR ISLAND ${Math.round(d)}m — FUEL ${Math.round(f.fuel)}%`;
  }
  if (f.fuel <= 0 && f.y <= terrainHeight(f.x, f.z) + 3) {
    m.done = true;
    m.doneText = 'OUT OF FUEL — DITCHED SHORT';
    game.over = true;
  }
}

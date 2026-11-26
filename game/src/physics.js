// Arcade flight model for Nusantara Sky Run: throttle sets target
// speed, bank turns the aircraft, pitch climbs and descends, and the
// model stalls, sinks, burns fuel and takes damage on hard contact.
// Speeds are knots; positions are metres; angles are radians.
import { PLANE, RUNWAY } from './config.js';
import { clamp, angleDelta } from './random.js';
import { terrainHeight, isRunway } from './world.js';

export const KT_TO_MS = 0.514444;

export function newFlight() {
  return {
    x: -600, y: 220, z: -1400,
    yaw: Math.PI / 2, // facing east
    pitch: 0,
    roll: 0,
    speedKt: 90,
    throttle: 0.55,
    fuel: 100,
    damage: 0,
    vspeedMs: 0,
    onGround: false,
    crashed: false,
    crashReason: '',
  };
}

export function stepFlight(f, input, dt) {
  if (f.crashed || f.onGround) return;
  // Throttle.
  if (input.throttleUp) f.throttle = clamp(f.throttle + dt * 0.6, 0, 1);
  if (input.throttleDown) f.throttle = clamp(f.throttle - dt * 0.6, 0, 1);
  // Bank: keyboard or mouse offset; returns toward level hands-off.
  const mouseBank = input.mouseX !== null ? clamp(input.mouseX * 0.9, -0.9, 0.9) : 0;
  let targetRoll = 0;
  if (input.left) targetRoll = -PLANE.maxBank;
  else if (input.right) targetRoll = PLANE.maxBank;
  else if (input.mouseX !== null) targetRoll = mouseBank;
  f.roll += clamp(targetRoll - f.roll, -dt * 2.2, dt * 2.2);
  // Turn rate follows bank; heading wraps.
  f.yaw += Math.sin(f.roll) * PLANE.turnRate * dt * (f.speedKt / 100);
  // Pitch: keys, eased toward a gentle auto-level.
  let targetPitch = 0;
  if (input.pitchUp) targetPitch = 0.28;
  else if (input.pitchDown) targetPitch = -0.12; // gentle: a landing approach is a shallow descent
  f.pitch += clamp(targetPitch - f.pitch, -dt * 1.4, dt * 1.4);

  // Speed chases the throttle's target; drag grows with bank.
  const drag = 1 + Math.abs(f.roll) * 0.35;
  const targetSpeed = 30 + f.throttle * (PLANE.maxSpeedKt - 30);
  f.speedKt += clamp((targetSpeed / drag - f.speedKt) * dt * 0.5, -dt * 22, dt * 22);

  // Lift: climbing needs speed; below stall speed the wing quits.
  const speedMs = f.speedKt * KT_TO_MS;
  let climb = Math.sin(f.pitch) * speedMs;
  if (f.speedKt < PLANE.stallSpeedKt) {
    climb -= (PLANE.stallSpeedKt - f.speedKt) * 0.12;
  }
  climb = clamp(climb, -PLANE.sinkRate * 2.2, PLANE.climbRate);
  f.vspeedMs = climb;
  f.y += climb * dt;
  f.x += Math.sin(f.yaw) * Math.cos(f.pitch) * speedMs * dt;
  f.z += Math.cos(f.yaw) * Math.cos(f.pitch) * speedMs * dt;

  // Fuel burn follows the throttle.
  const burn = PLANE.fuelBurnIdle + (PLANE.fuelBurnFull - PLANE.fuelBurnIdle) * f.throttle;
  f.fuel = Math.max(0, f.fuel - burn * dt);
  if (f.fuel <= 0 && f.throttle > 0.15) f.throttle = 0.15; // flame-out glide

  // Ground contact.
  const ground = terrainHeight(f.x, f.z);
  if (f.y <= ground + 2) {
    const overRunway = isRunway(f.x, f.z);
    const gentle = f.vspeedMs > -6 && f.speedKt < 130 && Math.abs(f.roll) < 0.35;
    if (overRunway && gentle && ground > 2) {
      f.y = ground + 2;
      f.onGround = true; // a landing: missions score it
      f.speedKt = Math.max(0, f.speedKt - 30 * dt);
    } else if (f.vspeedMs < -14 || f.speedKt > 150) {
      f.crashed = true;
      f.crashReason = f.y < 3 && ground <= 2 ? 'Ditched in the sea' : 'Hit the ground too hard';
      f.damage = 100;
    } else {
      // Hard bounce: damage, bounce back up, keep flying.
      f.damage = Math.min(100, f.damage + 22);
      f.y = ground + 6;
      f.vspeedMs = 4;
      f.pitch = 0.1;
      f.speedKt *= 0.82;
      if (f.damage >= 100) {
        f.crashed = true;
        f.crashReason = 'Airframe gave out';
      }
    }
  }
  // World edge: turn the aircraft back gently.
  const R = 2050;
  if (Math.hypot(f.x, f.z) > R) {
    const home = Math.atan2(-f.x, -f.z);
    f.yaw += angleDelta(f.yaw, home) * dt * 0.8;
  }
}

export function headingDeg(f) {
  // 0 = north (+z), 90 = east (+x).
  let d = (Math.atan2(Math.sin(f.yaw), Math.cos(f.yaw)) * 180) / Math.PI;
  if (d < 0) d += 360;
  return d;
}

export function altitudeFt(f) {
  return Math.max(0, f.y * 3.28084);
}

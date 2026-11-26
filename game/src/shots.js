// Deterministic screenshot states for Nusantara Sky Run.
// ?shot=cover|landing|dash|menu&seed=1 places the plane, the mission
// and the clock at fixed values, so every screenshot is a real render
// of the game's own code in a repeatable pose.
import { missionStart } from './missions.js';

export function applyShot(game, f, mission, shot) {
  if (shot === 'cover') {
    // Ring Run, banking toward ring 3 dead ahead, sun high.
    Object.assign(f, missionStart('rings'), {
      x: 1150, y: 160, z: -680, yaw: 0.69, pitch: 0.02, roll: 0.3,
      speedKt: 148, throttle: 0.8, fuel: 82, vspeedMs: 1.5,
    });
    mission.nextRing = 2;
    mission.rings[0].done = true;
    mission.rings[1].done = true;
    mission.banner = 'RING 3/8 ↑ 234m';
    game.score = 240;
    game.timeLeft = 178;
    game.shotTime = 42;
  } else if (shot === 'landing') {
    // Final approach from the east: runway centred ahead, gear down, ~320 ft.
    Object.assign(f, missionStart('landing'), {
      x: 1350, y: 98, z: -320, yaw: -Math.PI / 2, pitch: -0.05, roll: 0.02,
      speedKt: 98, throttle: 0.4, fuel: 71, vspeedMs: -3,
    });
    mission.banner = 'FINAL — 320 FT — KEEP HER STRAIGHT';
    game.score = 0;
    game.timeLeft = null;
    game.shotTime = 30;
  } else if (shot === 'dash') {
    // Low over the sea between the islands, fuel amber.
    Object.assign(f, missionStart('dash'), {
      x: 1150, y: 150, z: 500, yaw: Math.PI / 4, pitch: 0.02, roll: -0.28,
      speedKt: 165, throttle: 0.85, fuel: 38,
    });
    mission.rings[0].done = true;
    mission.banner = 'FAR ISLAND 1,240m — FUEL 38%';
    game.score = 350;
    game.timeLeft = 132;
    game.shotTime = 66;
  }
  // 'menu' needs no pose: the menu screen draws itself.
}

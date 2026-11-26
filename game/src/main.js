// Nusantara Sky Run — game loop, state machine and screens.
// An original 3D chase-view flight game: three missions over the
// islands, fuel and damage that turn a sortie into decisions, and a
// full HUD. Keyboard + mouse, offline, no network.
import { WORLD, MISSIONS, COLORS, RUNWAY } from './config.js';
import { Camera } from './project.js';
import { renderWorld } from './render.js';
import { drawPlane } from './plane.js';
import { drawHUD } from './hud.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { newFlight, stepFlight } from './physics.js';
import { newMission, missionStart, updateMission } from './missions.js';
import { applyShot } from './shots.js';
import { terrainHeight } from './world.js';
import { clamp } from './random.js';

const W = 1280;
const H = 720;
const canvas = document.getElementById('game');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const cam = new Camera(W, H);
const input = new Input(canvas);
const sfx = new SoundBank();

const game = {
  state: 'menu', // menu | flying | paused | over
  missionId: 'rings',
  mission: null,
  flight: null,
  score: 0,
  timeLeft: null,
  over: false,
  won: false,
  retryLanding: false,
  shotTime: 0,
  time: 0,
  propAngle: 0,
  best: { rings: 0, landing: 0, dash: 0 },
  muted: false,
};

function startMission(id) {
  // Landing attempts persist across retries of the same mission.
  const prevAttempts = id === 'landing' && game.mission ? game.mission.attemptsLeft : MISSIONS.landing.attempts;
  game.missionId = id;
  game.mission = newMission(id);
  if (id === 'landing') game.mission.attemptsLeft = prevAttempts;
  game.flight = newFlight();
  const s = missionStart(id);
  Object.assign(game.flight, s, { roll: 0, pitch: 0, damage: 0, vspeedMs: 0, onGround: false, crashed: false });
  game.score = 0;
  game.timeLeft = game.mission.timeLeft;
  game.over = false;
  game.won = false;
  game.retryLanding = false;
  game.state = 'flying';
  sfx.ensure();
}

function toMenu() {
  game.state = 'menu';
  game.mission = null;
  game.flight = null;
  game.over = false;
}

function endMission() {
  game.state = 'over';
  game.best[game.missionId] = Math.max(game.best[game.missionId], game.score);
}

let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  game.time += dt;
  const t = game.shotTime || game.time;
  update(dt);
  render(t);
  input.endFrame();
  requestAnimationFrame(frame);
}

function update(dt) {
  // Global keys.
  if (input.wasPressed('m')) game.muted = sfx.toggleMute();
  if (game.state === 'menu') {
    if (input.wasPressed('1')) startMission('rings');
    else if (input.wasPressed('2')) startMission('landing');
    else if (input.wasPressed('3')) startMission('dash');
    else if (input.clicked) {
      const c = input.clicked;
      for (let i = 0; i < 3; i++) {
        const y0 = 330 + i * 96;
        if (c.x > W / 2 - 260 && c.x < W / 2 + 260 && c.y > y0 && c.y < y0 + 80) {
          startMission(['rings', 'landing', 'dash'][i]);
        }
      }
    }
    return;
  }
  if (game.state === 'over') {
    if (input.wasPressed('r')) startMission(game.missionId);
    else if (input.wasPressed('escape')) toMenu();
    return;
  }
  if (input.wasPressed('p') || input.wasPressed('escape')) {
    game.state = game.state === 'paused' ? 'flying' : 'paused';
    return;
  }
  if (game.state === 'paused') {
    if (input.wasPressed('r')) startMission(game.missionId);
    return;
  }
  // Flying.
  const f = game.flight;
  const m = game.mission;
  const wasCrashed = f.crashed;
  stepFlight(f, input.read(), dt);
  game.propAngle += dt * (6 + f.throttle * 40);
  if (f.onGround) {
    // Runway rollout: bleed speed, stay on the strip.
    f.speedKt = Math.max(0, f.speedKt - 26 * dt);
    f.y = terrainHeight(f.x, f.z) + 2;
    f.x += Math.sin(f.yaw) * f.speedKt * 0.514444 * dt;
    f.z += Math.cos(f.yaw) * f.speedKt * 0.514444 * dt;
  }
  updateMission(m, f, game, dt, sfx);
  game.timeLeft = m.timeLeft;
  if (f.crashed && !wasCrashed) {
    sfx.crash();
    if (m.id === 'landing' && m.attemptsLeft > 1) {
      // Spend one attempt and re-fly the approach.
      m.attemptsLeft -= 1;
      m.banner = `CRASHED — ${m.attemptsLeft} ATTEMPT${m.attemptsLeft > 1 ? 'S' : ''} LEFT`;
      setTimeout(() => {
        if (game.state === 'flying') startMission('landing');
      }, 900);
    } else {
      m.done = true;
      m.doneText = m.id === 'landing' ? 'OUT OF ATTEMPTS' : (f.crashReason || 'CRASHED');
      game.over = true;
    }
  }
  if (game.over) endMission();
  sfx.setEngine(f.throttle, f.speedKt);
}

function render(t) {
  ctx.clearRect(0, 0, W, H);
  if (game.state === 'menu') {
    drawMenu(t);
    return;
  }
  const f = game.flight;
  const m = game.mission;
  cam.update(f, f.yaw, f.pitch, f.roll);
  renderWorld(ctx, W, H, cam, f, m, t);
  drawPlane(ctx, W, H, f.roll, f.throttle, game.propAngle, m.id === 'landing' || f.onGround);
  drawHUD(ctx, W, H, f, m, game);
  if (game.state === 'paused') {
    dimScreen();
    centerText('PAUSED', 64, '#ffffff');
    centerText('P resume — R restart — M menu', 30, 'rgba(255,255,255,0.8)', H / 2 + 52);
  } else if (game.state === 'over') {
    dimScreen();
    centerText(game.won ? 'MISSION COMPLETE' : (m.doneText || 'CRASHED'), 54, game.won ? COLORS.hudGreen : COLORS.hudRed);
    centerText(`SCORE ${game.score}  •  BEST ${game.best[game.missionId]}`, 26, '#ffffff', H / 2 + 8);
    if (m.doneText && !game.won) centerText(m.doneText, 22, 'rgba(255,255,255,0.85)', H / 2 + 44);
    centerText('R fly again — M menu', 22, 'rgba(255,255,255,0.75)', H / 2 + 84);
  }
}

function dimScreen() {
  ctx.fillStyle = 'rgba(6, 18, 34, 0.55)';
  ctx.fillRect(0, 0, W, H);
}

function centerText(text, size, color, y = H / 2) {
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, y);
}

function drawMenu(t) {
  // Sky + sea backdrop with a drifting plane silhouette.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2f6fd0');
  g.addColorStop(0.55, '#bcd9f5');
  g.addColorStop(0.56, '#2f97b8');
  g.addColorStop(1, '#14608f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Sun + clouds.
  ctx.fillStyle = '#fff7cf';
  ctx.beginPath();
  ctx.arc(W - 180, 110, 34, 0, Math.PI * 2);
  ctx.fill();
  // Clouds: soft two-puff clusters drifting across the sky.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 5; i++) {
    const x = ((i * 260 + t * 12) % (W + 300)) - 150;
    const y = 90 + (i % 3) * 46;
    ctx.beginPath();
    ctx.ellipse(x, y, 90, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 40, y - 12, 60, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Title.
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(8, 30, 60, 0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText('NUSANTARA SKY RUN', W / 2, 168);
  ctx.shadowBlur = 0;
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('Fly the islands. Thread the rings. Bring her home.', W / 2, 208);
  // Mission cards.
  const cards = [
    ['1', 'RING RUN', 'Thread 8 golden rings in order — beat the clock.'],
    ['2', 'RUNWAY LANDING', 'Three attempts to grease it onto strip 09.'],
    ['3', 'COURIER DASH', 'Deliver to the far island before the fuel runs out.'],
  ];
  cards.forEach(([key, name, desc], i) => {
    const y = 330 + i * 96;
    const best = game.best[['rings', 'landing', 'dash'][i]];
    ctx.fillStyle = 'rgba(8, 24, 44, 0.55)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 260, y, 520, 80, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = COLORS.hudAmber;
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(key, W / 2 - 236, y + 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText(name, W / 2 - 196, y + 36);
    ctx.font = '500 16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(desc, W / 2 - 196, y + 62);
    if (best > 0) {
      ctx.fillStyle = COLORS.hudGreen;
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`BEST ${best}`, W / 2 + 238, y + 50);
    }
  });
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '500 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('W/S throttle  •  Arrows pitch & bank  •  Mouse steers  •  P pause  •  M mute  •  R restart', W / 2, 650);
  ctx.fillText('Click a mission or press 1, 2 or 3 to fly.', W / 2, 682);
  // A small plane silhouette crossing the sky, top-right.
  drawPlane(ctx, W, H, Math.sin(t * 0.4) * 0.08, 0.6, t * 30, false, W - 200, 150, 0.42, false);
}

// ---- Boot: deterministic screenshot states ----
if (shot === 'menu') {
  game.state = 'menu';
  game.time = 0;
  game.shotTime = 24;
  // Render one settled frame for the screenshot.
  render(game.shotTime);
  document.title = 'Nusantara Sky Run — shot menu';
} else if (shot) {
  const id = shot === 'landing' ? 'landing' : shot === 'dash' ? 'dash' : 'rings';
  startMission(id);
  applyShot(game, game.flight, game.mission, shot);
  // Render one settled frame immediately for the screenshot.
  cam.update(game.flight, game.flight.yaw, game.flight.pitch, game.flight.roll);
  renderWorld(ctx, W, H, cam, game.flight, game.mission, game.shotTime);
  drawPlane(ctx, W, H, game.flight.roll, game.flight.throttle, 1.2, id === 'landing');
  drawHUD(ctx, W, H, game.flight, game.mission, game);
  document.title = `Nusantara Sky Run — shot ${shot}`;
} else {
  requestAnimationFrame(frame);
}

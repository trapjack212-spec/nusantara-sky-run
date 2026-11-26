// HUD for Nusantara Sky Run: airspeed, altitude, heading compass,
// artificial horizon, throttle / fuel / damage gauges, a minimap and
// the mission banner. Everything is drawn on the game canvas so the
// screenshots show the instruments lit, exactly as the player sees them.
import { COLORS, RUNWAY } from './config.js';
import { clamp } from './random.js';
import { headingDeg, altitudeFt } from './physics.js';
import { DASH_TARGET } from './world.js';

const INK = COLORS.hudInk;
const PANEL = COLORS.hudPanel;

function panel(ctx, x, y, w, h, r = 10) {
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function label(ctx, text, x, y, size = 12, color = 'rgba(255,255,255,0.75)') {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function bigNum(ctx, text, x, y, size = 34) {
  ctx.fillStyle = INK;
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

export function drawHUD(ctx, W, H, f, mission, game) {
  // ---- Airspeed (top-left) ----
  panel(ctx, 16, 14, 168, 74);
  label(ctx, 'AIRSPEED', 28, 34);
  bigNum(ctx, `${Math.round(f.speedKt)}`, 28, 70);
  label(ctx, 'KT', 108, 70, 15);
  // Throttle bar under it: label on its own row, bar below.
  panel(ctx, 16, 96, 168, 34);
  label(ctx, `THR ${Math.round(f.throttle * 100)}%`, 28, 112, 11);
  ctx.fillStyle = '#123a5c';
  ctx.fillRect(26, 118, 148, 8);
  ctx.fillStyle = f.throttle > 0.85 ? COLORS.hudAmber : COLORS.hudGreen;
  ctx.fillRect(26, 118, 148 * f.throttle, 8);

  // ---- Altitude (top-right) ----
  panel(ctx, W - 184, 14, 168, 74);
  label(ctx, 'ALTITUDE', W - 172, 34);
  bigNum(ctx, `${Math.round(altitudeFt(f)).toLocaleString('en-US')}`, W - 172, 70);
  label(ctx, 'FT', W - 52, 70, 15);
  panel(ctx, W - 184, 96, 168, 26);
  const vs = Math.round(f.vspeedMs * 196.85);
  label(ctx, `V/S ${vs >= 0 ? '+' : ''}${vs} FPM`, W - 172, 116, 11,
    Math.abs(vs) > 900 ? COLORS.hudAmber : 'rgba(255,255,255,0.75)');

  // ---- Heading compass (top-centre) ----
  const hdg = headingDeg(f);
  panel(ctx, W / 2 - 150, 14, 300, 40);
  const cardinals = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']];
  ctx.save();
  ctx.beginPath();
  ctx.rect(W / 2 - 150, 14, 300, 40);
  ctx.clip();
  ctx.fillStyle = INK;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const [deg, name] of cardinals) {
    let d = ((deg - hdg + 540) % 360) - 180; // -180..180
    const x = W / 2 + d * 2.1;
    if (x < W / 2 - 150 || x > W / 2 + 150) continue;
    ctx.fillText(name, x, 32);
    ctx.fillRect(x - 1, 40, 2, 6);
  }
  // Ticks every 10 degrees.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let deg = Math.floor((hdg - 70) / 10) * 10; deg <= hdg + 70; deg += 10) {
    const d = ((deg - hdg + 540) % 360) - 180;
    const x = W / 2 + d * 2.1;
    if (x < W / 2 - 150 || x > W / 2 + 150) continue;
    ctx.fillRect(x, 44, 1, 5);
  }
  ctx.restore();
  // Centre caret + heading digits.
  ctx.fillStyle = COLORS.hudAmber;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 7, 14);
  ctx.lineTo(W / 2 + 7, 14);
  ctx.lineTo(W / 2, 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(hdg)).padStart(3, '0') + '°', W / 2, 68);

  // ---- Mission banner (under compass) ----
  if (mission.banner) {
    const text = mission.banner;
    ctx.font = '700 17px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 36;
    panel(ctx, W / 2 - w / 2, 76, w, 34);
    ctx.fillStyle = mission.bannerColor || INK;
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, 99);
  }

  // ---- Artificial horizon (bottom-left) ----
  const hx = 78;
  const hy = H - 78;
  const hr = 52;
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(hx, hy);
  ctx.rotate(-f.roll);
  const pitchPx = clamp(f.pitch * 90, -40, 40);
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-hr, -hr + pitchPx - hr, hr * 2, hr * 2);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-hr, pitchPx, hr * 2, hr * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  for (const off of [-30, -15, 0, 15, 30]) {
    const y = pitchPx + off;
    ctx.beginPath();
    ctx.moveTo(-26, y);
    ctx.lineTo(26, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker.
  ctx.strokeStyle = COLORS.hudAmber;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hx - 34, hy);
  ctx.lineTo(hx - 12, hy);
  ctx.moveTo(hx + 12, hy);
  ctx.lineTo(hx + 34, hy);
  ctx.stroke();
  label(ctx, 'ATTITUDE', hx - 30, hy + hr + 18, 11);

  // ---- Fuel + damage (bottom-right) ----
  const gx = W - 196;
  const gy = H - 108;
  panel(ctx, gx, gy, 180, 92);
  label(ctx, 'FUEL', gx + 12, gy + 20);
  const fuelW = 150 * (f.fuel / 100);
  ctx.fillStyle = '#123a5c';
  ctx.fillRect(gx + 12, gy + 28, 150, 12);
  ctx.fillStyle = f.fuel < 25 ? COLORS.hudRed : f.fuel < 50 ? COLORS.hudAmber : COLORS.hudGreen;
  ctx.fillRect(gx + 12, gy + 28, fuelW, 12);
  label(ctx, `${Math.round(f.fuel)}%`, gx + 128, gy + 20, 11);
  label(ctx, 'DAMAGE', gx + 12, gy + 62);
  ctx.fillStyle = '#123a5c';
  ctx.fillRect(gx + 12, gy + 68, 150, 12);
  ctx.fillStyle = f.damage > 60 ? COLORS.hudRed : COLORS.hudAmber;
  ctx.fillRect(gx + 12, gy + 68, 150 * (f.damage / 100), 12);

  // ---- Minimap (bottom-centre) ----
  const mw = 150;
  const mh = 96;
  const mx = W / 2 - mw / 2;
  const my = H - mh - 16;
  panel(ctx, mx, my, mw, mh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  const toMap = (x, z) => [mx + ((x + 2100) / 4200) * mw, my + ((z + 2100) / 4200) * mh];
  ctx.fillStyle = '#14608f';
  ctx.fillRect(mx, my, mw, mh);
  // Islands as blobs.
  ctx.fillStyle = '#3f7d3a';
  for (const [ix, iz, ir] of [[0, -100, 1500], [1850, 1250, 720], [-1650, 1150, 620]]) {
    const [px, py] = toMap(ix, iz);
    ctx.beginPath();
    ctx.arc(px, py, (ir / 4200) * mw, 0, Math.PI * 2);
    ctx.fill();
  }
  // Runway.
  ctx.strokeStyle = '#f5f2e8';
  ctx.lineWidth = 2;
  const [r1x, r1y] = toMap(RUNWAY.cx - RUNWAY.length / 2, RUNWAY.cz);
  const [r2x, r2y] = toMap(RUNWAY.cx + RUNWAY.length / 2, RUNWAY.cz);
  ctx.beginPath();
  ctx.moveTo(r1x, r1y);
  ctx.lineTo(r2x, r2y);
  ctx.stroke();
  // Rings / target.
  ctx.fillStyle = COLORS.ring;
  for (const r of mission.rings || []) {
    if (r.done) continue;
    const [px, py] = toMap(r.x, r.z);
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mission.id === 'dash') {
    const [px, py] = toMap(DASH_TARGET.x, DASH_TARGET.z);
    ctx.fillStyle = COLORS.ring;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Plane marker.
  const [px, py] = toMap(f.x, f.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.atan2(Math.sin(f.yaw), Math.cos(f.yaw)) - Math.PI / 2 + Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4, 5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  label(ctx, 'MAP', mx + 8, my + 14, 10);

  // ---- Score + time (clear of the banner pill above, on a panel
  // so clouds never wash the text out) ----
  panel(ctx, W / 2 - 92, 112, 184, 54);
  ctx.fillStyle = INK;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE ${game.score}`, W / 2, 134);
  if (game.timeLeft !== null) {
    const t = Math.max(0, Math.ceil(game.timeLeft));
    ctx.fillStyle = t < 30 ? COLORS.hudRed : INK;
    ctx.fillText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, W / 2, 158);
  }

  // ---- Stall / fuel warnings ----
  if (f.speedKt < 58 && !f.onGround) {
    flashWarning(ctx, W, H, 'STALL — NOSE DOWN, ADD POWER', COLORS.hudRed);
  } else if (f.fuel < 20 && f.fuel > 0) {
    flashWarning(ctx, W, H, 'FUEL LOW', COLORS.hudAmber);
  }
}

function flashWarning(ctx, W, H, text, color) {
  if (Math.floor(performance.now() / 450) % 2 === 0) return;
  ctx.font = '800 22px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 40;
  ctx.fillStyle = 'rgba(20, 8, 8, 0.6)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - w / 2, H - 190, w, 38, 8);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, H - 164);
}

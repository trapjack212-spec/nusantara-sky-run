// The courier plane, drawn in screen space as a chase view: the
// aircraft sits low-centre, banks with the roll, and the world moves
// around it. Drawn entirely with canvas paths — an original livery
// (teal fuselage, orange stripe, white wings, registration PK-NSR).
// cx/cy place the aircraft (default: chase-view centre); scale
// shrinks it for the menu screen.
export function drawPlane(ctx, W, H, roll, throttle, propAngle, gearDown, cx = W / 2, cy = H * 0.66, scale = 1, shadow = true) {
  const S = (W / 1280) * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(roll * 0.9);
  ctx.scale(S, S);

  // Soft shadow under the aircraft for depth (not in the menu sky).
  if (shadow) {
    ctx.fillStyle = 'rgba(10, 30, 50, 0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 118, 150, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wings (white, slightly swept).
  ctx.fillStyle = '#f2f4f6';
  ctx.strokeStyle = '#c8ccd2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.lineTo(-215, 42);
  ctx.lineTo(-205, 58);
  ctx.lineTo(-10, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.lineTo(215, 42);
  ctx.lineTo(205, 58);
  ctx.lineTo(10, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Wingtip nav lights: red left, green right.
  ctx.fillStyle = '#ff5347';
  ctx.beginPath();
  ctx.arc(-208, 50, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#37d67a';
  ctx.beginPath();
  ctx.arc(208, 50, 5, 0, Math.PI * 2);
  ctx.fill();

  // Tail: horizontal stabiliser + vertical fin.
  ctx.fillStyle = '#e8ebee';
  ctx.beginPath();
  ctx.moveTo(-58, -72);
  ctx.lineTo(-118, -96);
  ctx.lineTo(-112, -82);
  ctx.lineTo(-52, -58);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(58, -72);
  ctx.lineTo(118, -96);
  ctx.lineTo(112, -82);
  ctx.lineTo(52, -58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0f7d7a';
  ctx.beginPath();
  ctx.moveTo(-6, -66);
  ctx.lineTo(-26, -128);
  ctx.lineTo(2, -118);
  ctx.lineTo(10, -64);
  ctx.closePath();
  ctx.fill();

  // Fuselage: teal body with an orange cheatline.
  const body = ctx.createLinearGradient(0, -120, 0, 40);
  body.addColorStop(0, '#19a7a0');
  body.addColorStop(0.55, '#0f7d7a');
  body.addColorStop(1, '#0a5e5b');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -118);
  ctx.bezierCurveTo(26, -96, 34, -40, 30, 8);
  ctx.bezierCurveTo(28, 30, 16, 44, 0, 46);
  ctx.bezierCurveTo(-16, 44, -28, 30, -30, 8);
  ctx.bezierCurveTo(-34, -40, -26, -96, 0, -118);
  ctx.closePath();
  ctx.fill();
  // Orange cheatline along the fuselage.
  ctx.fillStyle = '#ff8c1a';
  ctx.beginPath();
  ctx.moveTo(-29, -18);
  ctx.quadraticCurveTo(0, -8, 29, -18);
  ctx.lineTo(29, -6);
  ctx.quadraticCurveTo(0, 4, -29, -6);
  ctx.closePath();
  ctx.fill();
  // Registration on the rear fuselage.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PK-NSR', 0, 34);

  // Cockpit glass, lit.
  const glass = ctx.createLinearGradient(0, -108, 0, -58);
  glass.addColorStop(0, '#cfeeff');
  glass.addColorStop(1, '#5aa8d8');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(0, -110);
  ctx.bezierCurveTo(16, -98, 20, -76, 16, -60);
  ctx.bezierCurveTo(8, -54, -8, -54, -16, -60);
  ctx.bezierCurveTo(-20, -76, -16, -98, 0, -110);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-12, -96);
  ctx.lineTo(2, -70);
  ctx.stroke();

  // Propeller: faint translucent disc + two blades, spinning.
  const propR = 40 + throttle * 18;
  ctx.save();
  ctx.translate(0, -118);
  ctx.rotate(propAngle);
  ctx.fillStyle = 'rgba(30, 40, 55, 0.16)';
  ctx.beginPath();
  ctx.arc(0, 0, propR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 28, 40, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, -propR * 0.7, 7, propR * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, propR * 0.7, 7, propR * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Spinner cone.
  ctx.fillStyle = '#ff8c1a';
  ctx.beginPath();
  ctx.arc(0, -118, 9, 0, Math.PI * 2);
  ctx.fill();

  // Landing gear (shown on approach / landing mission).
  if (gearDown) {
    ctx.strokeStyle = '#20262e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-20, 40);
    ctx.lineTo(-24, 66);
    ctx.moveTo(20, 40);
    ctx.lineTo(24, 66);
    ctx.stroke();
    ctx.fillStyle = '#20262e';
    ctx.beginPath();
    ctx.arc(-24, 70, 7, 0, Math.PI * 2);
    ctx.arc(24, 70, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

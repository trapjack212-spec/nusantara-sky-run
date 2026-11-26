// Keyboard + mouse input for Nusantara Sky Run.
// Arrows/WASD fly the plane; mouse position steers gently; keys
// drive the menu, pause, restart and mute. No other input exists.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = null; // -1..1 across the canvas, null when idle
    this.clicked = null; // {x, y} of the last click, consumed by the loop
    this.pressed = new Set(); // keys pressed since last poll
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouseX = null;
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.clicked = {
        x: ((e.clientX - r.left) / r.width) * canvas.width,
        y: ((e.clientY - r.top) / r.height) * canvas.height,
      };
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseX = null;
    });
  }

  // State snapshot the flight model reads each frame.
  read() {
    const k = this.keys;
    return {
      throttleUp: k.has('w'),
      throttleDown: k.has('s'),
      pitchUp: k.has('arrowup'),
      pitchDown: k.has('arrowdown'),
      left: k.has('a') || k.has('arrowleft'),
      right: k.has('d') || k.has('arrowright'),
      mouseX: this.mouseX,
    };
  }

  // True once per physical press; the loop clears it after polling.
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = null;
  }
}

// Synthesised sound for Nusantara Sky Run: engine drone, wind,
// ring chimes, touchdown thud, crash noise and warning beeps.
// Everything is generated with WebAudio — no audio files, no network.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.windGain = null;
    this.windSrc = null;
  }

  // Must be called from a user gesture at least once.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // Engine: two detuned saws through a low-pass filter.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 70;
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sawtooth';
    this.engineOsc2.frequency.value = 70.8;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filter);
    this.engineOsc2.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    this.engineOsc2.start();
    // Wind: looped noise buffer through a band-pass.
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.windSrc = this.ctx.createBufferSource();
    this.windSrc.buffer = buf;
    this.windSrc.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.windSrc.connect(bp);
    bp.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    this.windSrc.start();
  }

  setEngine(throttle, speedKt) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const freq = 55 + throttle * 90 + speedKt * 0.15;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(freq * 1.011, t, 0.1);
    this.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.06, t, 0.1);
    this.windGain.gain.setTargetAtTime(Math.min(0.09, speedKt * 0.00045), t, 0.2);
  }

  chime() {
    this.tone(880, 0.12, 'sine', 0.16);
    setTimeout(() => this.tone(1318, 0.18, 'sine', 0.16), 90);
  }

  thud() {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(38, this.ctx.currentTime + 0.22);
    g.gain.setValueAtTime(0.35, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + 0.26);
  }

  crash() {
    if (!this.ctx || this.muted) return;
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.4;
    src.connect(g);
    g.connect(this.ctx.destination);
    src.start();
    this.thud();
  }

  beep() {
    this.tone(880, 0.09, 'square', 0.08);
  }

  tone(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.02);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.engineGain) this.engineGain.gain.value = this.muted ? 0 : 0.05;
    if (this.windGain) this.windGain.gain.value = this.muted ? 0 : 0.02;
    return this.muted;
  }
}

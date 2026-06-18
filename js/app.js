'use strict';

/* =====================================================================
   POLYFILLS
   ===================================================================== */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    this.moveTo(x + rr, y);
    this.lineTo(x + w - rr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rr);
    this.lineTo(x + w, y + h - rr);
    this.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    this.lineTo(x + rr, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rr);
    this.lineTo(x, y + rr);
    this.quadraticCurveTo(x, y, x + rr, y);
    this.closePath();
  };
}

/* =====================================================================
   CONSTANTS
   ===================================================================== */
const STATE = {
  SPLASH:     'SPLASH',
  LOCKED_PIN: 'LOCKED_PIN',
  GAME_PLAY:  'GAME_PLAY',
  WIND_DOWN:  'WIND_DOWN',
  SLEEP:      'SLEEP'
};
const SUB = { POPPING: 'POPPING', PEEKABOO: 'PEEKABOO', PAINTING: 'PAINTING' };

const PENTATONIC      = [261.63, 293.66, 329.63, 392.00, 440.00];
const PENTATONIC_HIGH = [523.25, 587.33, 659.25, 783.99, 880.00];

const PIN_DIGITS            = [8, 2, 5];
const WINDDOWN_DURATION     = 60;
const SUB_MIN               = 180;
const SUB_MAX               = 240;
const INTERACTION_MILESTONE = 5;
const SURPRISE_POP_MIN      = 5;
const SURPRISE_POP_MAX      = 9;

const VALUE_CARDS = {
  [SUB.POPPING]:  { he: 'סקרנות',   en: 'Curiosity',  icon: '🔍' },
  [SUB.PEEKABOO]: { he: 'ביטחון',   en: 'Trust',      icon: '💛' },
  [SUB.PAINTING]: { he: 'יצירתיות', en: 'Creativity', icon: '🎨' },
};

const PASTEL = [
  '#FF6B6B', '#FF8E53', '#FFC947', '#BFFFB5',
  '#87CEEB', '#DDA0DD', '#98FB98', '#FFB6C1',
  '#87CEFA', '#F0E68C', '#E0BBE4', '#FFDAB9'
];

/* =====================================================================
   SOUND ENGINE
   ===================================================================== */
class SoundEngine {
  constructor () {
    this.ctx           = null;
    this.masterGain    = null;
    this.lullabyGain   = null;
    this.lullabyFilter = null;
    this.lullabyTimer  = null;
    this.paintNodes    = new Map();
    this._surpriseOsc  = null;
  }

  init () {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  resume () { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  playPop () {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
    g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.2);
  }

  playTone (freq, duration) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(t); osc.stop(t + duration + 0.02);
  }

  playCelebration () {
    if (!this.ctx) return;
    [880, 1046.5, 1318.5, 1568, 1760].forEach((f, i) =>
      setTimeout(() => this.playTone(f, 0.18), i * 90));
  }

  playSurpriseRise () {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this._surpriseOsc) { try { this._surpriseOsc.stop(); } catch(_) {} }
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 2.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.3);
    g.gain.setValueAtTime(0.25, t + 2.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(t); osc.stop(t + 2.8);
    this._surpriseOsc = osc;
  }

  playSurpriseExplosion () {
    if (!this.ctx) return;
    if (this._surpriseOsc) { try { this._surpriseOsc.stop(); } catch(_) {} this._surpriseOsc = null; }
    const t = this.ctx.currentTime;
    const boom = this.ctx.createOscillator(), boomG = this.ctx.createGain();
    boom.type = 'sawtooth'; boom.frequency.setValueAtTime(80, t);
    boom.frequency.exponentialRampToValueAtTime(20, t + 0.65);
    boomG.gain.setValueAtTime(0.5, t); boomG.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    boom.connect(boomG); boomG.connect(this.masterGain);
    boom.start(t); boom.stop(t + 0.8);
    [880, 1108, 1318, 1568, 1760, 2093, 2349].forEach((f, i) => {
      const o = this.ctx.createOscillator(), gg = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(f, t + i * 0.05);
      gg.gain.setValueAtTime(0.2, t + i * 0.05); gg.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.45);
      o.connect(gg); gg.connect(this.masterGain);
      o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.5);
    });
  }

  playAnimalSound (type) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (type === 'duck') {
      const osc = this.ctx.createOscillator(), filter = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(400, t); osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      filter.type = 'bandpass'; filter.frequency.setValueAtTime(900, t); filter.Q.setValueAtTime(2.5, t);
      g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(filter); filter.connect(g); g.connect(this.masterGain);
      osc.start(t); osc.stop(t + 0.38);
    } else if (type === 'cat') {
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(850, t + 0.2); osc.frequency.linearRampToValueAtTime(700, t + 0.4);
      g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(g); g.connect(this.masterGain); osc.start(t); osc.stop(t + 0.58);
    } else if (type === 'frog') {
      const osc = this.ctx.createOscillator(), lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain(), g = this.ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(80, t);
      lfo.type = 'sine'; lfo.frequency.setValueAtTime(20, t); lfoGain.gain.setValueAtTime(35, t);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency); osc.connect(g); g.connect(this.masterGain);
      lfo.start(t); osc.start(t); lfo.stop(t + 0.52); osc.stop(t + 0.52);
    } else if (type === 'rabbit') {
      [580, 720].forEach((freq, i) => {
        const o = this.ctx.createOscillator(), gg = this.ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(freq, t + i * 0.15);
        gg.gain.setValueAtTime(0.28, t + i * 0.15); gg.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.15 + 0.25);
        o.connect(gg); gg.connect(this.masterGain); o.start(t + i * 0.15); o.stop(t + i * 0.15 + 0.28);
      });
    } else if (type === 'star') {
      [880, 1108, 1318, 1568].forEach((freq, i) => {
        const o = this.ctx.createOscillator(), gg = this.ctx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(freq, t + i * 0.07);
        gg.gain.setValueAtTime(0.22, t + i * 0.07); gg.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.18);
        o.connect(gg); gg.connect(this.masterGain); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.2);
      });
    }
  }

  startPaintingTone (id, freq, pan) {
    if (!this.ctx || this.paintNodes.has(id)) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), sub = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, t);
    sub.type = 'sine';     sub.frequency.setValueAtTime(freq / 2, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.06);
    const panNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panNode) panNode.pan.setValueAtTime(pan, t);
    osc.connect(g); sub.connect(g);
    if (panNode) { g.connect(panNode); panNode.connect(this.masterGain); } else g.connect(this.masterGain);
    osc.start(t); sub.start(t);
    this.paintNodes.set(id, { osc, sub, gain: g, pan: panNode });
  }

  updatePaintingTone (id, freq, pan) {
    const n = this.paintNodes.get(id); if (!n || !this.ctx) return;
    const t = this.ctx.currentTime;
    n.osc.frequency.exponentialRampToValueAtTime(Math.max(freq, 20), t + 0.06);
    n.sub.frequency.exponentialRampToValueAtTime(Math.max(freq / 2, 10), t + 0.06);
    if (n.pan) n.pan.pan.linearRampToValueAtTime(pan, t + 0.06);
  }

  stopPaintingTone (id) {
    const n = this.paintNodes.get(id); if (!n || !this.ctx) return;
    const t = this.ctx.currentTime;
    n.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    n.osc.stop(t + 0.15); n.sub.stop(t + 0.15);
    this.paintNodes.delete(id);
  }

  stopAllPaintingTones () { for (const id of [...this.paintNodes.keys()]) this.stopPaintingTone(id); }

  startLullaby () {
    if (!this.ctx || this.lullabyGain) return;
    const t = this.ctx.currentTime;
    this.lullabyFilter = this.ctx.createBiquadFilter();
    this.lullabyFilter.type = 'lowpass'; this.lullabyFilter.frequency.setValueAtTime(2000, t);
    this.lullabyGain = this.ctx.createGain();
    this.lullabyGain.gain.setValueAtTime(0.0001, t); this.lullabyGain.gain.exponentialRampToValueAtTime(0.22, t + 1.5);
    this.lullabyFilter.connect(this.lullabyGain); this.lullabyGain.connect(this.masterGain);
    const melody = [261.63,261.63,392.00,392.00,440.00,440.00,392.00,349.23,349.23,329.63,329.63,293.66,293.66,261.63];
    const noteLen = 0.72, phraseLen = melody.length * noteLen;
    const schedulePhrase = (startT) => {
      if (!this.lullabyGain) return;
      melody.forEach((freq, i) => {
        const n = this.ctx.createOscillator(), ng = this.ctx.createGain(), nt = startT + i * noteLen;
        n.type = 'sine'; n.frequency.setValueAtTime(freq / 2, nt);
        ng.gain.setValueAtTime(0.0001, nt); ng.gain.exponentialRampToValueAtTime(0.55, nt + 0.06);
        ng.gain.exponentialRampToValueAtTime(0.0001, nt + noteLen * 0.85);
        n.connect(ng); ng.connect(this.lullabyFilter); n.start(nt); n.stop(nt + noteLen);
      });
      this.lullabyTimer = setTimeout(() => schedulePhrase(this.ctx.currentTime + 0.1), (phraseLen - 0.5) * 1000);
    };
    schedulePhrase(t + 0.5);
  }

  stopLullaby () {
    clearTimeout(this.lullabyTimer); this.lullabyTimer = null;
    if (!this.ctx || !this.lullabyGain) return;
    const t = this.ctx.currentTime;
    this.lullabyGain.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    const lg = this.lullabyGain, lf = this.lullabyFilter;
    this.lullabyGain = null; this.lullabyFilter = null;
    setTimeout(() => { try { lg.disconnect(); lf.disconnect(); } catch (_) {} }, 2500);
  }

  setLowPassCutoff (freq) {
    if (!this.ctx || !this.lullabyFilter) return;
    this.lullabyFilter.frequency.exponentialRampToValueAtTime(Math.max(freq, 80), this.ctx.currentTime + 0.8);
  }

  setMasterVolume (v) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.1);
  }

  fadeOut (seconds) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + seconds);
  }
}

/* =====================================================================
   PARTICLE POOL
   ===================================================================== */
class ParticlePool {
  constructor (size = 350) {
    this.pool = Array.from({ length: size }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, r: 4, color: '#fff', alpha: 1, decay: 0.025
    }));
  }

  spawn (x, y, vx, vy, r, color, decay = 0.025) {
    const p = this.pool.find(p => !p.active); if (!p) return;
    Object.assign(p, { active: true, x, y, vx, vy, r, color, alpha: 1, decay });
  }

  update () {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.x += p.vx; p.y += p.vy; p.vy += 0.12;
      p.alpha -= p.decay; if (p.alpha <= 0) p.active = false;
    }
  }

  draw (ctx) {
    for (const p of this.pool) {
      if (!p.active) continue;
      ctx.save(); ctx.globalAlpha = Math.max(0, p.alpha); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }

  releaseAll () { for (const p of this.pool) p.active = false; }
}

/* =====================================================================
   FIREWORKS SYSTEM  (canvas-only, no text)
   ===================================================================== */
class FireworksSystem {
  constructor () { this.rockets = []; this.active = false; this._timer = 0; }

  launch (w, h) {
    this.active = true; this._timer = 2.8;
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const x       = w * (0.12 + Math.random() * 0.76);
      const targetY = h * (0.08 + Math.random() * 0.38);
      const vy      = -(h * 0.82 - targetY) / 55;
      this.rockets.push({
        x, y: h * 0.88, targetY,
        vx: (Math.random() - 0.5) * 1.2, vy,
        color:  PASTEL[Math.floor(Math.random() * PASTEL.length)],
        color2: PASTEL[Math.floor(Math.random() * PASTEL.length)],
        trail: [], burst: false, dead: false,
        delay: i * 0.13,
      });
    }
  }

  update (dt, pool) {
    if (!this.active) return;
    this._timer -= dt;
    if (this._timer <= 0 && this.rockets.length === 0) { this.active = false; return; }

    for (const r of this.rockets) {
      if (r.delay > 0) { r.delay -= dt; continue; }
      if (r.burst || r.dead) continue;
      r.x += r.vx; r.y += r.vy; r.vy += 0.1;
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 10) r.trail.shift();

      if (r.y <= r.targetY) {
        r.burst = true;
        // Main burst — large colorful particles
        for (let i = 0; i < 42; i++) {
          const a = (i / 42) * Math.PI * 2;
          const spd = (3.5 + Math.random() * 4.5) * 0.75;
          pool.spawn(r.x, r.y, Math.cos(a) * spd, Math.sin(a) * spd - 0.5,
            2.5 + Math.random() * 3, r.color, 0.013);
        }
        // Secondary ring — smaller, different color
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2 + 0.14;
          const spd = (1.5 + Math.random() * 2.5) * 0.75;
          pool.spawn(r.x, r.y, Math.cos(a) * spd, Math.sin(a) * spd - 1,
            1.5 + Math.random() * 2, r.color2, 0.02);
        }
        // Gold sparkle center
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          pool.spawn(r.x, r.y, (Math.random() - 0.5) * 5, -Math.random() * 6,
            1 + Math.random() * 2, '#FFD700', 0.025);
        }
        setTimeout(() => { r.dead = true; }, 50);
      }
    }
    this.rockets = this.rockets.filter(r => !r.dead);
  }

  draw (ctx) {
    if (!this.active) return;
    for (const r of this.rockets) {
      if (r.burst || r.dead || r.delay > 0) continue;
      ctx.save();
      for (let i = 0; i < r.trail.length; i++) {
        const t = r.trail[i];
        ctx.globalAlpha = (i / r.trail.length) * 0.65;
        ctx.fillStyle = r.color;
        ctx.beginPath(); ctx.arc(t.x, t.y, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = r.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(r.x, r.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

/* =====================================================================
   ANIMAL DRAWING
   ===================================================================== */
function drawCat (ctx, x, y, r, eyeOpen = true) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#F4A460'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  [[-1, 1], [1, -1]].forEach(([sx, ex]) => {
    ctx.fillStyle = '#F4A460';
    ctx.beginPath(); ctx.moveTo(sx * r * 0.5, -r * 0.7); ctx.lineTo(sx * r * 0.88, -r * 1.38); ctx.lineTo(ex * r * 0.05 + (sx < 0 ? -r * 0.05 : r * 0.05), -r * 0.86); ctx.fill();
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath(); ctx.moveTo(sx * r * 0.5, -r * 0.76); ctx.lineTo(sx * r * 0.75, -r * 1.2); ctx.lineTo(ex * r * 0.08 + (sx < 0 ? -r * 0.1 : r * 0.1), -r * 0.9); ctx.fill();
  });
  const eR = r * 0.15;
  ctx.fillStyle = eyeOpen ? '#1a1a2e' : '#F4A460';
  [[-0.32, -0.08], [0.32, -0.08]].forEach(([ex, ey]) => { ctx.beginPath(); ctx.arc(r * ex, r * ey, eR, 0, Math.PI * 2); ctx.fill(); });
  if (eyeOpen) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.14, eR * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( r * 0.38, -r * 0.14, eR * 0.38, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#FF69B4'; ctx.beginPath(); ctx.arc(0, r * 0.18, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = r * 0.055; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, r * 0.28, r * 0.2, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.restore();
}

function drawDuck (ctx, x, y, r, eyeOpen = true) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FF8C00'; ctx.beginPath(); ctx.ellipse(r * 0.78, r * 0.1, r * 0.32, r * 0.16, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = eyeOpen ? '#1a1a2e' : '#FFD700'; ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.22, r * 0.15, 0, Math.PI * 2); ctx.fill();
  if (eyeOpen) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.29, -r * 0.28, r * 0.055, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#FFC200';
  [[-0.1, -0.86, 0.2], [0.14, -0.91, 0.17], [0.35, -0.82, 0.15]].forEach(([ox, oy, rr]) => { ctx.beginPath(); ctx.arc(r * ox, r * oy, r * rr, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}

function drawFrog (ctx, x, y, r, eyeOpen = true) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 1.05, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#66BB6A';
  [[-0.42, -0.62], [0.42, -0.62]].forEach(([ex, ey]) => { ctx.beginPath(); ctx.arc(r * ex, r * ey, r * 0.3, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = eyeOpen ? '#1a1a2e' : '#66BB6A';
  [[-0.42, -0.63], [0.42, -0.63]].forEach(([ex, ey]) => { ctx.beginPath(); ctx.arc(r * ex, r * ey, r * 0.15, 0, Math.PI * 2); ctx.fill(); });
  if (eyeOpen) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.7, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( r * 0.49, -r * 0.7, r * 0.06, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#388E3C'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, r * 0.28, r * 0.46, 0.12, Math.PI - 0.12); ctx.stroke();
  ctx.fillStyle = '#388E3C';
  ctx.beginPath(); ctx.arc(-r * 0.13, -r * 0.06, r * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( r * 0.13, -r * 0.06, r * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRabbit (ctx, x, y, r, eyeOpen = true) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#e8d0e8';
  ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 1.3, r * 0.2, r * 0.55, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb6c1'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 1.3, r * 0.1, r * 0.38, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8d0e8'; ctx.beginPath(); ctx.ellipse( r * 0.3, -r * 1.3, r * 0.2, r * 0.55,  0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb6c1'; ctx.beginPath(); ctx.ellipse( r * 0.3, -r * 1.3, r * 0.1, r * 0.38,  0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8d0e8'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  const eR = r * 0.14;
  ctx.fillStyle = eyeOpen ? '#c45a8a' : '#e8d0e8';
  ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.1, eR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( r * 0.3, -r * 0.1, eR, 0, Math.PI * 2); ctx.fill();
  if (eyeOpen) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.23, -r * 0.16, eR * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( r * 0.37, -r * 0.16, eR * 0.38, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#FF69B4'; ctx.beginPath(); ctx.arc(0, r * 0.18, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c45a8a'; ctx.lineWidth = r * 0.055; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, r * 0.28, r * 0.18, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.fillStyle = 'rgba(255,150,150,0.3)';
  ctx.beginPath(); ctx.ellipse(-r * 0.5, r * 0.2, r * 0.2, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( r * 0.5, r * 0.2, r * 0.2, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawStar (ctx, x, y, r, eyeOpen = true) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFB800'; ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const oa = (i / 5) * Math.PI * 2 - Math.PI / 2, ia = oa + Math.PI / 5;
    if (i === 0) ctx.moveTo(Math.cos(oa) * r, Math.sin(oa) * r);
    else         ctx.lineTo(Math.cos(oa) * r, Math.sin(oa) * r);
    ctx.lineTo(Math.cos(ia) * r * 0.45, Math.sin(ia) * r * 0.45);
  }
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  const eR = r * 0.13;
  ctx.fillStyle = eyeOpen ? '#1a1a2e' : '#FFD700';
  ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.08, eR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( r * 0.22, -r * 0.08, eR, 0, Math.PI * 2); ctx.fill();
  if (eyeOpen) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.16, -r * 0.14, eR * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( r * 0.28, -r * 0.14, eR * 0.38, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#B8860B'; ctx.lineWidth = r * 0.065; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.22, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.restore();
}

/* =====================================================================
   DEVELOPMENTAL TRACKER
   ===================================================================== */
class DevTracker {
  constructor () {
    this.sessionStart = 0; this.pops = 0; this.misses = 0;
    this.reactionTimes = []; this.lastTouch = 0;
    this.streakCur = 0; this.streakMax = 0;
    this.peekabooReveal = 0; this.paintStrokes = 0; this.surprisePops = 0;
    this._hasData = false;
  }

  startSession () {
    this.sessionStart = performance.now();
    this.pops = this.misses = this.streakCur = this.streakMax = 0;
    this.peekabooReveal = this.paintStrokes = this.surprisePops = 0;
    this.reactionTimes = []; this.lastTouch = performance.now(); this._hasData = false;
  }

  recordInteract (type) {
    const now = performance.now(), gap = now - this.lastTouch;
    this.lastTouch = now; this._hasData = true;
    if (type === 'pop') {
      this.pops++;
      if (gap > 150 && gap < 12000) this.reactionTimes.push(gap);
      this.streakCur++; this.streakMax = Math.max(this.streakMax, this.streakCur);
    } else if (type === 'miss') {
      this.misses++; this.streakCur = 0;
    } else if (type === 'peekaboo') {
      this.peekabooReveal++; this.streakCur++; this.streakMax = Math.max(this.streakMax, this.streakCur);
    } else if (type === 'paint') {
      this.paintStrokes++;
    } else if (type === 'surprise') {
      this.surprisePops++;
    }
  }

  hasData () { return this._hasData && (this.pops + this.peekabooReveal + this.paintStrokes) > 2; }

  computeReport () {
    const dMin  = Math.max(0.1, (performance.now() - this.sessionStart) / 60000);
    const total = this.pops + this.misses;
    const acc   = total > 0 ? Math.round(this.pops / total * 100) : 0;
    const avgRT = this.reactionTimes.length > 1
      ? Math.round(this.reactionTimes.reduce((a,b)=>a+b) / this.reactionTimes.length) : 1800;
    const ppm   = this.pops / dMin;

    const attentionScore = Math.min(100, Math.round(
      Math.min(this.streakMax * 8, 55) + Math.min(dMin * 5, 25) +
      (avgRT < 1000 ? 20 : avgRT < 1800 ? 12 : avgRT < 3000 ? 6 : 0)
    ));
    const motorScore = Math.min(100, Math.round(
      acc * 0.6 + (avgRT < 700 ? 40 : avgRT < 1200 ? 26 : avgRT < 2000 ? 14 : 5)
    ));
    const engagementScore = Math.min(100, Math.round(
      Math.min(ppm * 9, 50) + Math.min((this.peekabooReveal * 5 + this.paintStrokes * 0.4), 30) +
      (this.surprisePops > 0 ? 20 : 0)
    ));

    return { acc, pops: this.pops, misses: this.misses, avgRT,
      attentionScore, motorScore, engagementScore,
      streakMax: this.streakMax, dMin: Math.round(dMin), surprisePops: this.surprisePops };
  }
}

/* =====================================================================
   PARENT REPORT
   ===================================================================== */
class ParentReport {
  constructor () { this.el = document.getElementById('parentReport'); }

  show (data, onClose) {
    if (!this.el) return;
    const set  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setW = (id, pct) => {
      const el = document.getElementById(id); if (!el) return;
      el.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = pct + '%'; }));
    };
    set('scoreAttentionVal',  data.attentionScore  + ' / 100');
    set('scoreMotorVal',      data.motorScore      + ' / 100');
    set('scoreEngagementVal', data.engagementScore + ' / 100');
    setW('scoreAttention',  data.attentionScore);
    setW('scoreMotor',      data.motorScore);
    setW('scoreEngagement', data.engagementScore);
    set('reportPops',     data.pops);
    set('reportAccuracy', data.acc + '%');
    set('reportStreak',   data.streakMax);
    set('reportDuration', data.dMin);
    set('reportDiagnosisText', this._diagnose(data));

    this.el.style.display = 'flex';
    const btn = document.getElementById('closeReportBtn');
    if (btn) {
      const close = () => { this.el.style.display = 'none'; if (onClose) onClose(); };
      btn.onclick    = close;
      btn.ontouchend = (e) => { e.preventDefault(); close(); };
    }
  }

  _diagnose (d) {
    const lines = [];
    if (d.attentionScore >= 70)      lines.push('קשב ומיקוד מצוינים — הילד הציג יכולת ריכוז גבוהה לגילו.');
    else if (d.attentionScore >= 45) lines.push('קשב טוב ומתפתח — הילד מתמקד בצורה תקינה לגיל.');
    else                             lines.push('קשב בשלבי פיתוח — ממצא שגרתי לחלוטין בגיל שנה עד שלוש.');

    if (d.motorScore >= 70)      lines.push('תיאום עין-יד מרשים — מוטוריקה עדינה מפותחת היטב.');
    else if (d.motorScore >= 45) lines.push('מוטוריקה עדינה מתפתחת בקצב טוב לגיל.');
    else                         lines.push('מוטוריקה עדינה מתפתחת — תקין לגיל הצעיר.');

    if (d.engagementScore >= 70)      lines.push('מעורבות ועניין גבוהים מאוד — ילד פעיל וסקרן מאוד.');
    else if (d.engagementScore >= 45) lines.push('מעורבות טובה — מגלה עניין וסקרנות.');
    else                              lines.push('מעורבות מתפתחת — כל ילד מתחיל בקצב שלו.');

    if (d.surprisePops > 0) lines.push('השיג בועת הפתעה — מציין יכולת התמדה ועניין מתמשך.');
    return lines.join(' ');
  }
}

/* =====================================================================
   BUBBLE GAME  (soap pool + surprise bubble + chain explosion)
   ===================================================================== */
class BubbleGame {
  constructor (canvas, sound, pool, devTracker) {
    this.canvas      = canvas;
    this.sound       = sound;
    this.pool        = pool;
    this.devTracker  = devTracker;
    this.bubbles     = [];
    this.time        = 0;
    this.popCount    = 0;
    this.nextSurpriseAt = SURPRISE_POP_MIN + Math.floor(Math.random() * (SURPRISE_POP_MAX - SURPRISE_POP_MIN));
    this.surpriseBubble = null;
    this.shockwaves  = [];
    this.ambientSparkles = [];
    this._drawFns    = { cat: drawCat, duck: drawDuck, frog: drawFrog, rabbit: drawRabbit, star: drawStar };
    this._animals    = ['cat', 'duck', 'frog', 'rabbit', 'star'];
    this.onSurprisePop = null;
  }

  init () {
    this.time = 0; this.bubbles = []; this.surpriseBubble = null; this.shockwaves = [];
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) this.bubbles.push(this._make(i, count, true));
    this._initAmbientSparkles();
  }

  _initAmbientSparkles () {
    const w = this.canvas.width, h = this.canvas.height;
    this.ambientSparkles = Array.from({ length: 22 }, (_, i) => ({
      x: Math.random() * w, y: Math.random() * h,
      vy: -(0.25 + Math.random() * 0.55), vx: (Math.random() - 0.5) * 0.15,
      r: 1.2 + Math.random() * 2, alpha: Math.random() * 0.3,
      maxAlpha: 0.12 + Math.random() * 0.22,
      color: PASTEL[i % PASTEL.length], fadeDir: 1,
    }));
  }

  _make (idx, total, initial = false) {
    const w = this.canvas.width, h = this.canvas.height;
    const r = 40 + Math.random() * 32;
    const pad = r + 10;
    const xStart = pad + Math.random() * (w - pad * 2);
    const yInit  = initial ? (h * 0.2 + Math.random() * h * 0.6) : h + r + Math.random() * 60;
    return {
      xStart, x: xStart, y: yInit, r,
      speed: 28 + Math.random() * 22, amplitude: 10 + Math.random() * 22,
      omega: 1 + Math.random() * 2, phase: Math.random() * Math.PI * 2,
      animal: this._animals[Math.floor(Math.random() * this._animals.length)],
      color: PASTEL[Math.floor(Math.random() * PASTEL.length)],
      popped: false, popAnim: null, eyeOpen: true, eyeTimer: 0, chainDelay: -1,
    };
  }

  update (dt, windFactor = 1) {
    this.time += dt;
    const w = this.canvas.width, h = this.canvas.height;

    // Ambient sparkles
    for (const s of this.ambientSparkles) {
      s.x += s.vx; s.y += s.vy;
      s.alpha += s.fadeDir * dt * 0.18;
      if (s.alpha >= s.maxAlpha) s.fadeDir = -1;
      if (s.alpha <= 0) { s.x = Math.random() * w; s.y = h + 5; s.alpha = 0; s.fadeDir = 1; s.maxAlpha = 0.12 + Math.random() * 0.22; }
      if (s.y < -10)   { s.y = h + 5; s.x = Math.random() * w; }
    }

    // Regular bubbles
    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];
      if (b.popped) {
        if (b.chainDelay > 0) { b.chainDelay -= dt; if (b.chainDelay <= 0) { b.chainDelay = -1; this._popChain(b); } }
        if (b.popAnim) {
          b.popAnim.t += dt; b.popAnim.y += b.popAnim.vy * dt; b.popAnim.vy += 500 * dt;
          if (b.popAnim.t > 0.7) this.bubbles[i] = this._make(i, this.bubbles.length);
        }
        continue;
      }
      b.y -= b.speed * windFactor * dt;
      b.x  = b.xStart + b.amplitude * Math.sin(b.omega * this.time + b.phase);
      b.x  = Math.max(b.r, Math.min(this.canvas.width - b.r, b.x));
      if (b.eyeTimer > 0) { b.eyeTimer -= dt; b.eyeOpen = Math.floor(b.eyeTimer * 12) % 2 === 0; }
      if (b.y + b.r < 0) this.bubbles[i] = this._make(i, this.bubbles.length);
    }

    // Surprise bubble
    if (this.surpriseBubble && !this.surpriseBubble.popped) {
      const sb = this.surpriseBubble;
      sb.phase += dt;
      sb.r = Math.min(sb.r + dt * 80, sb.targetR);
      sb.y += (sb.targetY - sb.y) * dt * 1.6;
      sb.rainbowAngle = (sb.rainbowAngle + dt * 180) % 360;
      sb.pulse = 0.92 + 0.08 * Math.sin(sb.phase * 5);
    }

    // Shockwaves
    this.shockwaves = this.shockwaves.filter(sw => {
      sw.r += dt * (sw.maxR * 2.2); sw.alpha -= dt * 1.8; return sw.alpha > 0;
    });

    this.pool.update();
  }

  draw (ctx) {
    const w = this.canvas.width, h = this.canvas.height;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0f0528'); bg.addColorStop(1, '#0a1a55');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Ambient sparkles
    for (const s of this.ambientSparkles) {
      ctx.save(); ctx.globalAlpha = Math.max(0, s.alpha); ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    // Background stars (IS 5568 flicker max 2.35 Hz)
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 73 + 17) % 97) / 97 * w, sy = ((i * 47 + 31) % 83) / 83 * h * 0.55;
      const sr = 1 + (i % 3) * 0.5;
      const fl = 0.3 + 0.7 * Math.abs(Math.sin(this.time * (0.4 + i * 0.05)));
      ctx.globalAlpha = fl * 0.45; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Shockwaves
    for (const sw of this.shockwaves) {
      ctx.save(); ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.strokeStyle = sw.color || '#fff';
      ctx.lineWidth   = Math.max(1, (1 - sw.r / sw.maxR) * 10);
      ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Regular bubbles
    for (const b of this.bubbles) {
      if (b.popped) {
        if (b.popAnim) { const scale = Math.min(1.5 + b.popAnim.t * 2, 2.8); this._drawFns[b.animal](ctx, b.popAnim.x, b.popAnim.y, b.r * scale, false); }
        continue;
      }
      const poolFade = b.y > this.canvas.height * 0.82
        ? Math.max(0.15, (this.canvas.height - b.y) / (this.canvas.height * 0.18)) : 1;
      ctx.save(); ctx.globalAlpha = poolFade;
      ctx.shadowColor = b.color; ctx.shadowBlur = 18;
      const gr = ctx.createRadialGradient(b.x - b.r * 0.28, b.y - b.r * 0.28, b.r * 0.08, b.x, b.y, b.r);
      gr.addColorStop(0, b.color + 'CC'); gr.addColorStop(0.65, b.color + '55'); gr.addColorStop(1, b.color + '18');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = b.color + 'AA'; ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.ellipse(b.x - b.r * 0.24, b.y - b.r * 0.28, b.r * 0.18, b.r * 0.11, -0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      this._drawFns[b.animal](ctx, b.x, b.y, b.r * 0.58, b.eyeOpen);
    }

    // Surprise bubble
    if (this.surpriseBubble && !this.surpriseBubble.popped) {
      const sb = this.surpriseBubble, r = sb.r * sb.pulse, cx = sb.x, cy = sb.y;
      ctx.save();
      ctx.shadowColor = `hsl(${sb.rainbowAngle}, 100%, 65%)`; ctx.shadowBlur = 40;
      const gr = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r);
      gr.addColorStop(0, `hsla(${sb.rainbowAngle}, 100%, 85%, 0.7)`);
      gr.addColorStop(0.6, `hsla(${(sb.rainbowAngle + 60) % 360}, 100%, 65%, 0.35)`);
      gr.addColorStop(1,   `hsla(${(sb.rainbowAngle + 120) % 360}, 100%, 45%, 0.12)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `hsl(${sb.rainbowAngle}, 100%, 75%)`; ctx.lineWidth = 3; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(cx - r * 0.2, cy - r * 0.25, r * 0.22, r * 0.13, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `hsl(${sb.rainbowAngle}, 100%, 90%)`;
      ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', cx, cy);
      for (let i = 0; i < 6; i++) {
        const oa = sb.phase * 2 + (i / 6) * Math.PI * 2;
        ctx.fillStyle = PASTEL[i % PASTEL.length];
        ctx.beginPath(); ctx.arc(cx + Math.cos(oa) * r * 1.28, cy + Math.sin(oa) * r * 1.28, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Soap pool at bottom
    this._drawPool(ctx);
    this.pool.draw(ctx);
  }

  _drawPool (ctx) {
    const w = this.canvas.width, h = this.canvas.height, ph = 24;
    const grad = ctx.createLinearGradient(0, h - ph * 2, 0, h);
    grad.addColorStop(0, 'rgba(160,210,255,0)');
    grad.addColorStop(0.5, 'rgba(160,210,255,0.07)');
    grad.addColorStop(1, 'rgba(120,180,255,0.16)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(w / 2, h - ph * 0.5, w * 0.88, ph * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 14; i++) {
      const bx = w * 0.08 + (i / 13) * w * 0.84;
      const by = h - ph * 0.5 + Math.sin(this.time * 1.2 + i * 0.6) * 3;
      const br = 2.5 + (i % 3) * 1.8;
      const ba = Math.max(0, 0.08 + Math.sin(this.time * 1.8 + i * 0.9) * 0.06);
      ctx.save(); ctx.globalAlpha = ba;
      ctx.strokeStyle = 'rgba(200,230,255,0.7)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  handleTouch (tx, ty) {
    if (this.surpriseBubble && !this.surpriseBubble.popped) {
      const sb = this.surpriseBubble;
      const dx = tx - sb.x, dy = ty - sb.y;
      if (dx * dx + dy * dy <= sb.r * sb.r) { this._popSurprise(); return true; }
    }
    for (const b of this.bubbles) {
      if (b.popped) continue;
      const dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) { this._pop(b); return true; }
    }
    // Miss
    this.sound.playTone(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], 0.2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.pool.spawn(tx, ty, Math.cos(a) * 2, Math.sin(a) * 2 - 0.5, 3, 'rgba(255,255,255,0.6)', 0.06);
    }
    if (this.devTracker) this.devTracker.recordInteract('miss');
    return false;
  }

  _pop (b) {
    this.sound.playPop(); this.sound.playAnimalSound(b.animal);
    if ('vibrate' in navigator) navigator.vibrate(28);
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
      const spd   = (90 + Math.random() * 130) * 0.016;
      this.pool.spawn(b.x, b.y, Math.cos(angle) * spd, Math.sin(angle) * spd - 2.5,
        3 + Math.random() * 6, PASTEL[Math.floor(Math.random() * PASTEL.length)], 0.02);
    }
    this.shockwaves.push({ x: b.x, y: b.y, r: 4, maxR: b.r * 4, alpha: 0.5, color: b.color });
    b.popped = true; b.eyeOpen = false; b.popAnim = { t: 0, x: b.x, y: b.y, vy: -90 };
    if (this.devTracker) this.devTracker.recordInteract('pop');
    this.popCount++;
    if (!this.surpriseBubble && this.popCount >= this.nextSurpriseAt) this._triggerSurprise();
  }

  _triggerSurprise () {
    const w = this.canvas.width, h = this.canvas.height;
    this.surpriseBubble = {
      x: w / 2, y: h * 0.75, targetY: h * 0.38,
      r: 20, targetR: Math.min(w, h) * 0.26,
      phase: 0, rainbowAngle: 0, pulse: 1, popped: false,
    };
    this.sound.playSurpriseRise();
    this.nextSurpriseAt = SURPRISE_POP_MIN + Math.floor(Math.random() * (SURPRISE_POP_MAX - SURPRISE_POP_MIN));
    this.popCount = 0;
  }

  _popSurprise () {
    const sb = this.surpriseBubble; sb.popped = true;
    this.sound.playSurpriseExplosion();
    if ('vibrate' in navigator) navigator.vibrate([60, 40, 90, 40, 130]);
    if (this.devTracker) this.devTracker.recordInteract('surprise');
    this.shockwaves.push({ x: sb.x, y: sb.y, r: sb.r, maxR: Math.max(this.canvas.width, this.canvas.height) * 1.4, alpha: 0.75, color: `hsl(${sb.rainbowAngle}, 100%, 75%)` });
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2, spd = (250 + Math.random() * 350) * 0.016;
      this.pool.spawn(sb.x, sb.y, Math.cos(angle) * spd, Math.sin(angle) * spd - 4,
        5 + Math.random() * 11, PASTEL[i % PASTEL.length], 0.01);
    }
    let delay = 0.15;
    for (const b of this.bubbles) {
      if (!b.popped) { b.popped = true; b.chainDelay = delay; delay += 0.08 + Math.random() * 0.06; }
    }
    if (this.onSurprisePop) this.onSurprisePop();
  }

  _popChain (b) {
    this.sound.playPop();
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4, spd = (100 + Math.random() * 150) * 0.016;
      this.pool.spawn(b.x, b.y, Math.cos(angle) * spd, Math.sin(angle) * spd - 2,
        3 + Math.random() * 8, PASTEL[Math.floor(Math.random() * PASTEL.length)], 0.016);
    }
    this.shockwaves.push({ x: b.x, y: b.y, r: 4, maxR: b.r * 3.5, alpha: 0.4, color: b.color });
    b.popAnim = { t: 0, x: b.x, y: b.y, vy: -90 };
  }
}

/* =====================================================================
   PEEK-A-BOO GAME
   ===================================================================== */
class PeekabooGame {
  constructor (canvas, sound, devTracker) {
    this.canvas = canvas; this.sound = sound; this.devTracker = devTracker;
    this.blocker = null; this.sunShakeT = 0; this.sunScale = 1;
    this.revealed = 0; this.time = 0; this.autoTimer = 0; this.chimePlayed = false;
  }

  init () {
    const types = ['bush', 'blanket', 'cloud'], type = types[Math.floor(Math.random() * types.length)];
    const w = this.canvas.width, h = this.canvas.height;
    this.blocker = { type, cx: w / 2, cy: h * 0.59, bw: w * 0.88, bh: h * 0.62, offsetY: 0, targetY: 0, velY: 0 };
    this.revealed = 0; this.sunShakeT = 0; this.sunScale = 0; this.time = 0; this.autoTimer = 0; this.chimePlayed = false;
    this._tapPulse = 0;
  }

  update (dt) {
    this.time += dt;
    const b = this.blocker;
    b.velY = (b.velY + (b.targetY - b.offsetY) * 0.18) * 0.76; b.offsetY += b.velY;
    const isRevealed = b.offsetY > b.bh * 0.38;
    if (isRevealed) {
      this.revealed = Math.min(this.revealed + dt * 3.5, 1); this.sunScale = 0.5 + this.revealed * 0.5;
      this.autoTimer += dt;
      if (this.autoTimer > 3.2) { b.targetY = 0; this.autoTimer = 0; this.chimePlayed = false; }
    } else {
      this.revealed = Math.max(this.revealed - dt * 5, 0); this.sunScale = 0.5 + this.revealed * 0.5;
    }
    if (this.sunShakeT > 0) this.sunShakeT -= dt;
    // tap-pulse cycle every 2.2s when not revealed
    if (!isRevealed) this._tapPulse = (this._tapPulse + dt / 2.2) % 1;
  }

  draw (ctx) {
    const w = this.canvas.width, h = this.canvas.height, b = this.blocker;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#87CEEB'); sky.addColorStop(0.65, '#b0e0f0'); sky.addColorStop(1, '#98fb98');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7EC850'; ctx.beginPath(); ctx.roundRect(0, h * 0.64, w, h * 0.36, 0); ctx.fill();
    ctx.strokeStyle = '#5a9e30'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const gx = (i / 17) * w, gy = h * 0.64;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + 5, gy - 14, gx + Math.sin(this.time + i) * 8, gy - 20); ctx.stroke();
    }
    if (this.revealed > 0) { ctx.save(); ctx.globalAlpha = this.revealed; this._drawSun(ctx, w / 2, h * 0.33, Math.min(w, h) * 0.22 * this.sunScale); ctx.restore(); }
    else { ctx.save(); ctx.globalAlpha = 0.08; this._drawSun(ctx, w / 2, h * 0.33, Math.min(w, h) * 0.22); ctx.restore(); }
    ctx.save(); ctx.translate(0, b.offsetY); this._drawBlocker(ctx, b); ctx.restore();

    // Tap affordance: pulsing hand above blocker when not yet revealed
    if (this.revealed < 0.2) {
      const pulse = Math.sin(this._tapPulse * Math.PI * 2);
      const handY = b.cy - b.bh / 2 + b.offsetY - 28 + pulse * 10;
      const alpha = 0.55 + pulse * 0.35;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha) * (1 - this.revealed * 5);
      ctx.font = `${Math.round(Math.min(w, h) * 0.085)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('👆', w / 2, handY);
      ctx.restore();
    }
  }

  _drawSun (ctx, cx, cy, r) {
    const shakeX = this.sunShakeT > 0 ? Math.sin(this.time * 18) * 14 * Math.min(this.sunShakeT, 1) : 0;
    ctx.save(); ctx.translate(cx + shakeX, cy);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = Math.max(3, r * 0.08); ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.time * 0.6;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12);
      ctx.lineTo(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6); ctx.stroke();
    }
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    sg.addColorStop(0, '#FFFFAA'); sg.addColorStop(1, '#FFD700');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( r * 0.28, -r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = r * 0.085; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.48, 0.18, Math.PI - 0.18); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,120,0.3)';
    ctx.beginPath(); ctx.ellipse(-r * 0.48, r * 0.18, r * 0.2, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( r * 0.48, r * 0.18, r * 0.2, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawBlocker (ctx, b) {
    const cx = b.cx, cy = b.cy, bw = b.bw, bh = b.bh, x0 = cx - bw / 2, y0 = cy - bh / 2;
    if (b.type === 'bush') {
      const colors = ['#2E7D32','#388E3C','#43A047','#4CAF50','#66BB6A'];
      [[cx,cy,bh*0.43],[cx-bw*0.27,cy+bh*0.06,bh*0.36],[cx+bw*0.27,cy+bh*0.06,bh*0.36],[cx-bw*0.14,cy+bh*0.16,bh*0.3],[cx+bw*0.14,cy+bh*0.16,bh*0.3]].forEach(([cx2,cy2,r],i) => { ctx.fillStyle = colors[i%colors.length]; ctx.beginPath(); ctx.arc(cx2,cy2,r,0,Math.PI*2); ctx.fill(); });
    } else if (b.type === 'blanket') {
      ctx.fillStyle = '#5C6BC0'; ctx.beginPath(); ctx.roundRect(x0, y0, bw, bh, 28); ctx.fill();
      ctx.strokeStyle = '#7986CB'; ctx.lineWidth = 5;
      for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x0+28, y0+(bh/5)*i); ctx.lineTo(x0+bw-28, y0+(bh/5)*i); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#F0F4FF'; ctx.shadowColor = 'rgba(180,200,255,0.5)'; ctx.shadowBlur = 25;
      [[cx,cy,bh*0.4],[cx-bw*0.24,cy+bh*0.08,bh*0.32],[cx+bw*0.24,cy+bh*0.08,bh*0.32],[cx-bw*0.1,cy+bh*0.17,bh*0.34],[cx+bw*0.1,cy+bh*0.17,bh*0.34]].forEach(([cx2,cy2,r]) => { ctx.beginPath(); ctx.arc(cx2,cy2,r,0,Math.PI*2); ctx.fill(); }); ctx.shadowBlur = 0;
    }
  }

  handleTouch (tx, ty) {
    const b = this.blocker, bx = b.cx - b.bw / 2, by = b.cy - b.bh / 2 + b.offsetY;
    if (tx >= bx && tx <= bx + b.bw && ty >= by && ty <= by + b.bh) {
      b.targetY = b.bh * 0.9; b.autoTimer = 0;
      if (!this.chimePlayed) {
        this.chimePlayed = true; this.sunShakeT = 1.2;
        if ('vibrate' in navigator) navigator.vibrate(15);
        [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => this.sound.playTone(f, 0.32), i * 85));
        if (this.devTracker) this.devTracker.recordInteract('peekaboo');
      }
      return true;
    }
    this.sound.playTone(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], 0.25);
    return false;
  }
}

/* =====================================================================
   PAINTING GAME
   ===================================================================== */
class PaintingGame {
  constructor (canvas, sound, pool, devTracker) {
    this.canvas = canvas; this.sound = sound; this.pool = pool; this.devTracker = devTracker;
    this.offscreen = null; this.offCtx = null; this.paths = new Map();
    this.rainbowMode = false; this.rainbowAngle = 0;
  }

  init () {
    this.paths = new Map();
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = this.canvas.width; this.offscreen.height = this.canvas.height;
    this.offCtx = this.offscreen.getContext('2d');
    this.offCtx.fillStyle = '#111827'; this.offCtx.fillRect(0, 0, this.offscreen.width, this.offscreen.height);
    this._drawStarter();
  }

  _drawStarter () {
    const o = this.offCtx, w = this.offscreen.width, h = this.offscreen.height;
    const strokes = [
      { pts: [[w*0.12,h*0.38],[w*0.28,h*0.28],[w*0.42,h*0.42],[w*0.32,h*0.56]], color: '#FF8E53', lw: 18 },
      { pts: [[w*0.55,h*0.22],[w*0.72,h*0.34],[w*0.85,h*0.20],[w*0.78,h*0.42]], color: '#87CEEB', lw: 16 },
      { pts: [[w*0.18,h*0.62],[w*0.36,h*0.70],[w*0.52,h*0.60],[w*0.44,h*0.78]], color: '#DDA0DD', lw: 15 },
      { pts: [[w*0.60,h*0.58],[w*0.78,h*0.50],[w*0.88,h*0.66],[w*0.72,h*0.76]], color: '#BFFFB5', lw: 17 },
    ];
    for (const { pts, color, lw } of strokes) {
      o.save();
      o.strokeStyle = color; o.lineWidth = lw; o.lineCap = 'round'; o.lineJoin = 'round';
      o.shadowBlur = 18; o.shadowColor = color; o.globalAlpha = 0.55;
      o.beginPath(); o.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i+1][0]) / 2, my = (pts[i][1] + pts[i+1][1]) / 2;
        o.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      o.lineTo(pts[pts.length-1][0], pts[pts.length-1][1]);
      o.stroke(); o.restore();
    }
  }

  _freqForY (y) {
    const all = [...PENTATONIC, ...PENTATONIC_HIGH];
    const norm = 1 - Math.max(0, Math.min(1, y / this.canvas.height));
    return all[Math.round(norm * (all.length - 1))];
  }

  _panForX (x) { return (x / this.canvas.width) * 2 - 1; }

  touchStart (tx, ty, id) {
    const color = this.rainbowMode ? `hsl(${this.rainbowAngle}, 90%, 65%)` : PASTEL[Math.floor(Math.random() * PASTEL.length)];
    this.paths.set(id, { pts: [{ x: tx, y: ty }], color, lw: 8 + Math.random() * 6 });
    this.sound.startPaintingTone(id, this._freqForY(ty), this._panForX(tx));
    this._spawnParticles(tx, ty, color);
    if (this.devTracker) this.devTracker.recordInteract('paint');
  }

  touchMove (tx, ty, id) {
    const path = this.paths.get(id); if (!path) return;
    const last = path.pts[path.pts.length - 1];
    if ((tx - last.x) ** 2 + (ty - last.y) ** 2 < 9) return;
    if (this.rainbowMode) { this.rainbowAngle = (this.rainbowAngle + 3) % 360; path.color = `hsl(${this.rainbowAngle}, 90%, 65%)`; }
    path.pts.push({ x: tx, y: ty });
    this.sound.updatePaintingTone(id, this._freqForY(ty), this._panForX(tx));
    this._spawnParticles(tx, ty, path.color);
    const pts = path.pts, len = pts.length;
    if (len < 2) return;
    const o = this.offCtx;
    o.save(); o.strokeStyle = path.color; o.lineWidth = path.lw; o.lineCap = 'round'; o.lineJoin = 'round';
    o.shadowBlur = 14; o.shadowColor = path.color; o.beginPath();
    if (len === 2) { o.moveTo(pts[0].x, pts[0].y); o.lineTo(pts[1].x, pts[1].y); }
    else {
      const p1 = pts[len - 3], p2 = pts[len - 2], p3 = pts[len - 1];
      const mx1 = (p1.x + p2.x) / 2, my1 = (p1.y + p2.y) / 2;
      const mx2 = (p2.x + p3.x) / 2, my2 = (p2.y + p3.y) / 2;
      o.moveTo(mx1, my1); o.quadraticCurveTo(p2.x, p2.y, mx2, my2);
    }
    o.stroke(); o.restore();
  }

  touchEnd (id) { this.sound.stopPaintingTone(id); this.paths.delete(id); }

  _spawnParticles (x, y, color) {
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3;
      this.pool.spawn(x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 12,
        Math.cos(a) * s, Math.sin(a) * s - 0.8, 2 + Math.random() * 4, color, 0.028);
    }
  }

  update (dt) { this.pool.update(); }
  draw (ctx)  { if (this.offscreen) ctx.drawImage(this.offscreen, 0, 0); this.pool.draw(ctx); }
}

/* =====================================================================
   WIND-DOWN
   ===================================================================== */
class WindDown {
  constructor (sound, canvas) {
    this.sound = sound; this.canvas = canvas;
    this.overlay = document.getElementById('windDownOverlay');
    this.startT = null; this.lullabyReady = false;
  }
  start () { this.startT = performance.now() / 1000; this.lullabyReady = false; }
  update () {
    if (!this.startT) return { windFactor: 1, done: false };
    const progress = Math.min((performance.now() / 1000 - this.startT) / WINDDOWN_DURATION, 1);
    if (!this.lullabyReady && progress > 0.04) { this.sound.startLullaby(); this.lullabyReady = true; }
    if (this.lullabyReady) this.sound.setLowPassCutoff(2000 - progress * 1600);
    if (this.overlay) { this.overlay.style.display = 'block'; this.overlay.style.backgroundColor = `rgba(10,5,25,${progress * 0.55})`; }
    this.canvas.style.filter = `saturate(${Math.max(0.05, 1 - progress * 0.92)})`;
    return { windFactor: Math.max(0.25, 1 - progress * 0.75), done: progress >= 1 };
  }
  stop () {
    this.startT = null;
    if (this.overlay) { this.overlay.style.display = 'none'; this.overlay.style.backgroundColor = ''; }
    this.canvas.style.filter = '';
  }
}

/* =====================================================================
   SLEEP STATE
   ===================================================================== */
class SleepState {
  constructor () { this.el = document.getElementById('sleepScreen'); }
  enter () { if (this.el) this.el.style.display = 'flex'; }
  exit ()  { if (this.el) this.el.style.display = 'none'; }
}

/* =====================================================================
   SESSION GUARD
   ===================================================================== */
class SessionGuard {
  constructor () { this.wakeLock = null; this._onBackBound = this._onBack.bind(this); }
  async requestWakeLock () {
    if (!('wakeLock' in navigator)) return;
    try { this.wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
  }
  async requestFullscreen () {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent) || !document.documentElement.requestFullscreen) return;
    try { await document.documentElement.requestFullscreen(); } catch (_) {}
  }
  trapBackButton () {
    history.pushState({ gameActive: true }, '');
    window.removeEventListener('popstate', this._onBackBound);
    window.addEventListener('popstate', this._onBackBound);
  }
  _onBack (e) {
    if (e.state && e.state.gameActive) { history.pushState({ gameActive: true }, ''); const g = document.getElementById('gearBtn'); if (g) g.click(); }
  }
  async activate () { await this.requestWakeLock(); await this.requestFullscreen(); this.trapBackButton(); }
  deactivate () {
    if (this.wakeLock) { this.wakeLock.release().catch(() => {}); this.wakeLock = null; }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    window.removeEventListener('popstate', this._onBackBound);
  }
}

/* =====================================================================
   SPLASH SCREEN
   ===================================================================== */
class SplashScreen {
  constructor () { this.el = document.getElementById('splashScreen'); }
  show (onDone) {
    setTimeout(() => {
      if (this.el) this.el.classList.add('fade-out');
      setTimeout(() => { if (this.el) this.el.style.display = 'none'; onDone(); }, 700);
    }, 1900);
  }
}

/* =====================================================================
   PIN SYSTEM
   ===================================================================== */
class PINSystem {
  constructor (app) {
    this.app = app; this.sequence = [];
    this.modal = document.getElementById('pinModal');
    this.pinInput = document.getElementById('pinInput');
    this.pinError = document.getElementById('pinError');
    this.pinPrompt = document.getElementById('pinPrompt');
    this.configPanel = document.getElementById('configPanel');
    this.sessionStats = document.getElementById('sessionStats');
    this.sessionDuration = this._loadDuration();
    this._bind();
  }

  _loadDuration () {
    try { const c = JSON.parse(localStorage.getItem('toddlerGame_config') || '{}'); return [300,600,900].includes(c.sessionDuration) ? c.sessionDuration : 600; } catch (_) { return 600; }
  }
  _saveDuration (d) { try { localStorage.setItem('toddlerGame_config', JSON.stringify({ sessionDuration: d })); } catch (_) {} }
  _getSessionCount ()  { try { return parseInt(localStorage.getItem('gnGilui_sessions') || '0', 10); } catch (_) { return 0; } }
  _incrSessionCount () { try { localStorage.setItem('gnGilui_sessions', String(this._getSessionCount() + 1)); } catch (_) {} }

  _bind () {
    const gear = document.getElementById('gearBtn');
    gear.addEventListener('click',    () => this.show());
    gear.addEventListener('touchend', e => { e.preventDefault(); this.show(); }, { passive: false });

    document.querySelectorAll('.pin-btn').forEach(btn => {
      const d = parseInt(btn.dataset.digit, 10);
      const onTap = () => { if (d === -1) { this.sequence.pop(); this._updateDots(); } else if (d === -2) { this.sequence = []; this._updateDots(); } else this._digit(d); };
      btn.addEventListener('click', onTap);
      btn.addEventListener('touchend', e => { e.preventDefault(); onTap(); }, { passive: false });
    });

    document.querySelectorAll('.duration-btn').forEach(btn => {
      const onSel = () => {
        this.sessionDuration = parseInt(btn.dataset.duration, 10); this._saveDuration(this.sessionDuration);
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
      };
      btn.addEventListener('click', onSel);
      btn.addEventListener('touchend', e => { e.preventDefault(); onSel(); }, { passive: false });
    });

    this._bindBtn('startGameBtn',      () => { this.hide(); this.app.startGame(this.sessionDuration); });
    this._bindBtn('resetBtn',          () => { this.hide(); this.app.resetGame(); });
    this._bindBtn('closeModalBtn',     () => this.hide());
    this._bindBtn('viewReportBtn',     () => { this.hide(); this.app.showReport(); });
    this._bindBtn('accessibilityBtn',  () => { const m = document.getElementById('accessibilityModal'); if (m) m.style.display = 'flex'; });
    this._bindBtn('closeA11yBtn',      () => { const m = document.getElementById('accessibilityModal'); if (m) m.style.display = 'none'; });
    this._bindBtn('homePromptDismiss', () => {
      const p = document.getElementById('homeScreenPrompt'); if (p) p.style.display = 'none';
      try { localStorage.setItem('gnGilui_hsPrompt', '1'); } catch (_) {}
    });
  }

  _bindBtn (id, fn) {
    const btn = document.getElementById(id); if (!btn) return;
    btn.addEventListener('click', fn);
    btn.addEventListener('touchend', e => { e.preventDefault(); fn(); }, { passive: false });
  }

  _digit (d) {
    if (this.sequence.length >= PIN_DIGITS.length) return;
    this.sequence.push(d); this._updateDots();
    if (this.sequence.length === PIN_DIGITS.length) {
      setTimeout(() => { if (this.sequence.every((v, i) => v === PIN_DIGITS[i])) this._success(); else this._fail(); }, 120);
    }
  }

  _updateDots () {
    if (!this.pinInput) return;
    const filled = '● '.repeat(this.sequence.length);
    const empty  = '○ '.repeat(PIN_DIGITS.length - this.sequence.length);
    this.pinInput.textContent = (filled + empty).trim();
  }

  _success () {
    this.sequence = []; this._updateDots();
    if (this.pinError)   this.pinError.textContent = '';
    if (this.pinPrompt)  this.pinPrompt.style.display = 'none';
    if (this.configPanel) this.configPanel.style.display = 'block';
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.duration, 10) === this.sessionDuration));
    const count = this._getSessionCount();
    if (this.sessionStats) {
      this.sessionStats.innerHTML = count > 0
        ? `<span lang="he">סה״כ משחקים: <strong>${count}</strong></span>`
        : '<span lang="he">ברוך הבא לגן הגילוי! 🌟</span>';
    }
    const viewBtn = document.getElementById('viewReportBtn');
    if (viewBtn) viewBtn.style.display = this.app.devTracker.hasData() ? 'block' : 'none';
  }

  _fail () {
    this.sequence = []; this._updateDots();
    if (this.pinError) this.pinError.textContent = 'קוד שגוי — נסה שוב';
    const mc = this.modal ? this.modal.querySelector('.modal-content') : null;
    if (mc) { mc.classList.remove('shake'); void mc.offsetWidth; mc.classList.add('shake'); }
  }

  show () {
    this.sequence = [];
    if (this.pinError)    this.pinError.textContent = '';
    if (this.pinPrompt)   this.pinPrompt.style.display = 'block';
    if (this.configPanel) this.configPanel.style.display = 'none';
    if (this.modal) { this.modal.style.display = 'flex'; this.modal.classList.add('visible'); }
    this._updateDots();
  }

  hide () { if (this.modal) { this.modal.style.display = 'none'; this.modal.classList.remove('visible'); } }
  incrementSessionCount () { this._incrSessionCount(); }
}

/* =====================================================================
   MAIN APP
   ===================================================================== */
class App {
  constructor () {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');

    this.state = STATE.SPLASH; this.subState = SUB.POPPING; this.lastTime = 0;
    this.sessionDuration = 600; this.sessionStart = null; this.subStart = null;
    this.subDuration = 0; this.windFactor = 1;
    this.transitioning = false; this.transAlpha = 0; this.transDir = 1;
    this.nextSub = null; this.valueCardShown = false;
    this.interactionCount = 0; this.paintingSessionCount = 0; this._mouseDown = false;
    this.paused      = false;
    this._hudBounds  = { cx: 0, cy: 0, r: 0 };

    this.devTracker   = new DevTracker();
    this.sound        = new SoundEngine();
    this.pool         = new ParticlePool(350);
    this.fireworks    = new FireworksSystem();
    this.bubble       = new BubbleGame(this.canvas, this.sound, this.pool, this.devTracker);
    this.peekaboo     = new PeekabooGame(this.canvas, this.sound, this.devTracker);
    this.painting     = new PaintingGame(this.canvas, this.sound, this.pool, this.devTracker);
    this.windDown     = new WindDown(this.sound, this.canvas);
    this.sleep        = new SleepState();
    this.pin          = new PINSystem(this);
    this.sessionGuard = new SessionGuard();
    this.splash       = new SplashScreen();
    this.parentReport = new ParentReport();

    this.bubble.onSurprisePop = () => this._celebrate(true);

    this._resize(); this._bindEvents();
    this.loop = this._loop.bind(this);
  }

  init () {
    this.splash.show(() => { this.state = STATE.LOCKED_PIN; this.pin.show(); });
    requestAnimationFrame(this.loop);
  }

  startGame (duration) {
    this.sessionDuration = duration;
    const now = performance.now() / 1000;
    this.sessionStart = now; this.subStart = now;
    this.subDuration  = SUB_MIN + Math.random() * (SUB_MAX - SUB_MIN);
    this.subState     = SUB.POPPING; this.windFactor = 1;
    this.transitioning = false; this.transAlpha = 0; this.interactionCount = 0;

    this.paused = false;
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    this.pool.releaseAll(); this.sleep.exit(); this.windDown.stop();
    this.sound.stopLullaby(); if (this.sound.ctx) this.sound.setMasterVolume(0.4);

    this.paintingSessionCount = 0; this.painting.rainbowMode = false;

    this.bubble.init(); this.peekaboo.init(); this.painting.init();
    this.devTracker.startSession();
    this.state = STATE.GAME_PLAY;
    this.pin.incrementSessionCount();
    this.sessionGuard.activate();
  }

  resetGame () {
    this.state = STATE.LOCKED_PIN;
    this.sound.stopLullaby(); this.sound.stopAllPaintingTones(); this.windDown.stop();
    this.sleep.exit(); this.sessionGuard.deactivate();
    if (this.sound.ctx) { this.sound.fadeOut(0.4); setTimeout(() => { if (this.sound.ctx) this.sound.setMasterVolume(0.4); }, 600); }
    this.pin.show();
  }

  showReport () {
    if (!this.devTracker.hasData()) return;
    this.parentReport.show(this.devTracker.computeReport(), () => this.pin.show());
  }

  _resize () { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }

  _reinit () {
    if (this.state !== STATE.GAME_PLAY) return;
    if (this.subState === SUB.POPPING)  this.bubble.init();
    if (this.subState === SUB.PEEKABOO) this.peekaboo.init();
    if (this.subState === SUB.PAINTING) this.painting.init();
  }

  _bindEvents () {
    window.addEventListener('resize', () => { this._resize(); this._reinit(); });
    const cvs = this.canvas;
    cvs.addEventListener('touchstart',  this._onTouch.bind(this), { passive: false });
    cvs.addEventListener('touchmove',   this._onTouch.bind(this), { passive: false });
    cvs.addEventListener('touchend',    this._onTouch.bind(this), { passive: false });
    cvs.addEventListener('touchcancel', this._onTouch.bind(this), { passive: false });
    cvs.addEventListener('mousedown',   this._onMouse.bind(this));
    cvs.addEventListener('mousemove',   this._onMouse.bind(this));
    cvs.addEventListener('mouseup',     this._onMouse.bind(this));
    window.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart',  e => e.preventDefault());
    document.addEventListener('gesturechange', e => e.preventDefault());
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') { this.sound.resume(); await this.sessionGuard.requestWakeLock(); }
    });
    const initAudio = () => { this.sound.init(); this.sound.resume(); };
    document.addEventListener('touchstart', initAudio, { once: true, passive: true });
    document.addEventListener('mousedown',  initAudio, { once: true });
    this._checkIOSPrompt();
  }

  _checkIOSPrompt () {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true;
    let dismissed = false;
    try { dismissed = !!localStorage.getItem('gnGilui_hsPrompt'); } catch (_) {}
    if (isIOS && !isStandalone && !dismissed) {
      setTimeout(() => {
        if (this.state !== STATE.LOCKED_PIN) return;
        const p = document.getElementById('homeScreenPrompt');
        if (p) p.style.display = 'block';
      }, 5000);
    }
  }

  _hitHUD (x, y) {
    const h = this._hudBounds;
    if (!h.r) return false;
    return (x - h.cx) ** 2 + (y - h.cy) ** 2 <= h.r ** 2;
  }

  _togglePause () {
    this.paused = !this.paused;
    const overlay = document.getElementById('pauseOverlay');
    if (overlay) overlay.style.display = this.paused ? 'flex' : 'none';
    if (this.paused) this.sound.stopAllPaintingTones();
  }

  _onTouch (e) {
    e.preventDefault();
    if (this.state !== STATE.GAME_PLAY) return;
    if (e.type === 'touchstart') {
      const t = e.changedTouches[0];
      if (this._hitHUD(t.clientX, t.clientY)) { this._togglePause(); return; }
    }
    if (this.paused || this.transitioning) return;
    for (const touch of e.changedTouches) {
      const { clientX: x, clientY: y, identifier: id } = touch;
      if (e.type === 'touchstart')       this._interact('start', x, y, id);
      else if (e.type === 'touchmove')   this._interact('move',  x, y, id);
      else                               this._interact('end',   x, y, id);
    }
  }

  _onMouse (e) {
    if (this.state !== STATE.GAME_PLAY) return;
    const { clientX: x, clientY: y } = e, id = 9999;
    if (e.type === 'mousedown' && this._hitHUD(x, y)) { this._togglePause(); return; }
    if (this.paused || this.transitioning) return;
    if (e.type === 'mousedown')             { this._mouseDown = true;  this._interact('start', x, y, id); }
    else if (e.type === 'mousemove' && this._mouseDown) { this._interact('move', x, y, id); }
    else if (e.type === 'mouseup')          { this._mouseDown = false; this._interact('end',   x, y, id); }
  }

  _interact (type, x, y, id) {
    let hit = false;
    if (this.subState === SUB.POPPING) {
      if (type === 'start') hit = this.bubble.handleTouch(x, y);
    } else if (this.subState === SUB.PEEKABOO) {
      if (type === 'start' || type === 'move') hit = this.peekaboo.handleTouch(x, y);
    } else if (this.subState === SUB.PAINTING) {
      if (type === 'start') { this.painting.touchStart(x, y, id); hit = true; }
      else if (type === 'move') { this.painting.touchMove(x, y, id); hit = true; }
      else if (type === 'end')  { this.painting.touchEnd(id); }
    }
    if (hit && type === 'start') {
      this.interactionCount++;
      if (this.interactionCount % INTERACTION_MILESTONE === 0) this._celebrate(false);
    }
  }

  _celebrate (isSurprise) {
    this.sound.playCelebration();
    this.fireworks.launch(this.canvas.width, this.canvas.height);
    if (isSurprise) {
      // Extra burst for surprise
      setTimeout(() => this.fireworks.launch(this.canvas.width, this.canvas.height), 400);
      setTimeout(() => this.fireworks.launch(this.canvas.width, this.canvas.height), 900);
    }
  }

  _showValueCard (sub) {
    const vc = VALUE_CARDS[sub]; if (!vc) return;
    const el = document.getElementById('valueCard'); if (!el) return;
    el.querySelector('.value-icon').textContent = vc.icon;
    el.querySelector('.value-he').textContent   = vc.he;
    el.querySelector('.value-en').textContent   = vc.en;
    el.classList.remove('visible'); void el.offsetWidth; el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2100);
  }

  _pickNextSub () {
    const all = [SUB.POPPING, SUB.PEEKABOO, SUB.PAINTING];
    return all.filter(s => s !== this.subState)[Math.floor(Math.random() * 2)];
  }

  _beginTransition (next) {
    if (this.transitioning) return;
    this.transitioning = true; this.transAlpha = 0; this.transDir = 1;
    this.nextSub = next; this.valueCardShown = false;
    this.sound.stopAllPaintingTones(); this.pool.releaseAll();
  }

  _enterSleep () {
    this.state = STATE.SLEEP; this.sound.fadeOut(2.5); this.sessionGuard.deactivate();
    let alpha = 0;
    const fadeStep = () => {
      if (alpha < 1) {
        alpha += 0.018;
        this.ctx.fillStyle = `rgba(0,0,0,${Math.min(alpha, 1)})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        requestAnimationFrame(fadeStep);
      } else { this.windDown.stop(); this.sleep.enter(); }
    };
    fadeStep();
  }

  _drawSideMargins (ctx, now) {
    const w = this.canvas.width, h = this.canvas.height, mw = 22;

    const lg = ctx.createLinearGradient(0, 0, mw, 0);
    lg.addColorStop(0, 'rgba(80,40,180,0.22)'); lg.addColorStop(1, 'rgba(80,40,180,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, mw, h);

    const rg = ctx.createLinearGradient(w, 0, w - mw, 0);
    rg.addColorStop(0, 'rgba(80,40,180,0.22)'); rg.addColorStop(1, 'rgba(80,40,180,0)');
    ctx.fillStyle = rg; ctx.fillRect(w - mw, 0, mw, h);

    // Left: pop-progress dots
    const filled = Math.min(Math.floor(this.devTracker.pops / 3), 14);
    for (let i = 0; i < 14; i++) {
      const dy = h * 0.12 + (i / 13) * h * 0.76, isFilled = i < filled;
      ctx.save(); ctx.globalAlpha = isFilled ? 0.55 : 0.12;
      ctx.fillStyle = isFilled ? '#a78bfa' : 'rgba(255,255,255,0.3)';
      if (isFilled) { ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 6; }
      ctx.beginPath(); ctx.arc(8, dy, isFilled ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    // Right: session time progress bar
    if (this.sessionStart) {
      const elapsed = now - this.sessionStart, progress = Math.min(elapsed / this.sessionDuration, 1);
      const barH = h * 0.76 * progress, barY = h * 0.12 + h * 0.76 - barH;
      ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#7dd3fc';
      ctx.beginPath(); ctx.roundRect(w - 5, barY, 4, barH, 2); ctx.fill();
      if (progress > 0.01) {
        ctx.globalAlpha = 0.35; ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(w - 3, barY, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawHeader (ctx) {
    const w = this.canvas.width;
    const grad = ctx.createLinearGradient(0, 0, 0, 52);
    grad.addColorStop(0, 'rgba(8, 4, 28, 0.82)');
    grad.addColorStop(1, 'rgba(8, 4, 28, 0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, 52);
    // Decorative dots row
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const dx = w * 0.5 + (i - 3) * w * 0.06;
      const pulse = 0.08 + 0.06 * Math.abs(Math.sin(this.lastTime * 1.4 + i * 0.8));
      ctx.globalAlpha = pulse;
      ctx.fillStyle = PASTEL[(i * 3) % PASTEL.length];
      ctx.beginPath(); ctx.arc(dx, 10, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _drawFooter (ctx) {
    const w = this.canvas.width, h = this.canvas.height;
    const fh = 44;
    const grad = ctx.createLinearGradient(0, h - fh, 0, h);
    grad.addColorStop(0, 'rgba(8, 4, 28, 0)');
    grad.addColorStop(1, 'rgba(8, 4, 28, 0.78)');
    ctx.fillStyle = grad; ctx.fillRect(0, h - fh, w, fh);
    // Matching decorative dots
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const dx = w * 0.5 + (i - 3) * w * 0.06;
      const pulse = 0.08 + 0.06 * Math.abs(Math.sin(this.lastTime * 1.4 + i * 0.8 + Math.PI));
      ctx.globalAlpha = pulse;
      ctx.fillStyle = PASTEL[(i * 3 + 2) % PASTEL.length];
      ctx.beginPath(); ctx.arc(dx, h - 10, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _drawHUD (ctx, now) {
    const w = this.canvas.width;
    const cx = w - 48, cy = 52, r = 36;
    this._hudBounds = { cx, cy, r };

    ctx.save();
    // Background circle
    ctx.fillStyle   = 'rgba(0, 0, 0, 0.58)';
    ctx.strokeStyle = this.paused ? 'rgba(255,200,0,0.85)' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth   = 2;
    ctx.shadowColor = this.paused ? 'rgba(255,200,0,0.4)' : 'rgba(100,80,200,0.4)';
    ctx.shadowBlur  = 12;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur  = 0;

    // Session time arc
    if (this.sessionStart) {
      const progress = Math.min((now - this.sessionStart) / this.sessionDuration, 1);
      const arcColor = progress > 0.85 ? '#FF6B6B' : progress > 0.6 ? '#FFC947' : '#a78bfa';
      ctx.strokeStyle = arcColor; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, r - 5, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      // Countdown timer
      const remaining = Math.max(0, this.sessionDuration - (now - this.sessionStart));
      const mins = Math.floor(remaining / 60), secs = Math.floor(remaining % 60);
      ctx.fillStyle = this.paused ? '#FFD700' : '#fff';
      ctx.font = `bold ${Math.round(r * 0.38)}px -apple-system, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, cx, cy - 5);
    }

    // Pop count
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${Math.round(r * 0.28)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${this.devTracker.pops}`, cx, cy + r * 0.38);

    // Pause/play indicator icon
    ctx.fillStyle = this.paused ? '#FFD700' : 'rgba(255,255,255,0.35)';
    ctx.font = `${Math.round(r * 0.38)}px sans-serif`;
    ctx.fillText(this.paused ? '▶' : '⏸', cx + r * 0.62, cy + r * 0.55);

    ctx.restore();
  }

  _loop (timestamp) {
    requestAnimationFrame(this.loop);
    const now = timestamp / 1000, dt = Math.min(now - this.lastTime, 0.05);
    this.lastTime = now;

    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;

    if (this.state === STATE.SPLASH || this.state === STATE.LOCKED_PIN) {
      ctx.fillStyle = '#0a0818'; ctx.fillRect(0, 0, w, h); return;
    }
    if (this.state === STATE.SLEEP) return;

    const elapsed = now - (this.sessionStart || now);

    if (this.state === STATE.GAME_PLAY && elapsed >= this.sessionDuration) {
      this.state = STATE.WIND_DOWN; this.windDown.start();
    }
    if (this.state === STATE.GAME_PLAY && !this.transitioning) {
      if (now - this.subStart >= this.subDuration) this._beginTransition(this._pickNextSub());
    }
    if (this.state === STATE.WIND_DOWN) {
      const { windFactor, done } = this.windDown.update();
      this.windFactor = windFactor; if (done) { this._enterSleep(); return; }
    }

    if (!this.transitioning && !this.paused) {
      if (this.subState === SUB.POPPING)  this.bubble.update(dt, this.windFactor);
      if (this.subState === SUB.PEEKABOO) this.peekaboo.update(dt);
      if (this.subState === SUB.PAINTING) this.painting.update(dt);
    }

    if (this.subState === SUB.POPPING)  this.bubble.draw(ctx);
    if (this.subState === SUB.PEEKABOO) this.peekaboo.draw(ctx);
    if (this.subState === SUB.PAINTING) this.painting.draw(ctx);

    // Persistent header + footer on all game states
    this._drawHeader(ctx);
    this._drawFooter(ctx);

    if (this.state === STATE.GAME_PLAY || this.state === STATE.WIND_DOWN) {
      this._drawSideMargins(ctx, now);
    }

    // Fireworks (canvas-only, no DOM text)
    if (!this.paused) this.fireworks.update(dt, this.pool);
    this.fireworks.draw(ctx);

    if (this.transitioning) {
      this.transAlpha += this.transDir * 0.055;
      if (this.transDir === 1 && this.transAlpha >= 1) {
        this.transAlpha = 1;
        if (!this.valueCardShown) {
          this.valueCardShown = true;
          this.subState    = this.nextSub;
          this.subStart    = now;
          this.subDuration = SUB_MIN + Math.random() * (SUB_MAX - SUB_MIN);
          if (this.subState === SUB.POPPING)  this.bubble.init();
          if (this.subState === SUB.PEEKABOO) this.peekaboo.init();
          if (this.subState === SUB.PAINTING) {
            this.paintingSessionCount++;
            this.painting.rainbowMode = (this.paintingSessionCount % 3 === 0);
            this.painting.init();
          }
          this._showValueCard(this.subState);
          this.transDir = -1;
        }
      } else if (this.transDir === -1 && this.transAlpha <= 0) {
        this.transAlpha = 0; this.transitioning = false;
      }
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, this.transAlpha))})`;
      ctx.fillRect(0, 0, w, h);
    }

    // HUD always on top during gameplay
    if (this.state === STATE.GAME_PLAY || this.state === STATE.WIND_DOWN) {
      this._drawHUD(ctx, now);
    }
  }
}

/* =====================================================================
   ENTRY POINT
   ===================================================================== */
window.addEventListener('DOMContentLoaded', () => { const app = new App(); app.init(); });

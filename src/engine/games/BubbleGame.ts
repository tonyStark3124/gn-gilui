import { PASTEL, SURPRISE_POP_MIN, SURPRISE_POP_MAX } from '@/engine/constants';
import { drawAnimal, type AnimalType } from '@/engine/drawing/animals';
import type { SoundEngine } from '@/engine/systems/SoundEngine';
import type { ParticlePool } from '@/engine/systems/ParticlePool';
import type { DevTracker } from '@/engine/systems/DevTracker';

const ANIMALS: AnimalType[] = ['duck', 'cat', 'frog', 'rabbit', 'star'];

interface Bubble {
  x: number; y: number; r: number;
  vx: number; vy: number; phase: number; speed: number;
  animal: AnimalType; color: string;
  eyeOpen: boolean; eyeTimer: number;
  alpha: number; fadeIn: boolean; chainDelay: number;
}

interface Shockwave { x: number; y: number; r: number; maxR: number; alpha: number; color: string; }
interface Sparkle { x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number; phase: number; }
interface SurpriseBubble {
  x: number; y: number; r: number; targetR: number; targetY: number;
  rainbowAngle: number; orbAngle: number; alpha: number; phase: 'grow' | 'float' | 'gone';
}

export class BubbleGame {
  onSurprisePop: (() => void) | null = null;

  private canvas: HTMLCanvasElement;
  private sound: SoundEngine;
  private pool: ParticlePool;
  private tracker: DevTracker;

  private bubbles: Bubble[] = [];
  private shockwaves: Shockwave[] = [];
  private sparkles: Sparkle[] = [];
  private surprise: SurpriseBubble | null = null;
  private popCount = 0;
  private nextSurprise = 0;
  private ripples: Array<{ x: number; y: number; r: number; alpha: number }> = [];

  constructor(canvas: HTMLCanvasElement, sound: SoundEngine, pool: ParticlePool, tracker: DevTracker) {
    this.canvas = canvas;
    this.sound = sound;
    this.pool = pool;
    this.tracker = tracker;
  }

  init(): void {
    this.pool.releaseAll();
    this.bubbles = [];
    this.shockwaves = [];
    this.ripples = [];
    this.surprise = null;
    this.popCount = 0;
    this.nextSurprise = SURPRISE_POP_MIN + Math.floor(Math.random() * (SURPRISE_POP_MAX - SURPRISE_POP_MIN + 1));
    this._initSparkles();
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) this.bubbles.push(this._make());
  }

  private _initSparkles(): void {
    this.sparkles = Array.from({ length: 22 }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1 + Math.random() * 2,
      color: PASTEL[Math.floor(Math.random() * PASTEL.length)]!,
      alpha: Math.random(),
      phase: Math.random() * Math.PI * 2,
    }));
  }

  private _make(): Bubble {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const r = 28 + Math.random() * 32;
    return {
      x: r + Math.random() * (w - r * 2),
      y: h + r + Math.random() * 60,
      r,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(0.6 + Math.random() * 0.8),
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5,
      animal: ANIMALS[Math.floor(Math.random() * ANIMALS.length)]!,
      color: PASTEL[Math.floor(Math.random() * PASTEL.length)]!,
      eyeOpen: true,
      eyeTimer: 2000 + Math.random() * 3000,
      alpha: 0,
      fadeIn: true,
      chainDelay: 0,
    };
  }

  update(dt: number, windFactor: number, now: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const s of this.sparkles) {
      s.x += s.vx; s.y += s.vy;
      s.alpha = 0.3 + 0.7 * Math.abs(Math.sin(now / 1000 + s.phase));
      if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
      if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
    }

    for (const b of this.bubbles) {
      if (b.chainDelay > 0) { b.chainDelay -= dt; continue; }
      if (b.fadeIn) {
        b.alpha = Math.min(1, b.alpha + 0.04);
        if (b.alpha >= 1) b.fadeIn = false;
      }
      const distFromBottom = h - b.y;
      if (distFromBottom > 120) b.alpha = 1;
      else b.alpha = Math.max(0.1, distFromBottom / 120);
      b.x += b.vx + Math.sin(now / 1800 + b.phase) * 0.5 * windFactor;
      b.y += b.vy * windFactor;
      b.eyeTimer -= dt;
      if (b.eyeTimer <= 0) {
        b.eyeOpen = !b.eyeOpen;
        b.eyeTimer = b.eyeOpen ? 2000 + Math.random() * 3000 : 150 + Math.random() * 100;
      }
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > w - b.r) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
    }

    const gone = this.bubbles.filter(b => b.y < -b.r * 2);
    gone.forEach(b => {
      const idx = this.bubbles.indexOf(b);
      if (idx >= 0) this.bubbles[idx] = this._make();
    });

    if (this.surprise) {
      const s = this.surprise;
      if (s.phase === 'grow') {
        s.r = Math.min(s.targetR, s.r + 1.2);
        s.y = Math.max(s.targetY, s.y - 1.5);
        if (s.r >= s.targetR && s.y <= s.targetY) s.phase = 'float';
      } else if (s.phase === 'float') {
        s.x += Math.sin(now / 1200) * 0.8;
        s.y += Math.sin(now / 900) * 0.4;
        s.rainbowAngle = (s.rainbowAngle + 1.5) % 360;
        s.orbAngle += 0.025;
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i]!;
      sw.r += 4; sw.alpha -= 0.03;
      if (sw.alpha <= 0) this.shockwaves.splice(i, 1);
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i]!;
      rp.r += 3; rp.alpha -= 0.05;
      if (rp.alpha <= 0) this.ripples.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark gradient bg
    const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
    bg.addColorStop(0, '#1e1b4b');
    bg.addColorStop(1, '#0a0818');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Background stars (IS 5568 compliant: max 2.35 Hz)
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137.5) % w);
      const sy = ((i * 97.3) % (h * 0.7));
      const blink = 0.4 + 0.6 * Math.abs(Math.sin(now / 1000 * (0.4 + i * 0.05)));
      ctx.save();
      ctx.globalAlpha = blink * 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Ambient sparkles
    for (const s of this.sparkles) {
      ctx.save();
      ctx.globalAlpha = s.alpha * 0.6;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Soap pool at bottom
    this._drawPool(ctx, w, h, now);

    // Shockwaves
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = sw.alpha * 0.5;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Miss ripples
    for (const rp of this.ripples) {
      ctx.save();
      ctx.globalAlpha = rp.alpha * 0.4;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Regular bubbles
    for (const b of this.bubbles) {
      if (b.chainDelay > 0) continue;
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      const shellGrad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 0, b.x, b.y, b.r);
      shellGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
      shellGrad.addColorStop(0.6, 'rgba(255,255,255,0.04)');
      shellGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shellGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      drawAnimal(ctx, b.animal, b.x, b.y, b.r * 0.72, b.eyeOpen);
      ctx.restore();
    }

    // Surprise bubble
    if (this.surprise && this.surprise.phase !== 'gone') {
      this._drawSurprise(ctx, this.surprise, now);
    }

    // Particles
    this.pool.draw(ctx);
  }

  private _drawPool(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
    const poolY = h - 14;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.ellipse(w / 2, poolY, w * 0.45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 14; i++) {
      const bx = w * 0.1 + (w * 0.8 * i) / 13;
      const phase = i * 0.8;
      const by = poolY - 8 - Math.sin(now / 800 + phase) * 4;
      const br = 3 + (i % 3);
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now / 600 + phase);
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private _drawSurprise(ctx: CanvasRenderingContext2D, s: SurpriseBubble, now: number): void {
    const hueGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    const h1 = s.rainbowAngle;
    hueGrad.addColorStop(0, `hsla(${h1},100%,80%,0.25)`);
    hueGrad.addColorStop(0.6, `hsla(${(h1 + 120) % 360},100%,70%,0.12)`);
    hueGrad.addColorStop(1, `hsla(${(h1 + 240) % 360},100%,60%,0.05)`);
    ctx.save();
    ctx.shadowColor = `hsl(${h1},100%,75%)`;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = hueGrad;
    ctx.fill();
    ctx.strokeStyle = `hsl(${h1},100%,80%)`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // "!" label
    ctx.fillStyle = `hsl(${(h1 + 180) % 360},100%,90%)`;
    ctx.font = `bold ${Math.round(s.r * 0.8)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', s.x, s.y);

    // Orbiting sparkles
    for (let i = 0; i < 6; i++) {
      const angle = s.orbAngle + (i / 6) * Math.PI * 2;
      const ox = s.x + Math.cos(angle) * (s.r + 14);
      const oy = s.y + Math.sin(angle) * (s.r + 14);
      const hue = (s.rainbowAngle + i * 60) % 360;
      ctx.fillStyle = `hsl(${hue},100%,80%)`;
      ctx.beginPath();
      ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  handleTouch(tx: number, ty: number): boolean {
    if (this.surprise && this.surprise.phase === 'float') {
      const s = this.surprise;
      const dx = tx - s.x; const dy = ty - s.y;
      if (dx * dx + dy * dy <= s.r * s.r) {
        this._popSurprise(s);
        return true;
      }
    }

    for (const b of this.bubbles) {
      if (b.chainDelay > 0) continue;
      const dx = tx - b.x; const dy = ty - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) {
        this._pop(b);
        return true;
      }
    }

    // Miss
    this.tracker.recordInteract('miss');
    this.ripples.push({ x: tx, y: ty, r: 8, alpha: 0.8 });
    return false;
  }

  private _pop(b: Bubble): void {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.pool.spawn(b.x, b.y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1,
        3 + Math.random() * 4, PASTEL[i % PASTEL.length]!, 0.02);
    }
    this.shockwaves.push({ x: b.x, y: b.y, r: b.r, maxR: b.r * 2.5, alpha: 0.8, color: b.color });
    this.sound.playPop();
    this.sound.playAnimalSound(b.animal);
    if ('vibrate' in navigator) navigator.vibrate(28);
    this.tracker.recordInteract('pop');
    this.popCount++;

    const idx = this.bubbles.indexOf(b);
    if (idx >= 0) this.bubbles[idx] = this._make();

    if (this.popCount >= this.nextSurprise && !this.surprise) this._triggerSurprise();
  }

  private _triggerSurprise(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.surprise = {
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h + 60,
      r: 20,
      targetR: 55 + Math.random() * 20,
      targetY: h * 0.25 + Math.random() * h * 0.25,
      rainbowAngle: 0,
      orbAngle: 0,
      alpha: 1,
      phase: 'grow',
    };
    this.sound.playSurpriseRise();
  }

  private _popSurprise(s: SurpriseBubble): void {
    s.phase = 'gone';
    this.surprise = null;
    this.sound.playSurpriseExplosion();
    if ('vibrate' in navigator) navigator.vibrate([60, 40, 90, 40, 130]);
    this.shockwaves.push({ x: s.x, y: s.y, r: s.r, maxR: s.r * 4, alpha: 1.0, color: '#ffe970' });
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      this.pool.spawn(s.x, s.y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2,
        3 + Math.random() * 5, PASTEL[i % PASTEL.length]!, 0.014);
    }
    this.bubbles.forEach((b, i) => { b.chainDelay = 150 + i * 120; });
    setTimeout(() => {
      this.bubbles.forEach((b, i) => {
        setTimeout(() => this._popChain(b), i * 120);
      });
    }, 200);
    this.tracker.recordInteract('surprise');
    this.nextSurprise = this.popCount + SURPRISE_POP_MIN +
      Math.floor(Math.random() * (SURPRISE_POP_MAX - SURPRISE_POP_MIN + 1));
    this.onSurprisePop?.();
  }

  private _popChain(b: Bubble): void {
    b.chainDelay = 0;
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.pool.spawn(b.x, b.y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        2 + Math.random() * 3, PASTEL[i % PASTEL.length]!, 0.022);
    }
    this.shockwaves.push({ x: b.x, y: b.y, r: b.r * 0.5, maxR: b.r * 2, alpha: 0.6, color: b.color });
    this.sound.playPop();
    const idx = this.bubbles.indexOf(b);
    if (idx >= 0) this.bubbles[idx] = this._make();
  }

  getPopCount(): number { return this.popCount; }
}

import { PENTATONIC } from '@/engine/constants';
import type { SoundEngine } from '@/engine/systems/SoundEngine';
import type { ParticlePool } from '@/engine/systems/ParticlePool';
import type { DevTracker } from '@/engine/systems/DevTracker';

export class PaintingGame {
  private canvas: HTMLCanvasElement;
  private sound: SoundEngine;
  private pool: ParticlePool;
  private tracker: DevTracker;

  private offscreen: HTMLCanvasElement | null = null;
  private offCtx: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  private hue = 0;
  private rainbowMode = false;
  private strokeCount = 0;
  private trailPoints: Array<{ x: number; y: number }> = [];

  constructor(canvas: HTMLCanvasElement, sound: SoundEngine, pool: ParticlePool, tracker: DevTracker) {
    this.canvas = canvas;
    this.sound = sound;
    this.pool = pool;
    this.tracker = tracker;
  }

  init(rainbowMode = false): void {
    this.rainbowMode = rainbowMode;
    this.drawing = false;
    this.strokeCount = 0;
    this.hue = Math.random() * 360;
    this.trailPoints = [];
    if (!this.offscreen || this.offscreen.width !== this.canvas.width || this.offscreen.height !== this.canvas.height) {
      this.offscreen = document.createElement('canvas');
      this.offscreen.width = this.canvas.width;
      this.offscreen.height = this.canvas.height;
      this.offCtx = this.offscreen.getContext('2d');
    }
    if (this.offCtx) {
      this.offCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  update(_dt: number, windFactor: number, _now: number): void {
    this.pool.update();
  }

  draw(ctx: CanvasRenderingContext2D, _now: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Warm bg
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#1a0a2e');
    bg.addColorStop(0.5, '#0f1a35');
    bg.addColorStop(1, '#0a1a0f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Persistent strokes from offscreen canvas
    if (this.offscreen) ctx.drawImage(this.offscreen, 0, 0);

    this.pool.draw(ctx);
  }

  handleTouchStart(tx: number, ty: number): void {
    this.drawing = true;
    this.lastX = tx;
    this.lastY = ty;
    this.trailPoints = [{ x: tx, y: ty }];
    const freq = this._freqFromY(ty);
    const pan = this._panFromX(tx);
    this.sound.startPaintingTone(freq, pan);
    this.tracker.recordInteract('paint');
    this.strokeCount++;
  }

  handleTouchMove(tx: number, ty: number): void {
    if (!this.drawing || !this.offCtx) return;

    this.trailPoints.push({ x: tx, y: ty });
    if (this.trailPoints.length > 4) this.trailPoints.shift();

    if (this.rainbowMode) {
      this.hue = (this.hue + 2.5) % 360;
    }

    const color = this.rainbowMode
      ? `hsl(${this.hue}, 90%, 65%)`
      : `hsl(${this.hue}, 75%, 70%)`;

    this.offCtx.save();
    this.offCtx.lineCap = 'round';
    this.offCtx.lineJoin = 'round';
    this.offCtx.strokeStyle = color;
    this.offCtx.lineWidth = 14 + Math.random() * 6;
    this.offCtx.shadowColor = color;
    this.offCtx.shadowBlur = 10;
    this.offCtx.globalAlpha = 0.82;

    if (this.trailPoints.length >= 3) {
      const pts = this.trailPoints;
      const last = pts[pts.length - 1]!;
      const prev = pts[pts.length - 2]!;
      const prev2 = pts[pts.length - 3]!;
      const cpx = (prev2.x + last.x) / 2;
      const cpy = (prev2.y + last.y) / 2;
      this.offCtx.beginPath();
      this.offCtx.moveTo(prev.x, prev.y);
      this.offCtx.quadraticCurveTo(cpx, cpy, last.x, last.y);
      this.offCtx.stroke();
    } else {
      this.offCtx.beginPath();
      this.offCtx.moveTo(this.lastX, this.lastY);
      this.offCtx.lineTo(tx, ty);
      this.offCtx.stroke();
    }
    this.offCtx.restore();

    // Sparkle particles along trail
    if (Math.random() < 0.35) {
      const hsl = this.rainbowMode ? `hsl(${(this.hue + 60) % 360},100%,80%)` : color;
      this.pool.spawn(tx + (Math.random() - 0.5) * 8, ty + (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 1.5, -Math.random() * 1.5, 2 + Math.random() * 3, hsl, 0.028);
    }

    const freq = this._freqFromY(ty);
    const pan = this._panFromX(tx);
    this.sound.updatePaintingTone(freq, pan);
    this.lastX = tx;
    this.lastY = ty;
  }

  handleTouchEnd(): void {
    this.drawing = false;
    this.trailPoints = [];
    this.sound.stopPaintingTone();
  }

  private _freqFromY(y: number): number {
    const h = this.canvas.height;
    const idx = Math.floor((1 - y / h) * (PENTATONIC.length - 1));
    return PENTATONIC[Math.max(0, Math.min(PENTATONIC.length - 1, idx))]!;
  }

  private _panFromX(x: number): number {
    return (x / this.canvas.width) * 2 - 1;
  }
}

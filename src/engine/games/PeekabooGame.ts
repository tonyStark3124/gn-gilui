import type { SoundEngine } from '@/engine/systems/SoundEngine';
import type { DevTracker } from '@/engine/systems/DevTracker';

export class PeekabooGame {
  private canvas: HTMLCanvasElement;
  private sound: SoundEngine;
  private tracker: DevTracker;

  private blockerX = 0;
  private blockerY = 0;
  private blockerW = 0;
  private blockerH = 0;
  private blockerVel = 0;
  private revealed = false;
  private pulsePhase = 0;
  private faceAlpha = 0;
  private starAlpha = 0;
  private tapHint = true;
  private tapHintTimer = 0;
  private eyeTimer = 2500;
  private eyeOpen = true;
  private hintPulse = 0;

  constructor(canvas: HTMLCanvasElement, sound: SoundEngine, tracker: DevTracker) {
    this.canvas = canvas;
    this.sound = sound;
    this.tracker = tracker;
  }

  init(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.blockerW = w * 0.62;
    this.blockerH = h * 0.58;
    this.blockerX = (w - this.blockerW) / 2;
    this.blockerY = (h - this.blockerH) / 2 + h * 0.02;
    this.blockerVel = 0;
    this.revealed = false;
    this.faceAlpha = 0;
    this.starAlpha = 0;
    this.tapHint = true;
    this.tapHintTimer = 0;
    this.pulsePhase = 0;
    this.eyeOpen = true;
    this.eyeTimer = 2500;
    this.hintPulse = 0;
  }

  update(dt: number, windFactor: number, _now: number): void {
    const h = this.canvas.height;

    this.eyeTimer -= dt;
    if (this.eyeTimer <= 0) {
      this.eyeOpen = !this.eyeOpen;
      this.eyeTimer = this.eyeOpen ? 2000 + Math.random() * 3000 : 120 + Math.random() * 80;
    }

    if (this.revealed) {
      const gravity = 0.7;
      this.blockerVel += gravity;
      this.blockerY += this.blockerVel * windFactor;
      this.faceAlpha = Math.min(1, this.faceAlpha + 0.025);
      this.starAlpha = Math.min(1, this.starAlpha + 0.018);

      if (this.blockerY > h + this.blockerH) {
        this.revealed = false;
        this.blockerY = (h - this.blockerH) / 2 + h * 0.02;
        this.blockerVel = 0;
        this.faceAlpha = 0;
        this.starAlpha = 0;
        this.pulsePhase = 0;
        this.tapHint = true;
        this.tapHintTimer = 0;
      }
    } else {
      this.tapHintTimer += dt;
      if (this.tapHintTimer > 2000) this.hintPulse += 0.05;
    }
    this.pulsePhase += 0.04;
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient bg
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1e3a5f');
    bg.addColorStop(1, '#0a1628');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Sun + face behind blocker
    const sunX = w / 2;
    const sunY = h * 0.38;
    const sunR = Math.min(w, h) * 0.22;

    // Glow rays
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + now / 2000;
      const rayLen = sunR * (1.4 + 0.2 * Math.sin(now / 600 + i));
      const x1 = sunX + Math.cos(angle) * sunR * 1.1;
      const y1 = sunY + Math.sin(angle) * sunR * 1.1;
      const x2 = sunX + Math.cos(angle) * rayLen;
      const y2 = sunY + Math.sin(angle) * rayLen;
      ctx.save();
      ctx.globalAlpha = this.faceAlpha * 0.35;
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    // Sun body
    ctx.save();
    ctx.globalAlpha = this.faceAlpha;
    ctx.shadowColor = '#fde68a';
    ctx.shadowBlur = 40;
    const sunGrad = ctx.createRadialGradient(sunX - sunR * 0.2, sunY - sunR * 0.2, 0, sunX, sunY, sunR);
    sunGrad.addColorStop(0, '#fef3c7');
    sunGrad.addColorStop(0.5, '#fde68a');
    sunGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Sun face
    const er = sunR * 0.14;
    if (this.eyeOpen) {
      ctx.fillStyle = '#1e293b';
      [[-0.3, -0.2], [0.3, -0.2]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(sunX + sunR * dx!, sunY + sunR * dy!, er, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sunX - sunR * 0.33, sunY - sunR * 0.23, er * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = sunR * 0.06;
      [[-0.3, -0.2], [0.3, -0.2]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(sunX + sunR * dx!, sunY + sunR * dy!, er, 0, Math.PI);
        ctx.stroke();
      });
    }
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = sunR * 0.07;
    ctx.beginPath();
    ctx.arc(sunX, sunY + sunR * 0.18, sunR * 0.28, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.restore();

    // Stars around sun
    ctx.save();
    ctx.globalAlpha = this.starAlpha * (0.6 + 0.4 * Math.sin(now / 400));
    ctx.fillStyle = '#fde68a';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + now / 1200;
      const dist = sunR * 1.55;
      const sx = sunX + Math.cos(angle) * dist;
      const sy = sunY + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Blocker (curtain)
    if (this.blockerY < h + this.blockerH * 1.2) {
      const bx = this.blockerX;
      const by = this.blockerY;
      const bw = this.blockerW;
      const bh = this.blockerH;
      const r = 28;

      ctx.save();
      const pulse = 1 + 0.02 * Math.sin(this.pulsePhase);
      ctx.translate(bx + bw / 2, by + bh / 2);
      ctx.scale(pulse, pulse);
      ctx.translate(-(bx + bw / 2), -(by + bh / 2));

      const blockerGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      blockerGrad.addColorStop(0, '#4c1d95');
      blockerGrad.addColorStop(0.5, '#5b21b6');
      blockerGrad.addColorStop(1, '#6d28d9');
      ctx.fillStyle = blockerGrad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, r);
      else { ctx.moveTo(bx + r, by); ctx.arcTo(bx + bw, by, bx + bw, by + bh, r); ctx.arcTo(bx + bw, by + bh, bx, by + bh, r); ctx.arcTo(bx, by + bh, bx, by, r); ctx.arcTo(bx, by, bx + bw, by, r); ctx.closePath(); }
      ctx.fill();
      ctx.strokeStyle = 'rgba(167,139,250,0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Hint tap indicator
      if (!this.revealed && this.tapHintTimer > 1500) {
        const hintAlpha = 0.4 + 0.5 * Math.abs(Math.sin(this.hintPulse));
        ctx.globalAlpha = hintAlpha;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = `bold ${Math.round(bw * 0.15)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👇', bx + bw / 2, by + bh / 2);
      }
      ctx.restore();
    }
  }

  handleTouch(tx: number, ty: number): void {
    if (this.revealed) return;
    const bx = this.blockerX;
    const by = this.blockerY;
    const bw = this.blockerW;
    const bh = this.blockerH;
    if (tx >= bx && tx <= bx + bw && ty >= by && ty <= by + bh) {
      this.revealed = true;
      this.blockerVel = -8;
      this.tapHint = false;
      this.sound.playTone(523.25, 0.3);
      setTimeout(() => this.sound.playTone(659.25, 0.3), 100);
      setTimeout(() => this.sound.playTone(783.99, 0.4), 200);
      if ('vibrate' in navigator) navigator.vibrate(15);
      this.tracker.recordInteract('peekaboo');
    }
  }
}

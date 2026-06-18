import { PASTEL } from '@/engine/constants';
import type { ParticlePool } from './ParticlePool';

interface Rocket {
  x: number; y: number; tx: number; ty: number;
  vx: number; vy: number; speed: number;
  color: string; trail: Array<{ x: number; y: number; a: number }>;
  burst: boolean;
}

export class FireworksSystem {
  private rockets: Rocket[] = [];
  private active = false;

  launch(w: number, h: number): void {
    this.active = true;
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const tx = w * (0.1 + Math.random() * 0.8);
      const ty = h * (0.1 + Math.random() * 0.35);
      const sx = w * (0.2 + Math.random() * 0.6);
      const sy = h + 10;
      const dx = tx - sx; const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 8 + Math.random() * 4;
      this.rockets.push({
        x: sx, y: sy, tx, ty,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        speed, color: PASTEL[Math.floor(Math.random() * PASTEL.length)]!,
        trail: [], burst: false,
      });
    }
  }

  update(dt: number, pool: ParticlePool): boolean {
    if (!this.active) return false;
    let allDone = true;
    for (const r of this.rockets) {
      if (r.burst) { allDone = false; continue; }
      r.trail.push({ x: r.x, y: r.y, a: 1.0 });
      if (r.trail.length > 20) r.trail.shift();
      for (const t of r.trail) t.a -= 0.05;
      r.x += r.vx;
      r.y += r.vy;
      const dist = Math.sqrt((r.tx - r.x) ** 2 + (r.ty - r.y) ** 2);
      if (dist < r.speed * 1.5) {
        r.burst = true;
        this._burst(r.x, r.y, r.color, pool);
      }
      allDone = false;
    }
    if (allDone && this.rockets.length > 0) {
      this.rockets = [];
      this.active = false;
    }
    return true;
  }

  private _burst(x: number, y: number, color: string, pool: ParticlePool): void {
    for (let i = 0; i < 42; i++) {
      const angle = (i / 42) * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      pool.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        3 + Math.random() * 3, PASTEL[i % PASTEL.length]!, 0.016);
    }
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      pool.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        2 + Math.random() * 2, color, 0.022);
    }
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      pool.spawn(x, y, Math.cos(angle) * 6, Math.sin(angle) * 6 - 2,
        1.5 + Math.random() * 1.5, '#ffe970', 0.025);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const r of this.rockets) {
      if (r.burst) continue;
      for (const t of r.trail) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, t.a * 0.6);
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  isActive(): boolean { return this.active; }
}

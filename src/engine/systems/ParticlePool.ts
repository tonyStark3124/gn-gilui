import type { Particle } from '@/types/game';

export class ParticlePool {
  private pool: Particle[];
  private size: number;

  constructor(size = 350) {
    this.size = size;
    this.pool = Array.from({ length: size }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, r: 4, color: '#fff', alpha: 1, decay: 0.02,
    }));
  }

  spawn(x: number, y: number, vx: number, vy: number, r: number, color: string, decay: number): void {
    const p = this.pool.find(p => !p.active);
    if (!p) return;
    p.active = true;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.r = r;
    p.color = color; p.alpha = 1; p.decay = decay;
  }

  update(): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      p.vx *= 0.97;
      p.alpha -= p.decay;
      if (p.alpha <= 0) p.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  releaseAll(): void {
    for (const p of this.pool) p.active = false;
  }
}

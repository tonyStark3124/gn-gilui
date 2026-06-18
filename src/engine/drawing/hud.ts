import { PASTEL } from '@/engine/constants';

export interface HudBounds { cx: number; cy: number; r: number; }

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  now: number,
  w: number,
  popCount: number,
  sessionRemaining: number,
  sessionDuration: number,
  paused: boolean,
): HudBounds {
  const cx = w - 48;
  const cy = 52;
  const r = 36;
  const progress = Math.max(0, sessionRemaining / sessionDuration);

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.stroke();

  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + progress * Math.PI * 2;
  const arcColor = progress > 0.3 ? '#a78bfa' : progress > 0.1 ? '#f59e0b' : '#ef4444';
  ctx.strokeStyle = arcColor;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, startAngle, endAngle);
  ctx.stroke();

  if (paused) {
    ctx.fillStyle = 'rgba(167,139,250,0.9)';
    const bw = 6; const bh = 18; const gap = 5;
    ctx.fillRect(cx - bw - gap / 2, cy - bh / 2, bw, bh);
    ctx.fillRect(cx + gap / 2, cy - bh / 2, bw, bh);
  } else {
    ctx.fillStyle = 'rgba(248,250,252,0.9)';
    ctx.font = `bold ${Math.round(r * 0.38)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mins = Math.floor(sessionRemaining / 60);
    const secs = Math.floor(sessionRemaining % 60);
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, cx, cy - 4);
    ctx.font = `${Math.round(r * 0.28)}px system-ui`;
    ctx.fillStyle = 'rgba(203,213,225,0.8)';
    ctx.fillText(`${popCount}`, cx, cy + 13);
  }
  ctx.restore();
  return { cx, cy, r };
}

export function drawHeader(ctx: CanvasRenderingContext2D, w: number, now: number): void {
  const h = 52;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const dots = [
    '#f87171','#fb923c','#facc15','#4ade80','#34d399','#60a5fa','#a78bfa',
  ];
  dots.forEach((col, i) => {
    const pulse = 0.55 + 0.45 * Math.sin(now / 900 + i * 0.9);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(28 + i * 26, 26, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export function drawFooter(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
  const fh = 44;
  const grad = ctx.createLinearGradient(0, h - fh, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - fh, w, fh);

  const dots = [
    '#a78bfa','#60a5fa','#34d399','#4ade80','#facc15','#fb923c','#f87171',
  ];
  dots.forEach((col, i) => {
    const pulse = 0.55 + 0.45 * Math.sin(now / 900 + i * 0.9 + Math.PI);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(28 + i * 26, h - 22, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export function drawSideMargins(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  dotsFilled: number,
  sessionProgress: number,
): void {
  const mw = 22;

  // left gradient strip
  const leftGrad = ctx.createLinearGradient(0, 0, mw, 0);
  leftGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
  leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, 0, mw, h);

  // right gradient strip
  const rightGrad = ctx.createLinearGradient(w - mw, 0, w, 0);
  rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
  rightGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = rightGrad;
  ctx.fillRect(w - mw, 0, mw, h);

  // Left: 14 purple progress dots (1 per 3 pops)
  const totalDots = 14;
  const dotSpacing = (h - 120) / (totalDots - 1);
  for (let i = 0; i < totalDots; i++) {
    const dotY = 60 + i * dotSpacing;
    const filled = i < dotsFilled;
    const pulse = filled ? (0.7 + 0.3 * Math.sin(now / 600 + i)) : 0.25;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = filled ? PASTEL[6]! : 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(11, dotY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Right: cyan session time progress bar
  const barH = h - 120;
  const barY = 60;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#0e7490';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(w - 17, barY, 6, barH, 3);
  else ctx.rect(w - 17, barY, 6, barH);
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#22d3ee';
  const filled = barH * sessionProgress;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(w - 17, barY + barH - filled, 6, filled, 3);
  else ctx.rect(w - 17, barY + barH - filled, 6, filled);
  ctx.fill();
  ctx.restore();
}

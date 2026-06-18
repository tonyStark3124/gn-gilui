export type AnimalType = 'duck' | 'cat' | 'frog' | 'rabbit' | 'star';

export function drawAnimal(ctx: CanvasRenderingContext2D, type: AnimalType, x: number, y: number, r: number, eyeOpen: boolean): void {
  switch (type) {
    case 'duck':   drawDuck(ctx, x, y, r, eyeOpen); break;
    case 'cat':    drawCat(ctx, x, y, r, eyeOpen); break;
    case 'frog':   drawFrog(ctx, x, y, r, eyeOpen); break;
    case 'rabbit': drawRabbit(ctx, x, y, r, eyeOpen); break;
    case 'star':   drawStar(ctx, x, y, r, eyeOpen); break;
  }
}

export function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, eyeOpen: boolean): void {
  ctx.save();
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.75, y + r * 0.1, r * 0.28, r * 0.18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  if (eyeOpen) {
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.2, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - r * 0.26, y - r * 0.24, r * 0.045, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.2, r * 0.12, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, eyeOpen: boolean): void {
  ctx.save();
  ctx.fillStyle = '#f9a8d4';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.05, r * 0.82, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f472b6';
  [[x - r * 0.6, y - r * 0.75], [x + r * 0.6, y - r * 0.75]].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.moveTo(ex!, ey! + r * 0.3);
    ctx.lineTo(ex! - r * 0.22, ey!);
    ctx.lineTo(ex! + r * 0.22, ey!);
    ctx.closePath();
    ctx.fill();
  });
  ctx.fillStyle = '#1e293b';
  if (eyeOpen) {
    [[-0.28, -0.15], [0.28, -0.15]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.ellipse(x + r * dx!, y + r * dy!, r * 0.1, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#fff';
    [[-0.31, -0.18], [0.25, -0.18]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + r * dx!, y + r * dy!, r * 0.04, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = r * 0.09;
    [[-0.28, -0.15], [0.28, -0.15]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + r * dx!, y + r * dy!, r * 0.12, 0, Math.PI);
      ctx.stroke();
    });
  }
  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.2, r * 0.12, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawFrog(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, eyeOpen: boolean): void {
  ctx.save();
  ctx.fillStyle = '#86efac';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4ade80';
  [[-0.55, -0.75], [0.55, -0.75]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(x + r * dx!, y + r * dy!, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#1e293b';
  if (eyeOpen) {
    [[-0.55, -0.78], [0.55, -0.78]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + r * dx!, y + r * dy!, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + r * dx! - r * 0.04, y + r * dy! - r * 0.04, r * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
    });
  } else {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = r * 0.1;
    [[-0.55, -0.78], [0.55, -0.78]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + r * dx!, y + r * dy!, r * 0.14, 0, Math.PI);
      ctx.stroke();
    });
  }
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.3, r * 0.3, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
}

export function drawRabbit(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, eyeOpen: boolean): void {
  ctx.save();
  ctx.fillStyle = '#f1f5f9';
  [[-0.35, -1.0], [0.35, -1.0]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.ellipse(x + r * dx!, y + r * dy!, r * 0.22, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#fda4af';
  [[-0.35, -1.0], [0.35, -1.0]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.ellipse(x + r * dx!, y + r * dy!, r * 0.12, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fda4af';
  [[-0.22, -0.1], [0.22, -0.1]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.ellipse(x + r * dx!, y + r * dy!, r * 0.18, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  if (eyeOpen) {
    ctx.fillStyle = '#ec4899';
    [[-0.28, -0.22], [0.28, -0.22]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + r * dx!, y + r * dy!, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#fff';
    [[-0.31, -0.25], [0.25, -0.25]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + r * dx!, y + r * dy!, r * 0.045, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = r * 0.08;
    [[-0.28, -0.22], [0.28, -0.22]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + r * dx!, y + r * dy!, r * 0.11, 0, Math.PI);
      ctx.stroke();
    });
  }
  ctx.fillStyle = '#fda4af';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.25, r * 0.1, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, eyeOpen: boolean): void {
  ctx.save();
  ctx.shadowColor = '#fde68a';
  ctx.shadowBlur = r * 0.6;
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const innerAngle = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    else ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    ctx.lineTo(x + r * 0.42 * Math.cos(innerAngle), y + r * 0.42 * Math.sin(innerAngle));
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1e293b';
  if (eyeOpen) {
    [[-0.22, -0.1], [0.22, -0.1]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + r * dx!, y + r * dy!, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.13, r * 0.035, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = r * 0.07;
    [[-0.22, -0.1], [0.22, -0.1]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + r * dx!, y + r * dy!, r * 0.09, 0, Math.PI);
      ctx.stroke();
    });
  }
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.2, r * 0.18, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
}

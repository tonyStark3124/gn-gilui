import type { ReportData } from '@/types/game';

type InteractType = 'pop' | 'miss' | 'peekaboo' | 'paint' | 'surprise';

export class DevTracker {
  private sessionStart = 0;
  private pops = 0;
  private misses = 0;
  private peekabooReveals = 0;
  private paintStrokes = 0;
  private surprisePops = 0;
  private streak = 0;
  private streakMax = 0;
  private reactionTimes: number[] = [];
  private lastPopTime = 0;

  startSession(): void {
    this.sessionStart = Date.now();
    this.pops = 0;
    this.misses = 0;
    this.peekabooReveals = 0;
    this.paintStrokes = 0;
    this.surprisePops = 0;
    this.streak = 0;
    this.streakMax = 0;
    this.reactionTimes = [];
    this.lastPopTime = 0;
  }

  recordInteract(type: InteractType): void {
    const now = Date.now();
    switch (type) {
      case 'pop':
        this.pops++;
        if (this.lastPopTime > 0) {
          const rt = now - this.lastPopTime;
          if (rt < 8000) this.reactionTimes.push(rt);
        }
        this.lastPopTime = now;
        this.streak++;
        if (this.streak > this.streakMax) this.streakMax = this.streak;
        break;
      case 'miss':
        this.misses++;
        this.streak = 0;
        break;
      case 'peekaboo':
        this.peekabooReveals++;
        this.streak++;
        if (this.streak > this.streakMax) this.streakMax = this.streak;
        break;
      case 'paint':
        this.paintStrokes++;
        break;
      case 'surprise':
        this.surprisePops++;
        this.streak += 3;
        if (this.streak > this.streakMax) this.streakMax = this.streak;
        break;
    }
  }

  hasData(): boolean {
    return this.pops + this.misses + this.peekabooReveals + this.paintStrokes > 0;
  }

  computeReport(): ReportData {
    const dMs = Date.now() - this.sessionStart;
    const dMin = dMs / 60000;
    const avgRT = this.reactionTimes.length > 0
      ? this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length
      : 3000;
    const total = this.pops + this.misses;
    const accuracy = total > 0 ? this.pops / total : 0;
    const popsPerMin = dMin > 0 ? this.pops / dMin : 0;
    const speedBonus = Math.max(0, 1 - avgRT / 3000);
    const variety = (this.peekabooReveals > 0 ? 10 : 0) + (this.paintStrokes > 0 ? 10 : 0);
    const attentionScore = Math.min(100,
      this.streakMax * 8 + dMin * 5 + speedBonus * 20);
    const motorScore = Math.min(100,
      accuracy * 60 + speedBonus * 40);
    const engagementScore = Math.min(100,
      popsPerMin * 9 + variety + this.surprisePops * 5);
    return {
      attentionScore: Math.round(attentionScore),
      motorScore: Math.round(motorScore),
      engagementScore: Math.round(engagementScore),
      pops: this.pops,
      misses: this.misses,
      avgRT: Math.round(avgRT),
      streakMax: this.streakMax,
      dMin: Math.round(dMin * 10) / 10,
      surprisePops: this.surprisePops,
      peekabooReveals: this.peekabooReveals,
      paintStrokes: this.paintStrokes,
    };
  }
}

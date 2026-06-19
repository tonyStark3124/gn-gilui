import { GameState, SubState, type GameStateType, type SubStateType } from '@/types/game';
import {
  SUB_MIN, SUB_MAX, SESSION_DEFAULT, WINDDOWN_DURATION,
  INTERACTION_MILESTONE, VALUE_CARDS,
} from './constants';
import { SoundEngine } from './systems/SoundEngine';
import { ParticlePool } from './systems/ParticlePool';
import { FireworksSystem } from './systems/FireworksSystem';
import { DevTracker } from './systems/DevTracker';
import { SessionGuard } from './systems/SessionGuard';
import { BubbleGame } from './games/BubbleGame';
import { PeekabooGame } from './games/PeekabooGame';
import { PaintingGame } from './games/PaintingGame';
import { drawHUD, drawHeader, drawFooter, drawSideMargins, type HudBounds } from './drawing/hud';
import type { GameEngineCallbacks } from '@/types/game';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: GameEngineCallbacks;
  private raf = 0;
  private last = 0;

  // DFA
  private state: GameStateType = GameState.SPLASH;
  private subState: SubStateType = SubState.POPPING;
  private paused = false;
  private sessionDuration = SESSION_DEFAULT;
  private sessionStart = 0;
  private subStart = 0;
  private subDuration = 0;
  private windFactor = 1.0;

  // Transition fade
  private transAlpha = 0;
  private transDir = 0;
  private nextSub: SubStateType | null = null;
  private valueCardShown = false;
  private transFrames = 0;

  // Wind-down
  private windDownStart = 0;
  private lullabyStarted = false;

  // Interaction
  private interactionCount = 0;
  private paintingSessionCount = 0;
  private hudBounds: HudBounds = { cx: 0, cy: 0, r: 0 };

  // Systems
  sound: SoundEngine;
  private pool: ParticlePool;
  private fireworks: FireworksSystem;
  devTracker: DevTracker;
  private sessionGuard: SessionGuard;

  // Games
  private bubble: BubbleGame;
  private peekaboo: PeekabooGame;
  private painting: PaintingGame;

  constructor(canvas: HTMLCanvasElement, cb: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cb = cb;

    this.sound = new SoundEngine();
    this.pool = new ParticlePool(350);
    this.fireworks = new FireworksSystem();
    this.devTracker = new DevTracker();
    this.sessionGuard = new SessionGuard();

    this.bubble = new BubbleGame(canvas, this.sound, this.pool, this.devTracker);
    this.peekaboo = new PeekabooGame(canvas, this.sound, this.devTracker);
    this.painting = new PaintingGame(canvas, this.sound, this.pool, this.devTracker);

    this.bubble.onSurprisePop = () => this._celebrate(true);
  }

  start(): void {
    this._resize();
    this._setState(GameState.SPLASH);
    setTimeout(() => {
      this._setState(GameState.LOCKED_PIN);
      this.cb.onSplashDone();
    }, 1900);
    this.raf = requestAnimationFrame(this._loop.bind(this));
  }

  startGame(duration = SESSION_DEFAULT): void {
    this.sessionDuration = duration;
    this.sessionStart = performance.now();
    this.interactionCount = 0;
    this.paintingSessionCount = 0;
    this.lullabyStarted = false;
    this.paused = false;
    this.devTracker.startSession();
    this.cb.onPausedChange(false);
    this._setState(GameState.GAME_PLAY);
    const subs: SubStateType[] = [SubState.POPPING, SubState.PEEKABOO, SubState.PAINTING];
    this._startSub(subs[Math.floor(Math.random() * subs.length)]!);
    this.sessionGuard.activate(() => this._requestPIN()).catch(() => { /* ignore */ });
  }

  private _requestPIN(): void {
    this._setState(GameState.LOCKED_PIN);
  }

  endGame(): void {
    this.sessionGuard.deactivate();
    this.sound.fadeOut(2.0);
    const report = this.devTracker.computeReport();
    this._setState(GameState.LOCKED_PIN);
    this.cb.onSessionEnd(report);
  }

  togglePause(): void {
    this.paused = !this.paused;
    this.cb.onPausedChange(this.paused);
    if (this.paused) {
      this.painting.handleTouchEnd();
      this.sound.stopPaintingTone();
    }
  }

  resize(): void { this._resize(); }

  private _resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.scale(dpr, dpr);
  }

  private _setState(s: GameStateType): void {
    this.state = s;
    this.cb.onStateChange(s);
  }

  private _startSub(sub: SubStateType): void {
    this.subState = sub;
    this.subDuration = (SUB_MIN + Math.random() * (SUB_MAX - SUB_MIN)) * 1000;
    this.subStart = performance.now();
    this.pool.releaseAll();
    this.sound.stopPaintingTone();
    switch (sub) {
      case SubState.POPPING: this.bubble.init(); break;
      case SubState.PEEKABOO: this.peekaboo.init(); break;
      case SubState.PAINTING:
        this.paintingSessionCount++;
        this.painting.init(this.paintingSessionCount % 3 === 0);
        break;
    }
    this.cb.onSubStateChange(sub);
  }

  private _nextSub(): SubStateType {
    const order: SubStateType[] = [SubState.POPPING, SubState.PEEKABOO, SubState.PAINTING];
    const idx = order.indexOf(this.subState);
    return order[(idx + 1) % order.length]!;
  }

  private _celebrate(isSurprise = false): void {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const n = isSurprise ? 3 : 1;
    for (let i = 0; i < n; i++) {
      setTimeout(() => this.fireworks.launch(w, h), i * 300);
    }
    this.sound.playCelebration();
  }

  private _checkInteraction(): void {
    this.interactionCount++;
    this.cb.onPopCountChange(this.bubble.getPopCount());
    if (this.interactionCount % INTERACTION_MILESTONE === 0) this._celebrate(false);
  }

  onTouch(x: number, y: number, phase: 'start' | 'move' | 'end'): void {
    if (this.state !== GameState.GAME_PLAY) return;

    // HUD hit on start → toggle pause
    if (phase === 'start') {
      const hb = this.hudBounds;
      const dx = x - hb.cx; const dy = y - hb.cy;
      if (dx * dx + dy * dy <= hb.r * hb.r) {
        this.togglePause();
        return;
      }
    }

    if (this.paused) return;

    if (phase === 'start' || phase === 'move') {
      switch (this.subState) {
        case SubState.POPPING:
          if (phase === 'start') {
            const hit = this.bubble.handleTouch(x, y);
            if (hit) this._checkInteraction();
          }
          break;
        case SubState.PEEKABOO:
          if (phase === 'start') {
            this.peekaboo.handleTouch(x, y);
            this._checkInteraction();
          }
          break;
        case SubState.PAINTING:
          if (phase === 'start') this.painting.handleTouchStart(x, y);
          else this.painting.handleTouchMove(x, y);
          this._checkInteraction();
          break;
      }
    }
    if (phase === 'end' && this.subState === SubState.PAINTING) {
      this.painting.handleTouchEnd();
    }
  }

  private _loop(ts: number): void {
    const dt = Math.min(50, ts - (this.last || ts));
    this.last = ts;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    if (this.state === GameState.GAME_PLAY && !this.paused) {
      const elapsed = ts - this.sessionStart;
      const remaining = Math.max(0, this.sessionDuration * 1000 - elapsed);

      // Wind-down
      if (remaining < WINDDOWN_DURATION * 1000 && this.windFactor > 0.25) {
        const p = remaining / (WINDDOWN_DURATION * 1000);
        this.windFactor = 0.25 + p * 0.75;
        const cutoff = 200 + p * 3800;
        this.canvas.style.filter = `saturate(${0.3 + p * 0.7})`;
        this.sound.setLowPassCutoff(cutoff);
        if (this.windFactor <= 0.26 && !this.lullabyStarted) {
          this.lullabyStarted = true;
          this.sound.startLullaby();
        }
      }

      if (remaining <= 0) {
        this.canvas.style.filter = '';
        this.sound.stopLullaby();
        this._setState(GameState.SLEEP);
        this.endGame();
        this.raf = requestAnimationFrame(this._loop.bind(this));
        return;
      }

      // Sub-game rotation
      if (ts - this.subStart > this.subDuration && !this.transDir) {
        this.transDir = 1;
        this.transAlpha = 0;
        this.nextSub = this._nextSub();
        this.valueCardShown = false;
        this.transFrames = 0;
      }

      // Fade transition
      if (this.transDir !== 0) {
        this.transFrames++;
        if (this.transDir === 1) {
          this.transAlpha = Math.min(1, this.transAlpha + 0.05);
          if (this.transAlpha >= 1 && this.nextSub && !this.valueCardShown) {
            this.valueCardShown = true;
            this.cb.onValueCard(VALUE_CARDS[this.nextSub]);
            this._startSub(this.nextSub);
            this.transDir = -1;
            setTimeout(() => this.cb.onHideValueCard(), 2000);
          }
        } else {
          this.transAlpha = Math.max(0, this.transAlpha - 0.05);
          if (this.transAlpha <= 0) { this.transDir = 0; this.nextSub = null; }
        }
      }

      // Update games
      switch (this.subState) {
        case SubState.POPPING: this.bubble.update(dt, this.windFactor, ts); break;
        case SubState.PEEKABOO: this.peekaboo.update(dt, this.windFactor, ts); break;
        case SubState.PAINTING: this.painting.update(dt, this.windFactor, ts); break;
      }
      this.pool.update();
      this.fireworks.update(dt, this.pool);

      // Draw
      this.ctx.save();
      switch (this.subState) {
        case SubState.POPPING: this.bubble.draw(this.ctx, ts); break;
        case SubState.PEEKABOO: this.peekaboo.draw(this.ctx, ts); break;
        case SubState.PAINTING: this.painting.draw(this.ctx, ts); break;
      }
      drawHeader(this.ctx, w, ts);
      drawFooter(this.ctx, w, h, ts);
      drawSideMargins(
        this.ctx, w, h, ts,
        Math.floor(this.bubble.getPopCount() / 3),
        1 - remaining / (this.sessionDuration * 1000),
      );
      this.fireworks.draw(this.ctx);

      if (this.transAlpha > 0) {
        this.ctx.fillStyle = `rgba(0,0,0,${this.transAlpha})`;
        this.ctx.fillRect(0, 0, w, h);
      }

      this.hudBounds = drawHUD(
        this.ctx, ts, w,
        this.bubble.getPopCount(),
        remaining / 1000,
        this.sessionDuration,
        this.paused,
      );
      this.ctx.restore();
    } else if (this.state === GameState.SLEEP) {
      this.ctx.clearRect(0, 0, w, h);
    }

    this.raf = requestAnimationFrame(this._loop.bind(this));
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.sessionGuard.deactivate();
    this.sound.stopPaintingTone();
    this.sound.stopLullaby();
  }
}

import type { GameEngine } from './GameEngine';

let _engine: GameEngine | null = null;

export function setEngine(engine: GameEngine): void {
  _engine = engine;
}

export function getEngine(): GameEngine | null {
  return _engine;
}

export function clearEngine(): void {
  _engine = null;
}

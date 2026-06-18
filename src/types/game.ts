export const GameState = {
  SPLASH: 'SPLASH',
  LOCKED_PIN: 'LOCKED_PIN',
  GAME_PLAY: 'GAME_PLAY',
  WIND_DOWN: 'WIND_DOWN',
  SLEEP: 'SLEEP',
} as const;
export type GameStateType = (typeof GameState)[keyof typeof GameState];

export const SubState = {
  POPPING: 'POPPING',
  PEEKABOO: 'PEEKABOO',
  PAINTING: 'PAINTING',
} as const;
export type SubStateType = (typeof SubState)[keyof typeof SubState];

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface ReportData {
  attentionScore: number;
  motorScore: number;
  engagementScore: number;
  pops: number;
  misses: number;
  avgRT: number;
  streakMax: number;
  dMin: number;
  surprisePops: number;
  peekabooReveals: number;
  paintStrokes: number;
}

export interface GameEngineCallbacks {
  onStateChange: (state: GameStateType) => void;
  onSubStateChange: (sub: SubStateType) => void;
  onPausedChange: (paused: boolean) => void;
  onPopCountChange: (count: number) => void;
  onSplashDone: () => void;
  onSessionEnd: (report: ReportData) => void;
  onValueCard: (data: { he: string; en: string }) => void;
  onHideValueCard: () => void;
}

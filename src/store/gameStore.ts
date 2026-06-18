'use client';
import { create } from 'zustand';
import { GameState, SubState, type GameStateType, type SubStateType, type ReportData } from '@/types/game';

interface ValueCardData { he: string; en: string; }

interface GameStore {
  gameState: GameStateType;
  subState: SubStateType;
  paused: boolean;
  popCount: number;
  splashDone: boolean;
  showPIN: boolean;
  showReport: boolean;
  reportData: ReportData | null;
  valueCard: ValueCardData | null;
  showValueCard: boolean;
  sessionCount: number;

  setGameState: (s: GameStateType) => void;
  setSubState: (s: SubStateType) => void;
  setPaused: (p: boolean) => void;
  setPopCount: (n: number) => void;
  setSplashDone: (b: boolean) => void;
  setShowPIN: (b: boolean) => void;
  showReportData: (data: ReportData) => void;
  closeReport: () => void;
  setValueCard: (data: ValueCardData | null) => void;
  incrementSessionCount: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: GameState.SPLASH,
  subState: SubState.POPPING,
  paused: false,
  popCount: 0,
  splashDone: false,
  showPIN: false,
  showReport: false,
  reportData: null,
  valueCard: null,
  showValueCard: false,
  sessionCount: typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('gnGilui_sessions') ?? '0', 10)
    : 0,

  setGameState: (s) => set({ gameState: s }),
  setSubState: (s) => set({ subState: s }),
  setPaused: (p) => set({ paused: p }),
  setPopCount: (n) => set({ popCount: n }),
  setSplashDone: (b) => set({ splashDone: b, showPIN: b }),
  setShowPIN: (b) => set({ showPIN: b }),
  showReportData: (data) => set({ reportData: data, showReport: true }),
  closeReport: () => set({ showReport: false }),
  setValueCard: (data) => set({ valueCard: data, showValueCard: data !== null }),
  incrementSessionCount: () => {
    const n = get().sessionCount + 1;
    set({ sessionCount: n });
    if (typeof window !== 'undefined') localStorage.setItem('gnGilui_sessions', String(n));
  },
}));

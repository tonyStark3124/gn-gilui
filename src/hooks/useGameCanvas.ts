'use client';
import { useEffect, useRef } from 'react';
import { GameEngine } from '@/engine/GameEngine';
import { setEngine, clearEngine } from '@/engine/engineRef';
import { useGameStore } from '@/store/gameStore';
import { GameState } from '@/types/game';

export function useGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const store = useGameStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      onStateChange: (s) => {
        store.setGameState(s);
        if (s === GameState.LOCKED_PIN) store.setShowPIN(true);
        if (s === GameState.GAME_PLAY) store.setShowPIN(false);
      },
      onSubStateChange: (s) => store.setSubState(s),
      onPausedChange: (p) => store.setPaused(p),
      onPopCountChange: (n) => store.setPopCount(n),
      onSplashDone: () => store.setSplashDone(true),
      onSessionEnd: (report) => {
        store.showReportData(report);
        store.setShowPIN(true);
      },
      onValueCard: (data) => store.setValueCard(data),
      onHideValueCard: () => store.setValueCard(null),
    });

    setEngine(engine);
    engine.start();

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      engine.destroy();
      clearEngine();
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return canvasRef;
}

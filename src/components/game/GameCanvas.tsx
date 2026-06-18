'use client';
import { useCallback } from 'react';
import { useGameCanvas } from '@/hooks/useGameCanvas';
import { getEngine } from '@/engine/engineRef';

export function GameCanvas() {
  const canvasRef = useGameCanvas();

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    getEngine()?.onTouch(e.clientX - rect.left, e.clientY - rect.top, 'start');
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons === 0) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    getEngine()?.onTouch(e.clientX - rect.left, e.clientY - rect.top, 'move');
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    getEngine()?.onTouch(e.clientX - rect.left, e.clientY - rect.top, 'end');
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 touch-none select-none"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-hidden="true"
    />
  );
}

'use client';

import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export function useConfetti() {
  const fireConfetti = useCallback((options?: { particleCount?: number; spread?: number; origin?: { x: number; y: number } }) => {
    confetti({
      particleCount: options?.particleCount || 100,
      spread: options?.spread || 70,
      origin: options?.origin || { y: 0.6 },
      colors: ['#7C3AED', '#FF6B6B', '#06D6A0', '#FFD166', '#4CC9F0', '#FF85A1'],
      shapes: ['star', 'circle'],
      ticks: 200,
      gravity: 0.8,
      scalar: 1.2,
    });
  }, []);

  const fireBigCelebration = useCallback(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#7C3AED', '#FF6B6B', '#06D6A0', '#FFD166'],
      });
      confetti({
        particleCount: 30,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#7C3AED', '#FF6B6B', '#06D6A0', '#FFD166'],
      });
    }, 150);
  }, []);

  return { fireConfetti, fireBigCelebration };
}

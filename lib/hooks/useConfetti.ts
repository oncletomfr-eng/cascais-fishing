'use client';

import { useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  flat?: boolean;
  ticks?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  shapes?: confetti.Shape[];
  scalar?: number;
  zIndex?: number;
  disableForReducedMotion?: boolean;
}

interface UseConfettiReturn {
  fireConfetti: (options?: ConfettiOptions) => Promise<void>;
  fireFromElement: (element: HTMLElement, options?: ConfettiOptions) => Promise<void>;
  fireCelebration: () => Promise<void>;
  reset: () => void;
}

const DEFAULT_COLORS = [
  '#0ea5e9', // sky-500 (primary blue)
  '#10b981', // emerald-500 (success green)
  '#f59e0b', // amber-500 (warning)
  '#ef4444', // red-500 (error)
  '#8b5cf6', // violet-500 
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

/**
 * Custom hook for confetti animations with presets for fishing celebration
 */
export function useConfetti(): UseConfettiReturn {
  const animationRafRef = useRef<number>();

  const fireConfetti = useCallback(async (options: ConfettiOptions = {}) => {
    const defaults: ConfettiOptions = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: DEFAULT_COLORS,
      disableForReducedMotion: true,
      ...options
    };

    return confetti(defaults);
  }, []);

  const fireFromElement = useCallback(async (element: HTMLElement, options: ConfettiOptions = {}) => {
    const rect = element.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    return fireConfetti({
      origin: { x, y },
      ...options
    });
  }, [fireConfetti]);

  /**
   * Fire a celebration animation for group trip confirmation
   * Based on the fishing theme - multiple bursts like catching multiple fish
   */
  const fireCelebration = useCallback(async () => {
    const duration = 3000; // 3 seconds
    const animationEnd = Date.now() + duration;
    
    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const frame = () => {
      // Fire confetti from multiple points
      confetti({
        particleCount: randomInRange(15, 30),
        angle: randomInRange(55, 125),
        spread: randomInRange(50, 70),
        origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.5, 0.8) },
        colors: DEFAULT_COLORS,
        disableForReducedMotion: true
      });

      confetti({
        particleCount: randomInRange(15, 30),
        angle: randomInRange(55, 125),
        spread: randomInRange(50, 70),
        origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.5, 0.8) },
        colors: DEFAULT_COLORS,
        disableForReducedMotion: true
      });

      if (Date.now() < animationEnd) {
        animationRafRef.current = requestAnimationFrame(frame);
      }
    };

    frame();
    
    // Wait for animation to complete
    return new Promise<void>((resolve) => {
      setTimeout(resolve, duration);
    });
  }, []);

  const reset = useCallback(() => {
    if (animationRafRef.current) {
      cancelAnimationFrame(animationRafRef.current);
    }
    confetti.reset();
  }, []);

  return {
    fireConfetti,
    fireFromElement,
    fireCelebration,
    reset
  };
}

/**
 * Pre-configured confetti animations for specific fishing app scenarios
 */
export const confettiPresets = {
  // When someone joins a trip
  participantJoined: {
    particleCount: 50,
    spread: 45,
    origin: { x: 0.5, y: 0.8 },
    colors: ['#0ea5e9', '#10b981', '#f59e0b'],
    startVelocity: 25
  },

  // When a trip gets confirmed
  tripConfirmed: {
    particleCount: 150,
    spread: 100,
    origin: { x: 0.5, y: 0.6 },
    colors: DEFAULT_COLORS,
    startVelocity: 35,
    scalar: 1.2
  },

  // When a trip is almost full (urgency celebration)
  almostFull: {
    particleCount: 75,
    spread: 60,
    origin: { x: 0.5, y: 0.7 },
    colors: ['#ef4444', '#f59e0b', '#ec4899'],
    startVelocity: 30
  },

  // Subtle animation for minor achievements
  subtle: {
    particleCount: 30,
    spread: 40,
    origin: { x: 0.5, y: 0.8 },
    colors: ['#0ea5e9', '#10b981'],
    startVelocity: 20,
    scalar: 0.8
  }
};

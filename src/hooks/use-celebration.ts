import { useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  playCelebrationSound, 
  playBadgeUnlockSound, 
  playChallengeCompleteSound 
} from '@/lib/celebration-sounds';

interface CelebrationOptions {
  sound?: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

// Check if sound is enabled in localStorage
function isSoundEnabled(): boolean {
  const stored = localStorage.getItem('celebration-sound-enabled');
  return stored === null ? true : stored === 'true';
}

export function useCelebration() {
  // Badge unlock celebration - sparkles from center
  const celebrateBadge = useCallback(async (options: CelebrationOptions = {}) => {
    const { sound = isSoundEnabled(), intensity = 'medium' } = options;
    
    const particleCount = intensity === 'low' ? 30 : intensity === 'high' ? 100 : 50;
    
    // Gold/trophy colored confetti
    confetti({
      particleCount,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FFB347', '#FFCC00', '#F4C430'],
      shapes: ['star', 'circle'],
      scalar: 1.2,
      gravity: 0.8,
      ticks: 150,
    });

    // Add sparkle effect
    setTimeout(() => {
      confetti({
        particleCount: particleCount / 2,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#FFFFFF', '#FFFACD', '#FFE4B5'],
        shapes: ['star'],
        scalar: 0.8,
        gravity: 0.6,
        ticks: 100,
      });
    }, 150);

    if (sound) {
      await playBadgeUnlockSound();
    }
  }, []);

  // Challenge complete celebration - full confetti blast
  const celebrateChallenge = useCallback(async (options: CelebrationOptions = {}) => {
    const { sound = isSoundEnabled(), intensity = 'high' } = options;
    
    const particleCount = intensity === 'low' ? 50 : intensity === 'high' ? 200 : 100;
    const duration = intensity === 'low' ? 1000 : intensity === 'high' ? 3000 : 2000;
    const end = Date.now() + duration;

    // Continuous confetti burst
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Big center burst
    setTimeout(() => {
      confetti({
        particleCount,
        spread: 160,
        origin: { y: 0.35 },
        gravity: 0.7,
        scalar: 1.5,
        ticks: 200,
      });
    }, 200);

    if (sound) {
      await playChallengeCompleteSound();
    }
  }, []);

  // Generic celebration
  const celebrate = useCallback(async (options: CelebrationOptions = {}) => {
    const { sound = isSoundEnabled(), intensity = 'medium' } = options;
    
    const particleCount = intensity === 'low' ? 30 : intensity === 'high' ? 100 : 60;

    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
    });

    if (sound) {
      await playCelebrationSound();
    }
  }, []);

  // Toggle sound setting
  const setSoundEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem('celebration-sound-enabled', String(enabled));
  }, []);

  const getSoundEnabled = useCallback(() => {
    return isSoundEnabled();
  }, []);

  return {
    celebrateBadge,
    celebrateChallenge,
    celebrate,
    setSoundEnabled,
    getSoundEnabled,
  };
}

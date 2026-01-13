import { useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  playCelebrationSound, 
  playBadgeUnlockSound, 
  playChallengeCompleteSound 
} from '@/lib/celebration-sounds';

export interface CelebrationOptions {
  sound?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  duration?: number; // in milliseconds
}

// Check if sound is enabled in localStorage
function isSoundEnabled(): boolean {
  const stored = localStorage.getItem('celebration-sound-enabled');
  return stored === null ? true : stored === 'true';
}

// Get theme colors from CSS variables and convert to hex
function getThemeColors(): string[] {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  const hslToHex = (hsl: string): string => {
    const match = hsl.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
    if (!match) return '#3b82f6'; // fallback blue
    
    const h = parseFloat(match[1]);
    const s = parseFloat(match[2]) / 100;
    const l = parseFloat(match[3]) / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };
  
  // Extract theme colors
  const colors: string[] = [];
  const colorVars = ['--primary', '--accent', '--success', '--warning', '--info', '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];
  
  colorVars.forEach(varName => {
    const value = computedStyle.getPropertyValue(varName).trim();
    if (value) {
      colors.push(hslToHex(value));
    }
  });
  
  // Fallback if no colors found
  if (colors.length === 0) {
    return ['#3b82f6', '#f97316', '#22c55e', '#eab308', '#0ea5e9', '#8b5cf6'];
  }
  
  return colors;
}

// Get gold/trophy colors for badges
function getBadgeColors(): string[] {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  const hslToHex = (hsl: string): string => {
    const match = hsl.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
    if (!match) return '#FFD700';
    
    const h = parseFloat(match[1]);
    const s = parseFloat(match[2]) / 100;
    const l = parseFloat(match[3]) / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };
  
  // Get warning/accent for gold tones
  const warning = computedStyle.getPropertyValue('--warning').trim();
  const accent = computedStyle.getPropertyValue('--accent').trim();
  
  const baseColors = [
    warning ? hslToHex(warning) : '#FFD700',
    accent ? hslToHex(accent) : '#FFA500',
  ];
  
  // Add gold variations
  return [...baseColors, '#FFD700', '#FFA500', '#FFB347', '#FFCC00', '#F4C430'];
}

// Intensity configurations
const INTENSITY_CONFIG = {
  low: { particles: 30, spread: 45, duration: 1000, scalar: 0.8 },
  medium: { particles: 60, spread: 70, duration: 2000, scalar: 1.0 },
  high: { particles: 120, spread: 100, duration: 3000, scalar: 1.3 },
};

export function useCelebration() {
  // Badge unlock celebration - sparkles from center with theme colors
  const celebrateBadge = useCallback(async (options: CelebrationOptions = {}) => {
    const { sound = isSoundEnabled(), intensity = 'medium', duration } = options;
    const config = INTENSITY_CONFIG[intensity];
    const badgeColors = getBadgeColors();
    const effectDuration = duration ?? config.duration;
    
    // Main gold burst
    confetti({
      particleCount: config.particles,
      spread: config.spread,
      origin: { y: 0.6 },
      colors: badgeColors,
      shapes: ['star', 'circle'],
      scalar: config.scalar * 1.2,
      gravity: 0.8,
      ticks: Math.floor(effectDuration / 10),
    });

    // Sparkle effect with theme accent
    setTimeout(() => {
      confetti({
        particleCount: Math.floor(config.particles / 2),
        spread: config.spread + 30,
        origin: { y: 0.5 },
        colors: ['#FFFFFF', '#FFFACD', '#FFE4B5', ...badgeColors.slice(0, 2)],
        shapes: ['star'],
        scalar: config.scalar * 0.8,
        gravity: 0.6,
        ticks: Math.floor(effectDuration / 15),
      });
    }, 150);

    if (sound) {
      await playBadgeUnlockSound();
    }
  }, []);

  // Challenge complete celebration - full confetti blast with theme colors
  const celebrateChallenge = useCallback(async (options: CelebrationOptions = {}) => {
    const { sound = isSoundEnabled(), intensity = 'high', duration } = options;
    const config = INTENSITY_CONFIG[intensity];
    const themeColors = getThemeColors();
    const effectDuration = duration ?? config.duration;
    const end = Date.now() + effectDuration;

    // Continuous confetti burst from sides
    const frame = () => {
      confetti({
        particleCount: Math.max(2, Math.floor(config.particles / 40)),
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: themeColors,
        scalar: config.scalar,
      });
      confetti({
        particleCount: Math.max(2, Math.floor(config.particles / 40)),
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: themeColors,
        scalar: config.scalar,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Big center burst
    setTimeout(() => {
      confetti({
        particleCount: config.particles,
        spread: config.spread + 60,
        origin: { y: 0.35 },
        colors: themeColors,
        gravity: 0.7,
        scalar: config.scalar * 1.5,
        ticks: Math.floor(effectDuration / 10),
      });
    }, 200);

    if (sound) {
      await playChallengeCompleteSound();
    }
  }, []);

  // Generic celebration with theme colors
  const celebrate = useCallback(async (options: CelebrationOptions = {}) => {
    const { sound = isSoundEnabled(), intensity = 'medium', duration } = options;
    const config = INTENSITY_CONFIG[intensity];
    const themeColors = getThemeColors();
    const effectDuration = duration ?? config.duration;

    confetti({
      particleCount: config.particles,
      spread: config.spread,
      origin: { y: 0.6 },
      colors: themeColors,
      scalar: config.scalar,
      ticks: Math.floor(effectDuration / 10),
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

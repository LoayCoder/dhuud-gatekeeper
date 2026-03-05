/**
 * Alert sound management for real-time notifications
 * Uses Web Audio API for reliable playback
 */

// Sound URLs - using base64 encoded simple beep tones for instant loading
const SOUND_FREQUENCIES: Record<string, number> = {
  critical: 880,  // High A - urgent
  high: 660,      // E - alert
  medium: 440,    // A - notice
  low: 330,       // E - info
};

const SOUND_DURATIONS: Record<string, number> = {
  critical: 500,
  high: 400,
  medium: 300,
  low: 200,
};

const SOUND_PATTERNS: Record<string, number[]> = {
  critical: [200, 100, 200, 100, 200], // Triple beep
  high: [300, 150, 300],               // Double beep
  medium: [400],                        // Single beep
  low: [250],                           // Short beep
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  
  // Resume if suspended (due to autoplay policies)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  
  return audioContext;
}

function playBeep(frequency: number, duration: number): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getAudioContext();
    if (!ctx) {
      resolve();
      return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Fade in/out to prevent clicks
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);

    oscillator.start(now);
    oscillator.stop(now + duration / 1000);

    oscillator.onended = () => resolve();
  });
}

/**
 * Play an alert sound based on severity level
 * @param severity - 'critical' | 'high' | 'medium' | 'low'
 */
export async function playAlertSound(severity: string = 'medium'): Promise<void> {
  const normalizedSeverity = severity?.toLowerCase() || 'medium';
  const frequency = SOUND_FREQUENCIES[normalizedSeverity] || SOUND_FREQUENCIES.medium;
  const pattern = SOUND_PATTERNS[normalizedSeverity] || SOUND_PATTERNS.medium;

  try {
    for (let i = 0; i < pattern.length; i++) {
      const duration = pattern[i];
      await playBeep(frequency, duration);
      
      // Gap between beeps (if not last)
      if (i < pattern.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (e) {
    console.warn('Could not play alert sound:', e);
  }
}

/**
 * Pre-warm audio context (call on user interaction)
 */
export function initializeAudio(): void {
  getAudioContext();
}

/**
 * Test sound playback
 */
export async function testAlertSound(severity: string = 'medium'): Promise<void> {
  await playAlertSound(severity);
}

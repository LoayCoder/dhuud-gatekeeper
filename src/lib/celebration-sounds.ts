/**
 * Celebration sound effects using Web Audio API
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Play a victory/celebration jingle
export async function playCelebrationSound(): Promise<void> {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create a pleasant ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const noteDuration = 0.12;
    
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + i * noteDuration);
      
      gainNode.gain.setValueAtTime(0, now + i * noteDuration);
      gainNode.gain.linearRampToValueAtTime(0.3, now + i * noteDuration + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * noteDuration + noteDuration * 2);
      
      oscillator.start(now + i * noteDuration);
      oscillator.stop(now + i * noteDuration + noteDuration * 2);
    });
    
    // Add a final chord
    const chordDelay = notes.length * noteDuration;
    const chordFreqs = [523.25, 659.25, 783.99];
    
    chordFreqs.forEach((freq) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(freq, now + chordDelay);
      
      gainNode.gain.setValueAtTime(0, now + chordDelay);
      gainNode.gain.linearRampToValueAtTime(0.2, now + chordDelay + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + chordDelay + 0.5);
      
      oscillator.start(now + chordDelay);
      oscillator.stop(now + chordDelay + 0.5);
    });
  } catch (error) {
    console.warn('Could not play celebration sound:', error);
  }
}

// Play a badge unlock sound
export async function playBadgeUnlockSound(): Promise<void> {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Magical sparkle sound
    const sparkles = [880, 1108.73, 1318.51, 1760]; // A5, C#6, E6, A6
    
    sparkles.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + i * 0.08);
      
      gainNode.gain.setValueAtTime(0, now + i * 0.08);
      gainNode.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.3);
      
      oscillator.start(now + i * 0.08);
      oscillator.stop(now + i * 0.08 + 0.3);
    });
  } catch (error) {
    console.warn('Could not play badge sound:', error);
  }
}

// Play challenge complete fanfare
export async function playChallengeCompleteSound(): Promise<void> {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Triumphant fanfare
    const fanfare = [
      { freq: 392, start: 0, duration: 0.15 },      // G4
      { freq: 523.25, start: 0.15, duration: 0.15 }, // C5
      { freq: 659.25, start: 0.3, duration: 0.15 },  // E5
      { freq: 783.99, start: 0.45, duration: 0.4 },  // G5 (held)
    ];
    
    fanfare.forEach(({ freq, start, duration }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(freq, now + start);
      
      gainNode.gain.setValueAtTime(0, now + start);
      gainNode.gain.linearRampToValueAtTime(0.15, now + start + 0.02);
      gainNode.gain.setValueAtTime(0.15, now + start + duration - 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + start + duration);
      
      oscillator.start(now + start);
      oscillator.stop(now + start + duration);
    });
  } catch (error) {
    console.warn('Could not play challenge sound:', error);
  }
}

// Initialize audio context (call on user interaction)
export function initializeCelebrationAudio(): void {
  getAudioContext();
}

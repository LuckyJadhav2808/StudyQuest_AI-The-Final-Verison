/**
 * StudyQuest Sound Effects — Web Audio API
 * Supports swappable sound packs from the Item Shop.
 * No audio files needed, generates synth tones in-browser.
 */

import { getActiveSoundPack } from '@/hooks/useCustomization';

let audioCtx: AudioContext | null = null;
let cachedGlobalVolume: number | null = null;
let cachedKeyboardTicks: boolean | null = null;

function getCachedVolume(): number {
  if (cachedGlobalVolume !== null) return cachedGlobalVolume;
  if (typeof window === 'undefined') return 100;
  try {
    const val = localStorage.getItem('sq-sound-volume');
    cachedGlobalVolume = val !== null ? parseInt(val, 10) : 100;
  } catch {
    cachedGlobalVolume = 100;
  }
  return cachedGlobalVolume;
}

function getCachedKeyboardTicks(): boolean {
  if (cachedKeyboardTicks !== null) return cachedKeyboardTicks;
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem('sq-keyboard-ticks');
    cachedKeyboardTicks = val !== 'false';
  } catch {
    cachedKeyboardTicks = true;
  }
  return cachedKeyboardTicks;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'sq-sound-volume') cachedGlobalVolume = null;
    if (e.key === 'sq-keyboard-ticks') cachedKeyboardTicks = null;
  });
}

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const globalVolume = getCachedVolume();
    if (globalVolume <= 0) return;

    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    const scaledVolume = volume * (globalVolume / 100);
    gain.gain.setValueAtTime(scaledVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio not available
  }
}

/** Quick ascending chime — task complete, quest done, habit toggled */
export function playSuccess() {
  const pack = getActiveSoundPack();
  pack.successFreqs.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'sine', 0.12), i * 80);
  });
}

/** Celebratory fanfare — Pomodoro complete, level up */
export function playCelebration() {
  const pack = getActiveSoundPack();
  pack.celebrationFreqs.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'triangle', 0.1), i * 120);
  });
}

/** Soft click — toggle, selection */
export function playClick() {
  const pack = getActiveSoundPack();
  playTone(pack.clickFreq, 0.05, pack.clickWave, 0.08);
}

/** Notification ping — alerts, friend requests */
export function playNotify() {
  const pack = getActiveSoundPack();
  playTone(pack.notifyFreqs[0], 0.1, 'sine', 0.1);
  setTimeout(() => playTone(pack.notifyFreqs[1], 0.15, 'sine', 0.08), 100);
}

/** Error buzz */
export function playError() {
  const pack = getActiveSoundPack();
  playTone(pack.errorFreq, 0.15, pack.errorWave, 0.06);
}

/** XP award sparkle */
export function playXP() {
  const pack = getActiveSoundPack();
  pack.xpFreqs.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.1, 'sine', 0.06), i * 60);
  });
}

/** Simulate mechanical keyboard click (Cherry MX style click) */
export function playKeyboardClick() {
  try {
    if (!getCachedKeyboardTicks()) return;

    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const globalVolume = getCachedVolume();
    if (globalVolume <= 0) return;

    // Pitch variance for organic click feel
    const pitch = 850 + Math.random() * 300;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);

    const scaledVolume = 0.04 * (globalVolume / 100);
    gain.gain.setValueAtTime(scaledVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.025);
  } catch {
    // Fail silently
  }
}

/**
 * Ultra-subtle tactile haptic click tick (like iPhone Taptic / Switch joycon click)
 * Plays a 15ms micro-pulse with mobile physical vibration fallback.
 */
export function playHapticTick() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }

    const globalVolume = getCachedVolume();
    if (globalVolume <= 0) return;

    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.015);

    const scaledVolume = 0.025 * (globalVolume / 100);
    gain.gain.setValueAtTime(scaledVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.015);
  } catch {}
}

/**
 * Resonant Tibetan Singing Bowl / Mindfulness Gong (528Hz Solfeggio clarity frequency)
 * Uses harmonic overtones with a 2.5s gentle exponential decay for Pomodoro & focus completions.
 */
export function playTimerBell() {
  try {
    const globalVolume = getCachedVolume();
    if (globalVolume <= 0) return;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([30, 80, 40]);
      } catch {}
    }

    const ctx = getCtx();
    const now = ctx.currentTime;
    const duration = 2.4;

    const harmonics = [
      { freq: 528, gain: 0.15 },   // Fundamental (528 Hz)
      { freq: 1056, gain: 0.08 },  // 1st overtone
      { freq: 1584, gain: 0.04 },  // 2nd overtone
      { freq: 264, gain: 0.06 },   // Sub-harmonic warm body
    ];

    harmonics.forEach(({ freq, gain: baseGain }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const scaledGain = baseGain * (globalVolume / 100);
      // Fast soft attack (8ms) to prevent speaker popping
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(scaledGain, now + 0.008);
      // Smooth exponential decay
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    });
  } catch {}
}

/**
 * Triumphant 5-note Pentatonic Ascension Arpeggio for Level-Ups and Epic Quest Completions
 */
export function playLevelUpArpeggio() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 40, 20, 50, 80]);
      } catch {}
    }

    // A Major Pentatonic: A4 (440Hz), C#5 (554.37Hz), E5 (659.25Hz), A5 (880Hz), C#6 (1108.73Hz)
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 0.28, i === notes.length - 1 ? 'sine' : 'triangle', 0.14);
      }, i * 75);
    });
  } catch {}
}

/**
 * StudyQuest Sound Effects — Web Audio API
 * Supports swappable sound packs from the Item Shop.
 * No audio files needed, generates synth tones in-browser.
 */

import { getActiveSoundPack } from '@/hooks/useCustomization';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
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

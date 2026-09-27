/**
 * StudyQuest Companion Audio & Tactile Haptics Controller
 * Generates tactile Web Audio sound sprites for pet vocalizations & mobile vibrations.
 * Requires zero external audio assets; resilient against autoplay restrictions.
 */

import { PetSpecies } from '@/types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Check if sounds are globally enabled or volume is non-zero */
function getEffectiveVolume(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const volStr = localStorage.getItem('sq-sound-volume');
    if (volStr !== null) {
      const vol = parseInt(volStr, 10);
      if (isNaN(vol) || vol <= 0) return 0;
      return Math.min(1, vol / 100);
    }
    return 0.8;
  } catch {
    return 0.8;
  }
}

/** Trigger mobile haptic feedback if supported */
export function triggerHaptic(pattern: number | number[] = 15): void {
  if (typeof window === 'undefined') return;
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently ignore if haptics are not supported or blocked
  }
}

/** Play a frequency glide tone with an exponential decay */
function playGlideTone(
  startFreq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.12
) {
  const effectiveVol = getEffectiveVolume();
  if (effectiveVol <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    const targetGain = volume * effectiveVol;
    gain.gain.setValueAtTime(targetGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Silently handle audio engine exceptions
  }
}

/** Play species-specific happy vocalization */
export function playCompanionVocal(species: PetSpecies = 'owl') {
  triggerHaptic(20);

  switch (species) {
    case 'cat':
      // Sweet kitty meow / chirp glide (high pitch bend up then down)
      playGlideTone(680, 840, 0.12, 'triangle', 0.1);
      setTimeout(() => playGlideTone(840, 620, 0.18, 'sine', 0.08), 90);
      break;

    case 'dragon':
      // Playful cute dragon chirp with warm undertone
      playGlideTone(340, 520, 0.14, 'triangle', 0.12);
      setTimeout(() => playGlideTone(520, 410, 0.16, 'sine', 0.1), 100);
      break;

    case 'owl':
    default:
      // Scholarly double hoot: "Hoo-hoo"
      playGlideTone(560, 620, 0.12, 'sine', 0.12);
      setTimeout(() => playGlideTone(590, 650, 0.16, 'sine', 0.14), 130);
      break;
  }
}

/** Soft purr / rumble vibration on prolonged petting */
export function playPurrSound() {
  triggerHaptic([10, 30, 10, 30, 15]);
  const effectiveVol = getEffectiveVolume();
  if (effectiveVol <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.35);

    gain.gain.setValueAtTime(0.06 * effectiveVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {}
}

/** Feeding crunch / munch sound */
export function playMunchSound() {
  triggerHaptic([15, 20, 15]);
  playGlideTone(520, 340, 0.08, 'triangle', 0.12);
  setTimeout(() => playGlideTone(460, 310, 0.09, 'sine', 0.11), 110);
  setTimeout(() => playGlideTone(540, 360, 0.12, 'sine', 0.14), 220);
}

/** Level-up & quest celebration fanfare chime */
export function playCompanionCelebration() {
  triggerHaptic([20, 40, 20, 60, 40]);
  const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  chords.forEach((freq, idx) => {
    setTimeout(() => {
      playGlideTone(freq, freq * 1.02, 0.28, 'triangle', 0.1);
    }, idx * 90);
  });
}

/** Peaceful sleeping snore / breathing whistle */
export function playSnoreSound() {
  playGlideTone(320, 260, 0.45, 'sine', 0.05);
}

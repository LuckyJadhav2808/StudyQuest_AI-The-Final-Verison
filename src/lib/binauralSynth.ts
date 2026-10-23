/**
 * StudyQuest AI — Native Web Audio Binaural & Focus Sound Synthesizer
 * 
 * Generates pure client-side psychoacoustic soundscapes using the HTML5 Web Audio API:
 * - Real Binaural Beats (Alpha 10Hz, Beta 18Hz, Gamma 40Hz, Theta 6Hz) with stereo panning
 * - Calibrated Pink & Brown Noise for masking ambient distractions
 * - 100% Offline: Zero bandwidth, zero network requests, zero audio dropouts.
 */

export type BinauralPresetId =
  | 'gamma-focus'
  | 'beta-coding'
  | 'alpha-creative'
  | 'theta-meditation'
  | 'brown-noise'
  | 'pink-noise';

export interface BinauralPreset {
  id: BinauralPresetId;
  name: string;
  subtitle: string;
  emoji: string;
  category: 'binaural' | 'noise';
  carrierHz?: number;
  beatHz?: number;
  noiseType?: 'brown' | 'pink';
  description: string;
}

export const BINAURAL_PRESETS: BinauralPreset[] = [
  {
    id: 'gamma-focus',
    name: 'Gamma 40Hz (Deep Focus)',
    subtitle: 'High-intensity problem solving & memory retention',
    emoji: '⚡',
    category: 'binaural',
    carrierHz: 200,
    beatHz: 40,
    description: '40Hz Gamma wave entrainment for deep concentration, DSA coding, and intense study sessions.',
  },
  {
    id: 'beta-coding',
    name: 'Beta 18Hz (Active Flow)',
    subtitle: 'Alertness, logic & debugging state',
    emoji: '🧠',
    category: 'binaural',
    carrierHz: 216,
    beatHz: 18,
    description: '18Hz Beta waves stimulate active thinking, logical analysis, and fast problem solving.',
  },
  {
    id: 'alpha-creative',
    name: 'Alpha 10Hz (Calm Clarity)',
    subtitle: 'Relaxed focus, reading & note-taking',
    emoji: '🌿',
    category: 'binaural',
    carrierHz: 210,
    beatHz: 10,
    description: '10Hz Alpha waves induce calm mental clarity without drowsiness, ideal for reading long scrolls.',
  },
  {
    id: 'theta-meditation',
    name: 'Theta 6Hz (Deep Rest)',
    subtitle: 'Pre-exam calm, stress relief & revision',
    emoji: '🌌',
    category: 'binaural',
    carrierHz: 180,
    beatHz: 6,
    description: '6Hz Theta waves for deep relaxation, intuitive thinking, and cognitive decompression.',
  },
  {
    id: 'brown-noise',
    name: 'Warm Brown Noise',
    subtitle: 'Deep low-frequency rumble like a waterfall',
    emoji: '🌊',
    category: 'noise',
    noiseType: 'brown',
    description: 'Gentle, warm soundscape that masks sudden background noises and chatter.',
  },
  {
    id: 'pink-noise',
    name: 'Velvet Pink Noise',
    subtitle: 'Balanced acoustic spectrum like gentle rain',
    emoji: '🌧️',
    category: 'noise',
    noiseType: 'pink',
    description: 'Balanced 1/f frequency spectrum proven to enhance sustained reading endurance.',
  },
];

class BinauralSynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentPreset: BinauralPresetId | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.4;

  // Active oscillator/source references for cleanup
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getStatus(): { isPlaying: boolean; currentPreset: BinauralPresetId | null; volume: number } {
    return {
      isPlaying: this.isPlaying,
      currentPreset: this.currentPreset,
      volume: this.volume,
    };
  }

  public stop(): void {
    if (!this.isPlaying) return;

    if (this.masterGain && this.ctx) {
      // Smooth fade out over 100ms to eliminate clicks/pops
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }

    setTimeout(() => {
      if (this.leftOsc) {
        try { this.leftOsc.stop(); this.leftOsc.disconnect(); } catch {}
        this.leftOsc = null;
      }
      if (this.rightOsc) {
        try { this.rightOsc.stop(); this.rightOsc.disconnect(); } catch {}
        this.rightOsc = null;
      }
      if (this.noiseSource) {
        try { this.noiseSource.stop(); this.noiseSource.disconnect(); } catch {}
        this.noiseSource = null;
      }
      this.isPlaying = false;
      this.currentPreset = null;
    }, 120);
  }

  public play(presetId: BinauralPresetId): void {
    if (typeof window === 'undefined') return;

    const preset = BINAURAL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    // Stop current audio if playing
    this.stop();

    setTimeout(() => {
      const ctx = this.initContext();
      if (!this.masterGain) return;

      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.1);

      if (preset.category === 'binaural' && preset.carrierHz && preset.beatHz) {
        this.startBinauralBeats(ctx, preset.carrierHz, preset.beatHz);
      } else if (preset.category === 'noise') {
        this.startNoise(ctx, preset.noiseType || 'brown');
      }

      this.isPlaying = true;
      this.currentPreset = presetId;
    }, 130);
  }

  private startBinauralBeats(ctx: AudioContext, carrier: number, beat: number): void {
    // Left ear oscillator
    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(carrier, ctx.currentTime);

    const leftPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (leftPan) leftPan.pan.setValueAtTime(-1, ctx.currentTime);

    const leftGain = ctx.createGain();
    leftGain.gain.setValueAtTime(0.5, ctx.currentTime);

    if (leftPan) {
      leftOsc.connect(leftGain).connect(leftPan).connect(this.masterGain!);
    } else {
      leftOsc.connect(leftGain).connect(this.masterGain!);
    }

    // Right ear oscillator
    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(carrier + beat, ctx.currentTime);

    const rightPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (rightPan) rightPan.pan.setValueAtTime(1, ctx.currentTime);

    const rightGain = ctx.createGain();
    rightGain.gain.setValueAtTime(0.5, ctx.currentTime);

    if (rightPan) {
      rightOsc.connect(rightGain).connect(rightPan).connect(this.masterGain!);
    } else {
      rightOsc.connect(rightGain).connect(this.masterGain!);
    }

    leftOsc.start();
    rightOsc.start();

    this.leftOsc = leftOsc;
    this.rightOsc = rightOsc;
  }

  private startNoise(ctx: AudioContext, type: 'pink' | 'brown'): void {
    const bufferSize = 5 * ctx.sampleRate; // 5-second seamless loop buffer
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    if (type === 'pink') {
      // Paul Kellet's filtered pink noise algorithm
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
        leftChannel[i] = sample;
        rightChannel[i] = sample;
      }
    } else {
      // Brown noise (integrated random walk)
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        leftChannel[i] = lastOut * 3.5;
        rightChannel[i] = lastOut * 3.5;
      }
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // Filter out piercing highs
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'brown' ? 500 : 1200, ctx.currentTime);

    noiseSource.connect(filter).connect(this.masterGain!);
    noiseSource.start();

    this.noiseSource = noiseSource;
  }
}

// Singleton audio engine instance
export const binauralSynth = new BinauralSynthEngine();

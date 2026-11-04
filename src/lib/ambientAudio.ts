// Procedural ambient Web Audio API engine (Binaural Beats, Ocean Waves, Rain)
// 100% self-contained in the browser — requires 0 external audio assets.

export type ScapeKind = 'binaural' | 'waves' | 'rain';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let stopCurrent: (() => void) | null = null;
let volume = 0.6;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

function noiseBuffer(c: AudioContext, brown: boolean): AudioBuffer {
  const len = c.sampleRate * 4;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        d[i] = w;
      }
    }
  }
  return buf;
}

export function setAmbientVolume(v: number) {
  volume = v;
  if (master && ctx) {
    master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  }
}

export function stopAmbient() {
  stopCurrent?.();
  stopCurrent = null;
}

export function playAmbient(kind: ScapeKind) {
  stopAmbient();
  const c = getCtx();
  const out = c.createGain();
  out.gain.value = 0;
  out.connect(master!);
  out.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
  const sources: AudioScheduledSourceNode[] = [];

  const noise = (brown: boolean) => {
    const s = c.createBufferSource();
    s.buffer = noiseBuffer(c, brown);
    s.loop = true;
    sources.push(s);
    return s;
  };

  const osc = (type: OscillatorType, freq: number) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    sources.push(o);
    return o;
  };

  if (kind === 'binaural') {
    // 10Hz alpha-wave binaural beat + soft chord pad
    const l = osc('sine', 174);
    const r = osc('sine', 184);
    const pl = c.createStereoPanner();
    pl.pan.value = -1;
    const pr = c.createStereoPanner();
    pr.pan.value = 1;
    const bg = c.createGain();
    bg.gain.value = 0.14;
    l.connect(pl).connect(bg);
    r.connect(pr).connect(bg);
    bg.connect(out);

    const pad = c.createGain();
    pad.gain.value = 0.05;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    [110, 138.59, 164.81, 220].forEach((f, i) => {
      const o = osc('triangle', f);
      o.detune.value = i * 4 - 6;
      o.connect(pad);
    });
    pad.connect(lp).connect(out);

    const lfo = osc('sine', 0.07);
    const lg = c.createGain();
    lg.gain.value = 0.03;
    lfo.connect(lg).connect(pad.gain);

    const n = noise(true);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const ng = c.createGain();
    ng.gain.value = 0.05;
    n.connect(hp).connect(ng).connect(out);
  } else if (kind === 'waves') {
    const n = noise(true);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const g = c.createGain();
    g.gain.value = 0.5;
    n.connect(lp).connect(g).connect(out);

    const lfo = osc('sine', 0.11);
    const lg = c.createGain();
    lg.gain.value = 0.38;
    lfo.connect(lg).connect(g.gain);

    const hiss = noise(false);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    const hg = c.createGain();
    hg.gain.value = 0.04;
    hiss.connect(hp).connect(hg).connect(out);
    const lg2 = c.createGain();
    lg2.gain.value = 0.035;
    lfo.connect(lg2).connect(hg.gain);
  } else {
    // Rain ambience
    const n = noise(false);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7500;
    const g = c.createGain();
    g.gain.value = 0.32;
    n.connect(hp).connect(lp).connect(g).connect(out);

    const rumble = noise(true);
    const rg = c.createGain();
    rg.gain.value = 0.22;
    rumble.connect(rg).connect(out);
  }

  sources.forEach((s) => s.start());

  stopCurrent = () => {
    const t = c.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setTargetAtTime(0, t, 0.15);
    window.setTimeout(() => {
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          // ignore
        }
      });
    }, 200);
  };
}

'use client';

import { useEffect } from 'react';
import { useShop } from '@/hooks/useShop';

// ── Custom Cursor Definitions ──
// Each cursor ships both a default and pointer variant as CSS data-URLs.
const CURSOR_PACKS: Record<string, { default: string; pointer: string }> = {
  'cursor-wand': {
    default: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E🪄%3C/text%3E%3C/svg%3E") 4 4, auto`,
    pointer: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E✨%3C/text%3E%3C/svg%3E") 4 4, pointer`,
  },
  'cursor-sword': {
    default: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E⚔️%3C/text%3E%3C/svg%3E") 4 4, auto`,
    pointer: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E🗡️%3C/text%3E%3C/svg%3E") 4 4, pointer`,
  },
};

// ── Profile Border Glow Styles ──
const BORDER_STYLES: Record<string, { color: string; glow: string; animation?: string }> = {
  'border-crystal': {
    color: '#3B82F6',
    glow: '0 0 12px rgba(59, 130, 246, 0.5), 0 0 24px rgba(59, 130, 246, 0.2)',
  },
  'border-flame': {
    color: '#EF4444',
    glow: '0 0 12px rgba(239, 68, 68, 0.5), 0 0 24px rgba(239, 68, 68, 0.2)',
    animation: 'flameBorder 2s ease-in-out infinite alternate',
  },
  'border-celestial': {
    color: '#F59E0B',
    glow: '0 0 16px rgba(245, 158, 11, 0.6), 0 0 32px rgba(245, 158, 11, 0.3)',
    animation: 'celestialBorder 3s ease-in-out infinite alternate',
  },
};

// ── Sound Pack Definitions ──
// Each pack overrides the tone waveforms/frequencies used by the sound system.
export interface SoundPack {
  name: string;
  successFreqs: number[];
  clickFreq: number;
  clickWave: OscillatorType;
  celebrationFreqs: number[];
  xpFreqs: number[];
  notifyFreqs: [number, number];
  errorFreq: number;
  errorWave: OscillatorType;
}

export const SOUND_PACKS: Record<string, SoundPack> = {
  default: {
    name: 'Default',
    successFreqs: [523, 659, 784],
    clickFreq: 800,
    clickWave: 'sine',
    celebrationFreqs: [523, 659, 784, 1047],
    xpFreqs: [1047, 1319, 1568],
    notifyFreqs: [880, 1100],
    errorFreq: 200,
    errorWave: 'sawtooth',
  },
  'sound-retro': {
    name: 'Retro 8-bit',
    successFreqs: [262, 330, 392],    // lower, chiptune-like
    clickFreq: 600,
    clickWave: 'square',               // square wave = classic 8-bit
    celebrationFreqs: [262, 330, 392, 523],
    xpFreqs: [523, 659, 784],
    notifyFreqs: [440, 880],
    errorFreq: 150,
    errorWave: 'square',
  },
  'sound-nature': {
    name: 'Nature',
    successFreqs: [396, 528, 639],     // calmer, Solfeggio-inspired
    clickFreq: 440,
    clickWave: 'sine',
    celebrationFreqs: [396, 528, 639, 741],
    xpFreqs: [741, 852, 963],
    notifyFreqs: [528, 639],
    errorFreq: 174,
    errorWave: 'sine',
  },
};

// ── Global variable so the sound system can read the active pack ──
let _activeSoundPack: SoundPack = SOUND_PACKS['default'];

export function getActiveSoundPack(): SoundPack {
  return _activeSoundPack;
}

/**
 * useCustomization — Reads equipped shop items and applies visual effects globally.
 * Should be mounted once in the app Providers.
 */
export function useCustomization() {
  const { inventory } = useShop();
  const equipped = inventory.equippedItems || {};

  // ════════════════════════════════════════════════
  // 1) CURSOR — Inject a <style> tag that overrides the default cursor rules
  //    with higher specificity (!important) when a custom cursor is equipped.
  // ════════════════════════════════════════════════
  useEffect(() => {
    const cursorId = equipped['cursor'];
    const styleId = 'sq-custom-cursor-style';
    let existing = document.getElementById(styleId);

    if (cursorId && CURSOR_PACKS[cursorId]) {
      const pack = CURSOR_PACKS[cursorId];
      const css = `
        /* Custom shop cursor override — higher specificity than globals.css */
        html *, html *::before, html *::after {
          cursor: ${pack.default} !important;
        }
        html a, html button, html [role="button"],
        html input[type="submit"], html input[type="button"],
        html input[type="checkbox"], html input[type="radio"],
        html select, html label[for], html .cursor-pointer, html summary {
          cursor: ${pack.pointer} !important;
        }
        /* Preserve text cursor on editable elements */
        html input[type="text"], html input[type="email"], html input[type="password"],
        html input[type="search"], html input[type="url"], html input[type="number"],
        html input[type="tel"], html input:not([type]), html textarea,
        html [contenteditable="true"], html [contenteditable=""], html [role="textbox"],
        html .cm-editor, html .cm-content, html .monaco-editor, html .ProseMirror,
        html pre[contenteditable], html code[contenteditable] {
          cursor: text !important;
        }
      `;
      if (!existing) {
        existing = document.createElement('style');
        existing.id = styleId;
        document.head.appendChild(existing);
      }
      existing.textContent = css;
    } else {
      if (existing) existing.remove();
    }

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [equipped]);

  // ════════════════════════════════════════════════
  // 2) BORDER — Inject global CSS for `.custom-avatar-border` class
  //    and set CSS variables that AvatarBorder can read.
  // ════════════════════════════════════════════════
  useEffect(() => {
    const borderId = equipped['border'];
    const styleId = 'sq-custom-border-style';
    let existing = document.getElementById(styleId);

    if (borderId && BORDER_STYLES[borderId]) {
      const bs = BORDER_STYLES[borderId];
      // Set a data attribute on <html> so any component can check
      document.documentElement.setAttribute('data-custom-border', borderId);
      document.documentElement.style.setProperty('--custom-border-color', bs.color);
      document.documentElement.style.setProperty('--custom-border-glow', bs.glow);

      const css = `
        @keyframes flameBorder {
          0% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.4), 0 0 16px rgba(239, 68, 68, 0.15); }
          100% { box-shadow: 0 0 16px rgba(239, 68, 68, 0.7), 0 0 32px rgba(239, 68, 68, 0.3); }
        }
        @keyframes celestialBorder {
          0% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.4), 0 0 24px rgba(245, 158, 11, 0.2); }
          50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.7), 0 0 40px rgba(245, 158, 11, 0.35); }
          100% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.4), 0 0 24px rgba(245, 158, 11, 0.2); }
        }
      `;
      if (!existing) {
        existing = document.createElement('style');
        existing.id = styleId;
        document.head.appendChild(existing);
      }
      existing.textContent = css;
    } else {
      document.documentElement.removeAttribute('data-custom-border');
      document.documentElement.style.removeProperty('--custom-border-color');
      document.documentElement.style.removeProperty('--custom-border-glow');
      if (existing) existing.remove();
    }

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [equipped]);

  // ════════════════════════════════════════════════
  // 3) SOUND PACK — Update the global sound pack variable
  // ════════════════════════════════════════════════
  useEffect(() => {
    const soundId = equipped['sound'];
    if (soundId && SOUND_PACKS[soundId]) {
      _activeSoundPack = SOUND_PACKS[soundId];
    } else {
      _activeSoundPack = SOUND_PACKS['default'];
    }
  }, [equipped]);

  // Return equipped items info for components that need it
  return {
    equippedCursor: equipped['cursor'] || null,
    equippedBorder: equipped['border'] || null,
    equippedSound: equipped['sound'] || null,
    hasBorderEffect: !!(equipped['border'] && BORDER_STYLES[equipped['border']]),
    borderStyle: equipped['border'] ? BORDER_STYLES[equipped['border']] : null,
  };
}

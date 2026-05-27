'use client';

import { useEffect } from 'react';
import { useShop } from '@/hooks/useShop';

// Custom cursor SVG data URLs
const CURSORS: Record<string, string> = {
  'cursor-wand': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='24' font-size='24'%3E🪄%3C/text%3E%3C/svg%3E") 4 4, auto`,
  'cursor-sword': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='24' font-size='24'%3E⚔️%3C/text%3E%3C/svg%3E") 4 4, auto`,
};

// Profile border glow styles
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

/**
 * useCustomization — Reads equipped shop items and applies visual effects globally.
 * Should be mounted once in the app Providers.
 */
export function useCustomization() {
  const { inventory } = useShop();
  const equipped = inventory.equippedItems || {};

  // Apply custom cursor
  useEffect(() => {
    const cursorId = equipped['cursor'];
    if (cursorId && CURSORS[cursorId]) {
      document.body.style.cursor = CURSORS[cursorId];
    } else {
      document.body.style.cursor = '';
    }
    return () => { document.body.style.cursor = ''; };
  }, [equipped]);

  // Inject global border animation keyframes + CSS variable overrides
  useEffect(() => {
    const borderId = equipped['border'];
    const styleId = 'sq-custom-border-style';
    let existing = document.getElementById(styleId);

    if (borderId && BORDER_STYLES[borderId]) {
      const bs = BORDER_STYLES[borderId];
      const css = `
        :root {
          --custom-border-color: ${bs.color};
          --custom-border-glow: ${bs.glow};
        }
        @keyframes flameBorder {
          0% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.4), 0 0 16px rgba(239, 68, 68, 0.15); }
          100% { box-shadow: 0 0 16px rgba(239, 68, 68, 0.7), 0 0 32px rgba(239, 68, 68, 0.3); }
        }
        @keyframes celestialBorder {
          0% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.4), 0 0 24px rgba(245, 158, 11, 0.2); }
          50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.7), 0 0 40px rgba(245, 158, 11, 0.35); }
          100% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.4), 0 0 24px rgba(245, 158, 11, 0.2); }
        }
        .custom-avatar-border {
          border: 3px solid var(--custom-border-color, transparent) !important;
          box-shadow: var(--custom-border-glow, none);
          ${bs.animation ? `animation: ${bs.animation};` : ''}
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
      document.documentElement.style.removeProperty('--custom-border-color');
      document.documentElement.style.removeProperty('--custom-border-glow');
    }

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
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

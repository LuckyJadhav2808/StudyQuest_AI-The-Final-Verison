'use client';

import React, { useEffect, useRef } from 'react';

/**
 * QuestCursor — High-performance custom cursor.
 * Zero React re-renders: all visual updates happen via direct DOM manipulation
 * inside a single requestAnimationFrame loop.
 */

const CLICKABLE = 'a,button,[role="button"],input[type="submit"],input[type="button"],select,summary,label[for],.cursor-pointer';
const TEXT_INPUT = 'input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"],[contenteditable=""],[role="textbox"],.cm-content,.ProseMirror';

export default function QuestCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    const mouse = { x: -100, y: -100 };
    const smooth = { x: -100, y: -100 };
    let isHovering = false;
    let isText = false;
    let isClicking = false;
    let isVisible = false;
    let checkCounter = 0; // throttle elementFromPoint

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      isVisible = true;

      // Only check element every 4th move event to reduce layout thrashing
      checkCounter++;
      if (checkCounter % 4 === 0) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el) {
          isText = !!(el.matches(TEXT_INPUT) || el.closest(TEXT_INPUT));
          isHovering = !isText && !!(el.matches(CLICKABLE) || el.closest(CLICKABLE));
        } else {
          isText = false;
          isHovering = false;
        }
      }
    };

    const onDown = () => { isClicking = true; };
    const onUp = () => { isClicking = false; };
    const onLeave = () => { isVisible = false; };
    const onEnter = () => { isVisible = true; };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mousedown', onDown, { passive: true });
    document.addEventListener('mouseup', onUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseenter', onEnter);

    let raf: number;
    const loop = () => {
      // Lerp smooth position
      smooth.x += (mouse.x - smooth.x) * 0.15;
      smooth.y += (mouse.y - smooth.y) * 0.15;

      const outer = outerRef.current;
      const dot = dotRef.current;

      if (outer) {
        const show = isVisible && !isText;
        const size = isHovering ? 44 : 28;
        outer.style.transform = `translate3d(${smooth.x - size / 2}px, ${smooth.y - size / 2}px, 0)`;
        outer.style.width = `${size}px`;
        outer.style.height = `${size}px`;
        outer.style.opacity = show ? (isHovering ? '0.9' : '0.5') : '0';
        outer.style.borderColor = isHovering ? '#EC4899' : '#7C3AED';
        outer.style.boxShadow = isHovering
          ? '0 0 12px rgba(236,72,153,0.35)'
          : '0 0 6px rgba(124,58,237,0.12)';
      }

      if (dot) {
        const show = isVisible && !isText;
        const ds = isClicking ? 6 : 4;
        dot.style.transform = `translate3d(${mouse.x - ds / 2}px, ${mouse.y - ds / 2}px, 0)`;
        dot.style.width = `${ds}px`;
        dot.style.height = `${ds}px`;
        dot.style.opacity = show ? '1' : '0';
        dot.style.background = isHovering ? '#EC4899' : '#7C3AED';
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={outerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 99999,
          borderRadius: '50%',
          border: '2px solid #7C3AED',
          opacity: 0,
          willChange: 'transform',
          transition: 'width 0.15s, height 0.15s, opacity 0.15s, border-color 0.15s',
        }}
      />
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 99999,
          borderRadius: '50%',
          background: '#7C3AED',
          opacity: 0,
          willChange: 'transform',
          transition: 'width 0.1s, height 0.1s, opacity 0.1s',
        }}
      />
    </>
  );
}

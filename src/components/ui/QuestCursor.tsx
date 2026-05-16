'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * QuestCursor — Custom animated cursor that replaces the default system cursor.
 * Shows a purple circle + dot that smoothly follows the mouse.
 * Expands and glows pink when hovering over clickable elements.
 * Hides on mobile/touch devices and when the user is focused on text inputs.
 */

const CLICKABLE_SELECTORS = 'a, button, [role="button"], input[type="submit"], input[type="button"], select, summary, label[for], .cursor-pointer';
const TEXT_INPUT_SELECTORS = 'input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], input[type="number"], input[type="tel"], input:not([type]), textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"], .cm-content, .ProseMirror';

export default function QuestCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isTextFocused, setIsTextFocused] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Hide on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);

      // Check if hovering over a clickable element
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const isClickable = el.matches(CLICKABLE_SELECTORS) || el.closest(CLICKABLE_SELECTORS);
        const isTextInput = el.matches(TEXT_INPUT_SELECTORS) || el.closest(TEXT_INPUT_SELECTORS);
        setHovering(!!isClickable && !isTextInput);
        // Hide custom cursor when over text inputs
        if (isTextInput) {
          setIsTextFocused(true);
        } else {
          setIsTextFocused(false);
        }
      } else {
        setHovering(false);
        setIsTextFocused(false);
      }
    };

    // Track focus/blur on text inputs to hide cursor during typing
    const handleFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.matches(TEXT_INPUT_SELECTORS) || el.closest(TEXT_INPUT_SELECTORS))) {
        setIsTextFocused(true);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const el = e.relatedTarget as HTMLElement | null;
      if (!el || !(el.matches(TEXT_INPUT_SELECTORS) || el.closest(TEXT_INPUT_SELECTORS))) {
        setIsTextFocused(false);
      }
    };

    const handleMouseDown = () => setClicking(true);
    const handleMouseUp = () => setClicking(false);
    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    // Smooth animation loop
    let raf: number;
    const animate = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.15;
      pos.current.y += (target.current.y - pos.current.y) * 0.15;

      if (outerRef.current) {
        outerRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${target.current.x}px, ${target.current.y}px)`;
      }

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
      cancelAnimationFrame(raf);
    };
  }, [visible]);

  if (isTouchDevice) return null;

  // Hide the custom cursor when user is over/focused on text inputs
  const shouldShow = visible && !isTextFocused;
  const outerSize = hovering ? 44 : 28;
  const dotSize = clicking ? 6 : 4;

  return (
    <>
      {/* Outer ring — smooth follow with lag */}
      <div
        ref={outerRef}
        className="fixed top-0 left-0 pointer-events-none z-[99999] transition-[width,height,opacity,border-color,box-shadow] duration-200 ease-out"
        style={{
          width: outerSize,
          height: outerSize,
          marginLeft: -outerSize / 2,
          marginTop: -outerSize / 2,
          borderRadius: '50%',
          border: `2px solid ${hovering ? '#EC4899' : '#7C3AED'}`,
          opacity: shouldShow ? (hovering ? 0.9 : 0.5) : 0,
          boxShadow: hovering
            ? '0 0 15px rgba(236, 72, 153, 0.4), 0 0 30px rgba(124, 58, 237, 0.2)'
            : '0 0 8px rgba(124, 58, 237, 0.15)',
          mixBlendMode: 'screen',
        }}
      />
      {/* Inner dot — instant follow */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[99999] transition-[width,height,background,box-shadow,opacity] duration-150"
        style={{
          width: dotSize,
          height: dotSize,
          marginLeft: -dotSize / 2,
          marginTop: -dotSize / 2,
          borderRadius: '50%',
          background: hovering ? '#EC4899' : '#7C3AED',
          opacity: shouldShow ? 1 : 0,
          boxShadow: `0 0 6px ${hovering ? 'rgba(236, 72, 153, 0.6)' : 'rgba(124, 58, 237, 0.4)'}`,
        }}
      />
    </>
  );
}

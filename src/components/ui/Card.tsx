'use client';

import React, { useRef, useCallback, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  glass?: boolean;
  hover?: boolean;
  glow?: boolean;         // enable mouse-tracking glow (default: true when hover is true)
  padding?: 'none' | 'sm' | 'md' | 'lg';
  gradient?: string;
}

export default function Card({
  children,
  glass = true,
  hover = true,
  glow,
  padding = 'md',
  gradient,
  className,
  style,
  ...props
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const enableGlow = glow ?? hover; // glow defaults to hover value

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableGlow || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setGlowPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [enableGlow]);

  const handleMouseEnter = useCallback(() => {
    if (enableGlow) setIsHovered(true);
  }, [enableGlow]);

  const handleMouseLeave = useCallback(() => {
    if (enableGlow) setIsHovered(false);
  }, [enableGlow]);

  return (
    <motion.div
      ref={cardRef}
      className={clsx(
        'rounded-xl overflow-hidden relative',
        glass && 'card-glass',
        !glass && 'bg-[var(--card-bg)] border border-[var(--card-border)]',
        hover && 'hover:shadow-lg',
        padding === 'sm' && 'p-2.5 sm:p-3',
        padding === 'md' && 'p-4 sm:p-5',
        padding === 'lg' && 'p-4 sm:p-7',
        padding === 'none' && 'p-0',
        className,
      )}
      style={{
        ...(gradient ? { background: gradient } : {}),
        ...style,
      }}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {/* Mouse-tracking glow orb */}
      {enableGlow && isHovered && (
        <div
          className="pointer-events-none absolute z-0 transition-opacity duration-300"
          style={{
            width: 200,
            height: 200,
            left: glowPos.x - 100,
            top: glowPos.y - 100,
            background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
            opacity: 0.5,
            borderRadius: '50%',
            filter: 'blur(20px)',
          }}
        />
      )}

      {/* Content — on top of glow */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

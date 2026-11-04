'use client';

import React, { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

export type Tone = "iris" | "plasma" | "aqua" | "solar" | "mint";

/** Glass panel with 3D tilt + cursor spotlight */
export function Panel({
  tone = "iris",
  className = "",
  area,
  delay = 0,
  children,
  onClick,
}: {
  tone?: Tone;
  className?: string;
  area: string;
  delay?: number;
  children: ReactNode;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);

  const move = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - y) * 2.6}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 3.4}deg`);
  };

  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <section
      ref={ref}
      onMouseMove={move}
      onMouseLeave={leave}
      onClick={onClick}
      className={`panel tone-${tone} flex min-h-0 min-w-0 flex-col p-3 sm:p-3.5 lg:p-4 ${className}`}
      style={{ gridArea: area, animationDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </section>
  );
}

export function IconTile({ icon: Icon, tone, size = 38 }: { icon: LucideIcon | React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>; tone: Tone; size?: number }) {
  return (
    <div className={`tile tone-${tone}`} style={{ width: size, height: size, borderRadius: size * 0.34 }}>
      <Icon size={Math.round(size * 0.48)} strokeWidth={2.3} />
    </div>
  );
}

export function PanelHeader({
  icon,
  tone,
  title,
  tag,
  sub,
  right,
  size = 36,
  tagAlways,
}: {
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  tone: Tone;
  title: string;
  tag?: string;
  sub?: string;
  right?: ReactNode;
  size?: number;
  tagAlways?: boolean;
}) {
  return (
    <header className="flex shrink-0 items-center gap-2.5">
      <IconTile icon={icon} tone={tone} size={size} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h2 className="font-heading truncate text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            {title}
          </h2>
          {tag && <span className={`chip tone-${tone} shrink-0 ${tagAlways ? "inline-flex" : "hidden sm:inline-flex"}`}>{tag}</span>}
        </div>
        {sub && <p className="truncate text-[10px] sm:text-[11px] font-medium text-[var(--tone-text)] opacity-90">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function Chip({ tone, children, className = "" }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={`chip tone-${tone} ${className}`}>{children}</span>;
}

export function Btn({
  tone = "iris",
  children,
  onClick,
  className = "",
  disabled,
  type = "button",
}: {
  tone?: Tone;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`btn tone-${tone} ${className}`}>
      {children}
    </button>
  );
}

export function Modal({
  title,
  icon: Icon,
  tone = "iris",
  onClose,
  children,
  wide,
}: {
  title: string;
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  tone?: Tone;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`panel tone-${tone} relative w-full p-5 sm:p-6 z-10 ${wide ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="mb-4 flex items-center gap-3">
          <IconTile icon={Icon} tone={tone} size={40} />
          <h3 className="font-heading flex-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="raised grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:text-white cursor-pointer">
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

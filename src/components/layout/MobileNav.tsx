'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  HiHome,
  HiClipboardCheck,
  HiClock,
  HiPencilAlt,
  HiDotsHorizontal,
} from 'react-icons/hi';

const MOBILE_NAV_ITEMS = [
  { label: 'Home', href: '/', icon: HiHome },
  { label: 'Tasks', href: '/tasks', icon: HiClipboardCheck },
  { label: 'Timer', href: '/timer', icon: HiClock },
  { label: 'Notes', href: '/notes', icon: HiPencilAlt },
  { label: 'More', href: '/settings', icon: HiDotsHorizontal },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-[var(--card-bg)]/90 backdrop-blur-lg border-t border-[var(--card-border)]">
      <div className="flex items-center justify-around py-1.5 px-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-1 px-3 relative"
            >
              {isActive && (
                <motion.div
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full"
                  layoutId="mobile-active"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                className={`transition-colors ${
                  isActive ? 'text-primary' : 'text-[var(--muted-foreground)]'
                }`}
              />
              <span
                className={`text-[9px] font-semibold transition-colors ${
                  isActive ? 'text-primary' : 'text-[var(--muted-foreground)]'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

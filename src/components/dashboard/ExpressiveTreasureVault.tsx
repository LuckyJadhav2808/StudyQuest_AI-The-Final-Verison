'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playSuccess } from '@/lib/sounds';

interface ExpressiveTreasureVaultProps {
  chestAvailable?: boolean;
  onOpenChest: () => void;
  className?: string;
  size?: number; // default 150
}

type VaultExpression =
  | 'normal'
  | 'blink'
  | 'look-left'
  | 'look-right'
  | 'happy'
  | 'focus'
  | 'night-owl'
  | 'squish'
  | 'sleep';

const VAULT_QUOTES = [
  'Knowledge is the real treasure! 📚',
  'Guarding your precious XP! 🛡️',
  'Cha-ching! Keep that study streak! 💰',
  'Unlocked by your discipline! ⚡',
  'Study hard, loot harder! 🏆',
];

export default function ExpressiveTreasureVault({
  chestAvailable = true,
  onOpenChest,
  className = '',
  size = 150,
}: ExpressiveTreasureVaultProps) {
  const [expression, setExpression] = useState<VaultExpression>('normal');
  const [isSquishing, setIsSquishing] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showSpeech, setShowSpeech] = useState(true);

  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const glanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Dynamic Expression State Machine ────────────────────────
  useEffect(() => {
    // 1. Squish on click takes highest priority
    if (isSquishing) {
      setExpression('squish');
      return;
    }

    // 2. Sleeping state when daily reward is already claimed
    if (!chestAvailable) {
      setExpression('sleep');
      return;
    }

    // 3. Night owl detection (after 9:00 PM)
    const hour = new Date().getHours();
    const isNight = hour >= 21 || hour < 5;

    // 4. Default active state: Happy anticipatory bounce
    setExpression('happy');

    // 5. Autonomous Blinking Loop
    const scheduleBlink = () => {
      const delay = 2800 + Math.random() * 3200;
      blinkTimerRef.current = setTimeout(() => {
        setExpression('blink');
        setTimeout(() => {
          setExpression((prev) => {
            if (prev !== 'blink') return prev;
            return isNight ? 'night-owl' : chestAvailable ? 'happy' : 'normal';
          });
        }, 180);
        scheduleBlink();
      }, delay);
    };

    // 6. Curious Glancing Loop (Pupil left/right shifts)
    const scheduleGlance = () => {
      const delay = 5500 + Math.random() * 6500;
      glanceTimerRef.current = setTimeout(() => {
        const dir: VaultExpression = Math.random() > 0.5 ? 'look-left' : 'look-right';
        setExpression(dir);
        setTimeout(() => {
          setExpression((prev) => {
            if (prev !== dir) return prev;
            return isNight ? 'night-owl' : chestAvailable ? 'happy' : 'normal';
          });
        }, 1500);
        scheduleGlance();
      }, delay);
    };

    scheduleBlink();
    scheduleGlance();

    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      if (glanceTimerRef.current) clearTimeout(glanceTimerRef.current);
    };
  }, [chestAvailable, isSquishing]);

  // Click & Squish Handler
  const handleVaultClick = () => {
    if (chestAvailable) {
      playSuccess();
    } else {
      playClick();
    }
    setIsSquishing(true);
    setQuoteIndex((prev) => (prev + 1) % VAULT_QUOTES.length);
    setTimeout(() => setIsSquishing(false), 650);
    onOpenChest();
  };

  // Pupil horizontal shift offset for curious glancing
  const pupilShiftX = useMemo(() => {
    if (expression === 'look-left') return -4;
    if (expression === 'look-right') return 4;
    return 0;
  }, [expression]);

  const currentSpeechText = useMemo(() => {
    if (isSquishing) return 'Opening Daily Bounty! 🌟';
    if (!chestAvailable) return 'Vault Secured • Rest Well 💤';
    if (quoteIndex > 0) return VAULT_QUOTES[quoteIndex % VAULT_QUOTES.length];
    return 'Daily Loot Ready! Tap Me ✨';
  }, [isSquishing, chestAvailable, quoteIndex]);

  return (
    <div
      className={`relative select-none flex flex-col items-center justify-center cursor-pointer group ${className}`}
      onClick={handleVaultClick}
      title={chestAvailable ? 'Tap to open your daily study loot!' : 'Vault secured for today! Rest well'}
      style={{ width: size, height: size * 0.95 }}
    >
      {/* ── TACTILE FLOATING SPEECH BUBBLE ── */}
      <AnimatePresence>
        {showSpeech && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="absolute -top-10 z-30 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-400/40 text-white shadow-xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="text-xs">{chestAvailable ? '🎁' : '🔒'}</span>
            <span className="text-[11px] font-heading font-black text-amber-300 tracking-wide">
              {currentSpeechText}
            </span>
            {/* Bubble arrow down */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-b border-r border-amber-400/40 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AMBIENT LUMINESCENCE AURA DISK ── */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl pointer-events-none transition-all duration-700 ${
          chestAvailable
            ? 'bg-gradient-to-tr from-amber-500/35 via-orange-500/30 to-yellow-400/25 scale-125 group-hover:scale-150 animate-pulse'
            : 'bg-indigo-500/15 scale-100'
        }`}
      />

      {/* ── FLOATING XP CRYSTALS, COIN & HOURGLASS PROPS ── */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {/* Floating Amethyst XP Crystal (Left) */}
        <motion.div
          animate={{ y: [0, -7, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-3 top-3 text-base filter drop-shadow-[0_0_8px_rgba(168,85,247,0.85)]"
        >
          💎
        </motion.div>

        {/* Floating Golden Coin (Right) */}
        <motion.div
          animate={{ y: [0, -9, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="absolute -right-2 top-2 text-base filter drop-shadow-[0_0_8px_rgba(234,179,8,0.85)]"
        >
          🪙
        </motion.div>

        {/* Floating Magic Sparkle (Bottom Left) */}
        <motion.div
          animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
          className="absolute -left-2 bottom-4 text-xs filter drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]"
        >
          ✨
        </motion.div>
      </div>

      {/* ── MAIN SENTIENT VAULT CHARACTER (SVG Canvas) ── */}
      <motion.div
        animate={
          isSquishing
            ? { scale: [1, 0.82, 1.22, 0.96, 1], y: [0, 8, -20, 3, 0] }
            : chestAvailable
            ? { y: [0, -6, 0] }
            : { y: [0, -2, 0] }
        }
        whileHover={{ scale: 1.06, y: -4 }}
        whileTap={{ scale: 0.94 }}
        transition={
          isSquishing
            ? { duration: 0.65 }
            : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }
        className="relative z-10 flex items-center justify-center"
      >
        <svg
          viewBox="0 0 120 106"
          width={size}
          height={(size * 106) / 120}
          className="overflow-visible filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
        >
          <defs>
            {/* Rich Chest Body Wood Gradient */}
            <linearGradient id="vaultBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C2D12" />
              <stop offset="45%" stopColor="#9A3412" />
              <stop offset="100%" stopColor="#431407" />
            </linearGradient>

            {/* Lid Wood Highlight Gradient */}
            <linearGradient id="vaultLidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#B45309" />
              <stop offset="35%" stopColor="#9A3412" />
              <stop offset="100%" stopColor="#7C2D12" />
            </linearGradient>

            {/* Gleaming Metallic Gold Gradient */}
            <linearGradient id="vaultGoldGleam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="30%" stopColor="#FDE047" />
              <stop offset="70%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            {/* Glowing Gem Gradient (Ruby / Amethyst Crown Jewel) */}
            <linearGradient id="vaultGemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="60%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>

            {/* Radiant Inner Loot Light Eruption */}
            <radialGradient id="vaultLootEruption" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ── GROUND SHADOW ── */}
          <ellipse cx="60" cy="100" rx="42" ry="6" fill="rgba(0,0,0,0.38)" />

          {/* ── GOLDEN WING-HANDLES (LEFT & RIGHT) ── */}
          {/* Left Wing-Handle (Flutters when happy or squished!) */}
          <motion.g
            animate={
              isSquishing || chestAvailable
                ? { rotate: [-16, 14, -16] }
                : { rotate: 0 }
            }
            transition={{
              duration: isSquishing ? 0.25 : 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '16px 66px' }}
          >
            {/* Handle Base Plate */}
            <rect x="12" y="60" width="6" height="12" rx="2" fill="url(#vaultGoldGleam)" stroke="#78350F" strokeWidth="1" />
            {/* Handle Ring */}
            <path
              d="M 14 62 C 4 64, 4 76, 14 78"
              fill="none"
              stroke="url(#vaultGoldGleam)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Ring highlight glint */}
            <circle cx="8" cy="70" r="1.2" fill="#FEF08A" />
          </motion.g>

          {/* Right Wing-Handle */}
          <motion.g
            animate={
              isSquishing || chestAvailable
                ? { rotate: [16, -14, 16] }
                : { rotate: 0 }
            }
            transition={{
              duration: isSquishing ? 0.25 : 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '104px 66px' }}
          >
            {/* Handle Base Plate */}
            <rect x="102" y="60" width="6" height="12" rx="2" fill="url(#vaultGoldGleam)" stroke="#78350F" strokeWidth="1" />
            {/* Handle Ring */}
            <path
              d="M 106 62 C 116 64, 116 76, 106 78"
              fill="none"
              stroke="url(#vaultGoldGleam)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Ring highlight glint */}
            <circle cx="112" cy="70" r="1.2" fill="#FEF08A" />
          </motion.g>

          {/* ── CUTE LITTLE FEET / PAWS ── */}
          <g>
            {/* Left Foot */}
            <ellipse cx="32" cy="94" rx="7" ry="4" fill="url(#vaultGoldGleam)" stroke="#78350F" strokeWidth="1" />
            {/* Right Foot */}
            <ellipse cx="88" cy="94" rx="7" ry="4" fill="url(#vaultGoldGleam)" stroke="#78350F" strokeWidth="1" />
          </g>

          {/* ── MAIN CHEST BODY (BASE) ── */}
          <rect
            x="18"
            y="48"
            width="84"
            height="46"
            rx="10"
            fill="url(#vaultBodyGrad)"
            stroke="#431407"
            strokeWidth="2.8"
          />

          {/* Wood Planks Lines */}
          <line x1="18" y1="64" x2="102" y2="64" stroke="#431407" strokeWidth="1.6" opacity="0.65" />
          <line x1="18" y1="80" x2="102" y2="80" stroke="#431407" strokeWidth="1.6" opacity="0.65" />

          {/* Golden Corner Reinforcements & Rivets */}
          {/* Left Vertical Band */}
          <rect x="25" y="48" width="8" height="46" fill="url(#vaultGoldGleam)" stroke="#B45309" strokeWidth="1" />
          <circle cx="29" cy="54" r="1.6" fill="#431407" />
          <circle cx="29" cy="72" r="1.6" fill="#431407" />
          <circle cx="29" cy="88" r="1.6" fill="#431407" />

          {/* Right Vertical Band */}
          <rect x="87" y="48" width="8" height="46" fill="url(#vaultGoldGleam)" stroke="#B45309" strokeWidth="1" />
          <circle cx="91" cy="54" r="1.6" fill="#431407" />
          <circle cx="91" cy="72" r="1.6" fill="#431407" />
          <circle cx="91" cy="88" r="1.6" fill="#431407" />

          {/* Bottom Gold Rim Trim */}
          <rect x="18" y="90" width="84" height="4" rx="2" fill="url(#vaultGoldGleam)" />

          {/* ── RADIANT SEAM LOOT GLOW (WHEN CLAIMABLE) ── */}
          {chestAvailable && (
            <motion.g
              animate={{ opacity: [0.4, 0.95, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ellipse cx="60" cy="46" rx="36" ry="8" fill="url(#vaultLootEruption)" />
            </motion.g>
          )}

          {/* ── SENTIENT CHEST LID (ANIMATED JIGGLE & POP) ── */}
          <motion.g
            animate={
              isSquishing
                ? { y: [0, -14, 0] }
                : chestAvailable
                ? { y: [0, -5, 0] }
                : { y: 0 }
            }
            transition={{
              duration: isSquishing ? 0.35 : 2,
              repeat: isSquishing ? 1 : Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '60px 46px' }}
          >
            {/* Curved Lid Arch */}
            <path
              d="M 16 46 C 16 22, 104 22, 104 46 Z"
              fill="url(#vaultLidGrad)"
              stroke="#431407"
              strokeWidth="2.8"
            />

            {/* Lid Golden Straps */}
            <path
              d="M 25 46 C 25 25, 33 25, 33 46 Z"
              fill="url(#vaultGoldGleam)"
              stroke="#B45309"
              strokeWidth="1"
            />
            <path
              d="M 87 46 C 87 25, 95 25, 95 46 Z"
              fill="url(#vaultGoldGleam)"
              stroke="#B45309"
              strokeWidth="1"
            />

            {/* Top Crown Handle with Glowing Ruby Jewel */}
            <g>
              {/* Crown Handle Arch */}
              <path
                d="M 50 24 C 50 16, 70 16, 70 24"
                fill="none"
                stroke="url(#vaultGoldGleam)"
                strokeWidth="3.4"
                strokeLinecap="round"
              />
              {/* Crown Gem Setting Base */}
              <rect x="56" y="16" width="8" height="4" rx="1.5" fill="url(#vaultGoldGleam)" />
              {/* Glowing Gem Atop Handle */}
              <motion.polygon
                points="60,11 64,15 60,19 56,15"
                fill="url(#vaultGemGrad)"
                stroke="#FEF08A"
                strokeWidth="0.8"
                animate={{ scale: [1, 1.18, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '60px 15px' }}
              />
              {/* Gem glint spark */}
              <circle cx="58.8" cy="14" r="0.8" fill="#FFFFFF" />
            </g>

            {/* Lid Lower Rim Lip */}
            <rect
              x="14"
              y="42"
              width="92"
              height="6"
              rx="3"
              fill="url(#vaultGoldGleam)"
              stroke="#B45309"
              strokeWidth="1"
            />
          </motion.g>

          {/* ── SENTIENT CLASP WITH THE ICONIC (._.) LIVING FACE ── */}
          <g>
            {/* Clasp Shield Body */}
            <path
              d="M 44 40 L 76 40 L 74 66 L 60 75 L 46 66 Z"
              fill="url(#vaultGoldGleam)"
              stroke="#78350F"
              strokeWidth="2"
            />

            {/* Rosy Blushing Cheeks (Glows brighter on happy/squish) */}
            <circle
              cx="47"
              cy="58"
              r="3.5"
              fill="#F43F5E"
              opacity={isSquishing || expression === 'happy' ? 0.85 : 0.45}
            />
            <circle
              cx="73"
              cy="58"
              r="3.5"
              fill="#F43F5E"
              opacity={isSquishing || expression === 'happy' ? 0.85 : 0.45}
            />

            {/* ── LIVING EYES STATE MACHINE ON CLASP ── */}
            {expression === 'blink' ? (
              // 1. NATURAL BLINKING: (—  —)
              <>
                <line x1="50" y1="52" x2="57" y2="52" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="63" y1="52" x2="70" y2="52" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" />
              </>
            ) : expression === 'happy' ? (
              // 2. HAPPY / ANTICIPATING: (^  ^)
              <>
                <path d="M 50 54 Q 53.5 47, 57 54" fill="none" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                <path d="M 63 54 Q 66.5 47, 70 54" fill="none" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : expression === 'squish' ? (
              // 3. TACTILE SQUISHED: (>  <)
              <>
                <path d="M 50 49 L 56 53 L 50 57" fill="none" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 70 49 L 64 53 L 70 57" fill="none" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : expression === 'sleep' ? (
              // 4. SLEEPING / CLAIMED: (-  -)
              <>
                <path d="M 50 51 Q 53.5 56, 57 51" fill="none" stroke="#78350F" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M 63 51 Q 66.5 56, 70 51" fill="none" stroke="#78350F" strokeWidth="2.6" strokeLinecap="round" />
              </>
            ) : expression === 'night-owl' ? (
              // 5. NIGHT OWL HALF-LIDDED: (¬  ¬)
              <>
                {/* Left Eye */}
                <circle cx="53.5" cy="52" r="4.2" fill="#0F172A" />
                <circle cx="52.8" cy="51" r="1.6" fill="#FFFFFF" />
                <path d="M 48 48 Q 54 53, 59 49 L 59 46 L 48 46 Z" fill="#F59E0B" />

                {/* Right Eye */}
                <circle cx="66.5" cy="52" r="4.2" fill="#0F172A" />
                <circle cx="65.8" cy="51" r="1.6" fill="#FFFFFF" />
                <path d="M 61 49 Q 67 53, 72 48 L 72 46 L 61 46 Z" fill="#F59E0B" />
              </>
            ) : (
              // 6. NORMAL & CURIOUS GLANCING: Big Chibi Anime Eyes with Dual Specular Dots
              <>
                {/* Left Eye Socket */}
                <circle cx="53.5" cy="52" r="4.8" fill="#0F172A" />
                {/* Left Pupil with Spring Glancing Shift */}
                <motion.g
                  animate={{ x: pupilShiftX }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                >
                  <circle cx="52.6" cy="50.8" r="2" fill="#FFFFFF" />
                  <circle cx="54.6" cy="53.4" r="0.9" fill="#FFFFFF" />
                </motion.g>

                {/* Right Eye Socket */}
                <circle cx="66.5" cy="52" r="4.8" fill="#0F172A" />
                {/* Right Pupil with Spring Glancing Shift */}
                <motion.g
                  animate={{ x: pupilShiftX }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                >
                  <circle cx="65.6" cy="50.8" r="2" fill="#FFFFFF" />
                  <circle cx="67.6" cy="53.4" r="0.9" fill="#FFFFFF" />
                </motion.g>
              </>
            )}

            {/* ── CUTE KEYHOLE MOUTH / SMILE SLOT ── */}
            {isSquishing ? (
              // Excited Open Mouth Gasp on click
              <ellipse cx="60" cy="62" rx="3.5" ry="3" fill="#431407" />
            ) : expression === 'sleep' ? (
              // Soft sleeping slit
              <line x1="58" y1="62" x2="62" y2="62" stroke="#431407" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              // Smiling Keyhole Slot
              <motion.g
                animate={chestAvailable ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '60px 62px' }}
              >
                <circle cx="60" cy="61" r="2" fill="#431407" />
                <path d="M 59 61 L 61 61 L 62 65 L 58 65 Z" fill="#431407" />
              </motion.g>
            )}
          </g>
        </svg>
      </motion.div>

      {/* ── FLOATING ANIMATED ZZZ PARTICLES (WHEN CLAIMED/SLEEPING) ── */}
      <AnimatePresence>
        {!chestAvailable && (
          <div className="absolute -top-3 right-2 pointer-events-none z-20 font-heading font-black">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute text-amber-300 font-bold"
                style={{ fontSize: 9 + i * 2 }}
                initial={{ opacity: 0, y: 0, x: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [-2, -14 - i * 6],
                  x: [0, 8 + i * 4],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: i * 0.7,
                  ease: 'easeOut',
                }}
              >
                z
              </motion.span>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

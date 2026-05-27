'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePet } from '@/hooks/usePet';
import { useGamification } from '@/hooks/useGamification';
import { useTasks } from '@/hooks/useTasks';
import { useShop } from '@/hooks/useShop';
import { PET_SPECIES_CONFIG } from '@/lib/constants';
import './LofiRoom.css';

// ── Time of day detection ──
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ── Star positions (deterministic) ──
const STARS = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 17 + 7) % 90 + 5}%`,
  top: `${(i * 23 + 11) % 70 + 5}%`,
  delay: `${(i * 0.4) % 2}s`,
  size: i % 3 === 0 ? 3 : 2,
}));

// ── Dust particle positions ──
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  left: `${(i * 13 + 5) % 80 + 10}%`,
  duration: `${8 + (i * 3) % 8}s`,
  delay: `${i * 1.2}s`,
  size: 2 + (i % 2),
}));

// ── Book colors for the bookshelf ──
const BOOK_COLORS = [
  '#7C3AED', '#EC4899', '#10B981', '#F59E0B',
  '#3B82F6', '#EF4444', '#6366F1', '#14B8A6',
  '#D946EF', '#F97316',
];

interface LofiRoomProps {
  className?: string;
}

export default function LofiRoom({ className = '' }: LofiRoomProps) {
  const { pet, getMood } = usePet();
  const { gamification } = useGamification();
  const { tasks } = useTasks();
  const { coins } = useShop();

  const level = gamification?.level || 0;
  const xp = gamification?.xp || 0;
  const streak = gamification?.streak || 0;
  const timeOfDay = getTimeOfDay();
  const isNight = timeOfDay === 'night';

  // Tasks completed today
  const completedToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter((t) => {
      if (t.status !== 'done') return false;
      return new Date(t.updatedAt).toISOString().split('T')[0] === today;
    }).length;
  }, [tasks]);

  // Pet data
  const petEmoji = pet ? PET_SPECIES_CONFIG[pet.species]?.emoji[pet.stage] || '🥚' : null;
  const mood = getMood();
  const moodEmoji = mood === 'happy' ? '💖' : mood === 'sleeping' ? '💤' : mood === 'sad' ? '😢' : '💭';
  const petOnDesk = pet && pet.stage <= 2; // baby/teen on desk, adult/legendary on floor

  // Unlock checks
  const hasDesk = level >= 0; // always
  const hasChair = level >= 0;
  const hasBookshelf = level >= 3;
  const hasPosters = level >= 5;
  const hasLamp = level >= 7;
  const hasMonitor = level >= 10;
  const hasPlants = level >= 15;
  const hasRug = level >= 15;
  const hasPremiumEffects = level >= 20;

  return (
    <motion.div
      className={`lofi-room ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* ── Wall ── */}
      <div className="lofi-wall" />

      {/* ── Floor ── */}
      <div className="lofi-floor" />

      {/* ── Window ── */}
      <div className="lofi-window">
        <div className={`lofi-sky ${timeOfDay}`}>
          {/* Clouds (daytime only) */}
          {!isNight && (
            <>
              <div className="lofi-cloud" />
              <div className="lofi-cloud" />
            </>
          )}

          {/* Stars (night only) */}
          {isNight && (
            <>
              <div className="lofi-stars">
                {STARS.map((star, i) => (
                  <div
                    key={i}
                    className="lofi-star"
                    style={{
                      left: star.left,
                      top: star.top,
                      width: star.size,
                      height: star.size,
                      animationDelay: star.delay,
                    }}
                  />
                ))}
              </div>
              <div className="lofi-moon" />
            </>
          )}
        </div>
        <div className="lofi-window-divider-h" />
        <div className="lofi-window-divider-v" />
      </div>

      {/* ── Light Rays ── */}
      {(timeOfDay === 'morning' || timeOfDay === 'afternoon') && (
        <div className="lofi-light-rays" />
      )}

      {/* ── Posters (Level 5+) ── */}
      {hasPosters && (
        <>
          <motion.div
            className="lofi-poster lofi-poster-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            ⚡
          </motion.div>
          <motion.div
            className="lofi-poster lofi-poster-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            🎯
          </motion.div>
        </>
      )}

      {/* ── Bookshelf (Level 3+) ── */}
      {hasBookshelf && (
        <motion.div
          className="lofi-bookshelf"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="lofi-shelf" style={{ top: '30%' }} />
          <div className="lofi-shelf" style={{ top: '60%' }} />
          {/* Top row of books */}
          <div className="lofi-books" style={{ top: '8%', height: '20%' }}>
            {BOOK_COLORS.slice(0, 5).map((color, i) => (
              <div
                key={i}
                className="lofi-book"
                style={{
                  background: color,
                  height: `${60 + (i * 13) % 40}%`,
                }}
              />
            ))}
          </div>
          {/* Middle row */}
          <div className="lofi-books" style={{ top: '35%', height: '22%' }}>
            {BOOK_COLORS.slice(3, 8).map((color, i) => (
              <div
                key={i}
                className="lofi-book"
                style={{
                  background: color,
                  height: `${50 + (i * 17) % 50}%`,
                }}
              />
            ))}
          </div>
          {/* Bottom row */}
          <div className="lofi-books" style={{ top: '65%', height: '22%' }}>
            {BOOK_COLORS.slice(5, 10).map((color, i) => (
              <div
                key={i}
                className="lofi-book"
                style={{
                  background: color,
                  height: `${55 + (i * 11) % 45}%`,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Rug (Level 15+) ── */}
      {hasRug && (
        <motion.div
          className="lofi-rug"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        />
      )}

      {/* ── Desk ── */}
      {hasDesk && (
        <>
          <motion.div
            className="lofi-desk"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          />
          <div className="lofi-desk-legs" />
        </>
      )}

      {/* ── Chair ── */}
      {hasChair && (
        <motion.div
          className="lofi-chair"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="lofi-chair-back" />
          <div className="lofi-chair-seat" />
          <div className="lofi-chair-legs" />
        </motion.div>
      )}

      {/* ── Monitor (Level 10+) ── */}
      {hasMonitor && (
        <motion.div
          className="lofi-monitor"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="lofi-monitor-screen">
            <div className="lofi-monitor-glow" />
            {/* Tiny code lines on screen */}
            <div style={{ padding: '15% 12%' }}>
              {[40, 65, 30, 55, 45].map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: `${w}%`,
                    height: '2px',
                    background: i % 2 === 0 ? 'rgba(124, 58, 237, 0.5)' : 'rgba(16, 185, 129, 0.4)',
                    marginBottom: '4px',
                    borderRadius: '1px',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="lofi-monitor-stand" />
        </motion.div>
      )}

      {/* ── Desk Lamp (Level 7+) ── */}
      {hasLamp && (
        <motion.div
          className="lofi-lamp"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="lofi-lamp-shade" />
          <div className="lofi-lamp-light" />
          <div className="lofi-lamp-arm" />
          <div className="lofi-lamp-base" />
        </motion.div>
      )}

      {/* ── Plants (Level 15+) ── */}
      {hasPlants && (
        <motion.div
          className="lofi-plant"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          🪴
        </motion.div>
      )}

      {/* ── Virtual Pet ── */}
      {pet && petEmoji && (
        <motion.div
          className={`lofi-pet ${petOnDesk ? 'lofi-pet-desk' : 'lofi-pet-floor'}`}
          animate={{
            y: mood === 'sleeping' ? [0, -2, 0] : [0, -6, 0],
          }}
          transition={{
            duration: mood === 'sleeping' ? 3 : 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {petEmoji}
          <motion.div
            className="lofi-pet-mood"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 }}
          >
            {moodEmoji}
          </motion.div>
        </motion.div>
      )}

      {/* ── Floating Dust Particles ── */}
      <div className="lofi-particles">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="lofi-particle"
            style={{
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </div>

      {/* ── Stat Bubbles ── */}
      <motion.div
        className="lofi-stat-bubble lofi-stat-xp"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
      >
        <span className="lofi-stat-icon">⭐</span>
        <div>
          <div className="lofi-stat-value">Lv.{level}</div>
          <div className="lofi-stat-label">{xp.toLocaleString()} XP</div>
        </div>
      </motion.div>

      <motion.div
        className="lofi-stat-bubble lofi-stat-streak"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
      >
        <span className="lofi-stat-icon">🔥</span>
        <div>
          <div className="lofi-stat-value">{streak}</div>
          <div className="lofi-stat-label">Day Streak</div>
        </div>
      </motion.div>

      <motion.div
        className="lofi-stat-bubble lofi-stat-tasks"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
      >
        <span className="lofi-stat-icon">✅</span>
        <div>
          <div className="lofi-stat-value">{completedToday}</div>
          <div className="lofi-stat-label">Done Today</div>
        </div>
      </motion.div>

      <motion.div
        className="lofi-stat-bubble lofi-stat-coins"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9 }}
      >
        <span className="lofi-stat-icon">🪙</span>
        <div>
          <div className="lofi-stat-value">{coins}</div>
          <div className="lofi-stat-label">Coins</div>
        </div>
      </motion.div>

      {/* ── Room Level Label ── */}
      {hasPremiumEffects && (
        <motion.div
          style={{
            position: 'absolute',
            bottom: '2%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.4), rgba(236, 72, 153, 0.4))',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '4px 14px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-heading)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ✨ Maxed Out Room ✨
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

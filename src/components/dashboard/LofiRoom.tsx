'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePet } from '@/hooks/usePet';
import { useGamification } from '@/hooks/useGamification';
import { useTasks } from '@/hooks/useTasks';
import { useShop } from '@/hooks/useShop';
import { useTheme } from '@/context/ThemeContext';
import { PET_SPECIES_CONFIG } from '@/lib/constants';
import { playClick, playXP, playSuccess } from '@/lib/sounds';
import toast from 'react-hot-toast';
import TreasureChestModal from './TreasureChestModal';
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

const MOTIVATION_QUOTES = [
  "KEEP GOING",
  "YOU GOT THIS",
  "DREAM BIG",
  "STAY FOCUSED",
  "NEVER GIVE UP",
  "WORK HARD",
  "STAY SHARP",
  "DO IT TODAY",
  "STAY CALM",
  "AIM HIGH"
];

interface LofiRoomProps {
  className?: string;
}

export default function LofiRoom({ className = '' }: LofiRoomProps) {
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const { pet, getMood } = usePet();
  const { gamification } = useGamification();
  const { tasks } = useTasks();
  const { coins, addCoins, canClaimTreasureChest } = useShop();

  // Local interactive states
  const [petting, setPetting] = useState(false);
  const [waterCount, setWaterCount] = useState(0);
  const [splashes, setSplashes] = useState<{ id: number; x: number; y: number }[]>([]);
  const [showTreasureChest, setShowTreasureChest] = useState(false);
  const chestAvailable = canClaimTreasureChest();

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

  const dailyQuote = useMemo(() => {
    const dayIndex = new Date().getDate() % MOTIVATION_QUOTES.length;
    return MOTIVATION_QUOTES[dayIndex];
  }, []);

  // Pet data
  const petEmoji = pet ? PET_SPECIES_CONFIG[pet.species]?.emoji[pet.stage] || '🥚' : '🥚';
  const baseMood = getMood();
  // Override mood to happy when petting
  const mood = petting ? 'happy' : baseMood;
  const moodEmoji = mood === 'happy' ? '💖' : mood === 'sleeping' ? '💤' : mood === 'sad' ? '😢' : '💭';
  const petOnDesk = false; // Always on floor per user request

  // All features unlocked in the room at level 0 now!
  const hasDesk = true;
  const hasChair = true;
  const hasBookshelf = true;
  const hasPosters = true;
  const hasLamp = true;
  const hasMonitor = true;
  const hasPlants = true;
  const hasRug = true;
  const hasPremiumEffects = true;

  // Handlers
  const handleNavigation = (path: string) => {
    playClick();
    router.push(path);
  };

  const handlePetInteract = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (petting) return;
    playXP();
    setPetting(true);
    setTimeout(() => setPetting(false), 2000); // 2s pet jump animation
  };

  const handleWaterPlant = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSuccess();
    
    // Add splash animation
    const rect = e.currentTarget.getBoundingClientRect();
    const newSplash = { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top };
    setSplashes((prev) => [...prev, newSplash]);
    setTimeout(() => {
      setSplashes((prev) => prev.filter((s) => s.id !== newSplash.id));
    }, 1000);

    if (waterCount < 5) {
      setWaterCount((prev) => prev + 1);
      addCoins(1);
      toast.success('You watered the plant! +1 Coin 🪙', { icon: '🌱', duration: 2000 });
    } else {
      toast('The plant is fully watered for now! 🌿', { icon: '💧', duration: 2000 });
    }
  };

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
      <div 
        className="lofi-window"
      >
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

      {/* ── Wall Clock ── */}
      <div 
        className="lofi-clock lofi-interactive"
        onClick={() => handleNavigation('/timer')}
        title="Open Focus Timer"
      >
        <div className="lofi-clock-face">
          <div className="lofi-clock-center" />
          <div className="lofi-clock-hand-h" />
          <div className="lofi-clock-hand-m" />
        </div>
      </div>

      {/* ── Light Rays ── */}
      {(timeOfDay === 'morning' || timeOfDay === 'afternoon') && (
        <div className="lofi-light-rays" />
      )}

      {/* ── Posters ── */}
      {hasPosters && (
        <>
          <motion.div
            className="lofi-poster lofi-poster-1 lofi-interactive"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => handleNavigation('/skills')}
            title="RPG Skill Trees"
          >
            ⚡
          </motion.div>
          <motion.div
            className="lofi-poster lofi-poster-2 lofi-interactive"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => handleNavigation('/analytics')}
            title="Study Analytics"
          >
            🎯
          </motion.div>
          <motion.div
            className="lofi-poster lofi-poster-3 lofi-interactive"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            onClick={() => { playClick(); toast(`${dailyQuote}! You got this. 🔥`, { icon: "💪" }); }}
            title="Motivation"
          >
            <div className="lofi-poster-text">
              {dailyQuote.split(' ').map((word, i) => (
                <div key={i}>{word}</div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* ── Bookshelf ── */}
      {hasBookshelf && (
        <motion.div
          className="lofi-bookshelf lofi-interactive"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => handleNavigation('/notes')}
          title="Open Notes & Scrolls"
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

      {/* ── Rug ── */}
      {hasRug && (
        <motion.div
          className="lofi-rug lofi-interactive"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => handleNavigation('/shop')}
          title="Visit Item Shop"
        />
      )}

      {/* ── Treasure Chest ── */}
      <motion.div
        className={`lofi-treasure-chest lofi-interactive ${chestAvailable ? 'lofi-chest-available' : 'lofi-chest-claimed'}`}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
        onClick={() => { playClick(); setShowTreasureChest(true); }}
        title={chestAvailable ? 'Open Daily Treasure Chest!' : 'Treasure Chest (claimed today)'}
      >
        {chestAvailable ? '🎁' : '📦'}
        {chestAvailable && (
          <motion.div
            className="lofi-chest-sparkle"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ✨
          </motion.div>
        )}
      </motion.div>

      {/* ── Game Console ── */}
      <motion.div
        className="lofi-console lofi-interactive"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        onClick={() => handleNavigation('/arcade')}
        title="Play Arcade Games"
      >
        🎮
      </motion.div>

      {/* ── Fridge (Sticky Notes Widget) ── */}
      <motion.div
        className="lofi-fridge lofi-interactive"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        onClick={() => { playClick(); window.dispatchEvent(new CustomEvent('open-sticky-notes')); }}
        title="Open Sticky Notes"
      >
        <div className="lofi-fridge-door">
          <div className="lofi-fridge-handle" />
          <div className="lofi-fridge-note">📝</div>
        </div>
        <div className="lofi-fridge-freezer">
          <div className="lofi-fridge-handle" style={{ top: '15%', height: '40%' }} />
        </div>
      </motion.div>

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

      {/* ── Monitor ── */}
      {hasMonitor && (
        <motion.div
          className="lofi-monitor lofi-interactive"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => handleNavigation('/tasks')}
          title="Open Quest Log"
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

      {/* ── Desk Lamp ── */}
      {hasLamp && (
        <motion.div
          className="lofi-lamp lofi-interactive"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => { playClick(); toggleTheme(); }}
          title="Toggle Room Theme"
        >
          <div className="lofi-lamp-shade" />
          <div className="lofi-lamp-light" />
          <div className="lofi-lamp-arm" />
          <div className="lofi-lamp-base" />
        </motion.div>
      )}

      {/* ── Plants ── */}
      {hasPlants && (
        <motion.div
          className="lofi-plant lofi-interactive"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          onClick={handleWaterPlant}
          title="Water Plant"
        >
          🪴
          <AnimatePresence>
            {splashes.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 1, y: 0, scale: 0.5 }}
                animate={{ opacity: 0, y: -30, scale: 1.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  marginLeft: '-10px',
                  fontSize: '20px',
                  pointerEvents: 'none',
                }}
              >
                💧
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Virtual Pet ── */}
      {petEmoji && (
        <div 
          className={`lofi-pet-wrapper lofi-interactive ${petOnDesk ? 'lofi-pet-desk' : 'lofi-pet-floor'}`}
          onClick={handlePetInteract}
          title="Pet your companion"
        >
          {!petOnDesk && <div className="lofi-pet-cushion" />}
          <motion.div
            className={`lofi-pet ${petting ? 'petting-active' : ''}`}
            animate={{
              y: petting ? [0, -30, 0] : (mood === 'sleeping' ? [0, -2, 0] : [0, -6, 0]),
            }}
            transition={{
              duration: petting ? 0.6 : (mood === 'sleeping' ? 3 : 1.8),
              repeat: petting ? 0 : Infinity,
              ease: 'easeInOut',
            }}
          >
            {petEmoji}
            <motion.div
              key={moodEmoji}
              className="lofi-pet-mood"
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: petting ? 0 : 1, type: 'spring' }}
            >
              {moodEmoji}
            </motion.div>
          </motion.div>
        </div>
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

      {/* ── Treasure Chest Modal ── */}
      <TreasureChestModal
        isOpen={showTreasureChest}
        onClose={() => setShowTreasureChest(false)}
      />
    </motion.div>
  );
}

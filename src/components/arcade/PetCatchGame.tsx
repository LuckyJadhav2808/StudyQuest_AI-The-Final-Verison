'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiArrowLeft, HiPlay, HiHeart, HiStar } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { usePet } from '@/hooks/usePet';
import { useShop } from '@/hooks/useShop';
import { useGamification } from '@/hooks/useGamification';
import { PET_SPECIES_CONFIG } from '@/lib/constants';
import { playClick, playSuccess, playXP, playCelebration } from '@/lib/sounds';
import './PetCatchGame.css';

// ── Falling item types ──
interface FallingItem {
  id: number;
  emoji: string;
  x: number;       // 0-100 percent
  y: number;       // pixels from top
  speed: number;    // px per frame
  type: 'food' | 'treat' | 'golden' | 'danger';
  points: number;
}

interface ScorePopup {
  id: number;
  text: string;
  x: number;
  y: number;
  type: 'good' | 'bad' | 'great';
}

// ── Item pools ──
const FOOD_ITEMS = [
  { emoji: '🍎', type: 'food' as const, points: 1 },
  { emoji: '🍇', type: 'food' as const, points: 1 },
  { emoji: '🥕', type: 'food' as const, points: 1 },
  { emoji: '🍌', type: 'food' as const, points: 1 },
  { emoji: '🫐', type: 'food' as const, points: 1 },
  { emoji: '🍪', type: 'treat' as const, points: 2 },
  { emoji: '🧁', type: 'treat' as const, points: 2 },
  { emoji: '🍩', type: 'treat' as const, points: 3 },
  { emoji: '⭐', type: 'golden' as const, points: 5 },
];

const DANGER_ITEMS = [
  { emoji: '💣', type: 'danger' as const, points: -1 },
  { emoji: '🪨', type: 'danger' as const, points: -1 },
  { emoji: '⚡', type: 'danger' as const, points: -1 },
];

// ── Background stars ──
const STARS = Array.from({ length: 15 }, (_, i) => ({
  left: `${(i * 7 + 3) % 95}%`,
  top: `${(i * 13 + 5) % 50}%`,
  delay: `${(i * 0.5) % 3}s`,
  size: i % 4 === 0 ? 3 : 2,
}));

const GAME_DURATION = 45; // seconds
const CATCH_RADIUS = 40;  // px distance for catch detection
const SPAWN_INTERVAL_START = 800; // ms
const SPAWN_INTERVAL_MIN = 350;   // ms at max difficulty

interface PetCatchGameProps {
  onExit: () => void;
}

export default function PetCatchGame({ onExit }: PetCatchGameProps) {
  const { pet, playWithPet } = usePet();
  const { addCoins } = useShop();
  const { awardXP } = useGamification();

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [petX, setPetX] = useState(50); // percentage 0-100
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);

  const gameRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);
  const itemIdRef = useRef(0);
  const popupIdRef = useRef(0);
  const itemsRef = useRef<FallingItem[]>([]);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const petXRef = useRef(50);
  const timeLeftRef = useRef(GAME_DURATION);
  const gameActiveRef = useRef(false);

  // Pet emoji
  const petEmoji = pet ? PET_SPECIES_CONFIG[pet.species]?.emoji[pet.stage] || '🐣' : '🐣';

  // Keep refs in sync
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { petXRef.current = petX; }, [petX]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // ── Mouse / Touch movement ──
  const handleMove = useCallback((clientX: number) => {
    if (!gameRef.current || !gameActiveRef.current) return;
    const rect = gameRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * 100;
    setPetX(Math.max(5, Math.min(95, relX)));
  }, []);

  useEffect(() => {
    const el = gameRef.current;
    if (!el) return;
    const onMouse = (e: MouseEvent) => handleMove(e.clientX);
    const onTouch = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX); };
    el.addEventListener('mousemove', onMouse);
    el.addEventListener('touchmove', onTouch, { passive: false });
    return () => {
      el.removeEventListener('mousemove', onMouse);
      el.removeEventListener('touchmove', onTouch);
    };
  }, [handleMove]);

  // ── Keyboard controls ──
  useEffect(() => {
    if (!gameActiveRef.current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setPetX(prev => Math.max(5, prev - 5));
      if (e.key === 'ArrowRight' || e.key === 'd') setPetX(prev => Math.min(95, prev + 5));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState]);

  // ── Spawn item ──
  const spawnItem = useCallback(() => {
    const elapsed = GAME_DURATION - timeLeftRef.current;
    const dangerChance = Math.min(0.35, 0.1 + elapsed * 0.005);
    const goldenChance = 0.08;
    const roll = Math.random();

    let item;
    if (roll < goldenChance) {
      item = FOOD_ITEMS.find(f => f.type === 'golden')!;
    } else if (roll < goldenChance + dangerChance) {
      item = DANGER_ITEMS[Math.floor(Math.random() * DANGER_ITEMS.length)];
    } else {
      const foods = FOOD_ITEMS.filter(f => f.type !== 'golden');
      item = foods[Math.floor(Math.random() * foods.length)];
    }

    const speed = 2.5 + elapsed * 0.06 + Math.random() * 1.5;
    const newItem: FallingItem = {
      id: ++itemIdRef.current,
      emoji: item.emoji,
      x: 5 + Math.random() * 90,
      y: -30,
      speed,
      type: item.type,
      points: item.points,
    };

    setItems(prev => [...prev, newItem]);
  }, []);

  // ── Add score popup ──
  const addPopup = (text: string, x: number, y: number, type: 'good' | 'bad' | 'great') => {
    const id = ++popupIdRef.current;
    setPopups(prev => [...prev, { id, text, x, y, type }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 800);
  };

  // ── Game Loop ──
  const gameLoop = useCallback((timestamp: number) => {
    if (!gameActiveRef.current) return;

    // Spawn new items
    const elapsed = GAME_DURATION - timeLeftRef.current;
    const spawnInterval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_START - elapsed * 12);
    if (timestamp - lastSpawnRef.current > spawnInterval) {
      spawnItem();
      lastSpawnRef.current = timestamp;
    }

    // Move items + check collisions
    setItems(prev => {
      const gameEl = gameRef.current;
      if (!gameEl) return prev;
      const h = gameEl.offsetHeight;
      const w = gameEl.offsetWidth;
      const petPx = (petXRef.current / 100) * w;
      const groundY = h - 60;

      const remaining: FallingItem[] = [];
      for (const item of prev) {
        const newY = item.y + item.speed;
        const itemPx = (item.x / 100) * w;

        // Check catch (near pet at ground level)
        if (newY >= groundY - 35 && newY <= groundY && Math.abs(itemPx - petPx) < CATCH_RADIUS) {
          if (item.type === 'danger') {
            // Hit by danger item
            setLives(l => Math.max(0, l - 1));
            setCombo(0);
            comboRef.current = 0;
            setFlash('bad');
            addPopup('-1 ❤️', itemPx, groundY - 40, 'bad');
            setTimeout(() => setFlash(null), 300);
            if (livesRef.current <= 1) {
              gameActiveRef.current = false;
              setTimeout(() => endGame(), 300);
            }
          } else {
            // Caught food
            const comboMultiplier = comboRef.current >= 10 ? 3 : comboRef.current >= 5 ? 2 : 1;
            const pts = item.points * comboMultiplier;
            setScore(s => s + pts);
            setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
            setCaught(c => c + 1);
            setFlash('good');
            const label = comboMultiplier > 1 ? `+${pts} 🔥x${comboMultiplier}` : `+${pts}`;
            addPopup(label, itemPx, groundY - 40, item.type === 'golden' ? 'great' : 'good');
            setTimeout(() => setFlash(null), 200);
            if (item.type === 'golden') playXP();
            else playSuccess();
          }
          continue; // remove item
        }

        // Check if fell past ground
        if (newY > h) {
          if (item.type !== 'danger') {
            setCombo(0);
            comboRef.current = 0;
            setMissed(m => m + 1);
          }
          continue; // remove item
        }

        remaining.push({ ...item, y: newY });
      }
      return remaining;
    });

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [spawnItem]);

  // ── Start Game ──
  const startGame = () => {
    playClick();
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(3);
    setTimeLeft(GAME_DURATION);
    setItems([]);
    setPopups([]);
    setCaught(0);
    setMissed(0);
    setPetX(50);
    scoreRef.current = 0;
    comboRef.current = 0;
    livesRef.current = 3;
    timeLeftRef.current = GAME_DURATION;
    gameActiveRef.current = true;
    lastSpawnRef.current = 0;
    animFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // ── Timer ──
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        timeLeftRef.current = next;
        if (next <= 0) {
          gameActiveRef.current = false;
          endGame();
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  // ── End Game ──
  const endGame = async () => {
    gameActiveRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    setGameState('done');

    const finalScore = scoreRef.current;
    const xp = Math.max(5, Math.floor(finalScore * 0.8));
    const coins = Math.max(1, Math.floor(finalScore * 0.3));

    await awardXP(xp, 'Pet Catch Game');
    await addCoins(coins);
    if (playWithPet) await playWithPet();
    playCelebration();
    toast.success(`+${xp} XP  +${coins} Coins! 🎉`);
  };

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ═══════════════════════
  // RENDER: Idle
  // ═══════════════════════
  if (gameState === 'idle') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors">
            <HiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              <span>🐾</span> Pet Catch
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">Catch food, avoid dangers, feed your pet!</p>
          </div>
        </div>

        <Card padding="lg">
          <div className="text-center py-6 space-y-5">
            <motion.div className="text-7xl" animate={{ y: [0, -12, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              {petEmoji}
            </motion.div>
            <div>
              <h3 className="text-lg font-heading font-bold mb-1">{pet?.name || 'Your Pet'} is hungry!</h3>
              <p className="text-sm text-[var(--muted-foreground)] max-w-xs mx-auto">
                Move your pet to catch falling food 🍎 and treats 🍪. Avoid bombs 💣 and rocks 🪨!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto text-center">
              <div className="p-2 rounded-xl bg-teal/10 border border-teal/20">
                <span className="text-xl block mb-1">🍎</span>
                <p className="text-[9px] uppercase font-bold text-[var(--muted-foreground)]">+1 pt</p>
              </div>
              <div className="p-2 rounded-xl bg-amber/10 border border-amber/20">
                <span className="text-xl block mb-1">🍩</span>
                <p className="text-[9px] uppercase font-bold text-[var(--muted-foreground)]">+3 pts</p>
              </div>
              <div className="p-2 rounded-xl bg-coral/10 border border-coral/20">
                <span className="text-xl block mb-1">💣</span>
                <p className="text-[9px] uppercase font-bold text-[var(--muted-foreground)]">-1 life</p>
              </div>
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              <Badge variant="primary" size="sm">⏱️ {GAME_DURATION}s</Badge>
              <Badge variant="teal" size="sm">❤️ 3 Lives</Badge>
              <Badge variant="amber" size="sm">🔥 Combos</Badge>
            </div>

            <Button variant="primary" size="lg" icon={<HiPlay />} onClick={startGame}>
              Start Game
            </Button>
            <p className="text-[10px] text-[var(--muted-foreground)]">Move mouse / touch / arrow keys</p>
          </div>
        </Card>
      </div>
    );
  }

  // ═══════════════════════
  // RENDER: Game Over
  // ═══════════════════════
  if (gameState === 'done') {
    const accuracy = caught + missed > 0 ? Math.round((caught / (caught + missed)) * 100) : 0;
    const xp = Math.max(5, Math.floor(score * 0.8));
    const coins = Math.max(1, Math.floor(score * 0.3));
    const rating = score >= 60 ? '🏆' : score >= 30 ? '⭐' : score >= 15 ? '👍' : '💪';

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card padding="lg">
          <div className="text-center py-6 space-y-6">
            <motion.span className="text-7xl block" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}>
              {rating}
            </motion.span>
            <div>
              <h2 className="text-2xl font-heading font-black">
                {lives <= 0 ? 'Game Over!' : 'Time\'s Up!'}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {pet?.name || 'Your pet'} {score >= 30 ? 'loved the feast!' : 'appreciates the effort!'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-xl font-heading font-black text-primary">{score}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Score</p>
              </div>
              <div className="p-3 rounded-xl bg-amber/10 border border-amber/20 text-center">
                <p className="text-xl font-heading font-black text-amber">{maxCombo}x</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Max Combo</p>
              </div>
              <div className="p-3 rounded-xl bg-teal/10 border border-teal/20 text-center">
                <p className="text-xl font-heading font-black text-teal">{xp}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">XP Earned</p>
              </div>
              <div className="p-3 rounded-xl bg-coral/10 border border-coral/20 text-center">
                <p className="text-xl font-heading font-black text-coral">{coins}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Coins</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="primary" icon={<HiPlay />} onClick={startGame}>Play Again</Button>
              <Button variant="ghost" icon={<HiArrowLeft />} onClick={onExit}>Back</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ═══════════════════════
  // RENDER: Playing
  // ═══════════════════════
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { gameActiveRef.current = false; cancelAnimationFrame(animFrameRef.current); setGameState('idle'); }} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors" title="Quit">
          <HiArrowLeft size={18} />
        </button>
        <Badge variant="primary" size="sm">🐾 Pet Catch</Badge>
      </div>

      <div className="catch-game" ref={gameRef} tabIndex={0}>
        {/* Stars */}
        <div className="catch-stars">
          {STARS.map((s, i) => (
            <div key={i} className="catch-star" style={{ left: s.left, top: s.top, animationDelay: s.delay, width: s.size, height: s.size }} />
          ))}
        </div>

        {/* HUD */}
        <div className="catch-hud">
          <div className="catch-hud-stat">
            <HiStar className="text-amber" size={16} />
            <span>{score}</span>
          </div>
          <div className="catch-lives">
            {[0, 1, 2].map(i => (
              <span key={i} className={`catch-heart ${i >= lives ? 'lost' : ''}`}>❤️</span>
            ))}
          </div>
          <div className="catch-hud-stat">
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="catch-timer-bar">
          <div
            className={`catch-timer-fill ${timeLeft <= 10 ? 'ending' : ''}`}
            style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
          />
        </div>

        {/* Combo */}
        <AnimatePresence>
          {combo >= 3 && (
            <motion.div
              className="catch-combo"
              key={combo}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              🔥 {combo}x Combo!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Falling items */}
        {items.map(item => (
          <div
            key={item.id}
            className={`catch-item ${item.type === 'danger' ? 'danger' : ''}`}
            style={{ left: `${item.x}%`, top: item.y, transform: 'translate(-50%, -50%)' }}
          >
            {item.emoji}
          </div>
        ))}

        {/* Score popups */}
        <AnimatePresence>
          {popups.map(popup => (
            <motion.div
              key={popup.id}
              className={`catch-score-popup ${popup.type}`}
              style={{ left: popup.x, top: popup.y }}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -40, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              {popup.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Flash */}
        {flash && <div className={`catch-flash ${flash}`} key={Date.now()} />}

        {/* Ground */}
        <div className="catch-ground" />

        {/* Pet glow */}
        <div className="catch-pet-glow" style={{ left: `calc(${petX}% - 30px)` }} />

        {/* Pet */}
        <div className="catch-pet" style={{ left: `calc(${petX}% - 22px)` }}>
          {petEmoji}
        </div>
      </div>
    </div>
  );
}

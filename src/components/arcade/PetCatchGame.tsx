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
  alpha: number; // for canvas fade transition
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

const GAME_DURATION = 45; // seconds
const CATCH_RADIUS = 40;  // logical px distance for catch detection
const SPAWN_INTERVAL_START = 800; // ms
const SPAWN_INTERVAL_MIN = 350;   // ms at max difficulty

interface PetCatchGameProps {
  onExit: () => void;
}

export default function PetCatchGame({ onExit }: PetCatchGameProps) {
  const { pet, playWithPet } = usePet();
  const { addCoins } = useShop();
  const { awardXP } = useGamification();

  // Slow React states (infrequent updates only for UI)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  // Canvas and Physics engine references
  const gameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);
  const itemIdRef = useRef(0);
  const popupIdRef = useRef(0);

  // High-frequency coordinates in refs to avoid React re-render lags
  const itemsRef = useRef<FallingItem[]>([]);
  const popupsRef = useRef<ScorePopup[]>([]);
  const petXRef = useRef(50); // percentage 0-100
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const timeLeftRef = useRef(GAME_DURATION);
  const gameActiveRef = useRef(false);
  const flashRef = useRef<'good' | 'bad' | null>(null);
  const caughtRef = useRef(0);
  const missedRef = useRef(0);
  const starsRef = useRef<{ x: number; y: number; size: number; speed: number; alpha: number; dir: number }[]>([]);

  // Pet emoji
  const petEmoji = pet ? PET_SPECIES_CONFIG[pet.species]?.emoji[pet.stage] || '🐣' : '🐣';

  // ── Mouse / Touch movement ──
  const handleMove = useCallback((clientX: number) => {
    if (!gameRef.current || !gameActiveRef.current) return;
    const rect = gameRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * 100;
    petXRef.current = Math.max(5, Math.min(95, relX));
  }, []);

  useEffect(() => {
    const el = gameRef.current;
    if (!el) return;
    const onMouse = (e: MouseEvent) => handleMove(e.clientX);
    const onTouch = (e: TouchEvent) => {
      if (gameActiveRef.current) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    };
    el.addEventListener('mousemove', onMouse);
    el.addEventListener('touchmove', onTouch, { passive: false });
    return () => {
      el.removeEventListener('mousemove', onMouse);
      el.removeEventListener('touchmove', onTouch);
    };
  }, [handleMove]);

  // ── Keyboard controls ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!gameActiveRef.current) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        petXRef.current = Math.max(5, petXRef.current - 5);
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        petXRef.current = Math.min(95, petXRef.current + 5);
      }
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

    itemsRef.current.push(newItem);
  }, []);

  // ── Add score popup ──
  const addPopupRef = (text: string, x: number, y: number, type: 'good' | 'bad' | 'great') => {
    popupsRef.current.push({
      id: ++popupIdRef.current,
      text,
      x,
      y,
      type,
      alpha: 1.0,
    });
  };

  // ── Game Physics Loop + Canvas Rendering ──
  const gameLoop = useCallback((timestamp: number) => {
    if (!gameActiveRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // 1. Spawning
    const elapsed = GAME_DURATION - timeLeftRef.current;
    const spawnInterval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_START - elapsed * 12);
    if (timestamp - lastSpawnRef.current > spawnInterval) {
      spawnItem();
      lastSpawnRef.current = timestamp;
    }

    const groundY = 360; // logical grass height
    const petPx = (petXRef.current / 100) * 480;

    // 2. Physics updates & Collision checking
    const remainingItems: FallingItem[] = [];
    for (const item of itemsRef.current) {
      const newY = item.y + item.speed;
      const itemPx = (item.x / 100) * 480;

      // Check collision sitting on the grass
      if (newY >= groundY - 35 && newY <= groundY && Math.abs(itemPx - petPx) < CATCH_RADIUS) {
        if (item.type === 'danger') {
          // bomb hit
          livesRef.current = Math.max(0, livesRef.current - 1);
          setLives(livesRef.current);
          comboRef.current = 0;
          flashRef.current = 'bad';
          
          addPopupRef('-1 ❤️', itemPx, groundY - 40, 'bad');
          setTimeout(() => {
            if (flashRef.current === 'bad') flashRef.current = null;
          }, 300);

          if (livesRef.current <= 0) {
            gameActiveRef.current = false;
            setTimeout(() => endGame(), 300);
          }
        } else {
          // food caught
          const comboMultiplier = comboRef.current >= 10 ? 3 : comboRef.current >= 5 ? 2 : 1;
          const pts = item.points * comboMultiplier;
          scoreRef.current += pts;
          setScore(scoreRef.current);

          comboRef.current += 1;
          if (comboRef.current > maxComboRef.current) {
            maxComboRef.current = comboRef.current;
          }

          caughtRef.current += 1;
          flashRef.current = 'good';
          
          const label = comboMultiplier > 1 ? `+${pts} 🔥x${comboMultiplier}` : `+${pts}`;
          addPopupRef(label, itemPx, groundY - 40, item.type === 'golden' ? 'great' : 'good');
          setTimeout(() => {
            if (flashRef.current === 'good') flashRef.current = null;
          }, 200);

          if (item.type === 'golden') playXP();
          else playSuccess();
        }
        continue;
      }

      // Check missed falling offscreen
      if (newY > 420) {
        if (item.type !== 'danger') {
          comboRef.current = 0;
          missedRef.current += 1;
        }
        continue;
      }

      remainingItems.push({ ...item, y: newY });
    }
    itemsRef.current = remainingItems;

    // 3. Clear Screen
    ctx.clearRect(0, 0, 480, 420);

    // 4. Draw Background
    const gradient = ctx.createLinearGradient(0, 0, 0, 420);
    gradient.addColorStop(0, '#1a103a');
    gradient.addColorStop(0.6, '#0f1729');
    gradient.addColorStop(1, '#1a2744');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 480, 420);

    // 5. Draw Twinkling Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    starsRef.current.forEach(star => {
      star.alpha += star.speed * star.dir;
      if (star.alpha >= 0.8) { star.alpha = 0.8; star.dir = -1; }
      if (star.alpha <= 0.1) { star.alpha = 0.1; star.dir = 1; }

      ctx.save();
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 6. Draw Ground (grass)
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, 420);
    groundGrad.addColorStop(0, '#1e3a2f');
    groundGrad.addColorStop(1, '#162e24');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, 480, 60);

    // Grass line
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(480, groundY);
    ctx.stroke();

    // Grass detail blades
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.lineWidth = 2;
    for (let gx = 15; gx < 480; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, groundY);
      ctx.lineTo(gx - 4, groundY + 8);
      ctx.moveTo(gx + 15, groundY);
      ctx.lineTo(gx + 17, groundY + 12);
      ctx.stroke();
    }

    // 7. Draw Pet shadow glow
    const glowGrad = ctx.createRadialGradient(petPx, groundY - 5, 2, petPx, groundY - 5, 30);
    glowGrad.addColorStop(0, 'rgba(124, 58, 237, 0.35)');
    glowGrad.addColorStop(1, 'rgba(124, 58, 237, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(petPx, groundY - 5, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 8. Draw Pet Mascot
    ctx.font = '44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(petEmoji, petPx, groundY - 2);

    // 9. Draw Items
    itemsRef.current.forEach(item => {
      const itemPx = (item.x / 100) * 480;
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (item.type === 'danger') {
        ctx.save();
        ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(item.emoji, itemPx, item.y);
        ctx.restore();
      } else {
        ctx.fillText(item.emoji, itemPx, item.y);
      }
    });

    // 10. Draw floating score popups
    const activePopups: ScorePopup[] = [];
    popupsRef.current.forEach(popup => {
      popup.y -= 1.2;
      popup.alpha = Math.max(0, popup.alpha - 0.025);

      if (popup.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = popup.alpha;
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = popup.type === 'good' ? '#6ee7b7' : popup.type === 'bad' ? '#fca5a5' : '#fbbf24';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText(popup.text, popup.x, popup.y);
        ctx.restore();
        activePopups.push(popup);
      }
    });
    popupsRef.current = activePopups;

    // 11. Draw Combo
    if (comboRef.current >= 3) {
      ctx.save();
      ctx.font = '900 16px "Lexend", sans-serif';
      ctx.fillStyle = '#FBBF24';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fillText(`🔥 ${comboRef.current}x Combo!`, 240, 80);
      ctx.restore();
    }

    // 12. Draw Flash overlay
    if (flashRef.current) {
      ctx.fillStyle = flashRef.current === 'good' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(0, 0, 480, 420);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [spawnItem]);

  // ── Start Game ──
  const startGame = () => {
    playClick();
    setGameState('playing');
    setScore(0);
    setLives(3);
    setTimeLeft(GAME_DURATION);

    // reset logic refs
    scoreRef.current = 0;
    livesRef.current = 3;
    timeLeftRef.current = GAME_DURATION;
    comboRef.current = 0;
    maxComboRef.current = 0;
    caughtRef.current = 0;
    missedRef.current = 0;
    petXRef.current = 50;
    itemsRef.current = [];
    popupsRef.current = [];
    flashRef.current = null;
    gameActiveRef.current = true;
    lastSpawnRef.current = 0;

    // Pre-generate stars logical coordinates
    starsRef.current = Array.from({ length: 15 }, (_, i) => ({
      x: (i * 32 + 20) % 460 + 10,
      y: (i * 29 + 15) % 180 + 10,
      size: (i % 3) + 1,
      speed: 0.004 + (i % 3) * 0.003,
      alpha: Math.random() * 0.6 + 0.2,
      dir: Math.random() > 0.5 ? 1 : -1,
    }));

    animFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // ── HUD Time Countdown ──
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 1);
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        gameActiveRef.current = false;
        endGame();
      }
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

    playCelebration();
    toast.success(`+${xp} XP  +${coins} Coins! 🎉`);

    // Firestore / hook saves in background
    awardXP(xp, 'Pet Catch Game').catch(() => {});
    addCoins(coins).catch(() => {});
    if (playWithPet) {
      playWithPet().catch(() => {});
    }
  };

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ═══════════════════════
  // RENDER: Idle Screen
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
            <div className="text-7xl animate-float-large">
              {petEmoji}
            </div>
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
                <span className="text-xl block mb-1">🍪</span>
                <p className="text-[9px] uppercase font-bold text-[var(--muted-foreground)]">+2 pts</p>
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
  // RENDER: Done / Game Over
  // ═══════════════════════
  if (gameState === 'done') {
    const accuracy = caughtRef.current + missedRef.current > 0
      ? Math.round((caughtRef.current / (caughtRef.current + missedRef.current)) * 100)
      : 0;
    const finalScore = scoreRef.current;
    const xp = Math.max(5, Math.floor(finalScore * 0.8));
    const coins = Math.max(1, Math.floor(finalScore * 0.3));
    const rating = finalScore >= 60 ? '🏆' : finalScore >= 30 ? '⭐' : finalScore >= 15 ? '👍' : '💪';

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card padding="lg">
          <div className="text-center py-6 space-y-6">
            <motion.span className="text-7xl block" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}>
              {rating}
            </motion.span>
            <div>
              <h2 className="text-2xl font-heading font-black">
                {lives <= 0 ? 'Game Over!' : "Time's Up!"}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {pet?.name || 'Your pet'} {finalScore >= 30 ? 'loved the feast!' : 'appreciates the effort!'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-xl font-heading font-black text-primary">{finalScore}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Score</p>
              </div>
              <div className="p-3 rounded-xl bg-amber/10 border border-amber/20 text-center">
                <p className="text-xl font-heading font-black text-amber">{maxComboRef.current}x</p>
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
  // RENDER: Playing Screen (Canvas + Overlay HUD)
  // ═══════════════════════
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            gameActiveRef.current = false;
            cancelAnimationFrame(animFrameRef.current);
            setGameState('idle');
          }}
          className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors"
          title="Quit"
        >
          <HiArrowLeft size={18} />
        </button>
        <Badge variant="primary" size="sm">🐾 Pet Catch</Badge>
      </div>

      <div className="catch-game" ref={gameRef} tabIndex={0}>
        {/* Hardware-accelerated drawing buffer */}
        <canvas
          ref={canvasRef}
          width={480}
          height={420}
          className="block w-full h-full"
        />

        {/* HUD Overlay */}
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

        {/* Timer countdown progress bar */}
        <div className="catch-timer-bar">
          <div
            className={`catch-timer-fill ${timeLeft <= 10 ? 'ending' : ''}`}
            style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

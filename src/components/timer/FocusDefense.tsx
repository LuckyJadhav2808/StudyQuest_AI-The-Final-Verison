'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiShieldCheck, HiLightningBolt } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { playClick, playSuccess } from '@/lib/sounds';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

interface FocusDefenseProps {
  isRunning: boolean;
  timeLeft: number;
  totalTime: number;
  phase: 'focus' | 'short-break' | 'long-break';
  sessions: number;
}

interface Tower {
  id: string;
  x: number;
  y: number;
  type: 'bow' | 'spire' | 'beam';
  level: number;
  lastShot: number; // timestamp
}

interface Enemy {
  id: string;
  type: 'ping' | 'doomscroll' | 'boss';
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number; // progress along path array (0 to 1)
  x: number;
  y: number;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  targetEnemyId: string;
  speed: number;
  damage: number;
  type: 'arrow' | 'bolt' | 'beam';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
}

// Tower properties config
const TOWER_CONFIG = {
  bow: { name: 'Focus Bow', cost: 10, range: 120, cooldown: 800, damage: 15, color: '#10B981', emoji: '🏹' },
  spire: { name: 'Aether Spire', cost: 20, range: 100, cooldown: 1500, damage: 45, color: '#7C3AED', emoji: '🔮' },
  beam: { name: 'Focus Beam', cost: 35, range: 150, cooldown: 400, damage: 8, color: '#EF4444', emoji: '⚡' },
};

// Tower placement slots on the map (coordinates from 0 to 100 relative)
const TOWER_SLOTS = [
  { id: 'slot-1', x: 22, y: 30 },
  { id: 'slot-2', x: 45, y: 25 },
  { id: 'slot-3', x: 35, y: 70 },
  { id: 'slot-4', x: 62, y: 55 },
  { id: 'slot-5', x: 78, y: 35 },
];

export default function FocusDefense({ isRunning, timeLeft, totalTime, phase }: FocusDefenseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  // Game States
  const [baseHp, setBaseHp] = useState<number>(100);
  const [focusPoints, setFocusPoints] = useState<number>(20); // starts with 20 FP to build first tower
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ id: string; x: number; y: number } | null>(null);

  // Keep references to states for canvas loop to avoid stale closure lags
  const stateRef = useRef({
    baseHp,
    focusPoints,
    towers,
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    isRunning,
  });

  // Keep refs synced
  useEffect(() => {
    stateRef.current.baseHp = baseHp;
    stateRef.current.focusPoints = focusPoints;
    stateRef.current.towers = towers;
    stateRef.current.isRunning = isRunning;
  }, [baseHp, focusPoints, towers, isRunning]);

  // Handle active focus time -> yields Focus Points (1 FP every 10 seconds of active focus)
  useEffect(() => {
    if (!isRunning || phase !== 'focus') return;
    const interval = setInterval(() => {
      setFocusPoints((prev) => prev + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, [isRunning, phase]);

  // Define the grid path for the enemies (percentage coordinates)
  const path = useMemo(() => [
    { x: 5, y: 15 },
    { x: 28, y: 15 },
    { x: 28, y: 50 },
    { x: 52, y: 50 },
    { x: 52, y: 20 },
    { x: 74, y: 20 },
    { x: 74, y: 78 },
    { x: 92, y: 78 },
  ], []);

  // Set up game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Helper: translate percentage coordinates to pixel coordinates
    const toPx = (pctX: number, pctY: number) => ({
      x: (pctX / 100) * canvas.width,
      y: (pctY / 100) * canvas.height,
    });

    // Helper: Spawn blood or impact particles
    const spawnParticles = (x: number, y: number, color: string, count = 8) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          life: 30 + Math.random() * 20,
        });
      }
    };

    // The Main Loop
    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Draw Background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Path
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const pt = toPx(path[i].x, path[i].y);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = canvas.height * 0.08;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.lineWidth = canvas.height * 0.02;
      ctx.stroke();

      // Draw base castle target zone
      const basePt = toPx(path[path.length - 1].x, path[path.length - 1].y);
      const gradient = ctx.createRadialGradient(basePt.x, basePt.y, 5, basePt.x, basePt.y, 40);
      gradient.addColorStop(0, 'rgba(124, 58, 237, 0.6)');
      gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(basePt.x, basePt.y, 40, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle/Glow around Core Base
      ctx.font = '24px Arial';
      ctx.fillText('🏰', basePt.x - 12, basePt.y + 8);

      // Update & Spawn enemies only when running
      if (stateRef.current.isRunning && phase === 'focus') {
        const timeSinceSpawn = timestamp - lastSpawnRef.current;
        const spawnInterval = Math.max(4000, 15000 - (totalTime - timeLeft) * 8); // spawn faster as session progresses
        
        if (timeSinceSpawn > spawnInterval) {
          lastSpawnRef.current = timestamp;
          const rand = Math.random();
          let type: 'ping' | 'doomscroll' | 'boss' = 'ping';
          let hp = 30;
          let speed = 0.001;

          if (rand > 0.85) {
            type = 'boss';
            hp = 180;
            speed = 0.0004;
          } else if (rand > 0.5) {
            type = 'doomscroll';
            hp = 70;
            speed = 0.0008;
          }

          const startPt = toPx(path[0].x, path[0].y);
          stateRef.current.enemies.push({
            id: crypto.randomUUID(),
            type,
            hp,
            maxHp: hp,
            speed,
            pathIndex: 0,
            x: startPt.x,
            y: startPt.y,
          });
        }
      }

      // Update Enemies
      for (let i = stateRef.current.enemies.length - 1; i >= 0; i--) {
        const enemy = stateRef.current.enemies[i];

        if (stateRef.current.isRunning) {
          enemy.pathIndex += enemy.speed;
        }

        // Enemy reached base
        if (enemy.pathIndex >= 1) {
          const damage = enemy.type === 'boss' ? 30 : enemy.type === 'doomscroll' ? 15 : 8;
          setBaseHp((prev) => Math.max(0, prev - damage));
          spawnParticles(enemy.x, enemy.y, '#EF4444', 15);
          stateRef.current.enemies.splice(i, 1);
          continue;
        }

        // Calculate current position along the path
        const totalSegments = path.length - 1;
        const rawProgress = enemy.pathIndex * totalSegments;
        const segmentIdx = Math.floor(rawProgress);
        const segmentProgress = rawProgress - segmentIdx;

        if (segmentIdx >= 0 && segmentIdx < totalSegments) {
          const ptA = toPx(path[segmentIdx].x, path[segmentIdx].y);
          const ptB = toPx(path[segmentIdx + 1].x, path[segmentIdx + 1].y);
          enemy.x = ptA.x + (ptB.x - ptA.x) * segmentProgress;
          enemy.y = ptA.y + (ptB.y - ptA.y) * segmentProgress;
        }

        // Draw Enemy
        ctx.fillStyle = enemy.type === 'boss' ? '#F59E0B' : enemy.type === 'doomscroll' ? '#EC4899' : '#EF4444';
        ctx.beginPath();
        const size = enemy.type === 'boss' ? 14 : enemy.type === 'doomscroll' ? 10 : 8;
        ctx.arc(enemy.x, enemy.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Draw HP Bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(enemy.x - 12, enemy.y - size - 6, 24, 4);
        ctx.fillStyle = '#10B981';
        ctx.fillRect(enemy.x - 12, enemy.y - size - 6, (enemy.hp / enemy.maxHp) * 24, 4);

        // Draw alert emoji label
        ctx.fillStyle = '#fff';
        ctx.font = '9px Arial';
        ctx.fillText(enemy.type === 'boss' ? '🎬 Video Boss' : enemy.type === 'doomscroll' ? '📱 Social' : '🚨 Ping', enemy.x - 18, enemy.y - size - 10);
      }

      // Update & Shoot Towers
      stateRef.current.towers.forEach((tower) => {
        // Draw Range on Hover
        const towerPt = toPx(tower.x, tower.y);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.beginPath();
        ctx.arc(towerPt.x, towerPt.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText(TOWER_CONFIG[tower.type].emoji, towerPt.x - 8, towerPt.y + 5);

        // Shoot at closest enemy within range
        if (stateRef.current.isRunning) {
          const cfg = TOWER_CONFIG[tower.type];
          const cooldown = cfg.cooldown / (1 + (tower.level - 1) * 0.15); // shoots faster as level increases
          
          if (timestamp - tower.lastShot > cooldown) {
            let target: Enemy | null = null;
            let minDist = cfg.range;

            stateRef.current.enemies.forEach((enemy) => {
              const dx = enemy.x - towerPt.x;
              const dy = enemy.y - towerPt.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < minDist) {
                minDist = dist;
                target = enemy;
              }
            });

            if (target) {
              tower.lastShot = timestamp;
              stateRef.current.projectiles.push({
                id: crypto.randomUUID(),
                x: towerPt.x,
                y: towerPt.y,
                targetEnemyId: (target as Enemy).id,
                speed: tower.type === 'beam' ? 12 : tower.type === 'spire' ? 4 : 8,
                damage: cfg.damage * (1 + (tower.level - 1) * 0.3),
                type: tower.type === 'beam' ? 'beam' : tower.type === 'spire' ? 'bolt' : 'arrow',
              });
            }
          }
        }
      });

      // Update Projectiles
      for (let i = stateRef.current.projectiles.length - 1; i >= 0; i--) {
        const proj = stateRef.current.projectiles[i];
        const target = stateRef.current.enemies.find((e) => e.id === proj.targetEnemyId);

        if (!target) {
          stateRef.current.projectiles.splice(i, 1);
          continue;
        }

        const dx = target.x - proj.x;
        const dy = target.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < proj.speed) {
          // Impact!
          target.hp -= proj.damage;
          spawnParticles(target.x, target.y, proj.type === 'beam' ? '#EF4444' : proj.type === 'bolt' ? '#7C3AED' : '#10B981', 6);
          
          // Delete dead enemies
          if (target.hp <= 0) {
            spawnParticles(target.x, target.y, '#F59E0B', 15);
            const targetIdx = stateRef.current.enemies.findIndex((e) => e.id === target.id);
            if (targetIdx !== -1) stateRef.current.enemies.splice(targetIdx, 1);
          }

          stateRef.current.projectiles.splice(i, 1);
        } else {
          // Travel
          proj.x += (dx / dist) * proj.speed;
          proj.y += (dy / dist) * proj.speed;

          // Draw Projectile
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.type === 'bolt' ? 5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = proj.type === 'beam' ? '#EF4444' : proj.type === 'bolt' ? '#A78BFA' : '#34D399';
          ctx.fill();
        }
      }

      // Draw Tower placement slots
      TOWER_SLOTS.forEach((slot) => {
        const towerBuilt = stateRef.current.towers.find((t) => t.x === slot.x && t.y === slot.y);
        if (!towerBuilt) {
          const pt = toPx(slot.x, slot.y);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      // Update Particles
      for (let i = stateRef.current.particles.length - 1; i >= 0; i--) {
        const p = stateRef.current.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        p.life--;

        if (p.life <= 0 || p.alpha <= 0) {
          stateRef.current.particles.splice(i, 1);
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fillRect(p.x, p.y, 2, 2);
          ctx.globalAlpha = 1;
        }
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [path, totalTime, timeLeft, phase]);

  const handleSlotClick = (slot: { id: string; x: number; y: number }) => {
    playClick();
    setSelectedSlot(slot);
  };

  const buildTower = (type: 'bow' | 'spire' | 'beam') => {
    if (!selectedSlot) return;
    const cost = TOWER_CONFIG[type].cost;
    if (focusPoints < cost) {
      toast.error('Insufficient Focus Points! Complete study minutes to gain more.');
      return;
    }

    setFocusPoints((prev) => prev - cost);
    setTowers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        x: selectedSlot.x,
        y: selectedSlot.y,
        type,
        level: 1,
        lastShot: 0,
      },
    ]);
    playSuccess();
    toast.success(`${TOWER_CONFIG[type].name} built! 🛡️`);
    setSelectedSlot(null);
  };

  return (
    <div className="w-full flex flex-col gap-4 relative z-10 px-4 md:px-0">
      {/* HUD Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="bg-slate-900/60 backdrop-blur-md border border-purple-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Shield Health</p>
              <p className="text-sm font-heading font-black text-purple-400">{baseHp}%</p>
            </div>
          </div>
          <div className="flex-1 max-w-[60px] h-2 bg-slate-800 rounded-full overflow-hidden ml-2">
            <div className="h-full bg-purple-500" style={{ width: `${baseHp}%` }} />
          </div>
        </Card>

        <Card padding="sm" className="bg-slate-900/60 backdrop-blur-md border border-teal/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Focus Points</p>
              <p className="text-sm font-heading font-black text-teal">{focusPoints} FP</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="bg-slate-900/60 backdrop-blur-md border border-amber/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏰</span>
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Defense Units</p>
              <p className="text-sm font-heading font-black text-amber">{towers.length} Towers</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Defense Simulation Grid Canvas */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden border-2 border-slate-700/50 bg-slate-950 shadow-2xl">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Hover Click overlay spots for interactive placements */}
        {TOWER_SLOTS.map((slot) => {
          const hasTower = towers.some((t) => t.x === slot.x && t.y === slot.y);
          if (hasTower) return null;

          return (
            <button
              key={slot.id}
              onClick={() => handleSlotClick(slot)}
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center bg-transparent border-2 border-dashed border-white/20 hover:border-teal hover:bg-teal/10 transition-all z-20 cursor-pointer text-xs"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              title="Place Defense Tower"
            >
              ➕
            </button>
          );
        })}
      </div>

      {/* Spawning Dialog Selection Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              className="w-full max-w-sm p-5 rounded-2xl border-2 border-slate-800 bg-[#0b0c16]/95 shadow-2xl space-y-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="text-sm font-heading font-bold text-white flex items-center gap-1.5">🛠️ Build Defense Unit</h3>
              <p className="text-xs text-slate-400">Spend Focus Points to erect defensive energy towers next to the pathway.</p>
              
              <div className="space-y-2">
                {(['bow', 'spire', 'beam'] as const).map((type) => {
                  const cfg = TOWER_CONFIG[type];
                  return (
                    <button
                      key={type}
                      disabled={focusPoints < cfg.cost}
                      onClick={() => buildTower(type)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                        focusPoints >= cfg.cost
                          ? 'border-slate-800 hover:border-teal/60 bg-slate-900/40 hover:bg-slate-900/90'
                          : 'border-slate-900 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cfg.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-white">{cfg.name}</p>
                          <p className="text-[10px] text-slate-400">Cooldown: {cfg.cooldown}ms</p>
                        </div>
                      </div>
                      <Badge variant="teal">{cfg.cost} FP</Badge>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl border-2 border-slate-800 hover:bg-slate-900 transition-colors text-slate-400"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Info Guide */}
      <div className="flex items-center gap-2 p-3 bg-purple-500/5 rounded-xl border border-purple-500/10 text-slate-400 text-[10px] leading-relaxed">
        <HiShieldCheck className="text-purple-400 shrink-0" size={14} />
        <p>
          💡 <strong>Focus Defense:</strong> Complete study minutes to accumulate <strong>Focus Points (FP)</strong>. Click empty circles ➕ to construct defensive units and guard your base from incoming alerts!
        </p>
      </div>
    </div>
  );
}

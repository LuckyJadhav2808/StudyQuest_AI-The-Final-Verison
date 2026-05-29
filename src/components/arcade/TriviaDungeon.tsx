'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiShieldCheck, HiLightningBolt, HiHeart, HiStar, HiArrowLeft } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useGamification } from '@/hooks/useGamification';
import { useShop } from '@/hooks/useShop';
import { useNotes } from '@/hooks/useNotes';
import { useAuthContext } from '@/context/AuthContext';
import { playClick, playSuccess, playXP, playCelebration } from '@/lib/sounds';
import './TriviaDungeon.css';

// ── Types ──
interface Monster {
  id: string;
  name: string;
  emoji: string;
  maxHp: number;
  attack: number;
  xpReward: number;
  coinReward: number;
  tier: 'minion' | 'elite' | 'boss';
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

type GamePhase = 'note-select' | 'battle' | 'answering' | 'result' | 'victory' | 'defeat';

// ── Monster Roster ──
const MONSTERS: Monster[] = [
  { id: 'slime', name: 'Study Slime', emoji: '🟢', maxHp: 30, attack: 8, xpReward: 15, coinReward: 5, tier: 'minion' },
  { id: 'goblin', name: 'Distraction Goblin', emoji: '👺', maxHp: 50, attack: 12, xpReward: 25, coinReward: 10, tier: 'minion' },
  { id: 'skeleton', name: 'Procrastination Skeleton', emoji: '💀', maxHp: 70, attack: 15, xpReward: 35, coinReward: 15, tier: 'elite' },
  { id: 'wizard', name: 'Confusion Wizard', emoji: '🧙', maxHp: 90, attack: 18, xpReward: 50, coinReward: 20, tier: 'elite' },
  { id: 'dragon', name: 'Exam Dragon', emoji: '🐉', maxHp: 120, attack: 22, xpReward: 80, coinReward: 35, tier: 'boss' },
  { id: 'demon', name: 'Final Boss Demon', emoji: '👿', maxHp: 150, attack: 25, xpReward: 120, coinReward: 50, tier: 'boss' },
];

const PLAYER_MAX_HP = 100;
const PLAYER_ATTACK = 20;
const TIMER_SECONDS = 10;
const CRIT_CHANCE = 0.2;

// ── Dungeon particles ──
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  left: `${(i * 11 + 5) % 90 + 5}%`,
  duration: `${10 + (i * 2) % 8}s`,
  delay: `${i * 1.3}s`,
}));

// ── Pick weighted random monster ──
function pickMonster(): Monster {
  const roll = Math.random();
  const pool = roll < 0.4
    ? MONSTERS.filter(m => m.tier === 'minion')
    : roll < 0.75
      ? MONSTERS.filter(m => m.tier === 'elite')
      : MONSTERS.filter(m => m.tier === 'boss');
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Generate question via AI ──
async function generateQuestion(noteContents: string[], apiKey: string): Promise<QuizQuestion | null> {
  const stripped = noteContents.map(c => c.replace(/<[^>]*>/g, '')).join('\n\n').slice(0, 3000);
  const prompt = `Based on these study notes, generate exactly 1 multiple-choice question.
Test understanding, not just recall. Make it challenging but fair.
Return ONLY valid JSON, no markdown, no code fences, no other text:
{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctIndex": 0, "explanation": "..."}

Notes:
${stripped}`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    // Extract JSON from response (handle possible markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as QuizQuestion;
  } catch {
    return null;
  }
}

// ── Component ──
interface TriviaDungeonProps {
  onExit: () => void;
}

export default function TriviaDungeon({ onExit }: TriviaDungeonProps) {
  const { profile } = useAuthContext();
  const { awardXP } = useGamification();
  const { addCoins } = useShop();
  const { notes } = useNotes();

  // Game state
  const [phase, setPhase] = useState<GamePhase>('note-select');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [monster, setMonster] = useState<Monster | null>(null);
  const [monsterHp, setMonsterHp] = useState(0);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [floor, setFloor] = useState(1);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timerLeft, setTimerLeft] = useState(TIMER_SECONDS);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [floatingDmg, setFloatingDmg] = useState<{ id: number; value: string; type: string } | null>(null);

  // Stats
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noteContentsRef = useRef<string[]>([]);

  const apiKey = profile?.openRouterKey;

  // Clean up timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Toggle note selection
  const toggleNote = (noteId: string) => {
    playClick();
    setSelectedNotes(prev =>
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : prev.length < 3 ? [...prev, noteId] : prev
    );
  };

  // Start the dungeon
  const startDungeon = useCallback(() => {
    const contents = notes.filter(n => selectedNotes.includes(n.id)).map(n => n.content);
    noteContentsRef.current = contents;
    setPlayerHp(PLAYER_MAX_HP);
    setFloor(1);
    setTotalCorrect(0);
    setTotalQuestions(0);
    setTotalXpEarned(0);
    setTotalCoinsEarned(0);
    spawnMonster();
  }, [notes, selectedNotes]);

  // Spawn a new monster
  const spawnMonster = () => {
    const m = pickMonster();
    setMonster(m);
    setMonsterHp(m.maxHp);
    setPhase('battle');
    generateNextQuestion();
  };

  // Generate next question
  const generateNextQuestion = async () => {
    if (!apiKey) return;
    setLoading(true);
    setSelectedOption(null);
    setIsCorrect(null);
    const q = await generateQuestion(noteContentsRef.current, apiKey);
    if (q) {
      setQuestion(q);
      setPhase('answering');
      setTimerLeft(TIMER_SECONDS);
      startTimer();
    } else {
      toast.error('Failed to generate question. Try again!');
      setPhase('battle');
    }
    setLoading(false);
  };

  // Start countdown timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let t = TIMER_SECONDS;
    timerRef.current = setInterval(() => {
      t -= 0.1;
      setTimerLeft(Math.max(0, t));
      if (t <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleTimeout();
      }
    }, 100);
  };

  // Handle answer selection
  const handleAnswer = (index: number) => {
    if (selectedOption !== null || !question || !monster) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOption(index);
    setTotalQuestions(prev => prev + 1);
    const correct = index === question.correctIndex;
    setIsCorrect(correct);

    if (correct) {
      playSuccess();
      setTotalCorrect(prev => prev + 1);
      const isCrit = Math.random() < CRIT_CHANCE;
      const dmg = isCrit ? Math.floor(PLAYER_ATTACK * 1.5) : PLAYER_ATTACK;
      const newHp = Math.max(0, monsterHp - dmg);
      setMonsterHp(newHp);
      setShake(true);
      setFloatingDmg({ id: Date.now(), value: isCrit ? `${dmg} CRIT!` : `${dmg}`, type: isCrit ? 'crit' : 'monster-damage' });
      setTimeout(() => setShake(false), 400);
      setTimeout(() => setFloatingDmg(null), 1200);

      // Check monster death
      if (newHp <= 0) {
        setTimeout(() => handleVictory(), 1000);
        return;
      }
    } else {
      handlePlayerDamage();
    }

    // Next question after delay
    setTimeout(() => {
      if (correct || playerHp - (monster?.attack || 0) > 0) {
        generateNextQuestion();
      }
    }, 2000);
  };

  // Handle timeout
  const handleTimeout = () => {
    if (selectedOption !== null) return;
    setSelectedOption(-1);
    setIsCorrect(false);
    setTotalQuestions(prev => prev + 1);
    handlePlayerDamage();

    setTimeout(() => {
      if (playerHp - (monster?.attack || 0) > 0) {
        generateNextQuestion();
      }
    }, 2000);
  };

  // Monster attacks player
  const handlePlayerDamage = () => {
    if (!monster) return;
    const dmg = monster.attack;
    const newHp = Math.max(0, playerHp - dmg);
    setPlayerHp(newHp);
    setShake(true);
    setFloatingDmg({ id: Date.now(), value: `${dmg}`, type: 'player-damage' });
    setTimeout(() => setShake(false), 400);
    setTimeout(() => setFloatingDmg(null), 1200);

    if (newHp <= 0) {
      setTimeout(() => handleDefeat(), 1000);
    }
  };

  // Victory
  const handleVictory = async () => {
    if (!monster) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('victory');
    playCelebration();
    const xp = monster.xpReward;
    const coins = monster.coinReward;
    setTotalXpEarned(prev => prev + xp);
    setTotalCoinsEarned(prev => prev + coins);
    await awardXP(xp, 'Trivia Dungeon victory');
    await addCoins(coins);
    toast.success(`+${xp} XP  +${coins} Coins! 🎉`);
  };

  // Defeat
  const handleDefeat = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('defeat');
    const partialXp = Math.floor(totalXpEarned * 0.5) || 5;
    await awardXP(partialXp, 'Trivia Dungeon attempt');
    toast('You were defeated... +' + partialXp + ' XP saved', { icon: '💀' });
  };

  // Next floor
  const nextFloor = () => {
    setFloor(prev => prev + 1);
    spawnMonster();
  };

  // Health bar helper
  const hpPercent = (current: number, max: number) => Math.max(0, (current / max) * 100);
  const hpClass = (pct: number) => pct <= 25 ? 'low' : pct <= 50 ? 'medium' : '';

  // Timer ring
  const timerRadius = 14;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset = timerCircumference * (1 - timerLeft / TIMER_SECONDS);

  // ═══════════════════════════════════════════════
  // RENDER: Note Selection
  // ═══════════════════════════════════════════════
  if (phase === 'note-select') {
    return (
      <div className="dungeon-container space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors">
            <HiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              <span>⚔️</span> Trivia Dungeon
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">Select up to 3 notes to battle with</p>
          </div>
        </div>

        {!apiKey ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="text-5xl block mb-4">🔑</span>
              <h3 className="text-lg font-heading font-bold mb-2">API Key Required</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">Add your OpenRouter API key in Settings to generate AI questions.</p>
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/settings'}>Go to Settings</Button>
            </div>
          </Card>
        ) : notes.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="text-5xl block mb-4">📝</span>
              <h3 className="text-lg font-heading font-bold mb-2">No Notes Found</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">Create some study notes first — the dungeon generates questions from them!</p>
              <Button variant="teal" size="sm" onClick={() => window.location.href = '/notes'}>Create Notes</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="note-selector-grid">
              {notes.map(note => (
                <motion.div
                  key={note.id}
                  className={`note-card ${selectedNotes.includes(note.id) ? 'selected' : ''}`}
                  onClick={() => toggleNote(note.id)}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${selectedNotes.includes(note.id) ? 'bg-primary border-primary' : 'border-[var(--card-border)]'}`}>
                      {selectedNotes.includes(note.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{note.title || 'Untitled'}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{note.folder || 'General'} · {note.tags.slice(0, 2).join(', ') || 'No tags'}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted-foreground)] font-semibold">{selectedNotes.length}/3 notes selected</p>
              <Button
                variant="coral"
                size="lg"
                icon={<HiLightningBolt />}
                onClick={startDungeon}
                disabled={selectedNotes.length === 0}
              >
                Enter Dungeon ⚔️
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // RENDER: Victory
  // ═══════════════════════════════════════════════
  if (phase === 'victory') {
    return (
      <div className="dungeon-container space-y-6">
        <Card padding="lg">
          <div className="text-center py-8 space-y-6">
            <motion.span className="text-7xl block" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}>
              🏆
            </motion.span>
            <div>
              <h2 className="text-2xl font-heading font-black">Victory!</h2>
              <p className="text-sm text-[var(--muted-foreground)]">You defeated {monster?.name} on Floor {floor}!</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-xl font-heading font-black text-primary">{totalXpEarned}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">XP Earned</p>
              </div>
              <div className="p-3 rounded-xl bg-amber/10 border border-amber/20 text-center">
                <p className="text-xl font-heading font-black text-amber">{totalCoinsEarned}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Coins</p>
              </div>
              <div className="p-3 rounded-xl bg-teal/10 border border-teal/20 text-center">
                <p className="text-xl font-heading font-black text-teal">{totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0}%</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Accuracy</p>
              </div>
              <div className="p-3 rounded-xl bg-coral/10 border border-coral/20 text-center">
                <p className="text-xl font-heading font-black text-coral">{floor}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Floor</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="primary" icon={<HiLightningBolt />} onClick={nextFloor}>Next Floor ⚔️</Button>
              <Button variant="ghost" icon={<HiArrowLeft />} onClick={onExit}>Leave Dungeon</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // RENDER: Defeat
  // ═══════════════════════════════════════════════
  if (phase === 'defeat') {
    return (
      <div className="dungeon-container space-y-6">
        <Card padding="lg">
          <div className="text-center py-8 space-y-6">
            <motion.span className="text-7xl block" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
              💀
            </motion.span>
            <div>
              <h2 className="text-2xl font-heading font-black">Defeated!</h2>
              <p className="text-sm text-[var(--muted-foreground)]">You fell on Floor {floor} to {monster?.name}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-xl font-heading font-black text-primary">{Math.floor(totalXpEarned * 0.5) || 5}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">XP Saved</p>
              </div>
              <div className="p-3 rounded-xl bg-teal/10 border border-teal/20 text-center">
                <p className="text-xl font-heading font-black text-teal">{totalCorrect}/{totalQuestions}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Correct</p>
              </div>
              <div className="p-3 rounded-xl bg-coral/10 border border-coral/20 text-center">
                <p className="text-xl font-heading font-black text-coral">{floor}</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Floor</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="coral" icon={<HiLightningBolt />} onClick={startDungeon}>Try Again</Button>
              <Button variant="ghost" icon={<HiArrowLeft />} onClick={onExit}>Leave Dungeon</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // RENDER: Battle / Answering
  // ═══════════════════════════════════════════════
  const monsterHpPct = monster ? hpPercent(monsterHp, monster.maxHp) : 100;
  const playerHpPct = hpPercent(playerHp, PLAYER_MAX_HP);

  return (
    <div className="dungeon-container space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors" title="Leave Dungeon">
          <HiArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="sm">⚔️ Floor {floor}</Badge>
          <Badge variant="teal" size="sm">✅ {totalCorrect}/{totalQuestions}</Badge>
        </div>
      </div>

      {/* Battle Scene */}
      <div className={`battle-scene ${shake ? 'shake' : ''}`}>
        {/* Particles */}
        <div className="dungeon-particles">
          {PARTICLES.map((p, i) => (
            <div key={i} className="dungeon-particle" style={{ left: p.left, animationDuration: p.duration, animationDelay: p.delay }} />
          ))}
        </div>

        {/* Monster Area */}
        <div className="monster-area">
          {monster && (
            <>
              <div className={`monster-glow ${monster.tier}`} />

              {/* Monster HP */}
              <div className="health-bar-container">
                <div className="health-bar-label">
                  <span>{monster.name}</span>
                  <span>{monsterHp}/{monster.maxHp}</span>
                </div>
                <div className="health-bar-track">
                  <div className={`health-bar-fill monster ${hpClass(monsterHpPct)}`} style={{ width: `${monsterHpPct}%` }} />
                </div>
                <span className={`monster-tier ${monster.tier}`}>{monster.tier.toUpperCase()}</span>
              </div>

              {/* Monster Emoji */}
              <motion.div
                className="monster-emoji"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {monster.emoji}
              </motion.div>

              {/* Floating damage */}
              <AnimatePresence>
                {floatingDmg && (
                  <motion.div
                    key={floatingDmg.id}
                    className={`damage-float ${floatingDmg.type}`}
                    initial={{ opacity: 1, y: 0, scale: 0.5 }}
                    animate={{ opacity: 0, y: -60, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                  >
                    -{floatingDmg.value}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Loading state */}
          {loading && (
            <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.span className="text-3xl block mb-2" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⚡</motion.span>
              <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Generating question...</p>
            </motion.div>
          )}
        </div>

        {/* Question Panel */}
        {(phase === 'answering' || phase === 'result') && question && (
          <div className="question-panel">
            <p className="question-text">{question.question}</p>

            <div className="options-grid">
              {question.options.map((opt, i) => {
                let cls = 'option-btn';
                if (selectedOption !== null) {
                  if (i === question.correctIndex) cls += ' correct';
                  else if (i === selectedOption && !isCorrect) cls += ' wrong';
                  else if (selectedOption === -1) cls += ' timeout';
                }
                return (
                  <motion.button
                    key={i}
                    className={cls}
                    onClick={() => handleAnswer(i)}
                    disabled={selectedOption !== null}
                    whileTap={selectedOption === null ? { scale: 0.95 } : {}}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    {opt}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation after answering */}
            {selectedOption !== null && question.explanation && (
              <motion.p
                className="text-xs text-white/50 text-center mt-3 italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                💡 {question.explanation}
              </motion.p>
            )}

            {/* Timer */}
            {selectedOption === null && (
              <div className="timer-ring-container">
                <svg className="timer-ring" viewBox="0 0 36 36">
                  <circle className="timer-ring-bg" cx="18" cy="18" r={timerRadius} />
                  <circle
                    className={`timer-ring-progress ${timerLeft <= 3 ? 'urgent' : ''}`}
                    cx="18" cy="18" r={timerRadius}
                    strokeDasharray={timerCircumference}
                    strokeDashoffset={timerOffset}
                  />
                </svg>
                <span className={`timer-text ${timerLeft <= 3 ? 'urgent' : ''}`}>
                  {Math.ceil(timerLeft)}s
                </span>
              </div>
            )}
          </div>
        )}

        {/* Player Area */}
        <div className="player-area">
          <div className="player-info">
            <div className="player-avatar">⚔️</div>
            <div>
              <div className="health-bar-container" style={{ maxWidth: 180 }}>
                <div className="health-bar-label">
                  <span>You</span>
                  <span>{playerHp}/{PLAYER_MAX_HP}</span>
                </div>
                <div className="health-bar-track">
                  <div className={`health-bar-fill player ${hpClass(playerHpPct)}`} style={{ width: `${playerHpPct}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="player-stats">
            <div className="player-stat">
              <HiStar className="text-amber" size={14} /> {totalXpEarned} XP
            </div>
            <div className="player-stat">
              <HiShieldCheck className="text-teal" size={14} /> {totalCorrect}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

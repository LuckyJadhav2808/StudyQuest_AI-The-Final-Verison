'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlay, HiRefresh, HiLightningBolt, HiClock, HiStar, HiTrendingUp, HiArrowLeft } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';
import { useGamification } from '@/hooks/useGamification';
import { XP_AWARDS } from '@/lib/constants';
import TriviaDungeon from '@/components/arcade/TriviaDungeon';
import PetCatchGame from '@/components/arcade/PetCatchGame';

type ArcadeGame = 'hub' | 'typing' | 'dungeon' | 'catch';

// ── Code Snippet Banks (sorted by difficulty) ──
const CODE_SNIPPETS = [
  // Easy
  `const unique = [...new Set(array)];`,
  `const max = Math.max(...numbers);`,
  `const square = (n) => n * n;`,
  `let count = arr.filter(Boolean).length;`,
  `const sum = (arr) => arr.reduce((a, b) => a + b, 0);`,
  `const isPalindrome = (s) => s === s.split('').reverse().join('');`,
  `const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);`,
  `const flatten = (arr) => arr.flat(Infinity);`,
  // Medium
  `for (let i = 0; i < arr.length; i++) {\n  if (arr[i] === target) return i;\n}`,
  `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}`,
  `const debounce = (fn, ms) => {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n};`,
  `async function fetchData(url) {\n  const res = await fetch(url);\n  return res.json();\n}`,
  `class Stack {\n  constructor() { this.items = []; }\n  push(val) { this.items.push(val); }\n  pop() { return this.items.pop(); }\n}`,
  `const groupBy = (arr, key) =>\n  arr.reduce((acc, item) => {\n    (acc[item[key]] ||= []).push(item);\n    return acc;\n  }, {});`,
  `SELECT name, COUNT(*) as total\nFROM students\nGROUP BY name\nHAVING total > 1\nORDER BY total DESC;`,
  `def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)`,
  // Hard
  `function binarySearch(arr, target) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === target) return mid;\n    arr[mid] < target ? lo = mid + 1 : hi = mid - 1;\n  }\n  return -1;\n}`,
  `const deepClone = (obj) => {\n  if (obj === null || typeof obj !== 'object') return obj;\n  const clone = Array.isArray(obj) ? [] : {};\n  for (const key in obj) {\n    clone[key] = deepClone(obj[key]);\n  }\n  return clone;\n};`,
  `class LinkedList {\n  constructor() { this.head = null; }\n  append(val) {\n    const node = { val, next: null };\n    if (!this.head) { this.head = node; return; }\n    let curr = this.head;\n    while (curr.next) curr = curr.next;\n    curr.next = node;\n  }\n}`,
  `function throttle(fn, limit) {\n  let inThrottle = false;\n  return function(...args) {\n    if (!inThrottle) {\n      fn.apply(this, args);\n      inThrottle = true;\n      setTimeout(() => inThrottle = false, limit);\n    }\n  };\n}`,
];

// ── Study Term Banks (multi-subject) ──
const STUDY_TERMS = [
  // Biology
  "Photosynthesis converts light energy into chemical energy in plants.",
  "Mitochondria are the powerhouse of the cell, producing ATP through cellular respiration.",
  "DNA replication is semi-conservative, each strand serves as a template for a new strand.",
  "The central dogma of biology: DNA is transcribed to RNA, which is translated to protein.",
  "Natural selection is the process where organisms with favorable traits survive and reproduce.",
  "Enzymes are biological catalysts that lower the activation energy of chemical reactions.",
  // Physics
  "Newton's third law: every action has an equal and opposite reaction.",
  "Ohm's law states V = IR where V is voltage, I is current, R is resistance.",
  "The speed of light in a vacuum is approximately 299,792,458 meters per second.",
  "Kinetic energy equals one-half times mass times velocity squared: KE = 0.5mv^2.",
  "Entropy in a closed system always increases according to the second law of thermodynamics.",
  "Electromagnetic waves travel at the speed of light and do not require a medium.",
  // Computer Science
  "An algorithm is a step-by-step procedure for solving a problem in a finite number of steps.",
  "The OSI model has seven layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.",
  "SQL stands for Structured Query Language, used for managing relational databases.",
  "HTTP is a stateless protocol used for transmitting hypertext documents on the web.",
  "A binary tree has at most two children per node, called left child and right child.",
  "Big O notation describes the upper bound of an algorithm's time or space complexity.",
  "TCP ensures reliable data delivery through acknowledgments and retransmissions.",
  "A hash table provides O(1) average time complexity for insertions and lookups.",
  "Recursion is when a function calls itself with a smaller input until reaching a base case.",
  // Mathematics
  "The derivative of a function gives the slope of the tangent line at any given point.",
  "The Pythagorean theorem states that a^2 + b^2 = c^2 in a right triangle.",
  "A prime number is a natural number greater than 1 that has no positive divisors other than 1 and itself.",
  "The quadratic formula is x = (-b +/- sqrt(b^2 - 4ac)) / 2a for the equation ax^2 + bx + c = 0.",
  "Integration is the reverse process of differentiation and calculates the area under a curve.",
  // Chemistry
  "The periodic table organizes elements by increasing atomic number and chemical properties.",
  "Covalent bonds form when atoms share electron pairs to achieve stable electron configurations.",
  "pH is a measure of hydrogen ion concentration: pH 7 is neutral, below is acidic, above is basic.",
  "Avogadro's number is 6.022 x 10^23, representing the number of atoms in one mole of a substance.",
  // History & General
  "The Renaissance was a cultural movement that began in Italy during the 14th century.",
  "The theory of relativity by Einstein shows that E = mc^2, relating energy and mass.",
];

type Mode = 'code' | 'study';

interface GameResult {
  wpm: number;
  accuracy: number;
  time: number;
  mode: Mode;
  xpEarned: number;
}

const TIME_LIMIT = 30000; // 30 seconds for time challenge

export default function ArcadeContent() {
  const [activeGame, setActiveGame] = useState<ArcadeGame>('hub');
  const [mode, setMode] = useState<Mode>('code');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [snippet, setSnippet] = useState('');
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [timeChallenge, setTimeChallenge] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { awardXP } = useGamification();

  // Pick random snippet
  const pickSnippet = useCallback(() => {
    const pool = mode === 'code' ? CODE_SNIPPETS : STUDY_TERMS;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [mode]);

  // Start game
  const startGame = useCallback(() => {
    const s = pickSnippet();
    setSnippet(s);
    setTyped('');
    setGameState('playing');
    setStartTime(Date.now());
    setElapsed(0);
    setLastResult(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [pickSnippet]);

  // Timer tick + time challenge auto-finish
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      const now = Date.now() - startTime;
      setElapsed(now);
      if (timeChallenge && now >= TIME_LIMIT) {
        finishGame();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [gameState, startTime, timeChallenge]);

  // Check completion (normal mode)
  useEffect(() => {
    if (gameState !== 'playing' || !snippet) return;
    if (!timeChallenge && typed.length >= snippet.length) {
      finishGame();
    }
  }, [typed, snippet, gameState, timeChallenge]);

  const finishGame = () => {
    const timeSeconds = (Date.now() - startTime) / 1000;
    const words = snippet.split(/\s+/).length;
    const wpm = Math.round((words / timeSeconds) * 60);

    // Calculate accuracy
    let correct = 0;
    for (let i = 0; i < snippet.length; i++) {
      if (typed[i] === snippet[i]) correct++;
    }
    const accuracy = Math.round((correct / snippet.length) * 100);

    // XP: base 5 + bonus for speed and accuracy
    let xp = 5;
    if (accuracy >= 95) xp += 5;
    if (accuracy >= 100) xp += 5;
    if (wpm >= 40) xp += 3;
    if (wpm >= 60) xp += 5;

    const result: GameResult = {
      wpm,
      accuracy,
      time: Math.round(timeSeconds * 10) / 10,
      mode,
      xpEarned: xp,
    };

    setLastResult(result);
    setResults((prev) => [...prev.slice(-9), result]);
    setGameState('done');
    awardXP(xp, 'Typing Arcade');
    toast.success(`+${xp} XP earned! ⚡`);
  };

  // Render the snippet with character-by-character coloring
  const renderSnippet = useMemo(() => {
    if (!snippet) return null;
    return snippet.split('').map((char, i) => {
      let className = 'text-[var(--muted-foreground)] opacity-40'; // untyped
      if (i < typed.length) {
        className = typed[i] === char
          ? 'text-teal' // correct
          : 'bg-coral/20 text-coral'; // wrong
      }
      if (i === typed.length) {
        className += ' border-l-2 border-primary animate-pulse'; // cursor position
      }
      return (
        <span key={i} className={className}>
          {char === '\n' ? '↵\n' : char === ' ' ? '\u00A0' : char}
        </span>
      );
    });
  }, [snippet, typed]);

  // Stats
  const avgWpm = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.wpm, 0) / results.length)
    : 0;
  const avgAccuracy = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.accuracy, 0) / results.length)
    : 0;
  const bestWpm = results.length > 0
    ? Math.max(...results.map((r) => r.wpm))
    : 0;

  // ─── Game Hub ───
  if (activeGame === 'hub') {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-heading font-black flex items-center justify-center gap-3">
              <motion.span className="text-4xl" animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>🕹️</motion.span>
              Arcade
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Choose your game. Earn XP. Have fun.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Typing Arcade Card */}
            <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
              <Card padding="lg" hover className="cursor-pointer h-full" onClick={() => setActiveGame('typing')}>
                <div className="text-center space-y-4">
                  <motion.span className="text-6xl block" animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }}>⌨️</motion.span>
                  <div>
                    <h2 className="text-xl font-heading font-black">Typing Arcade</h2>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">Type code snippets & study terms at blazing speed</p>
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Badge variant="primary" size="sm">💻 Code</Badge>
                    <Badge variant="teal" size="sm">📚 Terms</Badge>
                    <Badge variant="coral" size="sm">⏱️ Time Attack</Badge>
                  </div>
                  <Button variant="primary" size="sm" icon={<HiPlay />}>Play</Button>
                </div>
              </Card>
            </motion.div>

            {/* Trivia Dungeon Card */}
            <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
              <Card padding="lg" hover className="cursor-pointer h-full relative overflow-hidden" onClick={() => setActiveGame('dungeon')}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-red-500/10 pointer-events-none" />
                <div className="text-center space-y-4 relative z-10">
                  <motion.span className="text-6xl block" animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>⚔️</motion.span>
                  <div>
                    <h2 className="text-xl font-heading font-black">Trivia Dungeon</h2>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">Battle monsters with knowledge from your notes</p>
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Badge variant="amber" size="sm">🐉 Bosses</Badge>
                    <Badge variant="primary" size="sm">🧠 AI Quiz</Badge>
                    <Badge variant="teal" size="sm">💰 Loot</Badge>
                  </div>
                  <Button variant="coral" size="sm" icon={<HiPlay />}>Enter Dungeon</Button>
                </div>
              </Card>
            </motion.div>

            {/* Pet Catch Card */}
            <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} className="md:col-span-2">
              <Card padding="lg" hover className="cursor-pointer h-full relative overflow-hidden" onClick={() => setActiveGame('catch')}>
                <div className="absolute inset-0 bg-gradient-to-br from-teal/10 via-transparent to-amber/10 pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-6 relative z-10">
                  <motion.span className="text-6xl block flex-shrink-0" animate={{ y: [0, -8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>🐾</motion.span>
                  <div className="flex-1">
                    <h2 className="text-xl font-heading font-black">Pet Catch</h2>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">Move your pet to catch falling food & treats. Avoid bombs!</p>
                    <div className="flex gap-2 mt-2 flex-wrap justify-center sm:justify-start">
                      <Badge variant="teal" size="sm">❤️ 3 Lives</Badge>
                      <Badge variant="amber" size="sm">🔥 Combos</Badge>
                      <Badge variant="primary" size="sm">🐾 Pet Mood</Badge>
                    </div>
                  </div>
                  <Button variant="teal" size="sm" icon={<HiPlay />}>Play</Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ─── Trivia Dungeon ───
  if (activeGame === 'dungeon') {
    return (
      <PageTransition>
        <TriviaDungeon onExit={() => setActiveGame('hub')} />
      </PageTransition>
    );
  }

  // ─── Pet Catch ───
  if (activeGame === 'catch') {
    return (
      <PageTransition>
        <PetCatchGame onExit={() => setActiveGame('hub')} />
      </PageTransition>
    );
  }

  // ─── Typing Arcade ───
  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveGame('hub')} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors" title="Back to Arcade">
                <HiArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl font-heading font-black flex items-center gap-2">
                  <span className="text-2xl">⌨️</span> Typing Arcade
                </h1>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Warm up your fingers. Type fast, type accurate, earn XP.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => setMode('code')}
              className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${mode === 'code' ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/30'}`}
            >
              💻 Code
            </button>
            <button
              onClick={() => setMode('study')}
              className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${mode === 'study' ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/30'}`}
            >
              📚 Study Terms
            </button>
            <button
              onClick={() => setTimeChallenge(!timeChallenge)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${timeChallenge ? 'bg-coral text-white border-coral' : 'border-[var(--card-border)] hover:border-coral/30'}`}
            >
              ⏱️ 30s Challenge
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Card padding="sm" hover={false}>
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Avg WPM</p>
                <p className="text-2xl font-heading font-black text-primary">{avgWpm}</p>
              </div>
            </Card>
            <Card padding="sm" hover={false}>
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Best WPM</p>
                <p className="text-2xl font-heading font-black text-teal">{bestWpm}</p>
              </div>
            </Card>
            <Card padding="sm" hover={false}>
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Avg Accuracy</p>
                <p className="text-2xl font-heading font-black text-amber">{avgAccuracy}%</p>
              </div>
            </Card>
          </div>
        )}

        {/* Game Area */}
        <Card padding="lg" hover={false}>
          {gameState === 'idle' && (
            <div className="text-center py-12">
              <motion.span
                className="text-6xl block mb-4"
                animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                ⌨️
              </motion.span>
              <h3 className="text-lg font-heading font-bold mb-2">Ready to Type?</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm mx-auto">
                {mode === 'code'
                  ? 'Type code snippets as fast and accurately as possible. Earn XP for speed & precision!'
                  : 'Type study terms from memory. Build muscle memory for key concepts!'}
              </p>
              <Button variant="primary" size="lg" icon={<HiPlay />} onClick={startGame}>
                Start Typing
              </Button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="space-y-4">
              {/* Timer bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HiClock className={timeChallenge && elapsed > 20000 ? 'text-coral' : 'text-primary'} size={16} />
                  <span className="text-sm font-heading font-bold tabular-nums">
                    {timeChallenge
                      ? `${Math.max(0, ((TIME_LIMIT - elapsed) / 1000)).toFixed(1)}s left`
                      : `${(elapsed / 1000).toFixed(1)}s`}
                  </span>
                  {timeChallenge && <Badge variant="coral" size="sm">⏱️ Time Challenge</Badge>}
                </div>
                <Badge variant="primary" size="sm">
                  {typed.length}/{snippet.length} chars
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-[var(--card-border)] overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${timeChallenge ? 'bg-gradient-to-r from-coral to-amber' : 'bg-gradient-to-r from-primary to-teal'}`}
                  style={{ width: timeChallenge ? `${Math.max(0, (1 - elapsed / TIME_LIMIT)) * 100}%` : `${(typed.length / snippet.length) * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* Snippet display */}
              <div className="p-4 rounded-2xl bg-[var(--background)] border-2 border-[var(--card-border)] font-mono text-sm leading-relaxed whitespace-pre-wrap break-all min-h-[100px]">
                {renderSnippet}
              </div>

              {/* Hidden input area */}
              <textarea
                ref={inputRef}
                value={typed}
                onChange={(e) => {
                  if (gameState === 'playing') {
                    setTyped(e.target.value);
                  }
                }}
                className="w-full p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 font-mono text-sm focus:border-primary focus:outline-none resize-none transition-colors"
                placeholder="Start typing here..."
                rows={3}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
              />
            </div>
          )}

          {gameState === 'done' && lastResult && (
            <div className="text-center py-8 space-y-6">
              <motion.span
                className="text-6xl block"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {lastResult.accuracy >= 95 ? '🏆' : lastResult.accuracy >= 80 ? '⭐' : '💪'}
              </motion.span>

              <div>
                <h3 className="text-xl font-heading font-black mb-1">
                  {lastResult.accuracy >= 95 ? 'Perfect!' : lastResult.accuracy >= 80 ? 'Great Job!' : 'Keep Practicing!'}
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  You earned <span className="text-primary font-bold">+{lastResult.xpEarned} XP</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-sm mx-auto">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <HiLightningBolt className="text-primary mx-auto mb-1" size={20} />
                  <p className="text-xl font-heading font-black text-primary">{lastResult.wpm}</p>
                  <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">WPM</p>
                </div>
                <div className="p-3 rounded-xl bg-teal/10 border border-teal/20">
                  <HiStar className="text-teal mx-auto mb-1" size={20} />
                  <p className="text-xl font-heading font-black text-teal">{lastResult.accuracy}%</p>
                  <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Accuracy</p>
                </div>
                <div className="p-3 rounded-xl bg-amber/10 border border-amber/20">
                  <HiClock className="text-amber mx-auto mb-1" size={20} />
                  <p className="text-xl font-heading font-black text-amber">{lastResult.time}s</p>
                  <p className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Time</p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="primary" icon={<HiRefresh />} onClick={startGame}>
                  Play Again
                </Button>
                <Button variant="ghost" icon={<HiTrendingUp />} onClick={() => setGameState('idle')}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Recent Games */}
        {results.length > 0 && (
          <Card padding="md" hover={false}>
            <h3 className="text-sm font-heading font-bold flex items-center gap-2 mb-3">
              <HiTrendingUp className="text-primary" /> Recent Games
            </h3>
            <div className="space-y-1.5">
              {[...results].reverse().map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl border border-[var(--card-border)] text-xs"
                >
                  <Badge variant={r.mode === 'code' ? 'primary' : 'teal'} size="sm">
                    {r.mode === 'code' ? '💻' : '📚'}
                  </Badge>
                  <span className="font-heading font-bold">{r.wpm} WPM</span>
                  <span className={`font-bold ${r.accuracy >= 95 ? 'text-teal' : r.accuracy >= 80 ? 'text-amber' : 'text-coral'}`}>
                    {r.accuracy}%
                  </span>
                  <span className="text-[var(--muted-foreground)]">{r.time}s</span>
                  <span className="ml-auto text-primary font-bold">+{r.xpEarned} XP</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

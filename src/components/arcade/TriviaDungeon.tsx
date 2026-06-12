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
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
const TIMER_SECONDS = 30; // Increased from 10s to 30s so users can read comprehensive questions
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

// ── Fallback Trivia Question Bank (General Computer Science) ──
const FALLBACK_QUESTIONS: QuizQuestion[] = [
  {
    question: "What is the time complexity of searching in a balanced binary search tree (BST)?",
    options: ["A) O(1)", "B) O(log n)", "C) O(n)", "D) O(n log n)"],
    correctIndex: 1,
    explanation: "A balanced BST, like an AVL or Red-Black tree, keeps its height bounded by log n, so search, insert, and delete take O(log n) time."
  },
  {
    question: "Which of the following is NOT a fundamental concept of Object-Oriented Programming (OOP)?",
    options: ["A) Encapsulation", "B) Inheritance", "C) Compilation", "D) Polymorphism"],
    correctIndex: 2,
    explanation: "Compilation is a build process. The four pillars of OOP are Encapsulation, Inheritance, Polymorphism, and Abstraction."
  },
  {
    question: "What does HTML stand for?",
    options: ["A) Hyper Text Markup Language", "B) High Text Markup Language", "C) Hyper Tabular Markup Language", "D) None of the above"],
    correctIndex: 0,
    explanation: "HTML stands for Hyper Text Markup Language. It is the standard markup language for documents designed to be displayed in a web browser."
  },
  {
    question: "Which HTTP status code represents 'Internal Server Error'?",
    options: ["A) 400", "B) 403", "C) 404", "D) 500"],
    correctIndex: 3,
    explanation: "500 is the standard HTTP status code for a generic internal server error."
  },
  {
    question: "In computer network routing, what does IP stand for?",
    options: ["A) Internet Protocol", "B) Information Path", "C) Intranet Port", "D) Instant Packet"],
    correctIndex: 0,
    explanation: "IP stands for Internet Protocol, which is the principal communications protocol in the Internet protocol suite for routing packets."
  },
  {
    question: "Which data structure operates on a Last In, First Out (LIFO) basis?",
    options: ["A) Queue", "B) Stack", "C) Heap", "D) Hash Table"],
    correctIndex: 1,
    explanation: "A Stack adds and removes elements from the same end, making it Last In, First Out (LIFO)."
  },
  {
    question: "What is the primary purpose of the 'git clone' command?",
    options: ["A) Copy an existing repository to a new directory", "B) Merge two branches", "C) Delete a repository", "D) Stage files for a commit"],
    correctIndex: 0,
    explanation: "git clone is used to target an existing repository and copy (clone) it locally."
  },
  {
    question: "Which SQL clause is used to filter records based on group summaries?",
    options: ["A) WHERE", "B) HAVING", "C) GROUP BY", "D) ORDER BY"],
    correctIndex: 1,
    explanation: "The HAVING clause was added to SQL because the WHERE keyword cannot be used with aggregate functions."
  },
  {
    question: "What is the main advantage of using a Hash Map?",
    options: ["A) It maintains insertion order", "B) It sorts keys automatically", "C) It provides O(1) average time complexity for lookup", "D) It uses less memory than an array"],
    correctIndex: 2,
    explanation: "Hash maps use hashing to map keys to bucket indices, providing O(1) average time complexity for search, insert, and delete."
  },
  {
    question: "Which of the following is a CSS layout model designed for one-dimensional layouts?",
    options: ["A) CSS Grid", "B) Flexbox", "C) Position Absolute", "D) Float Table"],
    correctIndex: 1,
    explanation: "Flexbox (Flexible Box Layout) is designed as a one-dimensional layout model (row or column), whereas CSS Grid is designed for two dimensions."
  },
  {
    question: "What is the output of 'typeof null' in JavaScript?",
    options: ["A) 'null'", "B) 'undefined'", "C) 'object'", "D) 'number'"],
    correctIndex: 2,
    explanation: "In JavaScript, 'typeof null' returns 'object'. This is a well-known, historical bug in the language implementation."
  },
  {
    question: "In database design, what does 'ACID' properties stand for?",
    options: [
      "A) Atomicity, Consistency, Isolation, Durability",
      "B) Access, Control, Index, Data",
      "C) Allocation, Concurrency, Integrity, Distribution",
      "D) None of the above"
    ],
    correctIndex: 0,
    explanation: "ACID stands for Atomicity, Consistency, Isolation, and Durability, ensuring reliable database transaction processing."
  },
  {
    question: "Which sorting algorithm has a worst-case time complexity of O(n^2)?",
    options: ["A) Merge Sort", "B) Quick Sort", "C) Heap Sort", "D) Radix Sort"],
    correctIndex: 1,
    explanation: "Quick Sort has a worst-case time complexity of O(n^2) when the pivot selection consistently selects the smallest or largest element, though its average case is O(n log n)."
  },
  {
    question: "What is the purpose of the Event Loop in JavaScript?",
    options: [
      "A) To run code synchronously line-by-line",
      "B) To compile code to binary format",
      "C) To monitor the call stack and callback queue for asynchronous execution",
      "D) To manage connections to database systems"
    ],
    correctIndex: 2,
    explanation: "The Event Loop monitors the call stack and callback queue, pushing callbacks onto the stack when the stack is empty."
  },
  {
    question: "What does DNS stand for in internet terminology?",
    options: ["A) Data Name Service", "B) Domain Name System", "C) Digital Network Security", "D) Distributed Node Server"],
    correctIndex: 1,
    explanation: "DNS stands for Domain Name System. It acts as the phonebook of the internet, translating domain names (like google.com) into IP addresses."
  }
];

// ── Generate questions batch via AI ──
async function generateQuestionsBatch(
  noteContents: string[],
  apiKey: string,
  seenQuestionTexts: string[],
  count: number = 6
): Promise<QuizQuestion[] | null> {
  const stripped = noteContents.map(c => c.replace(/<[^>]*>/g, '')).join('\n\n').slice(0, 3000);
  
  const seenStr = seenQuestionTexts.length > 0
    ? `Do NOT repeat or generate any of the following questions that the user has already answered or seen:\n${seenQuestionTexts.map(q => `- "${q}"`).join('\n')}`
    : '';

  const prompt = `Based on these study notes, generate exactly ${count} multiple-choice questions.
Test understanding, not just recall. Make them challenging but fair.
${seenStr}

Return ONLY a valid JSON array, no markdown, no code fences, no other text:
[{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctIndex": 0, "explanation": "..."}]

Notes:
${stripped}`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    if (data.error) {
      console.error('OpenRouter API Error Details:', JSON.stringify(data.error, null, 2));
      console.error('OpenRouter Full Response:', data);
      return null;
    }
    const text = data.choices?.[0]?.message?.content || '';
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('AI response did not contain a valid JSON array:', text);
      return null;
    }
    return JSON.parse(jsonMatch[0]) as QuizQuestion[];
  } catch (err) {
    console.error('Failed to generate questions batch:', err);
    return null;
  }
}

// ── Component ──
interface TriviaDungeonProps {
  onExit: () => void;
}

export default function TriviaDungeon({ onExit }: TriviaDungeonProps) {
  const { user, profile } = useAuthContext();
  const { gamification, awardXP } = useGamification();
  const { addCoins } = useShop();
  const { notes } = useNotes();

  // Game state
  const [phase, setPhase] = useState<GamePhase>('note-select');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [monster, setMonster] = useState<Monster | null>(null);
  const [monsterHp, setMonsterHp] = useState(0);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [floor, setFloor] = useState(1);
  const [startFloor, setStartFloor] = useState(1);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timerLeft, setTimerLeft] = useState(TIMER_SECONDS);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [floatingDmg, setFloatingDmg] = useState<{ id: number; value: string; type: string } | null>(null);

  // Pre-loaded questions batch
  const [dungeonQuestions, setDungeonQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Track seen question texts to avoid repetitions
  const [seenQuestionTexts, setSeenQuestionTexts] = useState<string[]>([]);

  // Log of all answered questions during this run
  const [answeredQuestionsLog, setAnsweredQuestionsLog] = useState<{
    question: QuizQuestion;
    selectedOption: number;
    isCorrect: boolean;
  }[]>([]);

  const questionRef = useRef<QuizQuestion | null>(null);
  useEffect(() => {
    questionRef.current = question;
  }, [question]);

  // Stats
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noteContentsRef = useRef<string[]>([]);

  const apiKey = profile?.openRouterKey;
  const highestReachedFloor = gamification?.triviaDungeonFloor || 1;

  // Sync startFloor with user's highestReachedFloor when gamification data loads
  useEffect(() => {
    if (gamification && phase === 'note-select') {
      setStartFloor(gamification.triviaDungeonFloor || 1);
    }
  }, [gamification, phase]);

  // Automatically track seen questions to prevent duplicates
  useEffect(() => {
    if (question) {
      setSeenQuestionTexts(prev => {
        if (prev.includes(question.question)) return prev;
        return [...prev, question.question];
      });
    }
  }, [question]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Save floor progress to Firestore database
  const saveHighestFloor = async (floorNum: number) => {
    if (!user?.uid) return;
    try {
      const ref = doc(db, 'users', user.uid, 'data', 'gamification');
      await setDoc(ref, { triviaDungeonFloor: floorNum }, { merge: true });
    } catch (err) {
      console.error('Failed to save dungeon floor:', err);
    }
  };

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
    setFloor(startFloor);
    setTotalCorrect(0);
    setTotalQuestions(0);
    setTotalXpEarned(0);
    setTotalCoinsEarned(0);
    setDungeonQuestions([]);
    setCurrentQuestionIndex(0);
    setAnsweredQuestionsLog([]); // Reset answered questions log when entering/restarting
    spawnMonster(contents, startFloor);
  }, [notes, selectedNotes, startFloor]);

  // Spawn a new monster
  const spawnMonster = async (contents?: string[], startFromFloor?: number) => {
    const m = pickMonster();
    setMonster(m);
    setMonsterHp(m.maxHp);
    setPhase('battle');
    await prepareQuestionsForBattle(contents || noteContentsRef.current);
  };

  // Prepare questions batch (AI or fallback)
  const prepareQuestionsForBattle = async (noteTexts: string[]) => {
    setLoading(true);
    setQuestion(null);
    setSelectedOption(null);
    setIsCorrect(null);

    let questionsBatch: QuizQuestion[] | null = null;

    if (apiKey && noteTexts.length > 0) {
      questionsBatch = await generateQuestionsBatch(noteTexts, apiKey, seenQuestionTexts, 6);
    }

    if (questionsBatch && questionsBatch.length > 0) {
      setDungeonQuestions(questionsBatch);
      setQuestion(questionsBatch[0]);
      setCurrentQuestionIndex(0);
      setPhase('answering');
      setTimerLeft(TIMER_SECONDS);
      startTimer();
    } else {
      // Pick 6 random fallback questions that the user has not seen yet
      const availableFallback = FALLBACK_QUESTIONS.filter(q => !seenQuestionTexts.includes(q.question));
      const pool = availableFallback.length >= 6 ? availableFallback : FALLBACK_QUESTIONS;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const selectedFallback = shuffled.slice(0, 6);
      
      setDungeonQuestions(selectedFallback);
      setQuestion(selectedFallback[0]);
      setCurrentQuestionIndex(0);
      setPhase('answering');
      setTimerLeft(TIMER_SECONDS);
      startTimer();
      if (apiKey && noteTexts.length > 0) {
        toast('Using Study Guild Trivia (AI Offline)', { icon: '💡' });
      }
    }
    setLoading(false);
  };

  // Load next question from pre-generated batch
  const loadNextQuestion = () => {
    setSelectedOption(null);
    setIsCorrect(null);

    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < dungeonQuestions.length) {
      setCurrentQuestionIndex(nextIdx);
      setQuestion(dungeonQuestions[nextIdx]);
      setPhase('answering');
      setTimerLeft(TIMER_SECONDS);
      startTimer();
    } else {
      // If user answers more than 6 questions, fall back to random general trivia questions
      const availableFallback = FALLBACK_QUESTIONS.filter(q => !seenQuestionTexts.includes(q.question));
      const pool = availableFallback.length > 0 ? availableFallback : FALLBACK_QUESTIONS;
      const fallbackQ = pool[Math.floor(Math.random() * pool.length)];
      setQuestion(fallbackQ);
      setPhase('answering');
      setTimerLeft(TIMER_SECONDS);
      startTimer();
    }
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
    setAnsweredQuestionsLog(prev => [...prev, { question, selectedOption: index, isCorrect: correct }]);

    if (correct) {
      playSuccess();
      setTotalCorrect(prev => prev + 1);
      const isCrit = Math.random() < CRIT_CHANCE;
      const dmg = isCrit ? Math.floor(PLAYER_ATTACK * 1.5) : PLAYER_ATTACK;
      setMonsterHp(prev => Math.max(0, prev - dmg));
      setShake(true);
      setFloatingDmg({ id: Date.now(), value: isCrit ? `${dmg} CRIT!` : `${dmg}`, type: isCrit ? 'crit' : 'monster-damage' });
      setTimeout(() => setShake(false), 400);
      setTimeout(() => setFloatingDmg(null), 1200);
    } else {
      handlePlayerDamage();
    }
  };

  // Handle timeout
  const handleTimeout = () => {
    if (selectedOption !== null) return;
    const currentQ = questionRef.current;
    if (!currentQ) return;

    setSelectedOption(-1);
    setIsCorrect(false);
    setTotalQuestions(prev => prev + 1);
    setAnsweredQuestionsLog(prev => [...prev, { question: currentQ, selectedOption: -1, isCorrect: false }]);
    handlePlayerDamage();
  };

  // Monster attacks player
  const handlePlayerDamage = () => {
    if (!monster) return;
    const dmg = monster.attack;
    setPlayerHp(prev => Math.max(0, prev - dmg));
    setShake(true);
    setFloatingDmg({ id: Date.now(), value: `${dmg}`, type: 'player-damage' });
    setTimeout(() => setShake(false), 400);
    setTimeout(() => setFloatingDmg(null), 1200);
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

    // Save highest floor progress
    const nextF = floor + 1;
    if (nextF > highestReachedFloor) {
      await saveHighestFloor(nextF);
    }
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
    const nextF = floor + 1;
    setFloor(nextF);
    spawnMonster();
  };

  // Battle review log renderer
  const renderBattleReview = () => {
    if (answeredQuestionsLog.length === 0) return null;
    return (
      <div className="mt-6 text-left border-t border-[var(--card-border)] pt-6 max-w-xl mx-auto space-y-4">
        <h3 className="text-sm font-heading font-black flex items-center gap-1.5 text-[var(--foreground)] uppercase tracking-wider">
          <span>📜</span> Battle Review Log ({answeredQuestionsLog.length})
        </h3>
        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
          {answeredQuestionsLog.map((log, idx) => {
            const { question: q, selectedOption, isCorrect } = log;
            const correctOpt = q.options[q.correctIndex];
            const selectedOptStr = selectedOption === -1 ? 'Timeout' : q.options[selectedOption];

            return (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border text-xs space-y-2 bg-[var(--card-bg)]/40 ${
                  isCorrect 
                    ? 'border-emerald-500/20 hover:border-emerald-500/30' 
                    : 'border-rose-500/20 hover:border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-[var(--foreground)]">Q{idx + 1}: {q.question}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex-shrink-0 ${
                    isCorrect 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {isCorrect ? 'Correct' : selectedOption === -1 ? 'Timeout' : 'Incorrect'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--card-border)]/50">
                  <div>
                    <span className="text-[10px] text-[var(--muted-foreground)] block font-bold uppercase">Your Answer</span>
                    <span className={`font-semibold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedOptStr}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div>
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-bold uppercase">Correct Answer</span>
                      <span className="font-semibold text-emerald-400">
                        {correctOpt}
                      </span>
                    </div>
                  )}
                </div>

                {q.explanation && (
                  <div className="mt-2 p-2 rounded bg-white/5 text-[11px] text-white/70 italic flex gap-1.5">
                    <span className="flex-shrink-0">💡</span>
                    <span>{q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Health bar helper
  const hpPercent = (current: number, max: number) => Math.max(0, (current / max) * 100);
  const hpClass = (pct: number) => pct <= 25 ? 'low' : pct <= 50 ? 'medium' : '';

  // Timer ring
  const timerRadius = 14;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset = timerCircumference * (1 - timerLeft / TIMER_SECONDS);

  // ─── Note Selection Render ───
  if (phase === 'note-select') {
    return (
      <div className="dungeon-container space-y-6">
        <div className="flex items-center justify-between">
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
        </div>

        {/* Global Starting Floor Selector */}
        <Card padding="md" className="border-primary/20 bg-primary/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-heading font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <span>🏰</span> Choose Starting Floor
              </h4>
              <p className="text-[10px] text-[var(--muted-foreground)] max-w-md">
                Select your starting floor. You can review previous floors or jump straight to your highest reached floor (Max: Floor {highestReachedFloor}).
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[var(--card-bg)] px-3 py-1.5 rounded-xl border border-[var(--card-border)]">
              <button 
                onClick={() => { playClick(); setStartFloor(prev => Math.max(1, prev - 1)); }}
                disabled={startFloor <= 1}
                className="w-8 h-8 rounded-lg border-2 border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-border)] font-bold disabled:opacity-40 transition-colors flex items-center justify-center text-sm"
              >
                -
              </button>
              <span className="text-base font-black px-3 select-none w-10 text-center">Floor {startFloor}</span>
              <button 
                onClick={() => { playClick(); setStartFloor(prev => Math.min(highestReachedFloor, prev + 1)); }}
                disabled={startFloor >= highestReachedFloor}
                className="w-8 h-8 rounded-lg border-2 border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--card-border)] font-bold disabled:opacity-40 transition-colors flex items-center justify-center text-sm"
              >
                +
              </button>
            </div>
          </div>
        </Card>

        {!apiKey ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="text-5xl block mb-4">🔑</span>
              <h3 className="text-lg font-heading font-bold mb-2">OpenRouter API Key Optional</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Add an OpenRouter API key in Settings to generate custom trivia from your own study notes. Otherwise, enter directly to play with general CS trivia!
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="coral"
                  size="sm"
                  icon={<HiLightningBolt />}
                  onClick={() => {
                    noteContentsRef.current = [];
                    setPlayerHp(PLAYER_MAX_HP);
                    setFloor(startFloor);
                    setTotalCorrect(0);
                    setTotalQuestions(0);
                    setTotalXpEarned(0);
                    setTotalCoinsEarned(0);
                    setDungeonQuestions([]);
                    setCurrentQuestionIndex(0);
                    spawnMonster();
                  }}
                >
                  Enter Dungeon (CS Trivia) ⚔️
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/settings'}>Go to Settings</Button>
              </div>
            </div>
          </Card>
        ) : notes.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="text-5xl block mb-4">📝</span>
              <h3 className="text-lg font-heading font-bold mb-2">No Notes Found</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Create study notes to generate custom AI questions, or enter now to play with general CS trivia!
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="coral"
                  size="sm"
                  icon={<HiLightningBolt />}
                  onClick={() => {
                    noteContentsRef.current = [];
                    setPlayerHp(PLAYER_MAX_HP);
                    setFloor(startFloor);
                    setTotalCorrect(0);
                    setTotalQuestions(0);
                    setTotalXpEarned(0);
                    setTotalCoinsEarned(0);
                    setDungeonQuestions([]);
                    setCurrentQuestionIndex(0);
                    spawnMonster();
                  }}
                >
                  Enter Dungeon (CS Trivia) ⚔️
                </Button>
                <Button variant="teal" size="sm" onClick={() => window.location.href = '/notes'}>Create Notes</Button>
              </div>
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
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    noteContentsRef.current = [];
                    setPlayerHp(PLAYER_MAX_HP);
                    setFloor(startFloor);
                    setTotalCorrect(0);
                    setTotalQuestions(0);
                    setTotalXpEarned(0);
                    setTotalCoinsEarned(0);
                    setDungeonQuestions([]);
                    setCurrentQuestionIndex(0);
                    spawnMonster();
                  }}
                >
                  Play CS Trivia ⚔️
                </Button>
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

            {/* Battle Review Log */}
            {renderBattleReview()}

            <div className="flex gap-3 justify-center pt-4">
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

            {/* Battle Review Log */}
            {renderBattleReview()}

            <div className="flex gap-3 justify-center pt-4">
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
                className="text-xs text-white/50 text-center mt-3 italic animate-fade-in"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                💡 {question.explanation}
              </motion.p>
            )}

            {/* Next Question / Finish Battle Button */}
            {selectedOption !== null && (
              <motion.div 
                className="flex justify-center mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {monsterHp <= 0 ? (
                  <Button 
                    variant="teal" 
                    size="md" 
                    icon={<HiStar />} 
                    onClick={handleVictory}
                  >
                    Finish Battle ⚔️
                  </Button>
                ) : playerHp <= 0 ? (
                  <Button 
                    variant="coral" 
                    size="md" 
                    icon={<HiArrowLeft />} 
                    onClick={handleDefeat}
                  >
                    Accept Defeat 💀
                  </Button>
                ) : (
                  <Button 
                    variant="primary" 
                    size="md" 
                    onClick={loadNextQuestion}
                  >
                    Next Question ➔
                  </Button>
                )}
              </motion.div>
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

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiAcademicCap, HiCheck, HiX, HiLightningBolt, HiRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { QuizQuestion } from '@/types';
import { playSuccess, playClick } from '@/lib/sounds';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  noteContent: string;
}

type QuizState = 'generating' | 'quiz' | 'results';

export default function QuizModal({ isOpen, onClose, noteTitle, noteContent }: QuizModalProps) {
  const { profile } = useAuthContext();
  const { awardXP } = useGamification();
  const [state, setState] = useState<QuizState>('generating');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const generateQuiz = useCallback(async () => {
    setState('generating');
    setQuestions([]);
    setCurrentQ(0);
    setScore(0);
    setSelected(null);
    setAnswered(false);
    setError('');

    const apiKey = profile?.openRouterKey;
    if (!apiKey) {
      setError('Please add your OpenRouter API key in Settings to use AI features.');
      return;
    }

    const stripped = stripHtml(noteContent);
    if (stripped.length < 50) {
      setError('Note content is too short to generate a quiz. Add more content first!');
      return;
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `Based on the following study notes, generate exactly 5 multiple-choice questions.
Each question should test understanding, not just recall.
Return ONLY a valid JSON array, no other text or markdown:
[{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctIndex": 0, "explanation": "..."}]

Notes:
${stripped.slice(0, 4000)}`,
            },
          ],
        }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Invalid response format');
      const parsed: QuizQuestion[] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('No questions');
      setQuestions(parsed.slice(0, 5));
      setState('quiz');
    } catch (err) {
      setError('Failed to generate quiz. Please try again.');
      toast.error('Quiz generation failed');
    }
  }, [noteContent, profile?.openRouterKey]);

  // Start generation when modal opens
  React.useEffect(() => {
    if (isOpen) generateQuiz();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = (idx: number) => {
    if (answered) return;
    playClick();
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[currentQ]?.correctIndex) {
      setScore((s) => s + 1);
      playSuccess();
    }
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      // Quiz complete — award XP
      const xpEarned = score * 5 + (score === questions.length ? 15 : 0);
      if (xpEarned > 0) awardXP(xpEarned, `Quiz: ${noteTitle}`);
      setState('results');
    }
  };

  const q = questions[currentQ];
  const stars = Math.ceil((score / Math.max(questions.length, 1)) * 5);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="min-h-[350px]">
        {/* Generating */}
        {state === 'generating' && !error && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <motion.span className="text-5xl" animate={{ rotate: [0, 10, -10, 0], y: [0, -8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>🦉</motion.span>
            <p className="text-sm font-heading font-bold">Questie is creating your quiz...</p>
            <p className="text-xs text-[var(--muted-foreground)]">Analyzing &quot;{noteTitle}&quot;</p>
            <div className="w-48 h-1.5 rounded-full bg-[var(--card-border)] overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full" animate={{ width: ['0%', '80%'] }} transition={{ duration: 3 }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <span className="text-4xl">😔</span>
            <p className="text-sm text-[var(--muted-foreground)] text-center max-w-xs">{error}</p>
            <Button variant="primary" size="sm" onClick={generateQuiz} icon={<HiRefresh size={14} />}>Retry</Button>
          </div>
        )}

        {/* Quiz */}
        {state === 'quiz' && q && (
          <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center justify-between">
              <Badge variant="primary" size="sm"><HiAcademicCap className="inline mr-1" /> Question {currentQ + 1} of {questions.length}</Badge>
              <Badge variant="amber" size="sm">Score: {score}/{currentQ + (answered ? 1 : 0)}</Badge>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--card-border)]">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentQ + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
            </div>

            {/* Question */}
            <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h3 className="text-base font-heading font-bold leading-snug">{q.question}</h3>
            </motion.div>

            {/* Options */}
            <div className="grid gap-2">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correctIndex;
                const isSelected = i === selected;
                let optClass = 'border-[var(--card-border)] hover:border-primary/30';
                if (answered) {
                  if (isCorrect) optClass = 'border-teal bg-teal/10 text-teal';
                  else if (isSelected && !isCorrect) optClass = 'border-coral bg-coral/10 text-coral';
                  else optClass = 'border-[var(--card-border)] opacity-50';
                } else if (isSelected) {
                  optClass = 'border-primary bg-primary/10';
                }
                return (
                  <motion.button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${optClass}`}
                    whileTap={!answered ? { scale: 0.98 } : {}}
                  >
                    <span className="w-7 h-7 rounded-lg border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {answered && isCorrect ? <HiCheck /> : answered && isSelected ? <HiX /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm font-medium">{opt.replace(/^[A-D]\)\s*/, '')}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation + Next */}
            <AnimatePresence>
              {answered && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                  <div className={`px-4 py-3 rounded-xl border-2 text-sm ${selected === q.correctIndex ? 'border-teal/30 bg-teal/5' : 'border-coral/30 bg-coral/5'}`}>
                    <p className="font-bold mb-1">{selected === q.correctIndex ? '✅ Correct!' : '❌ Wrong!'}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{q.explanation}</p>
                  </div>
                  <Button variant="primary" onClick={handleNext} className="w-full">
                    {currentQ < questions.length - 1 ? 'Next Question →' : 'See Results 🏆'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Results */}
        {state === 'results' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
            <span className="text-5xl block">{score === questions.length ? '🏆' : score >= 3 ? '⭐' : '📚'}</span>
            <h2 className="text-2xl font-heading font-black">Quiz Complete!</h2>
            <p className="text-lg font-bold">{score} / {questions.length} correct</p>
            <div className="flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <HiLightningBolt key={i} size={24} className={i < stars ? 'text-amber-400' : 'text-[var(--card-border)]'} />
              ))}
            </div>
            <div className="px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 inline-block">
              <p className="text-sm font-bold text-primary">+{score * 5 + (score === questions.length ? 15 : 0)} XP earned!</p>
              {score === questions.length && <p className="text-xs text-primary/70">🎯 Perfect score bonus: +15 XP</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={onClose} className="flex-1">Close</Button>
              <Button variant="primary" onClick={generateQuiz} className="flex-1" icon={<HiRefresh size={14} />}>Retry</Button>
            </div>
          </motion.div>
        )}
      </div>
    </Modal>
  );
}

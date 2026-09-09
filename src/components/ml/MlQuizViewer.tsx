'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  HiLightningBolt,
  HiCheckCircle,
  HiXCircle,
  HiRefresh,
  HiSparkles,
  HiArrowRight,
  HiAcademicCap,
} from 'react-icons/hi';
import { ML_QUIZ_QUESTIONS } from '@/data/mlQuizData';
import { MlQuizQuestion } from '@/types/ml';

interface MlQuizViewerProps {
  onBackToLessons: () => void;
}

export default function MlQuizViewer({ onBackToLessons }: MlQuizViewerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);

  const questions = ML_QUIZ_QUESTIONS;
  const currentQ = questions[currentIdx];

  const handleSelectOption = (optionIdx: number) => {
    if (selectedAnswers[currentIdx] !== undefined) return; // Already answered
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optionIdx,
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setIsFinished(true);
      // Calculate score
      let correct = 0;
      questions.forEach((q: MlQuizQuestion, idx: number) => {
        if (selectedAnswers[idx] === q.correctIndex) correct++;
      });
      if (correct / questions.length >= 0.7) {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore
        }
      }
    }
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setCurrentIdx(0);
    setIsFinished(false);
  };

  // Calculate score
  const totalCorrect = questions.filter(
    (q: MlQuizQuestion, idx: number) => selectedAnswers[idx] === q.correctIndex
  ).length;
  const scorePercent = Math.round((totalCorrect / questions.length) * 100);

  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-6">
          <HiAcademicCap className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-2">
          Assessment Complete!
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          You scored <strong className="text-indigo-400">{totalCorrect}</strong> out of{' '}
          <strong className="text-slate-200">{questions.length}</strong> ({scorePercent}%)
        </p>

        {/* Score Card */}
        <div className="w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 mb-8 flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Proficiency Rating
            </span>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                scorePercent >= 80
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : scorePercent >= 60
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800'
              }`}
            >
              {scorePercent >= 80
                ? '🏆 Senior ML Engineer'
                : scorePercent >= 60
                ? '⚡ Machine Learning Practitioner'
                : '🌱 Foundations In Progress'}
            </span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {scorePercent >= 80
              ? 'Phenomenal job! You demonstrated deep mastery over the mathematical intuitions, backpropagation, attention mechanisms, and production evaluation paradigms.'
              : scorePercent >= 60
              ? 'Great work! You have solid foundational knowledge. Review the mathematical formula cheat sheet and production lessons to solidify edge cases.'
              : 'Good effort! Machine Learning is an iterative journey. Walk through Tiers 1 through 4 again and experiment with the live Python playground to internalize the core principles.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleRestart}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <HiRefresh className="w-4 h-4" />
            <span>Retake Assessment</span>
          </button>

          <button
            onClick={onBackToLessons}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <HiSparkles className="w-4 h-4" />
            <span>Back to Curriculum</span>
          </button>
        </div>
      </div>
    );
  }

  const hasAnswered = selectedAnswers[currentIdx] !== undefined;
  const isSelected = selectedAnswers[currentIdx];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <HiLightningBolt className="w-4 h-4" />
          <span>Interactive Machine Learning Assessment</span>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Question {currentIdx + 1} of {questions.length}
        </span>
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-6">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
          {currentQ.question}
        </h2>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {currentQ.options.map((opt: string, idx: number) => {
            let btnStyle = 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white';

            if (hasAnswered) {
              if (idx === currentQ.correctIndex) {
                btnStyle = 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200 font-medium';
              } else if (idx === isSelected) {
                btnStyle = 'bg-rose-950/70 border-rose-500/70 text-rose-200';
              } else {
                btnStyle = 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={hasAnswered}
                className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex items-start gap-3 ${btnStyle}`}
              >
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1 leading-relaxed">{opt}</span>

                {hasAnswered && idx === currentQ.correctIndex && (
                  <HiCheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                {hasAnswered && idx === isSelected && idx !== currentQ.correctIndex && (
                  <HiXCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Banner */}
        {hasAnswered && (
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-900/50 text-xs sm:text-sm text-indigo-200 leading-relaxed flex flex-col gap-1">
            <span className="font-bold text-indigo-300 uppercase tracking-wide text-[11px]">
              Why this is correct:
            </span>
            <span>{currentQ.explanation}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBackToLessons}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Exit Assessment
          </button>

          {hasAnswered && (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all ml-auto"
            >
              <span>
                {currentIdx < questions.length - 1 ? 'Next Question' : 'View Results'}
              </span>
              <HiArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

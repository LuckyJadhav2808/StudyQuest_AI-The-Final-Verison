'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: string;
  position: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'body',
    title: 'Welcome to StudyQuest! 🦉',
    description: 'Welcome, adventurer! StudyQuest transforms your study routine into a legendary RPG quest. Let’s take a quick 1-minute tour to get you ready for the journey.',
    icon: '⚔️',
    position: 'center',
  },
  {
    target: 'sidebar-navigation',
    title: 'Your Map of Adventure 🗺️',
    description: 'The sidebar is your map. Use it to navigate between Base Camp, the Quest Log, focus sanctuaries, companions, and code labs.',
    icon: '🧭',
    position: 'right',
  },
  {
    target: 'daily-quests-card',
    title: 'Daily Quests ⚡',
    description: 'Check off daily habits here to maintain your streak and earn valuable XP. Keep your streak alive to unlock exclusive rewards.',
    icon: '🔥',
    position: 'bottom',
  },
  {
    target: 'lofi-room-widget',
    title: 'Lofi Room Widget 🎵',
    description: 'Change the vibe, control animations, and stream background tracks while you study.',
    icon: '🎧',
    position: 'left',
  },
  {
    target: 'companion-pet-card',
    title: 'Companion Pet 🐱',
    description: 'Your companion grows as you complete study focus sessions. Feed them, play with them, and help them evolve!',
    icon: '🥚',
    position: 'top',
  },
];

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem('studyquest_onboarding_completed');
    if (!completed) {
      // Small delay for natural load
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('studyquest_onboarding_completed', 'true');
    setIsOpen(false);
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Darkened backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Tour Modal card */}
          <motion.div
            className="relative w-full max-w-sm rounded-2xl bg-[var(--card-bg)] border-2 border-primary shadow-2xl p-6 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
            {/* Animated decorative orb */}
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-primary/10 blur-xl animate-pulse" />

            {/* Icon header */}
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-3xl mx-auto mb-4">
              {step.icon}
            </div>

            <h3 className="text-lg font-heading font-black text-center mb-2">
              {step.title}
            </h3>

            <p className="text-xs text-[var(--muted-foreground)] text-center mb-6 leading-relaxed min-h-[72px]">
              {step.description}
            </p>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-1.5 mb-6">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep ? 'w-5 bg-primary' : 'w-1.5 bg-[var(--card-border)]'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Controls */}
            <div className="flex gap-2">
              <button
                onClick={handleComplete}
                className="flex-1 py-2.5 rounded-xl border-2 border-[var(--card-border)] text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--muted)]/20 transition-all cursor-pointer"
              >
                Skip
              </button>
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                className="flex-1 text-xs"
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'Begin Quest!' : 'Next step →'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

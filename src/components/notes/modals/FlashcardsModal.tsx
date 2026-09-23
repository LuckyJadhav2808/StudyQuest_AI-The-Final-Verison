'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
}

export default function FlashcardsModal({
  isOpen,
  onClose,
  flashcards,
}: FlashcardsModalProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  const handleNext = () => {
    setCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
    setCardFlipped(false);
  };

  const handlePrev = () => {
    setCardIndex((prev) => Math.max(0, prev - 1));
    setCardFlipped(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Flashcards (${flashcards.length > 0 ? cardIndex + 1 : 0}/${flashcards.length})`}
    >
      {flashcards.length > 0 ? (
        <div className="space-y-4">
          <motion.div
            className="min-h-[190px] p-6 rounded-2xl border-2 border-[var(--card-border)] flex items-center justify-center cursor-pointer select-none shadow-sm hover:border-primary/40 transition-colors"
            style={{
              background: cardFlipped
                ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(76,201,240,0.12))'
                : 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(236,72,153,0.12))',
            }}
            onClick={() => setCardFlipped(!cardFlipped)}
            key={`${cardIndex}-${cardFlipped}`}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-center px-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-2">
                {cardFlipped ? '✨ Answer' : '❓ Question'}
              </p>
              <p className="text-sm font-semibold text-[var(--foreground)] leading-relaxed">
                {cardFlipped ? flashcards[cardIndex].answer : flashcards[cardIndex].question}
              </p>
            </div>
          </motion.div>

          <p className="text-[10px] text-center text-[var(--muted-foreground)]">
            Click the card to flip between Question and Answer
          </p>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={cardIndex === 0}
              className="flex-1"
            >
              ← Previous
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              disabled={cardIndex >= flashcards.length - 1}
              className="flex-1"
            >
              Next →
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-xs text-[var(--muted-foreground)]">
          No flashcards generated yet.
        </div>
      )}
    </Modal>
  );
}

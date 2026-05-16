'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

const QUOTES = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Education is the most powerful weapon to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Study hard what interests you the most in the most undisciplined way.", author: "Richard Feynman" },
  { text: "A mind that is stretched by new experience can never go back to its old dimensions.", author: "Oliver Wendell Holmes" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "The more I read, the more I acquire, the more certain I am that I know nothing.", author: "Voltaire" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Knowledge is power. Information is liberating.", author: "Kofi Annan" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
];

function getDailyQuote(): typeof QUOTES[0] {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

export default function TypewriterQuote() {
  const quote = useMemo(() => getDailyQuote(), []);
  const [displayed, setDisplayed] = useState('');
  const [showAuthor, setShowAuthor] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      if (idx <= quote.text.length) {
        setDisplayed(quote.text.slice(0, idx));
        idx++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowAuthor(true), 400);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [quote.text]);

  // Blinking cursor
  useEffect(() => {
    const blink = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--card-border)] bg-gradient-to-br from-[var(--card-bg)] to-primary/5 p-4">
      {/* Decorative accents */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-secondary/5 rounded-full blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">💡</span>
          <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Daily Inspiration</h4>
        </div>
        <p className="text-sm font-heading font-semibold leading-relaxed min-h-[2.5rem]">
          &ldquo;{displayed}
          <span
            className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 align-middle transition-opacity"
            style={{ opacity: cursorVisible ? 1 : 0 }}
          />
          {displayed === quote.text && <>&rdquo;</>}
        </p>
        {showAuthor && (
          <motion.p
            className="text-[10px] text-primary font-bold mt-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            — {quote.author}
          </motion.p>
        )}
      </div>
    </div>
  );
}

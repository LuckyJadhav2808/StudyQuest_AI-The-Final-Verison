'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPaperAirplane, HiTrash, HiSparkles, HiKey, HiClipboardCopy } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { doc, collection, orderBy, query, onSnapshot, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';
import Link from 'next/link';
import { useSpellingAssistant } from '@/hooks/useSpellingAssistant';
import { callAiCompletion, resolveOpenRouterKey } from '@/lib/ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const SYSTEM_PROMPT = `You are Questie 🦉, a friendly and encouraging study companion owl mascot for StudyQuest AI — a gamified student productivity platform. You help students with:
- Study tips and techniques
- Explaining concepts
- Time management advice
- Motivation and encouragement
- Homework help

Your personality:
- Cheerful and supportive
- Use emojis occasionally
- Encourage healthy study habits
- Celebrate achievements
- Keep responses concise and helpful

Always sign off with a fun owl-themed phrase when appropriate.`;

export default function ChatContent() {
  const { user, profile } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    handleKeyDown: handleSpellcheckKeyDown,
    handleSelect: handleSpellcheckSelect,
    suggestions,
    activeWord,
    replaceActiveWord,
    addActiveWordToDictionary
  } = useSpellingAssistant(input, setInput);

  const hasApiKey = true; // Always available via system tier or custom key

  // Load chat history from Firestore
  useEffect(() => {
    if (!user?.uid) { setLoadingHistory(false); return; }
    const chatRef = collection(db, 'users', user.uid, 'chatMessages');
    const q = query(chatRef, orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: "🦉 Hey there, adventurer! I'm Questie, your study companion. Ask me anything — study tips, concept explanations, or just need some motivation. I'm here to help you level up! What's on your mind today?",
          timestamp: Date.now(),
        }]);
      } else {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
      }
      setLoadingHistory(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // Save a message to Firestore
  const saveMessage = useCallback(async (msg: Message) => {
    if (!user?.uid) return;
    const msgRef = doc(db, 'users', user.uid, 'chatMessages', msg.id);
    await setDoc(msgRef, { role: msg.role, content: msg.content, timestamp: msg.timestamp });
  }, [user?.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    saveMessage(userMsg);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const result = await callAiCompletion({
        apiKey: profile?.openRouterKey,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...chatHistory,
          { role: 'user', content: userMsg.content },
        ],
        title: 'StudyQuest AI Questie Chat',
        feature: 'chat',
        max_tokens: 1024,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate response');
      }

      const reply = result.content || "🦉 Hoot! Something went wrong. Try again?";

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      saveMessage(assistantMsg);
    } catch (err: any) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `🦉 ${err?.message || "Oops! I couldn't connect to my brain right now. Check your API key in Settings and try again."}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
      saveMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    // Delete all messages from Firestore
    if (user?.uid) {
      const chatRef = collection(db, 'users', user.uid, 'chatMessages');
      const snap = await getDocs(chatRef);
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }
    const welcomeMsg: Message = {
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: "🦉 Fresh start! What would you like to learn today?",
      timestamp: Date.now(),
    };
    setMessages([welcomeMsg]);
    if (user?.uid) saveMessage(welcomeMsg);
    toast.success('Chat cleared');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleSpellcheckKeyDown(e);
    if (e.key === 'Enter' && !e.shiftKey && !e.isDefaultPrevented()) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🦉
            </motion.div>
            <div>
              <h1 className="text-lg font-heading font-bold">Questie Chat</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-coral/30 hover:text-coral transition-colors cursor-pointer"
              title="Clear chat"
            >
              <HiTrash size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <Card padding="none" hover={false} className="flex-1 overflow-y-auto mb-4">
          <div className="p-4 space-y-4">

            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm flex-shrink-0">
                      🦉
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap group relative ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-md'
                        : 'bg-[var(--card-border)]/40 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                    {msg.role === 'assistant' && msg.id !== 'welcome' && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Copied!'); }}
                        className="absolute -bottom-1 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm transition-opacity"
                        title="Copy message"
                      >
                        <HiClipboardCopy size={12} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {loading && (
              <motion.div
                className="flex gap-3 items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm">
                  🦉
                </div>
                <div className="flex gap-1 px-4 py-3 rounded-2xl bg-[var(--card-border)]/40">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary/50"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Input */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-semibold text-[var(--muted-foreground)]">
              <span className="text-purple-400">💡 Did you mean:</span>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={`${suggestion}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    replaceActiveWord(suggestion);
                  }}
                  className="text-purple-300 hover:text-white hover:underline transition-colors px-1 bg-purple-500/25 rounded cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
              <span className="text-[var(--muted-foreground)]/30 mx-1">|</span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addActiveWordToDictionary(activeWord);
                }}
                className="text-purple-400 hover:text-purple-300 transition-colors font-bold underline cursor-pointer"
              >
                ➕ Add "{activeWord.replace(/^[^\w'-]+|[^\w'-]+$/g, '') || activeWord}"
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onSelect={handleSpellcheckSelect}
                placeholder="Ask Questie anything (study tips, homework help, concept explanations)..."
                disabled={loading}
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium resize-none focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>
            <motion.button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_0_rgba(88,28,135,0.3)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(88,28,135,0.3)] transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <HiPaperAirplane size={20} className="rotate-90" />
            </motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPaperAirplane, HiTrash, HiSparkles, HiKey, HiClipboardCopy } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';
import Link from 'next/link';

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
  const { profile } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "🦉 Hey there, adventurer! I'm Questie, your study companion. Ask me anything — study tips, concept explanations, or just need some motivation. I'm here to help you level up! What's on your mind today?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasApiKey = !!profile?.openRouterKey;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !hasApiKey || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile!.openRouterKey}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chatHistory,
            { role: 'user', content: userMsg.content },
          ],
          max_tokens: 1024,
        }),
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "🦉 Hoot! Something went wrong. Try again?";

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "🦉 Oops! I couldn't connect to my brain right now. Check your API key in Settings and try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "🦉 Fresh start! What would you like to learn today?",
        timestamp: Date.now(),
      },
    ]);
    toast.success('Chat cleared');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
              <h1 className="text-lg font-heading font-black">Questie Chat</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">Online</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!hasApiKey && (
              <Link href="/settings">
                <Button variant="coral" size="sm" icon={<HiKey size={14} />}>Add API Key</Button>
              </Link>
            )}
            <button
              onClick={clearChat}
              className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-coral/30 hover:text-coral transition-colors"
              title="Clear chat"
            >
              <HiTrash size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <Card padding="none" hover={false} className="flex-1 overflow-y-auto mb-4">
          <div className="p-4 space-y-4">
            {!hasApiKey && (
              <div className="p-4 rounded-xl bg-amber/10 border-2 border-amber/20 text-center">
                <HiKey className="text-amber mx-auto mb-2" size={24} />
                <p className="text-xs font-semibold">API Key Required</p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                  Add your OpenRouter API key in{' '}
                  <Link href="/settings" className="text-primary font-bold hover:underline">Settings</Link>
                  {' '}to start chatting with Questie.
                </p>
              </div>
            )}

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
        <div className="flex gap-2 flex-shrink-0">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasApiKey ? "Ask Questie anything..." : "Add your API key in Settings first..."}
              disabled={!hasApiKey || loading}
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium resize-none focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
          <motion.button
            onClick={sendMessage}
            disabled={!input.trim() || !hasApiKey || loading}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_0_rgba(88,28,135,0.3)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(88,28,135,0.3)] transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <HiPaperAirplane size={20} className="rotate-90" />
          </motion.button>
        </div>
      </div>
    </PageTransition>
  );
}

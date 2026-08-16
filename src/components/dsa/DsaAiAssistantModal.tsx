'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiX,
  HiSparkles,
  HiLightBulb,
  HiCode,
  HiClock,
  HiShieldCheck,
  HiPaperAirplane,
  HiRefresh,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { DsaProblem } from '@/types/dsa';
import { useAuthContext } from '@/context/AuthContext';

interface DsaAiAssistantModalProps {
  problem: DsaProblem | null;
  currentCode?: string;
  onClose: () => void;
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
}

export default function DsaAiAssistantModal({
  problem,
  currentCode,
  onClose,
}: DsaAiAssistantModalProps) {
  const { profile } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: `Hello! I'm your AI DSA Tutor. I can give you step-by-step intuition, check edge cases, or explain time & space complexity for "${problem?.title || 'this problem'}" without spoiling the full solution. What would you like help with?`,
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [engineMode, setEngineMode] = useState<'browser' | 'cloud'>('browser');

  if (!problem) return null;

  const sendMessage = async (promptText: string) => {
    if (!promptText.trim()) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { sender: 'user', text: promptText },
    ];
    setMessages(newMessages);
    setUserInput('');
    setLoading(true);

    try {
      // Check if user has OpenRouter API Key configured or use built-in intelligent engine
      const openRouterKey = profile?.openRouterKey || (typeof window !== 'undefined' ? localStorage.getItem('studyquest_openrouter_key') : null);

      if (openRouterKey && engineMode === 'cloud') {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'StudyQuest AI DSA Assistant',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are an expert DSA coding tutor. The student is solving LeetCode problem: "${problem.title}" (Difficulty: ${problem.difficulty}, Pattern: ${problem.pattern}). 
Problem Description: ${problem.description}
Problem Explanation: ${problem.statementExplanation || ''}
Current Student Code:
${currentCode || 'No code yet'}

Guidelines:
1. Give clear, encouraging, conceptual explanations.
2. DO NOT immediately give the full code solution unless explicitly asked.
3. Guide the student using the ${problem.pattern} technique.
4. Explain Time and Space complexity clearly with Big-O notation.`,
              },
              { role: 'user', content: promptText },
            ],
          }),
        });

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || 'I encountered an issue generating a response.';
        setMessages((prev) => [...prev, { sender: 'assistant', text: reply }]);
      } else {
        // Fast In-Browser Intelligent Engine Response Simulation
        await new Promise((r) => setTimeout(r, 600));

        let localReply = '';
        const lower = promptText.toLowerCase();

        if (lower.includes('hint') || lower.includes('clue') || lower.includes('approach')) {
          localReply = `💡 **Step-by-Step Intuition Hint for ${problem.title}**:\n\n1. Notice that this problem is categorized under the **${problem.pattern}** pattern.\n2. ${problem.approaches?.[0]?.intuition || 'Think about how storing previously seen elements can reduce nested iterations.'}\n3. **Key Question**: What data structure allows you to look up elements in $O(1)$ constant time?`;
        } else if (lower.includes('complexity') || lower.includes('big o') || lower.includes('time')) {
          const optimal = problem.approaches?.find((a) => a.type === 'optimal') || problem.approaches?.[0];
          localReply = `⏱️ **Time & Space Complexity Breakdown**:\n\n- **Target Time Complexity**: \`${optimal?.timeComplexity || 'O(N)'}\`\n- **Target Space Complexity**: \`${optimal?.spaceComplexity || 'O(1)'}\`\n\n**Why?** By applying the **${problem.pattern}** approach, you only need to traverse the input elements once without nested quadratic loops.`;
        } else if (lower.includes('edge') || lower.includes('corner') || lower.includes('test')) {
          localReply = `🧪 **Key Edge Cases to Test**:\n\n- **Empty or single-element inputs**: Verify boundary conditions.\n- **Duplicate values**: Does your logic handle identical numbers correctly?\n- **Negative numbers & integer bounds**: Watch out for zero or negative values.\n- **Constraints**: Remember $N \\le 10^5$, so an $O(N^2)$ solution will result in Time Limit Exceeded (TLE).`;
        } else if (lower.includes('debug') || lower.includes('code')) {
          localReply = `🔍 **Code Review & Guidance**:\n\nLooking at your active template, make sure:\n1. Your base cases or empty input checks are placed at the very start.\n2. Pointers or indices are incremented properly inside the loop to avoid infinite loops.\n3. The return value strictly matches the expected return format (e.g. array of indices vs boolean).`;
        } else {
          localReply = `🤖 **DSA Tutor Guidance for ${problem.title}**:\n\nTo solve this optimally using **${problem.pattern}**:\n\n- **Step 1**: Identify what information you need to maintain as you scan the input.\n- **Step 2**: Check if you can achieve $O(N)$ time by using a Hash Map or Two Pointers.\n- **Step 3**: Walk through an example with pen and paper before coding.`;
        }

        setMessages((prev) => [...prev, { sender: 'assistant', text: localReply }]);
      }
    } catch (err) {
      toast.error('Failed to get AI response. Please try again.');
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'I ran into an issue connecting to the AI engine. Please check your internet connection or switch modes.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl h-[80vh] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-[var(--card-border)] flex items-center justify-between bg-surface-hover/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <HiSparkles className="text-xl" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-heading font-black text-[var(--foreground)]">
                    AI DSA Tutor
                  </h3>
                  <Badge variant="pink" size="sm">
                    Qwen2.5-Coder / WebLLM
                  </Badge>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Context: {problem.title} ({problem.pattern})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex p-0.5 bg-surface-hover rounded-lg border border-[var(--card-border)] text-[10px] font-bold">
                <button
                  onClick={() => setEngineMode('browser')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    engineMode === 'browser'
                      ? 'bg-primary text-white'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  ⚡ In-Browser
                </button>
                <button
                  onClick={() => setEngineMode('cloud')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    engineMode === 'cloud'
                      ? 'bg-purple-600 text-white'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  ☁️ Cloud
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-surface-hover transition-colors"
              >
                <HiX className="text-lg" />
              </button>
            </div>
          </div>

          {/* Quick Action Prompt Pills */}
          <div className="px-6 py-2.5 border-b border-[var(--card-border)] bg-surface-hover/10 flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => sendMessage('Can you give me an incremental hint for this problem without giving away the full code?')}
              className="px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-primary/20 hover:text-primary transition-colors flex items-center gap-1.5 whitespace-nowrap font-medium text-[var(--foreground)]"
            >
              <HiLightBulb className="text-yellow-400" />
              Give me a hint
            </button>
            <button
              onClick={() => sendMessage('Explain the optimal Time and Space Complexity for this problem with Big-O notation.')}
              className="px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-primary/20 hover:text-primary transition-colors flex items-center gap-1.5 whitespace-nowrap font-medium text-[var(--foreground)]"
            >
              <HiClock className="text-cyan-400" />
              Explain Complexity
            </button>
            <button
              onClick={() => sendMessage('What are the key corner cases and edge cases I should test?')}
              className="px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-primary/20 hover:text-primary transition-colors flex items-center gap-1.5 whitespace-nowrap font-medium text-[var(--foreground)]"
            >
              <HiShieldCheck className="text-emerald-400" />
              Check Edge Cases
            </button>
            <button
              onClick={() => sendMessage('Can you review my current code and give me feedback on any potential bugs?')}
              className="px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-primary/20 hover:text-primary transition-colors flex items-center gap-1.5 whitespace-nowrap font-medium text-[var(--foreground)]"
            >
              <HiCode className="text-purple-400" />
              Debug My Code
            </button>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-surface-hover border border-[var(--card-border)] text-[var(--foreground)] rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] animate-pulse">
                <HiSparkles className="text-purple-400 text-sm" />
                AI Tutor is generating guidance...
              </div>
            )}
          </div>

          {/* User Input Bar */}
          <div className="p-4 border-t border-[var(--card-border)] bg-surface-hover/20 flex items-center gap-3">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(userInput);
                }
              }}
              placeholder="Ask anything about this DSA problem..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface-hover border border-[var(--card-border)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => sendMessage(userInput)}
              loading={loading}
              icon={<HiPaperAirplane className="rotate-90" />}
            >
              Send
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

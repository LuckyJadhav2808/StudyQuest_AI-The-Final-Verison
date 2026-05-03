'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSparkles, HiLightBulb, HiX, HiCode, HiExclamation, HiClipboardCopy, HiCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';

/* ============================================================
   CodeAIPanel — AI-powered code assistant for the IDE
   
   Features:
   • "Explain Code" — AI explains the selected/active code
   • "Find Bugs" — AI scans code for potential issues
   • "Improve" — AI suggests improvements
   
   Uses OpenRouter API (same as ChatContent / NotesContent)
   ============================================================ */

type AIAction = 'explain' | 'bugs' | 'improve';

interface CodeAIPanelProps {
  code: string;
  fileName?: string;
  language?: string;
}

const ACTION_CONFIG = {
  explain: {
    label: 'Explain',
    icon: <HiLightBulb size={14} />,
    prompt: (code: string, lang: string) =>
      `You are a coding tutor. Explain the following ${lang} code in a clear, beginner-friendly way. Use bullet points. Be concise.\n\n\`\`\`${lang}\n${code}\n\`\`\``,
    color: 'text-primary',
    bg: 'bg-primary/10 hover:bg-primary/20 border-primary/20',
  },
  bugs: {
    label: 'Find Bugs',
    icon: <HiExclamation size={14} />,
    prompt: (code: string, lang: string) =>
      `You are a senior code reviewer. Analyze the following ${lang} code for bugs, errors, edge cases, and potential issues. List each issue with a brief fix suggestion. If the code is clean, say so.\n\n\`\`\`${lang}\n${code}\n\`\`\``,
    color: 'text-coral',
    bg: 'bg-coral/10 hover:bg-coral/20 border-coral/20',
  },
  improve: {
    label: 'Improve',
    icon: <HiCode size={14} />,
    prompt: (code: string, lang: string) =>
      `You are a senior developer. Suggest improvements for the following ${lang} code. Focus on readability, performance, and best practices. Provide the improved code with brief explanations of changes.\n\n\`\`\`${lang}\n${code}\n\`\`\``,
    color: 'text-teal',
    bg: 'bg-teal/10 hover:bg-teal/20 border-teal/20',
  },
};

function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', cpp: 'cpp', c: 'c', rs: 'rust',
    go: 'go', rb: 'ruby', html: 'html', css: 'css', sql: 'sql',
    json: 'json', md: 'markdown',
  };
  return map[ext] || ext || 'code';
}

export default function CodeAIPanel({ code, fileName = '', language }: CodeAIPanelProps) {
  const { profile } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [copied, setCopied] = useState(false);

  const lang = language || detectLanguage(fileName);

  const handleAction = useCallback(async (action: AIAction) => {
    if (!profile?.openRouterKey) {
      toast.error('Set your OpenRouter API key in Settings first!');
      return;
    }

    if (!code.trim()) {
      toast.error('No code to analyze — write some code first!');
      return;
    }

    setIsOpen(true);
    setActiveAction(action);
    setResponse('');
    setLoading(true);

    const config = ACTION_CONFIG[action];
    const systemPrompt = config.prompt(code.slice(0, 4000), lang); // Limit to avoid token overflow

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile.openRouterKey}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: 'You are Questie 🦉, a helpful coding assistant inside the StudyQuest IDE. Be concise, clear, and friendly. Use emojis sparingly. Format with markdown.' },
            { role: 'user', content: systemPrompt },
          ],
          max_tokens: 1500,
        }),
      });

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || 'No response received. Please try again.';
      setResponse(text);
    } catch (err) {
      setResponse('❌ Failed to connect to AI. Check your API key and internet connection.');
    } finally {
      setLoading(false);
    }
  }, [code, lang, profile]);

  const copyResponse = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Action buttons — always visible in IDE toolbar */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mr-1 hidden sm:inline">
          🦉 AI
        </span>
        {(Object.entries(ACTION_CONFIG) as [AIAction, typeof ACTION_CONFIG.explain][]).map(([key, config]) => (
          <motion.button
            key={key}
            onClick={() => handleAction(key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${config.bg} ${config.color}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={`${config.label} this code`}
          >
            {config.icon}
            <span className="hidden sm:inline">{config.label}</span>
          </motion.button>
        ))}
      </div>

      {/* AI Response Panel — slides in from the right */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[150] flex items-stretch justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              className="relative w-full max-w-[500px] bg-[var(--card-bg)] border-l-2 border-[var(--card-border)] shadow-2xl flex flex-col"
              initial={{ x: 500 }}
              animate={{ x: 0 }}
              exit={{ x: 500 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--card-border)]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🦉</span>
                  <div>
                    <p className="text-sm font-heading font-bold">
                      Questie AI — {activeAction && ACTION_CONFIG[activeAction].label}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      {fileName || 'Current file'} • {lang}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {response && !loading && (
                    <button
                      onClick={copyResponse}
                      className="p-1.5 rounded-lg hover:bg-[var(--muted)]/20 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      title="Copy response"
                    >
                      {copied ? <HiCheck size={16} className="text-teal" /> : <HiClipboardCopy size={16} />}
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-[var(--muted)]/20 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <HiX size={16} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <motion.div
                      className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                      🦉 Analyzing your code...
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">
                      This may take a few seconds
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none">
                    {/* Render response as formatted text */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap font-[var(--font-body)]">
                      {response.split('\n').map((line, i) => {
                        // Bold headers
                        if (line.startsWith('## ')) {
                          return <h3 key={i} className="text-base font-heading font-bold mt-4 mb-2 text-primary">{line.replace('## ', '')}</h3>;
                        }
                        if (line.startsWith('### ')) {
                          return <h4 key={i} className="text-sm font-heading font-bold mt-3 mb-1">{line.replace('### ', '')}</h4>;
                        }
                        // Code blocks
                        if (line.startsWith('```')) {
                          return <div key={i} className="text-[10px] text-[var(--muted-foreground)]">{line}</div>;
                        }
                        // Bullet points
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return (
                            <div key={i} className="flex gap-2 ml-2 my-0.5">
                              <span className="text-primary font-bold">•</span>
                              <span>{line.slice(2)}</span>
                            </div>
                          );
                        }
                        // Empty lines
                        if (line.trim() === '') return <div key={i} className="h-2" />;
                        // Regular text
                        return <p key={i} className="my-0.5">{line}</p>;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick re-ask buttons */}
              {!loading && response && (
                <div className="px-4 py-3 border-t border-[var(--card-border)] flex gap-2">
                  {(Object.entries(ACTION_CONFIG) as [AIAction, typeof ACTION_CONFIG.explain][])
                    .filter(([key]) => key !== activeAction)
                    .map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleAction(key)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${config.bg} ${config.color}`}
                      >
                        {config.icon}
                        {config.label}
                      </button>
                    ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiCheck, HiChevronRight, HiLightningBolt, HiPlay, HiBookmark, HiEye, HiCode, HiTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';
import CodeEditor from '@/components/ui/CodeEditor';
import { useAuthContext } from '@/context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db as fireDb } from '@/lib/firebase';
import { executeCode } from '@/lib/codeRunner';

const PROBLEMS = [
  { id: 'two-sum', title: 'Two Sum', difficulty: 'easy' as const, category: 'Arrays', desc: 'Return indices of two numbers that add up to target.', template: 'function twoSum(nums, target) {\n  // Your solution\n  \n}\nconsole.log(twoSum([2,7,11,15], 9));' },
  { id: 'reverse-string', title: 'Reverse String', difficulty: 'easy' as const, category: 'Strings', desc: 'Reverse an array of characters in-place.', template: 'function reverseString(s) {\n  // Your solution\n  \n}\nconsole.log(reverseString(["h","e","l","l","o"]));' },
  { id: 'valid-parens', title: 'Valid Parentheses', difficulty: 'easy' as const, category: 'Stacks', desc: 'Determine if string of brackets is valid.', template: 'function isValid(s) {\n  // Your solution\n  \n}\nconsole.log(isValid("()[]{}"));' },
  { id: 'binary-search', title: 'Binary Search', difficulty: 'easy' as const, category: 'Searching', desc: 'Find target in sorted array, return index or -1.', template: 'function search(nums, target) {\n  // Your solution\n  \n}\nconsole.log(search([-1,0,3,5,9,12], 9));' },
  { id: 'longest-sub', title: 'Longest Substring Without Repeating', difficulty: 'medium' as const, category: 'Sliding Window', desc: 'Find length of longest substring without repeating chars.', template: 'function lengthOfLongestSubstring(s) {\n  // Your solution\n  \n}\nconsole.log(lengthOfLongestSubstring("abcabcbb"));' },
  { id: 'merge-lists', title: 'Merge Sorted Arrays', difficulty: 'easy' as const, category: 'Arrays', desc: 'Merge two sorted arrays into one sorted array.', template: 'function mergeSorted(a, b) {\n  // Your solution\n  \n}\nconsole.log(mergeSorted([1,3,5], [2,4,6]));' },
];

const DC = { easy: 'teal', medium: 'amber', hard: 'coral' } as const;

const LANGS = [
  { id: 'javascript', label: 'JavaScript', version: '18.15.0' },
  { id: 'python', label: 'Python', version: '3.10.0' },
  { id: 'java', label: 'Java', version: '15.0.2' },
  { id: 'cpp', label: 'C++', version: '10.2.0' },
];

// DS Visualizer component
function DSVisualizer({ code }: { code: string }) {
  // Try to extract arrays, linked lists, trees from code
  const arrays: number[][] = [];
  const regex = /\[([0-9,\s-]+)\]/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const nums = match[1].split(',').map((n) => Number(n.trim())).filter((n) => !isNaN(n));
    if (nums.length > 0 && nums.length <= 20) arrays.push(nums);
  }

  if (arrays.length === 0) return null;

  return (
    <Card padding="md" hover={false}>
      <h3 className="text-xs font-heading font-bold mb-3 flex items-center gap-2">
        <HiEye className="text-primary" size={14} /> Data Structure Visualizer
      </h3>
      <div className="space-y-4">
        {arrays.slice(0, 3).map((arr, ai) => (
          <div key={ai}>
            <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5">Array {ai + 1}</p>
            <div className="flex gap-0.5 overflow-x-auto pb-1">
              {arr.map((val, vi) => (
                <motion.div
                  key={vi}
                  className="flex flex-col items-center"
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: vi * 0.05 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/30 flex items-center justify-center text-xs font-heading font-bold">{val}</div>
                  <span className="text-[8px] text-[var(--muted-foreground)] mt-0.5 font-mono">[{vi}]</span>
                </motion.div>
              ))}
            </div>
            {/* Linked list view */}
            <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mt-3 mb-1.5">As Linked List</p>
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {arr.map((val, vi) => (
                <React.Fragment key={vi}>
                  <motion.div
                    className="flex-shrink-0 w-12 h-8 rounded-lg bg-teal/15 border-2 border-teal/30 flex items-center justify-center text-xs font-bold"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: vi * 0.08 }}
                  >{val}</motion.div>
                  {vi < arr.length - 1 && <span className="text-teal text-xs mx-0.5">→</span>}
                </React.Fragment>
              ))}
              <span className="text-[var(--muted-foreground)] text-xs ml-1">null</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function DsaPage() {
  const { user } = useAuthContext();
  const [sel, setSel] = useState<typeof PROBLEMS[0] | null>(null);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('javascript');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'challenges' | 'free'>('challenges');
  const [freeCode, setFreeCode] = useState('// Write any DSA code here\n// Use console.log() to see output\n\nfunction bubbleSort(arr) {\n  const n = arr.length;\n  for (let i = 0; i < n; i++) {\n    for (let j = 0; j < n - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];\n      }\n    }\n  }\n  return arr;\n}\n\nconsole.log(bubbleSort([64, 34, 25, 12, 22, 11, 90]));');
  const [freeOutput, setFreeOutput] = useState('');
  const [freeLang, setFreeLang] = useState('javascript');

  const runCode = async () => {
    if (!code.trim()) return;
    setRunning(true);
    setOutput('⏳ Running...');
    try {
      const result = await executeCode(code, lang);
      const out = (result.stdout || '') + (result.stderr ? '\n' + result.stderr : '');
      setOutput(out.trim() || '(no output)');
      if (result.stderr) toast.error('Execution had errors');
      else toast.success('Code executed! ⚡');
    } catch { setOutput('❌ Failed to execute'); toast.error('Execution failed'); }
    finally { setRunning(false); }
  };

  const runFreeCode = async () => {
    if (!freeCode.trim()) return;
    setRunning(true);
    setFreeOutput('⏳ Running...');
    try {
      const result = await executeCode(freeCode, freeLang);
      const out = (result.stdout || '') + (result.stderr ? '\n' + result.stderr : '');
      setFreeOutput(out.trim() || '(no output)');
      if (result.stderr) toast.error('Execution had errors');
      else toast.success('Code executed! ⚡');
    } catch { setFreeOutput('❌ Failed to execute'); toast.error('Execution failed'); }
    finally { setRunning(false); }
  };

  const saveToSpellBook = async () => {
    if (!user || !code.trim() || !sel) return;
    const id = crypto.randomUUID();
    await setDoc(doc(fireDb, 'users', user.uid, 'snippets', id), {
      id, title: `DSA: ${sel.title}`, language: lang, code, tags: ['dsa', sel.category.toLowerCase()], createdAt: Date.now(),
    });
    toast.success('Saved to Spell Book! 📜');
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-heading font-black">DSA Dungeon</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Practice data structures & algorithms. Defeat each problem to earn XP!</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setMode('challenges')} className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all ${mode === 'challenges' ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]' : 'border-[var(--card-border)] hover:border-primary/30'}`}>⚔️ Challenges</button>
          <button onClick={() => setMode('free')} className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all ${mode === 'free' ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]' : 'border-[var(--card-border)] hover:border-primary/30'}`}>🖊️ Free Code</button>
        </div>

        {mode === 'free' ? (
          /* ===== FREE CODE MODE ===== */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {LANGS.map((l) => (
                  <button key={l.id} onClick={() => setFreeLang(l.id)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border-2 transition-all ${freeLang === l.id ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/30'}`}>{l.label}</button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" icon={<HiTrash size={14} />} onClick={() => setFreeCode('')}>Clear</Button>
                <Button variant="primary" size="sm" icon={<HiPlay size={14} />} onClick={runFreeCode} loading={running}>{running ? '...' : 'Run'}</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Card padding="none" hover={false}>
                  <div className="px-4 py-2 border-b-2 border-[var(--card-border)]">
                    <div className="flex items-center gap-2"><HiCode className="text-primary" size={14} /><span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Free Code Editor</span></div>
                  </div>
                  <CodeEditor
                    value={freeCode}
                    onChange={setFreeCode}
                    onRun={runFreeCode}
                    minHeight="350px"
                  />
                </Card>
                <DSVisualizer code={freeCode} />
              </div>
              <Card padding="none" hover={false}>
                <div className="px-4 py-2 border-b-2 border-[var(--card-border)]"><span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Output</span></div>
                <div className="p-4 text-sm min-h-[350px]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {!freeOutput ? (
                    <span className="text-[var(--muted-foreground)]">Write any code and press Ctrl+Enter to run...</span>
                  ) : (
                    <pre className="whitespace-pre-wrap">{freeOutput.split('\n').map((line, i) => (
                      <div key={i} className="flex gap-2"><span className="select-none text-[var(--muted-foreground)] opacity-40 w-6 text-right flex-shrink-0">{i + 1}</span><span>{line}</span></div>
                    ))}</pre>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : !sel ? (
          <div className="space-y-2">
            {PROBLEMS.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card padding="md" className="cursor-pointer" onClick={() => { setSel(p); setCode(p.template); setOutput(''); }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${solved.has(p.id) ? 'bg-teal/15' : 'bg-primary/15'}`}>
                      {solved.has(p.id) ? <HiCheck className="text-teal" size={20} /> : <HiLightningBolt className="text-primary" size={20} />}
                    </div>
                    <div className="flex-1"><h3 className="text-sm font-heading font-bold">{p.title}</h3><span className="text-[10px] text-[var(--muted-foreground)]">{p.category}</span></div>
                    <Badge variant={DC[p.difficulty]} size="sm">{p.difficulty}</Badge>
                    <HiChevronRight className="text-[var(--muted-foreground)]" size={18} />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setSel(null)} className="text-xs text-primary font-bold hover:underline uppercase tracking-wider">← Back</button>
              <div className="flex gap-1.5">
                {LANGS.map((l) => (
                  <button key={l.id} onClick={() => setLang(l.id)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border-2 transition-all ${lang === l.id ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/30'}`}>{l.label}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Description + Visualizer */}
              <div className="space-y-3">
                <Card padding="lg" hover={false}>
                  <div className="flex items-center gap-2 mb-3"><h2 className="text-lg font-heading font-bold">{sel.title}</h2><Badge variant={DC[sel.difficulty]} size="sm">{sel.difficulty}</Badge></div>
                  <p className="text-sm text-[var(--muted-foreground)]">{sel.desc}</p>
                </Card>
                <DSVisualizer code={code} />
              </div>

              {/* Right: Editor + Output */}
              <div className="space-y-3">
                <Card padding="none" hover={false}>
                  <div className="flex items-center justify-between px-4 py-2 border-b-2 border-[var(--card-border)]">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Solution</span>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" icon={<HiBookmark size={14} />} onClick={saveToSpellBook}>Save</Button>
                      <Button variant="teal" size="sm" icon={<HiCheck size={14} />} onClick={() => { setSolved((p) => new Set(p).add(sel.id)); toast.success('Problem marked solved! 🏆'); setSel(null); }}>Solved</Button>
                      <Button variant="primary" size="sm" icon={<HiPlay size={14} />} onClick={runCode} loading={running}>{running ? '...' : 'Run'}</Button>
                    </div>
                  </div>
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    onRun={runCode}
                    minHeight="250px"
                  />
                </Card>

                <Card padding="none" hover={false}>
                  <div className="px-4 py-2 border-b-2 border-[var(--card-border)]"><span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Output</span></div>
                  <div className="p-4 text-sm min-h-[100px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {!output ? (
                      <span className="text-[var(--muted-foreground)]">Run your code to see output...</span>
                    ) : (
                      <pre className="whitespace-pre-wrap">{output.split('\n').map((line, i) => (
                        <div key={i} className="flex gap-2"><span className="select-none text-[var(--muted-foreground)] opacity-40 w-6 text-right flex-shrink-0">{i + 1}</span><span>{line}</span></div>
                      ))}</pre>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

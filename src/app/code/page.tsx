'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiPlay, HiTrash, HiCode, HiLightningBolt, HiTerminal } from 'react-icons/hi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';
import CodeEditor from '@/components/ui/CodeEditor';
import CodeAIPanel from '@/components/code/CodeAIPanel';
import { executeCode } from '@/lib/codeRunner';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', version: '18.15.0' },
  { id: 'typescript', label: 'TypeScript', version: '5.0.3' },
  { id: 'python', label: 'Python', version: '3.10.0' },
  { id: 'java', label: 'Java', version: '15.0.2' },
  { id: 'cpp', label: 'C++', version: '10.2.0' },
  { id: 'c', label: 'C', version: '10.2.0' },
  { id: 'rust', label: 'Rust', version: '1.68.2' },
  { id: 'go', label: 'Go', version: '1.16.2' },
] as const;

const TEMPLATES: Record<string, string> = {
  javascript: `// JavaScript\nfunction greet(name) {\n  return \`Hello, \${name}! Welcome to StudyQuest 🦉\`;\n}\n\nconsole.log(greet("Adventurer"));\nconsole.log("2 + 2 =", 2 + 2);`,
  typescript: `// TypeScript\nfunction greet(name: string): string {\n  return \`Hello, \${name}! Welcome to StudyQuest 🦉\`;\n}\n\nconsole.log(greet("Adventurer"));`,
  python: `# Python\ndef greet(name):\n    return f"Hello, {name}! Welcome to StudyQuest 🦉"\n\nprint(greet("Adventurer"))\nprint("Fibonacci:", [0,1,1,2,3,5,8,13,21])`,
  java: `// Java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Adventurer! Welcome to StudyQuest 🦉");\n        for (int i = 1; i <= 5; i++) {\n            System.out.println("Level " + i + ": " + (i * 100) + " XP needed");\n        }\n    }\n}`,
  cpp: `// C++\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, Adventurer! Welcome to StudyQuest 🦉" << endl;\n    int arr[] = {5, 3, 8, 1, 9};\n    int n = sizeof(arr)/sizeof(arr[0]);\n    for(int i = 0; i < n; i++) cout << arr[i] << " ";\n    cout << endl;\n    return 0;\n}`,
  c: `// C\n#include <stdio.h>\n\nint main() {\n    printf("Hello, Adventurer! Welcome to StudyQuest 🦉\\n");\n    for(int i = 1; i <= 5; i++) {\n        printf("Level %d\\n", i);\n    }\n    return 0;\n}`,
  rust: `// Rust\nfn main() {\n    println!("Hello, Adventurer! Welcome to StudyQuest 🦉");\n    let nums = vec![1, 2, 3, 4, 5];\n    let sum: i32 = nums.iter().sum();\n    println!("Sum: {}", sum);\n}`,
  go: `// Go\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Adventurer! Welcome to StudyQuest 🦉")\n    for i := 1; i <= 5; i++ {\n        fmt.Printf("Level %d\\n", i)\n    }\n}`,
};

export default function CodePage() {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(TEMPLATES.javascript);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const runCode = async () => {
    if (!code.trim()) return;
    setRunning(true);
    setOutput('⏳ Running...');

    try {
      const result = await executeCode(code, language);
      const out = (result.stdout || '') + (result.stderr ? '\n' + result.stderr : '');
      setOutput(out.trim() || '(no output)');
      if (result.stderr) toast.error('Execution had errors');
      else toast.success('Code executed! ⚡');
    } catch {
      setOutput('❌ Failed to execute. Check your network.');
      toast.error('Execution failed');
    } finally {
      setRunning(false);
    }
  };

  const switchLanguage = (lang: string) => {
    setLanguage(lang);
    setCode(TEMPLATES[lang] || '');
    setOutput('');
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading font-black">Code Runner</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Write, run, and experiment with code in any language.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/ide"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-secondary text-white shadow-[0_3px_0_rgba(88,28,135,0.3)] hover:shadow-[0_4px_0_rgba(88,28,135,0.4)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_rgba(88,28,135,0.3)] transition-all"
            >
              <HiTerminal size={14} />
              Open Code Arena IDE
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => switchLanguage(lang.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border-2 ${
                  language === lang.id
                    ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]'
                    : 'border-[var(--card-border)] hover:border-primary/30'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Editor */}
          <Card padding="none" hover={false}>
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-[var(--card-border)]">
              <div className="flex items-center gap-2">
                <HiCode className="text-primary" size={14} />
                <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Editor</span>
                <Badge variant="primary" size="sm">{LANGUAGES.find((l) => l.id === language)?.label}</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setCode('')} icon={<HiTrash size={14} />}>Clear</Button>
                <Button variant="primary" size="sm" onClick={runCode} icon={<HiPlay size={14} />} loading={running}>
                  {running ? 'Running...' : 'Run ▶'}
                </Button>
              </div>
            </div>
            {/* AI tools row */}
            <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-[var(--card-border)]/50 bg-[var(--background)]/30">
              <CodeAIPanel code={code} language={language} />
            </div>
            <CodeEditor
              value={code}
              onChange={setCode}
              onRun={runCode}
              minHeight="380px"
              placeholder="Write your code here..."
            />
          </Card>

          {/* Output */}
          <Card padding="none" hover={false}>
            <div className="px-4 py-2 border-b-2 border-[var(--card-border)]">
              <div className="flex items-center gap-2">
                <HiLightningBolt className="text-teal" size={14} />
                <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Output</span>
                {running && <motion.div className="w-2 h-2 rounded-full bg-amber" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />}
              </div>
            </div>
            <div className="p-4 text-sm min-h-[400px]" style={{ fontFamily: 'var(--font-mono)' }}>
              {!output ? (
                <span className="text-[var(--muted-foreground)]">Click &quot;Run&quot; or press Ctrl+Enter to execute...</span>
              ) : (
                <pre className="whitespace-pre-wrap">{output.split('\n').map((line, i) => (
                  <div key={i} className="flex gap-2"><span className="select-none text-[var(--muted-foreground)] opacity-40 w-6 text-right flex-shrink-0">{i + 1}</span><span>{line}</span></div>
                ))}</pre>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}

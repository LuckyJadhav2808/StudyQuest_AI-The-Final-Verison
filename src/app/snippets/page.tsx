'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiTrash, HiSearch, HiClipboardCopy, HiCheck,
  HiCode, HiEye, HiX, HiShare, HiLightningBolt, HiTerminal, HiPencil, HiDownload
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import CodeEditor from '@/components/ui/CodeEditor';
import { executeCode } from '@/lib/codeRunner';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGroups, useGroupChat } from '@/hooks/useGroups';

interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  tags: string[];
  createdAt: number;
}

const getElementTheme = (lang: string) => {
  switch (lang.toLowerCase()) {
    case 'javascript':
    case 'typescript':
      return {
        border: 'border-amber-400/40 dark:border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.04)]',
        bg: 'bg-amber-500/5',
        badge: 'amber' as const,
        iconColor: 'text-amber-500',
        effect: '⚡ Lightning'
      };
    case 'python':
      return {
        border: 'border-emerald-400/40 dark:border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.04)]',
        bg: 'bg-emerald-500/5',
        badge: 'teal' as const,
        iconColor: 'text-emerald-500',
        effect: '🌿 Earth'
      };
    case 'java':
      return {
        border: 'border-orange-400/40 dark:border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.04)]',
        bg: 'bg-orange-500/5',
        badge: 'orange' as const,
        iconColor: 'text-orange-500',
        effect: '🔥 Fire'
      };
    case 'cpp':
    case 'c++':
    case 'c':
      return {
        border: 'border-rose-400/40 dark:border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.04)]',
        bg: 'bg-rose-500/5',
        badge: 'coral' as const,
        iconColor: 'text-rose-500',
        effect: '🩸 Crimson'
      };
    case 'html':
    case 'css':
      return {
        border: 'border-violet-400/40 dark:border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.04)]',
        bg: 'bg-violet-500/5',
        badge: 'pink' as const,
        iconColor: 'text-violet-500',
        effect: '🔮 Aether'
      };
    default:
      return {
        border: 'border-slate-400/30 dark:border-slate-800 shadow-[0_0_15px_rgba(100,116,139,0.02)]',
        bg: 'bg-slate-500/5',
        badge: 'primary' as const,
        iconColor: 'text-slate-500',
        effect: '🛡️ Metal'
      };
  }
};

export default function SnippetsPage() {
  const { user } = useAuthContext();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [shareSnippet, setShareSnippet] = useState<Snippet | null>(null);

  // Edit Snippet state
  const [editSnippetObj, setEditSnippetObj] = useState<Snippet | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLanguage, setEditLanguage] = useState('javascript');
  const [editCode, setEditCode] = useState('');

  // Snippet Execution state
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [execOutput, setExecOutput] = useState('');
  const [execStdin, setExecStdin] = useState('');
  const [runSnippetObj, setRunSnippetObj] = useState<Snippet | null>(null);

  // Grimoire Export state
  const [showGrimoireExportModal, setShowGrimoireExportModal] = useState(false);
  const [selectedGrimoireTheme, setSelectedGrimoireTheme] = useState<'modern' | 'editor' | 'parchment' | 'grimoire' | 'druid'>('editor');
  const [exportSelectedIds, setExportSelectedIds] = useState<Set<string>>(new Set());

  const { groups } = useGroups();

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'snippets'), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Snippet);
      items.sort((a, b) => b.createdAt - a.createdAt);
      setSnippets(items);
    });
    return () => unsub();
  }, [user]);

  const addSnippet = async () => {
    if (!user || !title.trim() || !code.trim()) {
      toast.error('Title and code are required');
      return;
    }
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'users', user.uid, 'snippets', id), {
      id,
      title: title.trim(),
      language,
      code,
      tags: [],
      createdAt: Date.now()
    });
    toast.success('Spell saved to Grimoire! 📜');
    setTitle('');
    setCode('');
    setShowModal(false);
  };

  const updateSnippet = async () => {
    if (!user || !editSnippetObj) return;
    if (!editTitle.trim() || !editCode.trim()) {
      toast.error('Title and code are required');
      return;
    }
    await setDoc(doc(db, 'users', user.uid, 'snippets', editSnippetObj.id), {
      title: editTitle.trim(),
      language: editLanguage,
      code: editCode,
    }, { merge: true });
    toast.success('Spell updated in Grimoire! 📜');
    setEditSnippetObj(null);
  };

  const deleteSnippet = (id: string, name: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Delete &quot;{name}&quot;?</span>
        <button
          onClick={async () => {
            if (user) await deleteDoc(doc(db, 'users', user.uid, 'snippets', id));
            toast.dismiss(t.id);
            toast.success('Spell removed');
          }}
          className="px-3 py-1 bg-[#FF6B6B] text-white rounded-lg text-xs font-bold"
        >
          Yes
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">
          No
        </button>
      </div>
    ), { duration: 5000 });
  };

  const copyCode = (snippet: Snippet) => {
    navigator.clipboard.writeText(snippet.code);
    setCopiedId(snippet.id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const castSpell = async (snippet: Snippet) => {
    setExecutingId(snippet.id);
    setExecOutput('⏳ Invoking magic compiler...');
    try {
      const result = await executeCode(snippet.code, snippet.language === 'c++' ? 'cpp' : snippet.language, execStdin, snippet.title);
      const out = (result.stdout || '') + (result.stderr ? '\n' + result.stderr : '');
      setExecOutput(out.trim() || '(no output)');
      if (result.stderr) toast.error('Spell fizzled (errors)');
      else toast.success('Spell cast successfully! ⚡');
    } catch {
      setExecOutput('❌ Spell failed to manifest.');
      toast.error('Spell failed');
    } finally {
      setExecutingId(null);
    }
  };

  const exportGrimoirePdf = async () => {
    // Filter to selected snippets only (if any selected, otherwise export all)
    const toExport = exportSelectedIds.size > 0
      ? snippets.filter((s) => exportSelectedIds.has(s.id))
      : snippets;

    if (toExport.length === 0) {
      toast.error('No code spells selected to export!');
      return;
    }

    const toastId = toast.loading('Compiling Spell Grimoire PDF...');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = (await import('jspdf')) as any;

      // Theme configuration
      const t = selectedGrimoireTheme;
      const themeBg =
        t === 'parchment' ? '#FDF6E2' :
        t === 'grimoire' ? '#1E1E2F' :
        t === 'druid' ? '#F2F4F0' :
        t === 'editor' ? '#0B0D17' :
        '#ffffff';
      const themeText =
        t === 'parchment' ? '#3E2723' :
        t === 'grimoire' ? '#F3F4F6' :
        t === 'druid' ? '#111827' :
        t === 'editor' ? '#FEF7FF' :
        '#1E1B4B';
      const themeH1 =
        t === 'parchment' ? '#5C4033' :
        t === 'grimoire' ? '#A78BFA' :
        t === 'druid' ? '#065F46' :
        t === 'editor' ? '#A78BFA' :
        '#312E81';
      const themeH2 =
        t === 'parchment' ? '#8B4513' :
        t === 'grimoire' ? '#C4B5FD' :
        t === 'druid' ? '#047857' :
        t === 'editor' ? '#A78BFA' :
        '#4338CA';
      const themeAccent =
        t === 'parchment' ? '#D4AF37' :
        t === 'grimoire' ? '#7C3AED' :
        t === 'druid' ? '#10B981' :
        t === 'editor' ? '#7C3AED' :
        '#6366F1';
      const themeMeta =
        t === 'parchment' ? '#8B6508' :
        t === 'grimoire' ? '#9CA3AF' :
        t === 'druid' ? '#6B7280' :
        t === 'editor' ? '#9CA3AF' :
        '#6366F1';
      const themePreBg =
        t === 'parchment' ? '#F5EAC9' :
        t === 'grimoire' ? '#111827' :
        t === 'druid' ? '#ECFDF5' :
        t === 'editor' ? '#1A1D35' :
        '#EEF2FF';
      const themePreText =
        t === 'parchment' ? '#3E2723' :
        t === 'grimoire' ? '#E5E7EB' :
        t === 'druid' ? '#064E3B' :
        t === 'editor' ? '#FEF7FF' :
        '#312E81';
      const themeFont =
        t === 'parchment' ? 'Georgia, Cambria, serif' :
        t === 'grimoire' ? 'Lexend, system-ui, sans-serif' :
        t === 'druid' ? 'Lexend, system-ui, sans-serif' :
        t === 'editor' ? 'Lexend, system-ui, sans-serif' :
        'Lexend, system-ui, sans-serif';

      // 1. Create single offscreen container with ALL content
      const container = document.createElement('div');
      container.style.cssText = `width:794px;padding:0px 40px 20px 40px;position:absolute;left:-9999px;font-family:${themeFont};font-size:13px;line-height:1.7;color:${themeText};background:${themeBg};white-space:pre-wrap;word-wrap:break-word;`;

      const styleTag = document.createElement('style');
      styleTag.textContent = `
        h1 { font-size: 24px; font-weight: 800; margin-top: 0px; margin-bottom: 8px; color: ${themeH1}; border-bottom: 2px solid ${themeAccent}; padding-bottom: 6px; }
        h2 { font-size: 16px; font-weight: 700; margin: 24px 0 8px; color: ${themeH2}; border-bottom: 1px dashed ${themeAccent}40; padding-bottom: 4px; }
        .meta { font-size: 10px; color: ${themeMeta}; font-style: italic; margin-bottom: 8px; }
        .subtitle { font-size: 10px; color: ${themeMeta}; margin-bottom: 20px; }
        pre { background: ${themePreBg}; color: ${themePreText}; padding: 12px 16px; border-radius: 8px; overflow-x: auto; font-family: 'Space Grotesk', monospace; font-size: 12px; border-left: 4px solid ${themeAccent}; margin: 8px 0; white-space: pre-wrap; word-wrap: break-word; }
        code { font-family: 'Space Grotesk', monospace; }
        p { color: ${themeText}; margin: 4px 0; }
        .snippet-block { margin-bottom: 24px; }
      `;
      container.appendChild(styleTag);

      // Copy document stylesheets for font rendering
      if (typeof window !== 'undefined') {
        Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach((style) => {
          container.appendChild(style.cloneNode(true));
        });
      }

      // Build all HTML content inside a wrapper div
      let contentHtml = `
        <h1>CODE GRIMOIRE &amp; SPELL BOOK</h1>
        <p class="subtitle">StudyQuest AI Grimoire Compilation - Exported on ${new Date().toLocaleDateString()} - ${toExport.length} spell${toExport.length !== 1 ? 's' : ''}</p>
      `;

      toExport.forEach((snip) => {
        contentHtml += `
          <div class="snippet-block">
            <h2>${snip.title}</h2>
            <div class="meta">Programming Language: ${snip.language.toUpperCase()} - Saved: ${new Date(snip.createdAt).toLocaleDateString()}</div>
            <pre><code>${snip.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </div>
        `;
      });

      container.innerHTML += `<div>${contentHtml}</div>`;
      document.body.appendChild(container);

      // 2. Compute page dimensions
      const pdf = new jsPDF('p', 'mm', 'a4') as any;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - 32;
      const pagePixelHeight = (usableHeight * 794) / imgWidth;

      // 3. Spacer insertion — avoid splitting blocks across page boundaries
      // (Same logic as Notes PDF export)
      const contentDiv = container.querySelector('div');
      if (contentDiv) {
        const blocks = Array.from(contentDiv.querySelectorAll('h1, .subtitle, .snippet-block'))
          .filter((block) => block.parentElement === contentDiv);
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i] as HTMLElement;
          const rect = block.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const top = rect.top - containerRect.top;
          const bottom = rect.bottom - containerRect.top;

          const pageIndex = Math.floor(top / pagePixelHeight);
          const endPageIndex = Math.floor(bottom / pagePixelHeight);

          const relativeTop = top % pagePixelHeight;
          if (endPageIndex > pageIndex && relativeTop > 180) {
            const pageBoundary = (pageIndex + 1) * pagePixelHeight;
            const spacerHeight = pageBoundary - top;
            // Only add spacer if the block fits within a single page
            if (spacerHeight > 0 && block.offsetHeight < pagePixelHeight) {
              const spacer = document.createElement('div');
              spacer.style.height = `${spacerHeight}px`;
              spacer.className = 'pdf-page-spacer';
              block.parentNode?.insertBefore(spacer, block);
            }
          }
        }
      }

      // 4. Theme-specific draw colors for jsPDF borders/headers
      const drawBorderColor =
        t === 'parchment' ? [212, 175, 55] :
        t === 'grimoire' ? [168, 85, 247] :
        t === 'druid' ? [16, 185, 129] :
        t === 'editor' ? [30, 33, 50] :
        [220, 210, 235];

      const drawHeaderColor =
        t === 'parchment' ? [139, 69, 19] :
        t === 'grimoire' ? [168, 85, 247] :
        t === 'druid' ? [6, 78, 59] :
        t === 'editor' ? [124, 58, 237] :
        [124, 58, 237];

      const drawHeaderLineColor =
        t === 'parchment' ? [212, 175, 55] :
        t === 'grimoire' ? [60, 60, 80] :
        t === 'druid' ? [200, 210, 195] :
        t === 'editor' ? [36, 40, 66] :
        [235, 230, 245];

      const drawTextColor =
        t === 'parchment' ? [100, 70, 50] :
        t === 'grimoire' ? [180, 180, 200] :
        t === 'druid' ? [80, 95, 80] :
        t === 'editor' ? [240, 230, 250] :
        [100, 100, 100];

      const drawFooterTextColor =
        t === 'parchment' ? [140, 110, 90] :
        t === 'grimoire' ? [130, 130, 150] :
        t === 'druid' ? [110, 125, 110] :
        t === 'editor' ? [150, 150, 170] :
        [140, 140, 140];

      const brandingTitle =
        t === 'parchment' ? 'AETHER GRIMOIRE' :
        t === 'grimoire' ? 'VOID GRIMOIRE' :
        t === 'druid' ? 'FOREST SPELL LOG' :
        t === 'editor' ? 'STUDYQUEST ACTIVE' :
        'STUDYQUEST AI';

      // 5. Render single canvas from the full container
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: themeBg });
      document.body.removeChild(container);

      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const totalPages = Math.ceil(imgHeight / usableHeight);

      // 6. Slice canvas into pages and draw decorations (same as Notes)
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const srcY = (page * usableHeight * canvas.width) / imgWidth;
        const srcH = Math.min((usableHeight * canvas.width) / imgWidth, canvas.height - srcY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        sliceCanvas.getContext('2d')!.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.85);
        const sliceHeight = (srcH * imgWidth) / canvas.width;

        // Fill entire page background for dark themes to avoid white margins
        if (t === 'editor' || t === 'grimoire') {
          const bgRgb = t === 'editor' ? [11, 13, 23] : [30, 30, 47];
          pdf.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        }

        pdf.addImage(sliceData, 'JPEG', margin, 16, imgWidth, sliceHeight, undefined, 'FAST');

        // ══════════ DRAW BEAUTIFIED BORDERS & BRANDING ══════════

        // Outer page border
        pdf.setDrawColor(drawBorderColor[0], drawBorderColor[1], drawBorderColor[2]);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(6, 6, pageWidth - 12, pageHeight - 12, 4, 4, 'D');

        // Header
        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(drawHeaderColor[0], drawHeaderColor[1], drawHeaderColor[2]);
        pdf.text(`${brandingTitle} - SPELL GRIMOIRE`, 12, 11);

        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(drawTextColor[0], drawTextColor[1], drawTextColor[2]);
        pdf.text(new Date().toLocaleDateString(), pageWidth - 12, 11, { align: "right" });

        // Header separator line
        pdf.setDrawColor(drawHeaderLineColor[0], drawHeaderLineColor[1], drawHeaderLineColor[2]);
        pdf.line(12, 13, pageWidth - 12, 13);

        // Footer separator line
        pdf.setDrawColor(drawHeaderLineColor[0], drawHeaderLineColor[1], drawHeaderLineColor[2]);
        pdf.line(12, pageHeight - 13, pageWidth - 12, pageHeight - 13);

        pdf.setFont("Helvetica", "italic");
        pdf.setFontSize(6.5);
        pdf.setTextColor(drawFooterTextColor[0], drawFooterTextColor[1], drawFooterTextColor[2]);
        pdf.text("Level Up Your Coding - studyquest.ai", 12, pageHeight - 9);

        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(drawFooterTextColor[0], drawFooterTextColor[1], drawFooterTextColor[2]);
        pdf.text(`Page ${page + 1} of ${totalPages}`, pageWidth - 12, pageHeight - 9, { align: "right" });
      }

      pdf.save(`Spell_Grimoire_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success('Grimoire PDF Compiled! 🧙‍♂️📄', { id: toastId });
    } catch (err) {
      console.error('Grimoire export error:', err);
      toast.error('Failed to compile Grimoire PDF', { id: toastId });
    }
  };

  const filtered = search.trim()
    ? snippets.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.language.includes(search.toLowerCase()))
    : snippets;

  const previewSnippet = snippets.find((s) => s.id === previewId);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black">Spell Book</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Your personal code snippet library.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowGrimoireExportModal(true)} icon={<HiDownload />}>Export Grimoire</Button>
            <Button variant="primary" size="sm" icon={<HiPlus />} onClick={() => { setCode(''); setShowModal(true); }}>New Spell</Button>
          </div>
        </div>

        <div className="relative">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
          <input
            type="text"
            placeholder="Search spells..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {filtered.length === 0 ? (
          <Card padding="lg" hover={false}>
            <div className="text-center py-8">
              <motion.span className="text-5xl block mb-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>📜</motion.span>
              <h3 className="text-lg font-heading font-bold mb-2">No spells yet!</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">Save code snippets you use often.</p>
              <Button variant="primary" icon={<HiPlus />} onClick={() => { setCode(''); setShowModal(true); }}>Create First Spell</Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((s, i) => {
              const theme = getElementTheme(s.language);
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className={`rounded-2xl border-2 p-4 transition-all duration-200 hover:-translate-y-0.5 bg-[var(--card-bg)] ${theme.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`${theme.iconColor} text-lg`}>📜</span>
                        <div className="text-left">
                          <h4 className="text-sm font-heading font-bold text-[var(--foreground)]">{s.title}</h4>
                          <span className="text-[8px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">{theme.effect}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setRunSnippetObj(s); setExecOutput(''); setExecStdin(''); }}
                          className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-500 transition-colors"
                          title="Cast Spell (Run Code)"
                        >
                          <HiLightningBolt size={16} />
                        </button>
                        {s.language === 'html' && (
                          <button onClick={() => setPreviewId(s.id)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Preview HTML">
                            <HiEye size={16} className="text-primary" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditSnippetObj(s);
                            setEditTitle(s.title);
                            setEditLanguage(s.language);
                            setEditCode(s.code);
                          }}
                          className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-primary"
                          title="Edit Spell"
                        >
                          <HiPencil size={16} />
                        </button>
                        <button onClick={() => copyCode(s)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Copy">
                          {copiedId === s.id ? <HiCheck className="text-teal" size={16} /> : <HiClipboardCopy size={16} />}
                        </button>
                        <button onClick={() => deleteSnippet(s.id, s.title)} className="p-1.5 rounded-lg hover:bg-coral/10 hover:text-coral transition-colors" title="Delete">
                          <HiTrash size={16} />
                        </button>
                        {groups.length > 0 && (
                          <button onClick={() => setShareSnippet(s)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Share to Group">
                            <HiShare size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <pre
                      className="p-3 rounded-xl bg-[var(--card-border)]/30 text-xs overflow-x-auto max-h-[160px] text-left border border-[var(--card-border)]/20"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {s.code}
                    </pre>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* New Spell Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Spell to Grimoire">
          <div className="space-y-4 text-left">
            <Input label="Title" placeholder="e.g. Array flatten" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Language</label>
              <div className="flex flex-wrap gap-1.5">
                {['javascript', 'typescript', 'python', 'java', 'c++', 'css', 'html', 'sql', 'rust', 'go'].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase border-2 transition-all ${
                      language === l ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/30'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Spell Code</label>
              <div className="rounded-xl border-2 border-[var(--card-border)] overflow-hidden bg-[var(--card-bg)]">
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={language === 'c++' ? 'cpp' : language}
                  minHeight="200px"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={addSnippet} className="flex-1">Save Spell</Button>
            </div>
          </div>
        </Modal>

        {/* Edit Spell Modal */}
        <Modal isOpen={!!editSnippetObj} onClose={() => setEditSnippetObj(null)} title="Edit Spell inside Grimoire">
          <div className="space-y-4 text-left">
            <Input label="Title" placeholder="e.g. Array flatten" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Language</label>
              <div className="flex flex-wrap gap-1.5">
                {['javascript', 'typescript', 'python', 'java', 'c++', 'css', 'html', 'sql', 'rust', 'go'].map((l) => (
                  <button
                    key={l}
                    onClick={() => setEditLanguage(l)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase border-2 transition-all ${
                      editLanguage === l ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/30'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Spell Code</label>
              <div className="rounded-xl border-2 border-[var(--card-border)] overflow-hidden bg-[var(--card-bg)]">
                <CodeEditor
                  value={editCode}
                  onChange={setEditCode}
                  language={editLanguage === 'c++' ? 'cpp' : editLanguage}
                  minHeight="200px"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditSnippetObj(null)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={updateSnippet} className="flex-1">Save Changes</Button>
            </div>
          </div>
        </Modal>

        {/* HTML Preview Modal */}
        <Modal isOpen={!!previewId} onClose={() => setPreviewId(null)} title="HTML Preview">
          <div className="space-y-3">
            <div className="rounded-xl border-2 border-[var(--card-border)] overflow-hidden bg-white" style={{ minHeight: '300px' }}>
              {previewSnippet && (
                <iframe
                  srcDoc={previewSnippet.code}
                  className="w-full min-h-[300px] border-0"
                  sandbox="allow-scripts"
                  title="HTML Preview"
                />
              )}
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)]">⚠️ Preview runs in a sandboxed iframe for security.</p>
          </div>
        </Modal>

        {/* Share to Group Modal */}
        <Modal isOpen={!!shareSnippet} onClose={() => setShareSnippet(null)} title="Share Snippet to Group">
          <div className="space-y-2 text-left">
            <p className="text-xs text-[var(--muted-foreground)] mb-3">Share &quot;{shareSnippet?.title}&quot; as a message in a group chat.</p>
            {groups.map((g) => (
              <ShareSnippetButton
                key={g.id}
                groupId={g.id}
                groupName={g.name}
                snippet={shareSnippet}
                userId={user?.uid || ''}
                userName={user?.displayName || 'User'}
                onDone={() => setShareSnippet(null)}
              />
            ))}
          </div>
        </Modal>

        {/* Spell Casting (Execution Console) Modal */}
        <Modal isOpen={!!runSnippetObj} onClose={() => setRunSnippetObj(null)} title="Cast Spell (Execute Code)">
          <div className="space-y-4 text-left">
            {runSnippetObj && (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-[var(--card-border)]">
                  <div>
                    <h3 className="text-sm font-heading font-bold">{runSnippetObj.title}</h3>
                    <p className="text-[10px] text-[var(--muted-foreground)]">Language: {runSnippetObj.language}</p>
                  </div>
                  <Badge variant="amber">{executingId ? '⚡ Casting...' : '📜 Ready'}</Badge>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-1">
                    📥 Input (stdin)
                  </label>
                  <textarea
                    value={execStdin}
                    onChange={(e) => setExecStdin(e.target.value)}
                    placeholder="Provide standard inputs here (optional)..."
                    className="w-full h-16 p-2 text-xs rounded-xl border-2 border-[var(--card-border)] bg-[var(--background)] focus:outline-none resize-none"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-1">
                    ⚙️ Wandbox Console output
                  </label>
                  <div
                    className="w-full min-h-[140px] max-h-[220px] p-3 rounded-xl bg-slate-950 text-slate-100 text-xs overflow-y-auto border border-slate-800"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {execOutput ? (
                      <pre className="whitespace-pre-wrap">{execOutput}</pre>
                    ) : (
                      <span className="text-slate-500">Console is empty. Cast the spell to invoke the compilers...</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setRunSnippetObj(null)} className="flex-1">Close</Button>
                  <Button
                    variant="primary"
                    onClick={() => castSpell(runSnippetObj)}
                    className="flex-1"
                    disabled={!!executingId}
                    icon={<HiLightningBolt />}
                  >
                    {executingId ? 'Casting...' : 'Cast Spell'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* ── Grimoire Export Theme Modal ── */}
        <Modal isOpen={showGrimoireExportModal} onClose={() => setShowGrimoireExportModal(false)} title="Export Spell Grimoire">
          <div className="space-y-4">
            {/* Spell Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Select Spells to Export</label>
                <button
                  onClick={() => {
                    if (exportSelectedIds.size === snippets.length) {
                      setExportSelectedIds(new Set());
                    } else {
                      setExportSelectedIds(new Set(snippets.map((s) => s.id)));
                    }
                  }}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  {exportSelectedIds.size === snippets.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-[180px] overflow-y-auto rounded-xl border-2 border-[var(--card-border)] divide-y divide-[var(--card-border)]">
                {snippets.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-primary/5 ${
                      exportSelectedIds.has(s.id) ? 'bg-primary/10' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={exportSelectedIds.has(s.id)}
                      onChange={() => {
                        setExportSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        });
                      }}
                      className="w-4 h-4 rounded border-2 border-[var(--card-border)] text-primary accent-[var(--primary)] flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-heading font-bold block truncate">{s.title}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">{s.language.toUpperCase()}</span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                {exportSelectedIds.size === 0
                  ? `All ${snippets.length} spells will be exported`
                  : `${exportSelectedIds.size} of ${snippets.length} spells selected`}
              </p>
            </div>

            {/* Theme Selection */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Scroll Style / Theme</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'modern' as const, name: 'Modern', desc: 'Clean indigo & white scholarly scroll', emoji: '📘', gradient: 'from-indigo-500 to-blue-500' },
                  { id: 'editor' as const, name: 'Active Editor', desc: 'Dark IDE-style matching your workspace', emoji: '🖥️', gradient: 'from-violet-600 to-purple-900' },
                  { id: 'parchment' as const, name: 'Parchment', desc: 'Warm aged parchment with gold ink', emoji: '📜', gradient: 'from-amber-600 to-yellow-500' },
                  { id: 'grimoire' as const, name: 'Grimoire', desc: 'Dark arcane spellbook with purple runes', emoji: '🔮', gradient: 'from-purple-600 to-violet-800' },
                  { id: 'druid' as const, name: 'Druid Grove', desc: 'Organic nature-infused emerald scroll', emoji: '🌿', gradient: 'from-emerald-500 to-green-700' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedGrimoireTheme(opt.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                      selectedGrimoireTheme === opt.id
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                        : 'border-[var(--card-border)] hover:border-primary/30 hover:bg-primary/5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${opt.gradient} flex items-center justify-center text-sm flex-shrink-0 shadow-md`}>
                      {opt.emoji}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-heading font-bold block">{opt.name}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] opacity-80 leading-snug">{opt.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={() => setShowGrimoireExportModal(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={() => { setShowGrimoireExportModal(false); exportGrimoirePdf(); }} className="flex-1" icon={<HiDownload />}>
                Compile {exportSelectedIds.size > 0 ? `${exportSelectedIds.size} Spell${exportSelectedIds.size !== 1 ? 's' : ''}` : 'Grimoire'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

function ShareSnippetButton({
  groupId,
  groupName,
  snippet,
  userId,
  userName,
  onDone
}: {
  groupId: string;
  groupName: string;
  snippet: Snippet | null;
  userId: string;
  userName: string;
  onDone: () => void;
}) {
  const { sendMessage } = useGroupChat(groupId);

  const handleShare = async () => {
    if (!snippet) return;
    const msg = `📜 **${snippet.title}** (${snippet.language})\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\``;
    await sendMessage(msg, userId, userName, 'text');
    toast.success(`Snippet shared to ${groupName}! 📤`);
    onDone();
  };

  return (
    <button
      onClick={handleShare}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 hover:bg-primary/5 transition-all"
    >
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm">
        🏰
      </div>
      <span className="text-sm font-heading font-bold flex-1 text-left">{groupName}</span>
      <HiShare className="text-[var(--muted-foreground)]" size={16} />
    </button>
  );
}

'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiTrash, HiPencil, HiSearch,
  HiEye, HiCode, HiDocumentText, HiFolder,
  HiChevronLeft, HiClock, HiDownload, HiSparkles,
  HiLightningBolt, HiRefresh, HiInformationCircle, HiShare,
} from 'react-icons/hi';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center text-sm text-[var(--muted-foreground)]">Loading editor...</div> });

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
};
const QUILL_FORMATS = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'code-block', 'link', 'image', 'color', 'background'];
import toast from 'react-hot-toast';
import { useNotes } from '@/hooks/useNotes';
import { useGamification } from '@/hooks/useGamification';
import { useAuthContext } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import DiagramModal from '@/components/notes/DiagramModal';
import { useGroups, useGroupResources } from '@/hooks/useGroups';
import { XP_AWARDS } from '@/lib/constants';
import { Note } from '@/types';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Flashcard { question: string; answer: string; }

export default function NotesContent() {
  const { notes, loading, addNote, updateNote, deleteNote } = useNotes();
  const { awardXP } = useGamification();
  const { profile } = useAuthContext();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFolder, setNewFolder] = useState('General');
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [pdfQuality, setPdfQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShareGroup, setShowShareGroup] = useState(false);

  const { groups } = useGroups();

  const noteRef = useRef<HTMLDivElement>(null);

  // Filter + group
  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.folder.toLowerCase().includes(q));
  }, [notes, search]);

  const folders = useMemo(() => {
    const map = new Map<string, Note[]>();
    filteredNotes.forEach((n) => { const g = map.get(n.folder) || []; g.push(n); map.set(n.folder, g); });
    return map;
  }, [filteredNotes]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const id = await addNote({ title: newTitle.trim(), content: '', folder: newFolder.trim() || 'General', tags: [] });
    await awardXP(XP_AWARDS.NOTE_CREATED, 'New note created');
    toast.success('Scroll created! +10 XP 📝');
    setShowNewModal(false); setNewTitle(''); setNewFolder('General');
    if (id) {
      const note = { id, title: newTitle.trim(), content: '', folder: newFolder.trim() || 'General', tags: [], createdAt: Date.now(), updatedAt: Date.now() };
      setSelectedNote(note); setEditContent(''); setEditTitle(newTitle.trim()); setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    await updateNote(selectedNote.id, { title: editTitle, content: editContent });
    setSelectedNote({ ...selectedNote, title: editTitle, content: editContent, updatedAt: Date.now() });
    setIsEditing(false);
    toast.success('Note saved! 💾');
  };

  const openNote = (note: Note) => { setSelectedNote(note); setEditContent(note.content); setEditTitle(note.title); setIsEditing(false); setPreview(false); };
  const backToList = () => { setSelectedNote(null); setIsEditing(false); setPreview(false); };

  // Insert diagram image into note content
  const handleInsertDiagram = (dataUrl: string) => {
    const imgTag = `<p><img src="${dataUrl}" alt="Diagram" style="max-width:100%;border-radius:12px;margin:8px 0;" /></p>`;
    const newContent = (editContent || '') + imgTag;
    setEditContent(newContent);
    if (selectedNote) {
      updateNote(selectedNote.id, { content: newContent });
      setSelectedNote({ ...selectedNote, content: newContent, updatedAt: Date.now() });
    }
  };

  // =================== PDF EXPORT ===================
  const exportPdf = async () => {
    if (!selectedNote || !selectedNote.content) { toast.error('Nothing to export'); return; }
    setShowPdfModal(false);

    const qualityScale = pdfQuality === 'low' ? 1 : pdfQuality === 'medium' ? 2 : 3;

    const toastId = toast.loading('Generating PDF...');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Create offscreen rendering element with proper rich text rendering
      const container = document.createElement('div');
      container.style.cssText = `width:794px;padding:40px;position:absolute;left:-9999px;font-family:system-ui;font-size:14px;line-height:1.8;color:#222;background:#fff;`;
      container.innerHTML = `<h1 style="font-size:24px;font-weight:800;margin-bottom:8px;">${selectedNote.title}</h1>
        <p style="font-size:10px;color:#888;margin-bottom:20px;">Exported from StudyQuest AI · ${new Date().toLocaleDateString()}</p>
        <div style="line-height:1.8;">${selectedNote.content}</div>`;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: qualityScale, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(container);

      const pdf = new jsPDF('p', 'mm', pdfPageSize);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Paginate
      const usableHeight = pageHeight - margin * 2;
      const totalPages = Math.ceil(imgHeight / usableHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const srcY = (page * usableHeight * canvas.width) / imgWidth;
        const srcH = Math.min((usableHeight * canvas.width) / imgWidth, canvas.height - srcY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        sliceCanvas.getContext('2d')!.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const sliceData = sliceCanvas.toDataURL('image/png');
        const sliceHeight = (srcH * imgWidth) / canvas.width;
        pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, sliceHeight);
        // Page number
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Page ${page + 1} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      }

      pdf.save(`${selectedNote.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      toast.success('PDF exported! 📄', { id: toastId });
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('PDF export failed', { id: toastId });
    }
  };

  // =================== AI SUMMARIZE ===================
  const aiSummarize = async () => {
    if (!selectedNote?.content) { toast.error('Nothing to summarize'); return; }
    if (!profile?.openRouterKey) { toast.error('Set your API key in Settings first'); return; }

    setAiLoading(true);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.openRouterKey}`, 'HTTP-Referer': window.location.origin },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{ role: 'system', content: 'You are a study assistant. Summarize the following notes concisely into key points with bullet points. Keep it focused and useful for revision.' }, { role: 'user', content: selectedNote.content }],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      const summary = data.choices?.[0]?.message?.content || 'Could not generate summary.';
      setSummaryText(summary);
      setShowSummary(true);
      toast.success('Summary generated! ✨');
    } catch { toast.error('Failed to summarize'); }
    finally { setAiLoading(false); }
  };

  // =================== AI FLASHCARDS ===================
  const aiFlashcards = async () => {
    if (!selectedNote?.content) { toast.error('Nothing to create flashcards from'); return; }
    if (!profile?.openRouterKey) { toast.error('Set your API key in Settings first'); return; }

    setAiLoading(true);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${profile.openRouterKey}`, 'HTTP-Referer': window.location.origin },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{ role: 'system', content: 'Create 5-8 flashcards from the following notes. Return ONLY valid JSON array with objects having "question" and "answer" fields. No markdown, no explanation, just JSON.' }, { role: 'user', content: selectedNote.content }],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '[]';
      // Extract JSON from response
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const cards: Flashcard[] = JSON.parse(jsonMatch[0]);
        setFlashcards(cards);
        setCardIndex(0);
        setCardFlipped(false);
        setShowFlashcards(true);
        toast.success(`${cards.length} flashcards created! 🃏`);
      } else { toast.error('Could not parse flashcards'); }
    } catch { toast.error('Failed to generate flashcards'); }
    finally { setAiLoading(false); }
  };

  // ----- Note Detail View -----
  if (selectedNote) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={backToList} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors"><HiChevronLeft size={20} /></button>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-2xl font-heading font-black bg-transparent border-none outline-none w-full" placeholder="Note title..." />
              ) : (
                <h1 className="text-2xl font-heading font-black truncate">{selectedNote.title}</h1>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="primary" size="sm">{selectedNote.folder}</Badge>
                <span className="text-[10px] text-[var(--muted-foreground)]"><HiClock className="inline mr-0.5" size={12} />{timeAgo(selectedNote.updatedAt)}</span>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
                </>
              ) : (
                <>
                  <Button variant="primary" size="sm" icon={<HiPencil size={14} />} onClick={() => setIsEditing(true)}>Edit</Button>
                  <button onClick={() => setConfirmDelete(selectedNote.id)} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-coral/30 hover:text-coral transition-colors"><HiTrash size={18} /></button>
                </>
              )}
            </div>
          </div>

          {/* Toolbar */}
          {!isEditing && selectedNote.content && selectedNote.content !== '<p><br></p>' && (
            <Card padding="sm" hover={false}>
              <div className="flex flex-wrap gap-2">
                <Button variant="teal" size="sm" icon={<HiDownload size={14} />} onClick={() => setShowPdfModal(true)}>Export PDF</Button>
                <Button variant="primary" size="sm" icon={<HiSparkles size={14} />} onClick={aiSummarize} loading={aiLoading}>AI Summarize</Button>
                <Button variant="amber" size="sm" icon={<HiLightningBolt size={14} />} onClick={aiFlashcards} loading={aiLoading}>AI Flashcards</Button>
                <Button variant="coral" size="sm" icon={<HiCode size={14} />} onClick={() => setShowDiagram(true)}>Diagram</Button>
                {groups.length > 0 && <Button variant="ghost" size="sm" icon={<HiShare size={14} />} onClick={() => setShowShareGroup(true)}>Share to Group</Button>}
              </div>
            </Card>
          )}
          {/* Editing toolbar: Diagram + Shortcuts */}
          {isEditing && (
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowShortcuts(!showShortcuts)} className={`p-2 rounded-xl border-2 transition-all text-xs ${showShortcuts ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--card-border)] hover:border-primary/30 text-[var(--muted-foreground)]'}`} title="Keyboard Shortcuts"><HiInformationCircle size={18} /></button>
              <Button variant="coral" size="sm" icon={<HiCode size={14} />} onClick={() => setShowDiagram(true)}>Insert Diagram</Button>
            </div>
          )}

          {/* Editor / Preview */}
          <Card padding="none" hover={false}>
            <div ref={noteRef}>
              {isEditing ? (
                <div className="quill-wrapper">
                  <ReactQuill
                    theme="snow"
                    value={editContent}
                    onChange={setEditContent}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="Start writing your note..."
                    style={{ minHeight: 400 }}
                  />
                </div>
              ) : (
                <div className="p-6 min-h-[300px]">
                  {selectedNote.content && selectedNote.content !== '<p><br></p>' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedNote.content }} />
                  ) : (
                    <div className="text-center py-12">
                      <span className="text-4xl mb-3 block">📝</span>
                      <p className="text-sm text-[var(--muted-foreground)]">This note is empty.</p>
                      <Button variant="primary" size="sm" className="mt-3" onClick={() => setIsEditing(true)}>Start Writing</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Keyboard Shortcuts Panel */}
          <AnimatePresence>
            {isEditing && showShortcuts && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                <Card padding="md" hover={false}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">⌨️</span>
                    <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Keyboard Shortcuts</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
                    {[
                      ['Ctrl + B', 'Bold'],
                      ['Ctrl + I', 'Italic'],
                      ['Ctrl + U', 'Underline'],
                      ['Ctrl + Shift + S', 'Strikethrough'],
                      ['Ctrl + Shift + 1', 'Heading 1'],
                      ['Ctrl + Shift + 2', 'Heading 2'],
                      ['Ctrl + Shift + 7', 'Ordered List'],
                      ['Ctrl + Shift + 8', 'Bullet List'],
                      ['Ctrl + K', 'Insert Link'],
                      ['Ctrl + Z', 'Undo'],
                      ['Ctrl + Y', 'Redo'],
                      ['Tab', 'Indent'],
                    ].map(([key, action]) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[var(--muted-foreground)]">{action}</span>
                        <kbd className="text-[9px] font-mono bg-[var(--card-border)]/50 px-1.5 py-0.5 rounded-md border border-[var(--card-border)] font-semibold whitespace-nowrap">{key}</kbd>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Delete confirm */}
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Note">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">This will permanently delete this note. This cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
            <Button variant="coral" onClick={async () => { if (confirmDelete) { await deleteNote(confirmDelete); setConfirmDelete(null); backToList(); toast.success('Note deleted'); } }} className="flex-1">Delete</Button>
          </div>
        </Modal>

        {/* PDF Export Modal */}
        <Modal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} title="Export as PDF">
          <div className="space-y-5">
            {/* Page Size */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Page Size</label>
              <div className="flex gap-2">
                {([
                  { id: 'a4' as const, label: 'A4', desc: '210 × 297 mm' },
                  { id: 'letter' as const, label: 'Letter', desc: '8.5 × 11 in' },
                  { id: 'legal' as const, label: 'Legal', desc: '8.5 × 14 in' },
                ]).map((opt) => (
                  <button key={opt.id} onClick={() => setPdfPageSize(opt.id)} className={`flex-1 py-3 rounded-xl border-2 text-center transition-all ${pdfPageSize === opt.id ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]' : 'border-[var(--card-border)] hover:border-primary/30'}`}>
                    <span className="text-xs font-bold block">{opt.label}</span>
                    <span className={`text-[9px] block mt-0.5 ${pdfPageSize === opt.id ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Quality */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Image Quality</label>
              <div className="flex gap-2">
                {([
                  { id: 'low' as const, label: 'Low', desc: 'Small file', emoji: '📄' },
                  { id: 'medium' as const, label: 'Medium', desc: 'Balanced', emoji: '📋' },
                  { id: 'high' as const, label: 'High', desc: 'Crystal clear', emoji: '✨' },
                ]).map((opt) => (
                  <button key={opt.id} onClick={() => setPdfQuality(opt.id)} className={`flex-1 py-3 rounded-xl border-2 text-center transition-all ${pdfQuality === opt.id ? 'bg-teal text-white border-teal shadow-[0_3px_0_rgba(16,185,129,0.3)]' : 'border-[var(--card-border)] hover:border-teal/30'}`}>
                    <span className="text-sm block">{opt.emoji}</span>
                    <span className="text-xs font-bold block">{opt.label}</span>
                    <span className={`text-[9px] block mt-0.5 ${pdfQuality === opt.id ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={() => setShowPdfModal(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={exportPdf} className="flex-1" icon={<HiDownload size={14} />}>Export PDF</Button>
            </div>
          </div>
        </Modal>

        {/* AI Summary Modal */}
        <Modal isOpen={showSummary} onClose={() => setShowSummary(false)} title="AI Summary">
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/15 max-h-[400px] overflow-y-auto">
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{summaryText}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(summaryText); toast.success('Summary copied!'); }}>Copy Summary</Button>
          </div>
        </Modal>

        {/* Flashcards Modal */}
        <Modal isOpen={showFlashcards} onClose={() => setShowFlashcards(false)} title={`Flashcards (${cardIndex + 1}/${flashcards.length})`}>
          {flashcards.length > 0 && (
            <div className="space-y-4">
              <motion.div
                className="min-h-[180px] p-6 rounded-2xl border-2 border-[var(--card-border)] flex items-center justify-center cursor-pointer"
                style={{ background: cardFlipped ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(76,201,240,0.1))' : 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.1))' }}
                onClick={() => setCardFlipped(!cardFlipped)}
                key={`${cardIndex}-${cardFlipped}`}
                initial={{ rotateY: 90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-2">{cardFlipped ? 'Answer' : 'Question'}</p>
                  <p className="text-sm font-semibold">{cardFlipped ? flashcards[cardIndex].answer : flashcards[cardIndex].question}</p>
                </div>
              </motion.div>
              <p className="text-[10px] text-center text-[var(--muted-foreground)]">Click card to flip</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setCardIndex(Math.max(0, cardIndex - 1)); setCardFlipped(false); }} disabled={cardIndex === 0} className="flex-1">← Previous</Button>
                <Button variant="primary" size="sm" onClick={() => { setCardIndex(Math.min(flashcards.length - 1, cardIndex + 1)); setCardFlipped(false); }} disabled={cardIndex >= flashcards.length - 1} className="flex-1">Next →</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Diagram Modal */}
        <DiagramModal isOpen={showDiagram} onClose={() => setShowDiagram(false)} onInsert={handleInsertDiagram} />

        {/* Share to Group Modal */}
        <Modal isOpen={showShareGroup} onClose={() => setShowShareGroup(false)} title="Share to Group">
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted-foreground)] mb-3">Choose a group to share this note as a resource.</p>
            {groups.map((g) => (
              <ShareToGroupButton key={g.id} groupId={g.id} groupName={g.name} note={selectedNote} onDone={() => setShowShareGroup(false)} />
            ))}
          </div>
        </Modal>
      </PageTransition>
    );
  }

  // ----- Notes List View -----
  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black">Notes & Scrolls</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Your knowledge base. Write, organize, remember.</p>
          </div>
          <Button variant="primary" size="sm" icon={<HiPlus />} onClick={() => setShowNewModal(true)}>New Note</Button>
        </div>

        <div className="relative">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
          <input type="text" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium focus:border-primary focus:outline-none transition-colors" />
        </div>

        {notes.length === 0 && !loading ? (
          <Card padding="lg" hover={false}>
            <div className="text-center py-8">
              <motion.span className="text-5xl block mb-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>📝</motion.span>
              <h3 className="text-lg font-heading font-bold mb-2">No notes yet!</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">Create your first note to start your knowledge base.</p>
              <Button variant="primary" icon={<HiPlus />} onClick={() => setShowNewModal(true)}>Create First Note</Button>
            </div>
          </Card>
        ) : (
          Array.from(folders.entries()).map(([folder, folderNotes]) => (
            <div key={folder}>
              <div className="flex items-center gap-2 mb-2">
                <HiFolder className="text-primary" size={16} />
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{folder}</h3>
                <Badge variant="muted" size="sm">{folderNotes.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {folderNotes.map((note, i) => (
                  <motion.div key={note.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card padding="md" className="cursor-pointer group" onClick={() => openNote(note)}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-heading font-bold group-hover:text-primary transition-colors truncate">{note.title}</h4>
                        <HiDocumentText className="text-[var(--muted-foreground)] flex-shrink-0" size={16} />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] line-clamp-3 mb-3">{note.content || 'Empty note...'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[var(--muted-foreground)] font-semibold"><HiClock className="inline mr-0.5" size={10} />{timeAgo(note.updatedAt)}</span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}

        <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Create New Note">
          <div className="space-y-4">
            <Input label="Title" placeholder="e.g. Physics Chapter 4 Notes" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Input label="Folder" placeholder="e.g. Physics, General" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} icon={<HiFolder size={16} />} />
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowNewModal(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleCreate} className="flex-1">Create</Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

// Helper component: shares a note to a specific group's resources
function ShareToGroupButton({ groupId, groupName, note, onDone }: { groupId: string; groupName: string; note: Note | null; onDone: () => void }) {
  const { user, profile } = useAuthContext();
  const { addResource } = useGroupResources(groupId);

  const handleShare = async () => {
    if (!note || !user || !profile) return;
    await addResource({
      groupId,
      title: note.title,
      type: 'note',
      url: '',
      content: note.content,
      addedBy: user.uid,
      addedByName: profile.displayName,
    });
    toast.success(`Shared "${note.title}" to ${groupName}! 📤`);
    onDone();
  };

  return (
    <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 hover:bg-primary/5 transition-all">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm">🏰</div>
      <span className="text-sm font-heading font-bold flex-1 text-left">{groupName}</span>
      <HiShare className="text-[var(--muted-foreground)]" size={16} />
    </button>
  );
}

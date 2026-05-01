'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiPlus, HiTrash, HiSearch, HiClipboardCopy, HiCheck, HiCode, HiEye, HiX, HiShare } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGroups, useGroupChat } from '@/hooks/useGroups';

interface Snippet { id: string; title: string; language: string; code: string; tags: string[]; createdAt: number; }

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
    if (!user || !title.trim() || !code.trim()) { toast.error('Title and code are required'); return; }
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'users', user.uid, 'snippets', id), { id, title: title.trim(), language, code, tags: [], createdAt: Date.now() });
    toast.success('Spell saved! 📜');
    setTitle(''); setCode(''); setShowModal(false);
  };

  const deleteSnippet = (id: string, name: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Delete &quot;{name}&quot;?</span>
        <button onClick={async () => { if (user) await deleteDoc(doc(db, 'users', user.uid, 'snippets', id)); toast.dismiss(t.id); toast.success('Spell removed'); }} className="px-3 py-1 bg-[#FF6B6B] text-white rounded-lg text-xs font-bold">Yes</button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">No</button>
      </div>
    ), { duration: 5000 });
  };

  const copyCode = (snippet: Snippet) => {
    navigator.clipboard.writeText(snippet.code);
    setCopiedId(snippet.id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = search.trim() ? snippets.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.language.includes(search.toLowerCase())) : snippets;

  const previewSnippet = snippets.find((s) => s.id === previewId);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black">Spell Book</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Your personal code snippet library.</p>
          </div>
          <Button variant="primary" size="sm" icon={<HiPlus />} onClick={() => setShowModal(true)}>New Spell</Button>
        </div>

        <div className="relative">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
          <input type="text" placeholder="Search spells..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-medium focus:border-primary focus:outline-none transition-colors" />
        </div>

        {filtered.length === 0 ? (
          <Card padding="lg" hover={false}>
            <div className="text-center py-8">
              <motion.span className="text-5xl block mb-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>📜</motion.span>
              <h3 className="text-lg font-heading font-bold mb-2">No spells yet!</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">Save code snippets you use often.</p>
              <Button variant="primary" icon={<HiPlus />} onClick={() => setShowModal(true)}>Create First Spell</Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card padding="md" hover={false}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HiCode className="text-primary" size={16} />
                      <h4 className="text-sm font-heading font-bold">{s.title}</h4>
                      <Badge variant="primary" size="sm">{s.language}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {s.language === 'html' && (
                        <button onClick={() => setPreviewId(s.id)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Preview HTML"><HiEye size={16} className="text-primary" /></button>
                      )}
                      <button onClick={() => copyCode(s)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Copy">
                        {copiedId === s.id ? <HiCheck className="text-teal" size={16} /> : <HiClipboardCopy size={16} />}
                      </button>
                      <button onClick={() => deleteSnippet(s.id, s.title)} className="p-1.5 rounded-lg hover:bg-coral/10 hover:text-coral transition-colors" title="Delete"><HiTrash size={16} /></button>
                      {groups.length > 0 && <button onClick={() => setShareSnippet(s)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Share to Group"><HiShare size={16} /></button>}
                    </div>
                  </div>
                  <pre className="p-3 rounded-lg bg-[var(--card-border)]/30 text-xs overflow-x-auto max-h-[200px]" style={{ fontFamily: 'var(--font-mono)' }}>{s.code}</pre>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* New Spell Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Spell">
          <div className="space-y-4">
            <Input label="Title" placeholder="e.g. Array flatten" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Language</label>
              <div className="flex flex-wrap gap-1.5">
                {['javascript', 'typescript', 'python', 'java', 'c++', 'css', 'html', 'sql', 'rust', 'go'].map((l) => (
                  <button key={l} onClick={() => setLanguage(l)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase border-2 transition-all ${language === l ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/30'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Code</label>
              <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full min-h-[150px] p-3 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm resize-none outline-none focus:border-primary transition-colors" style={{ fontFamily: 'var(--font-mono)' }} placeholder="Paste your code..." />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={addSnippet} className="flex-1">Save Spell</Button>
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
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted-foreground)] mb-3">Share &quot;{shareSnippet?.title}&quot; as a message in a group chat.</p>
            {groups.map((g) => (
              <ShareSnippetButton key={g.id} groupId={g.id} groupName={g.name} snippet={shareSnippet} userId={user?.uid || ''} userName={user?.displayName || 'User'} onDone={() => setShareSnippet(null)} />
            ))}
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

function ShareSnippetButton({ groupId, groupName, snippet, userId, userName, onDone }: { groupId: string; groupName: string; snippet: Snippet | null; userId: string; userName: string; onDone: () => void }) {
  const { sendMessage } = useGroupChat(groupId);

  const handleShare = async () => {
    if (!snippet) return;
    const msg = `📜 **${snippet.title}** (${snippet.language})\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\``;
    await sendMessage(msg, userId, userName, 'text');
    toast.success(`Snippet shared to ${groupName}! 📤`);
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

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiShieldCheck, HiUsers, HiExclamation, HiSpeakerphone,
  HiSearch, HiRefresh, HiCheck, HiClock, HiChartBar, HiCurrencyDollar,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import { ADMIN_EMAILS, PATCH_NOTES, getAvatarUrl } from '@/lib/constants';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, doc, updateDoc,
  query, orderBy, onSnapshot, deleteDoc,
} from 'firebase/firestore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';

// ── Types ──────────────────────────────────────────────────────
type Tab = 'overview' | 'users' | 'bugs' | 'patchnotes';

interface LeaderboardUser {
  uid: string;
  displayName: string;
  avatarSeed?: string;
  avatarStyle?: string;
  xp: number;
  level: number;
  streak: number;
}

interface BugReport {
  id: string;
  uid: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  adminNote?: string;
  createdAt: number;
  updatedAt: number;
}

interface Stats {
  totalUsers: number;
  totalXP: number;
  totalCoins: number;
  openBugs: number;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <HiChartBar /> },
  { id: 'users', label: 'Users', icon: <HiUsers /> },
  { id: 'bugs', label: 'Bug Reports', icon: <HiExclamation /> },
  { id: 'patchnotes', label: 'Patch Notes', icon: <HiSpeakerphone /> },
];

const STATUS_BADGE: Record<string, 'coral' | 'amber' | 'teal'> = {
  open: 'coral',
  'in-progress': 'amber',
  resolved: 'teal',
};

// ── Component ──────────────────────────────────────────────────
export default function AdminContent() {
  const { profile } = useAuthContext();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalXP: 0, totalCoins: 0, openBugs: 0 });
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Fetch Stats ──────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!profile?.email || !ADMIN_EMAILS.includes(profile.email)) return;
    setLoading(true);
    try {
      const [usersSnap, lbSnap, bugsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'leaderboard')),
        getDocs(collection(db, 'bugReports')),
      ]);

      let totalXP = 0;
      lbSnap.forEach((d) => { totalXP += (d.data().xp || 0); });

      const openBugs = bugsSnap.docs.filter((d) => d.data().status === 'open').length;

      setStats({
        totalUsers: usersSnap.size,
        totalXP,
        totalCoins: Math.round(totalXP * 0.4),
        openBugs,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [profile?.email]);

  // ── Fetch Users ──────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!profile?.email || !ADMIN_EMAILS.includes(profile.email)) return;
    try {
      const snap = await getDocs(collection(db, 'leaderboard'));
      const list: LeaderboardUser[] = snap.docs.map((d) => ({
        uid: d.id,
        displayName: d.data().displayName || 'Unknown',
        avatarSeed: d.data().avatarSeed,
        avatarStyle: d.data().avatarStyle,
        xp: d.data().xp || 0,
        level: d.data().level || 0,
        streak: d.data().streak || 0,
      }));
      list.sort((a, b) => b.xp - a.xp);
      setUsers(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch users');
    }
  }, [profile?.email]);

  // ── Real-time Bug Reports ───────────────────────────────────
  useEffect(() => {
    if (!profile?.email || !ADMIN_EMAILS.includes(profile.email)) return;
    const q = query(collection(db, 'bugReports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBugs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BugReport)));
    }, (err) => {
      console.error(err);
      toast.error('Bug report listener error');
    });
    return unsub;
  }, [profile?.email]);

  // ── Initial Fetch ──────────────────────────────────────────
  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [fetchStats, fetchUsers]);

  // ── Access Guard ─────────────────────────────────────────────
  if (!profile?.email || !ADMIN_EMAILS.includes(profile.email)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 rounded-full bg-red-500/15 flex items-center justify-center"
        >
          <HiShieldCheck className="w-12 h-12 text-red-400" />
        </motion.div>
        <h2 className="text-xl font-heading font-bold text-[var(--foreground)]">Access Denied</h2>
        <p className="text-[var(--muted-foreground)] text-sm">You don&apos;t have admin access.</p>
      </div>
    );
  }

  // ── Admin Actions ──────────────────────────────────────────
  const grantCoins = async (uid: string, amount: number) => {
    try {
      const ref = doc(db, 'users', uid, 'data', 'inventory');
      // We read-then-update to add coins
      const snap = await getDocs(collection(db, 'users', uid, 'data'));
      const invDoc = snap.docs.find((d) => d.id === 'inventory');
      const current = invDoc?.data()?.coins || 0;
      await updateDoc(ref, { coins: current + amount }).catch(async () => {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(ref, { coins: amount }, { merge: true });
      });
      toast.success(`+${amount} coins → user`);
    } catch { toast.error('Failed to grant coins'); }
  };

  const grantXP = async (uid: string, amount: number) => {
    try {
      const ref = doc(db, 'users', uid, 'data', 'gamification');
      const snap = await getDocs(collection(db, 'users', uid, 'data'));
      const gamDoc = snap.docs.find((d) => d.id === 'gamification');
      const current = gamDoc?.data()?.xp || 0;
      await updateDoc(ref, { xp: current + amount }).catch(async () => {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(ref, { xp: amount }, { merge: true });
      });
      toast.success(`+${amount} XP → user`);
    } catch { toast.error('Failed to grant XP'); }
  };

  const updateBugStatus = async (bugId: string, status: BugReport['status']) => {
    try {
      await updateDoc(doc(db, 'bugReports', bugId), { status, updatedAt: Date.now() });
      toast.success(`Status → ${status}`);
    } catch { toast.error('Failed to update bug'); }
  };

  const updateBugNote = async (bugId: string, note: string) => {
    try {
      await updateDoc(doc(db, 'bugReports', bugId), { adminNote: note, updatedAt: Date.now() });
      toast.success('Note saved');
    } catch { toast.error('Failed to save note'); }
  };

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.uid.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // ── Render ─────────────────────────────────────────────────
  return (
    <PageTransition>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
          <HiShieldCheck className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-[var(--foreground)]">
            Admin Dashboard
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">Command Center • StudyQuest AI</p>
        </div>
        <Button
          variant="ghost" size="sm"
          icon={<HiRefresh />}
          onClick={() => { fetchStats(); fetchUsers(); }}
          className="ml-auto"
        >
          Refresh
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${
              tab === t.id
                ? 'bg-red-500/15 text-red-400 shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]'
            }`}
          >
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'overview' && <OverviewTab stats={stats} loading={loading} />}
          {tab === 'users' && (
            <UsersTab
              users={filteredUsers} search={search} setSearch={setSearch}
              grantCoins={grantCoins} grantXP={grantXP}
            />
          )}
          {tab === 'bugs' && (
            <BugsTab bugs={bugs} updateStatus={updateBugStatus} updateNote={updateBugNote}
              formatDate={formatDate}
            />
          )}
          {tab === 'patchnotes' && <PatchNotesTab />}
        </motion.div>
      </AnimatePresence>
    </PageTransition>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── Tab: Overview ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
function OverviewTab({ stats, loading }: { stats: Stats; loading: boolean }) {
  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <HiUsers className="w-6 h-6" />, color: 'text-purple-400', bg: 'bg-purple-500/15' },
    { label: 'Total XP', value: stats.totalXP.toLocaleString(), icon: <HiChartBar className="w-6 h-6" />, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { label: 'Total Coins (est.)', value: stats.totalCoins.toLocaleString(), icon: <HiCurrencyDollar className="w-6 h-6" />, color: 'text-teal-400', bg: 'bg-teal-500/15' },
    { label: 'Open Bugs', value: stats.openBugs, icon: <HiExclamation className="w-6 h-6" />, color: 'text-red-400', bg: 'bg-red-500/15' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <Card key={i} hover className="relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center ${c.color}`}>
              {c.icon}
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">{c.label}</p>
              <p className="text-2xl font-heading font-bold text-[var(--foreground)]">
                {loading ? '…' : c.value}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── Tab: Users ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
function UsersTab({
  users, search, setSearch, grantCoins, grantXP,
}: {
  users: LeaderboardUser[];
  search: string;
  setSearch: (v: string) => void;
  grantCoins: (uid: string, amount: number) => void;
  grantXP: (uid: string, amount: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          type="text" placeholder="Search by name or UID…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">{users.length} users</p>

      {/* User List */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {users.map((u) => (
          <Card key={u.uid} hover padding="sm" className="flex items-center gap-3">
            {/* Avatar */}
            <img
              src={getAvatarUrl(u.avatarSeed || u.displayName, u.avatarStyle || 'adventurer')}
              alt={u.displayName}
              className="w-9 h-9 rounded-full bg-[var(--card-border)]"
            />
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)] truncate">{u.displayName}</p>
              <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
                <span>Lv.{u.level}</span>
                <span>⭐ {u.xp.toLocaleString()} XP</span>
                <span>🔥 {u.streak}</span>
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-1.5 shrink-0">
              <Button variant="amber" size="sm" onClick={() => grantCoins(u.uid, 100)}>
                +100 🪙
              </Button>
              <Button variant="primary" size="sm" onClick={() => grantXP(u.uid, 500)}>
                +500 ⭐
              </Button>
            </div>
          </Card>
        ))}
        {users.length === 0 && (
          <p className="text-center text-sm text-[var(--muted-foreground)] py-8">No users found.</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── Tab: Bug Reports ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
function BugsTab({
  bugs, updateStatus, updateNote, formatDate,
}: {
  bugs: BugReport[];
  updateStatus: (id: string, status: BugReport['status']) => void;
  updateNote: (id: string, note: string) => void;
  formatDate: (ts: number) => string;
}) {
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      {bugs.length === 0 && (
        <Card hover={false}>
          <p className="text-center text-sm text-[var(--muted-foreground)] py-8">No bug reports yet 🎉</p>
        </Card>
      )}
      {bugs.map((bug) => (
        <Card key={bug.id} hover padding="md">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-[var(--foreground)] truncate">{bug.title}</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                by {bug.userName} • {formatDate(bug.createdAt)}
              </p>
            </div>
            <Badge variant={STATUS_BADGE[bug.status]} dot size="md">{bug.status}</Badge>
          </div>

          <p className="text-xs text-[var(--muted-foreground)] mb-3 line-clamp-3">{bug.description}</p>

          {/* Admin Note */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Admin note…"
              value={noteInputs[bug.id] ?? bug.adminNote ?? ''}
              onChange={(e) => setNoteInputs((p) => ({ ...p, [bug.id]: e.target.value }))}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-red-500/40"
            />
            <Button
              variant="ghost" size="sm"
              onClick={() => updateNote(bug.id, noteInputs[bug.id] ?? bug.adminNote ?? '')}
            >
              Save
            </Button>
          </div>

          {/* Status Actions */}
          <div className="flex gap-2">
            <Button variant="amber" size="sm" icon={<HiClock />}
              onClick={() => updateStatus(bug.id, 'in-progress')}
              disabled={bug.status === 'in-progress'}
            >
              In Progress
            </Button>
            <Button variant="teal" size="sm" icon={<HiCheck />}
              onClick={() => updateStatus(bug.id, 'resolved')}
              disabled={bug.status === 'resolved'}
            >
              Resolved
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── Tab: Patch Notes ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
function PatchNotesTab() {
  const typeIcon: Record<string, string> = {
    feature: '🚀',
    improvement: '✨',
    fix: '🔧',
  };

  const typeBadge: Record<string, 'teal' | 'amber' | 'coral'> = {
    feature: 'teal',
    improvement: 'amber',
    fix: 'coral',
  };

  return (
    <div className="space-y-4">
      {PATCH_NOTES.map((pn) => (
        <Card key={pn.version} hover padding="md">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="primary" size="md">v{pn.version}</Badge>
            <h3 className="text-base font-heading font-bold text-[var(--foreground)]">{pn.title}</h3>
            <span className="text-xs text-[var(--muted-foreground)] ml-auto">{pn.date}</span>
          </div>
          <ul className="space-y-2">
            {pn.entries.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                <Badge variant={typeBadge[e.type]} size="sm">
                  {typeIcon[e.type]} {e.type}
                </Badge>
                <span className="flex-1">{e.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

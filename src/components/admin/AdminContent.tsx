'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiShieldCheck, HiUsers, HiExclamation, HiSpeakerphone,
  HiSearch, HiRefresh, HiCheck, HiClock, HiChartBar, HiCurrencyDollar,
  HiAdjustments, HiCheckCircle, HiXCircle, HiLightningBolt, HiSparkles,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import { ADMIN_EMAILS, PATCH_NOTES, getAvatarUrl } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { getProfileRef, getGamificationRef } from '@/lib/firestore';
import {
  FeatureFlags,
  getAllFeatureFlags,
  setFeatureFlagOverride,
  resetFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
} from '@/config/featureFlags';
import {
  collection, getDocs, getDoc, doc, updateDoc,
  query, orderBy, onSnapshot, deleteDoc,
} from 'firebase/firestore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';

// ── Types ──────────────────────────────────────────────────────
type Tab = 'overview' | 'users' | 'featureflags' | 'bugs' | 'patchnotes';

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
  { id: 'featureflags', label: 'Feature Flags', icon: <HiAdjustments /> },
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
      const [usersSnap, lbSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'leaderboard')),
      ]);

      const lbMap = new Map<string, any>();
      lbSnap.docs.forEach((d) => {
        lbMap.set(d.id, d.data());
      });

      const userPromises = usersSnap.docs.map(async (uDoc) => {
        const uid = uDoc.id;
        const lbData = lbMap.get(uid);

        if (lbData) {
          return {
            uid,
            displayName: lbData.displayName || 'Unknown',
            avatarSeed: lbData.avatarSeed || uid,
            avatarStyle: lbData.avatarStyle || 'adventurer',
            xp: lbData.xp || 0,
            level: lbData.level || 0,
            streak: lbData.streak || 0,
          };
        }

        // Fallback for users not yet in leaderboard collection
        try {
          const [profileDoc, gamDoc] = await Promise.all([
            getDoc(getProfileRef(uid)),
            getDoc(getGamificationRef(uid)),
          ]);

          const p = profileDoc.exists() ? profileDoc.data() : null;
          const g = gamDoc.exists() ? gamDoc.data() : null;

          return {
            uid,
            displayName: p?.displayName || 'Adventurer',
            avatarSeed: p?.avatarSeed || uid,
            avatarStyle: p?.avatarStyle || 'adventurer',
            xp: g?.xp || 0,
            level: g?.level || 0,
            streak: g?.streak || 0,
          };
        } catch {
          return {
            uid,
            displayName: 'Adventurer',
            avatarSeed: uid,
            avatarStyle: 'adventurer',
            xp: 0,
            level: 0,
            streak: 0,
          };
        }
      });

      const list = await Promise.all(userPromises);
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
          {tab === 'featureflags' && <FeatureFlagsTab />}
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
    <div className="space-y-6">
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

      {/* DSA Dataset Management & 1-Click Sync Card */}
      <DsaDatasetAdminCard />
    </div>
  );
}

function DsaDatasetAdminCard() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSyncLatestQuestions = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/dsa-sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('🎉 DSA Questions Synced! User progress is 100% safe.');
        setSyncStatus('Library synced & up-to-date');
      } else {
        toast.error(`Sync error: ${data.error || 'Failed to sync'}`);
      }
    } catch (err) {
      toast.error('Network error during DSA sync');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="p-6 border border-primary/20 bg-gradient-to-r from-primary/5 via-purple-500/5 to-cyan-500/5 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            <h3 className="text-base font-heading font-bold text-[var(--foreground)]">
              DSA LeetCode Library & 1-Click Sync
            </h3>
            <Badge variant="teal" size="sm">2,360+ Problems Active</Badge>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] max-w-xl">
            Pull and update the latest C++ & Python LeetCode solutions directly into StudyQuest. All existing user progress, solved questions, notes, and XP are 100% preserved and protected.
          </p>
          {syncStatus && (
            <p className="text-xs font-bold text-emerald-400 pt-1">
              ✅ {syncStatus}
            </p>
          )}
        </div>

        <Button
          variant="primary"
          size="md"
          loading={isSyncing}
          onClick={handleSyncLatestQuestions}
          icon={<HiRefresh className={isSyncing ? 'animate-spin' : ''} />}
        >
          {isSyncing ? 'Syncing Questions...' : '🔄 1-Click Update DSA Dataset'}
        </Button>
      </div>
    </Card>
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

// ═══════════════════════════════════════════════════════════════
// ── Tab: Feature Flags (Kill-Switch Control Center) ───────────
// ═══════════════════════════════════════════════════════════════

interface FlagMeta {
  key: keyof FeatureFlags;
  name: string;
  category: 'Core Learning' | 'Gamification & RPG' | 'Developer Tools' | 'Social';
  description: string;
  route: string;
  icon: string;
}

const FEATURE_METADATA: FlagMeta[] = [
  {
    key: 'studyTracker',
    name: 'Study & Syllabus Progress Tracker',
    category: 'Core Learning',
    description: 'Dynamic syllabus checklist, unit KPIs, revision tracker, and SPPU / GATE presets.',
    route: '/tracker',
    icon: '📘',
  },
  {
    key: 'dsaDungeon',
    name: 'DSA Dungeon & Problem Sheets',
    category: 'Core Learning',
    description: 'Striver SDE Sheet, curated algorithmic problems, test cases, and difficulty filtering.',
    route: '/dsa',
    icon: '⚔️',
  },
  {
    key: 'typingArcade',
    name: 'Typing Speed Arcade',
    category: 'Gamification & RPG',
    description: 'Retro game-infused typing drills, WPM tracking, and competitive leaderboards.',
    route: '/arcade',
    icon: '🕹️',
  },
  {
    key: 'alchemyLab',
    name: 'Knowledge & Formula Alchemy Lab',
    category: 'Core Learning',
    description: 'Interactive formula synthesis, concept combinations, and elemental study cards.',
    route: '/alchemy',
    icon: '⚗️',
  },
  {
    key: 'whiteboard',
    name: 'Collaborative Canvas & Whiteboard',
    category: 'Developer Tools',
    description: 'Infinite visual canvas for architecture diagrams, flowcharts, and sticky brainstorming.',
    route: '/whiteboard',
    icon: '🎨',
  },
  {
    key: 'codeRunner',
    name: 'Code Runner IDE & Playground',
    category: 'Developer Tools',
    description: 'Multi-language code execution environment for Python, JavaScript, C++, and Java.',
    route: '/coderunner',
    icon: '💻',
  },
  {
    key: 'sqlLab',
    name: 'Interactive SQL Database Sandbox',
    category: 'Developer Tools',
    description: 'In-browser SQLite query runner, schema visualizer, and relational practice sets.',
    route: '/sql',
    icon: '🗄️',
  },
  {
    key: 'petSystem',
    name: 'Virtual Mascot Companion & Pets',
    category: 'Gamification & RPG',
    description: 'Evolving study pets (Owl, Cat, Dino) that gain XP and buff user study streaks.',
    route: '/pets',
    icon: '🦉',
  },
  {
    key: 'itemShop',
    name: 'XP Shop & Avatar Customization',
    category: 'Gamification & RPG',
    description: 'Spend study coins on avatar cosmetics, custom themes, and profile badges.',
    route: '/shop',
    icon: '🛍️',
  },
  {
    key: 'skillTree',
    name: 'Academic Skill Tree Progression',
    category: 'Gamification & RPG',
    description: 'RPG-style skill unlock tree across Computer Science and Engineering branches.',
    route: '/skills',
    icon: '🌳',
  },
  {
    key: 'studyGroups',
    name: 'Multiplayer Study Squads & Rooms',
    category: 'Social',
    description: 'Real-time collaborative study lobbies with shared timers and squad challenges.',
    route: '/groups',
    icon: '👥',
  },
  {
    key: 'examsCountdown',
    name: 'Exam Countdown & Prep Timers',
    category: 'Core Learning',
    description: 'Milestone timers for University In-Sem, End-Sem, and competitive exams.',
    route: '/exams',
    icon: '⏳',
  },
];

function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlags>(() => getAllFeatureFlags());
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Listen for real-time changes across the application
  useEffect(() => {
    const handleUpdate = () => {
      setFlags(getAllFeatureFlags());
    };
    window.addEventListener('featureflags_updated', handleUpdate);
    return () => window.removeEventListener('featureflags_updated', handleUpdate);
  }, []);

  const handleToggle = (key: keyof FeatureFlags) => {
    const nextState = !flags[key];
    setFeatureFlagOverride(key, nextState);
    setFlags((prev) => ({ ...prev, [key]: nextState }));

    if (nextState) {
      toast.success(`🟢 Feature flag "${key}" ENABLED`, { duration: 3000 });
    } else {
      toast.error(`🔴 Feature flag "${key}" DISABLED (Kill-Switch Engaged)`, { duration: 4000 });
    }
  };

  const handleEnableAll = () => {
    FEATURE_METADATA.forEach((f) => {
      setFeatureFlagOverride(f.key, true);
    });
    setFlags(getAllFeatureFlags());
    toast.success('All platform features enabled!');
  };

  const handleDisableAll = () => {
    FEATURE_METADATA.forEach((f) => {
      setFeatureFlagOverride(f.key, false);
    });
    setFlags(getAllFeatureFlags());
    toast.error('⚠️ All feature flags disabled (Global Kill-Switch Active)!');
  };

  const handleResetDefaults = () => {
    resetFeatureFlags();
    setFlags(getAllFeatureFlags());
    toast.success('Feature flags reset to system defaults');
  };

  // Filter flags
  const filteredFlags = FEATURE_METADATA.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.route.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const activeCount = Object.values(flags).filter(Boolean).length;
  const totalCount = FEATURE_METADATA.length;
  const disabledCount = totalCount - activeCount;

  return (
    <div className="space-y-6">
      
      {/* 1. Header Control Banner */}
      <Card hover={false} className="border-2 border-primary/20 bg-gradient-to-br from-[var(--card-bg)] via-[#0B0F19] to-red-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="coral" size="sm" className="font-bold">
                <HiShieldCheck size={13} className="mr-1" /> Production Feature Flags
              </Badge>
              <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                Local + Runtime Overrides
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
              Instant Kill-Switch Command Center
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-2xl">
              Toggle any platform feature ON or OFF in 0-seconds. When a feature is disabled, its sidebar entry, direct route, and subcomponents are instantly guarded.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            <Button
              variant="teal"
              size="sm"
              icon={<HiCheckCircle size={15} />}
              onClick={handleEnableAll}
            >
              Enable All
            </Button>
            <Button
              variant="coral"
              size="sm"
              icon={<HiXCircle size={15} />}
              onClick={handleDisableAll}
            >
              Kill All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<HiRefresh size={14} />}
              onClick={handleResetDefaults}
            >
              Reset Defaults
            </Button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)] block">
              Total Modules
            </span>
            <span className="text-xl font-heading font-black text-white">{totalCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
              Active Flags
            </span>
            <span className="text-xl font-heading font-black text-emerald-400">{activeCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 block">
              Killed / Disabled
            </span>
            <span className="text-xl font-heading font-black text-red-400">{disabledCount}</span>
          </div>
        </div>
      </Card>

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feature flags by name, key, route or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-xs sm:text-sm text-white focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {['all', 'Core Learning', 'Gamification & RPG', 'Developer Tools', 'Social'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Feature Flag Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFlags.map((flag) => {
          const isEnabled = flags[flag.key];

          return (
            <Card
              key={flag.key}
              hover={false}
              className={`border-2 transition-all p-4 sm:p-5 flex flex-col justify-between ${
                isEnabled
                  ? 'border-slate-800/80 bg-[var(--card-bg)]/80 hover:border-primary/40'
                  : 'border-red-500/30 bg-red-950/10'
              }`}
            >
              <div>
                {/* Header: Icon, Name & Status Toggle */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                      {flag.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-sm sm:text-base text-white truncate">
                        {flag.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-primary">
                          {flag.key}
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)]">•</span>
                        <span className="font-mono text-[11px] text-sky-400">
                          {flag.route}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(flag.key)}
                    className={`relative w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none flex-shrink-0 ${
                      isEnabled ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-slate-700'
                    }`}
                    title={isEnabled ? 'Click to disable / kill feature' : 'Click to enable feature'}
                  >
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform ${
                        isEnabled ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-4">
                  {flag.description}
                </p>
              </div>

              {/* Footer: Category & Status Badge */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                <span className="text-[11px] text-slate-400 font-semibold">
                  {flag.category}
                </span>

                {isEnabled ? (
                  <Badge variant="teal" size="sm" className="font-bold">
                    <HiCheckCircle size={12} className="mr-1" /> ACTIVE
                  </Badge>
                ) : (
                  <Badge variant="coral" size="sm" className="font-bold">
                    <HiXCircle size={12} className="mr-1" /> KILLED (OFF)
                  </Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>

    </div>
  );
}


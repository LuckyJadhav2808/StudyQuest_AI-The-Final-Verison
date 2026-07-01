'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiLightningBolt, HiClipboardCheck,
  HiClock, HiTrendingUp, HiStar, HiCalendar,
  HiPlay, HiSparkles, HiFire, HiUserAdd, HiTrash,
  HiCheck, HiBell, HiClipboardCopy, HiPencilAlt,
  HiSearch, HiTemplate,
} from 'react-icons/hi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useTasks } from '@/hooks/useTasks';
import { useFriends } from '@/hooks/useFriends';
import { useDailyQuests } from '@/hooks/useDailyQuests';
import { getAvatarUrl, ACHIEVEMENTS, XP_AWARDS } from '@/lib/constants';
import { getLocalDateString } from '@/lib/dateUtils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import XPBar from '@/components/gamification/XPBar';
import LevelBadge from '@/components/gamification/LevelBadge';
import StreakCounter from '@/components/gamification/StreakCounter';
import PageTransition from '@/components/layout/PageTransition';
import StudyHeatmap from '@/components/dashboard/StudyHeatmap';
import TypewriterQuote from '@/components/dashboard/TypewriterQuote';
import DraggableDashboard from '@/components/dashboard/DraggableDashboard';
import LofiRoom from '@/components/dashboard/LofiRoom';
import TreasureChestModal from '@/components/dashboard/TreasureChestModal';
import MusicWidget from '@/components/dashboard/MusicWidget';
import { useNotes } from '@/hooks/useNotes';
import { useExams } from '@/hooks/useExams';
import { useShop } from '@/hooks/useShop';
import { playClick, playSuccess, playXP } from '@/lib/sounds';

// Time-of-day greeting system
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { greeting: 'Good Morning', emoji: '🌅', gradient: 'from-amber-500/15 via-orange-400/10 to-yellow-300/10', border: 'border-amber-400/20', accent: 'text-amber-500', tip: 'Rise and grind.' };
  if (hour >= 12 && hour < 17) return { greeting: 'Good Afternoon', emoji: '☀️', gradient: 'from-sky-400/15 via-teal/10 to-lime/10', border: 'border-sky-400/20', accent: 'text-sky-500', tip: 'Stay focused.' };
  if (hour >= 17 && hour < 21) return { greeting: 'Good Evening', emoji: '🌆', gradient: 'from-orange-500/15 via-pink-500/10 to-purple-500/10', border: 'border-orange-400/20', accent: 'text-orange-500', tip: 'Finish strong.' };
  return { greeting: 'Night Owl Mode', emoji: '🌙', gradient: 'from-violet-600/15 via-purple-500/10 to-indigo-600/10', border: 'border-violet-500/25', accent: 'text-violet-400', tip: '2x XP active!' };
}

export default function DashboardContent() {
  const { user, profile } = useAuthContext();
  const { gamification, awardXP, xpHistory } = useGamification();
  const { tasks } = useTasks();
  const { friends, incomingRequests, acceptRequest, rejectRequest } = useFriends();
  const { quests, addQuest, toggleQuest, deleteQuest, todayCompleted, todayTotal } = useDailyQuests();
  const { notes } = useNotes();
  const { upcomingExams } = useExams();
  const { coins, addCoins, canClaimTreasureChest } = useShop();
  const [showTreasureChest, setShowTreasureChest] = useState(false);
  const chestAvailable = canClaimTreasureChest();

  // Dashboard mode preference (from Firestore)
  const [dashboardMode, setDashboardMode] = useState<'classic' | 'lofi' | 'modern'>('modern');
  useEffect(() => {
    if (!user?.uid) return;
    const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
    const unsub = onSnapshot(prefsRef, (snap) => {
      if (snap.exists() && snap.data().dashboardMode) {
        setDashboardMode(snap.data().dashboardMode as 'classic' | 'lofi' | 'modern');
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const changeDashboardMode = async (mode: 'classic' | 'lofi' | 'modern') => {
    setDashboardMode(mode);
    if (user?.uid) {
      try {
        const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
        await setDoc(prefsRef, { dashboardMode: mode }, { merge: true });
        toast.success(`Dashboard mode updated to ${mode}!`);
      } catch (e) {
        console.error('Failed to save dashboard preference', e);
      }
    }
  };

  const timeOfDay = getTimeOfDay();

  const [newQuest, setNewQuest] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const classicNotifRef = useRef<HTMLDivElement>(null);
  const modernNotifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [modernLeftOrder, setModernLeftOrder] = useState<string[]>([
    'banner', 'quests', 'scrolls', 'heatmap', 'exams'
  ]);
  const [modernRightOrder, setModernRightOrder] = useState<string[]>([
    'profile', 'stats', 'friends', 'shortcuts', 'halloffame', 'calendar', 'activity', 'tasks', 'jukebox', 'scratchpad'
  ]);
  const [isModernEditMode, setIsModernEditMode] = useState(false);

  useEffect(() => {
    try {
      const left = localStorage.getItem('sq-modern-left-order');
      const right = localStorage.getItem('sq-modern-right-order');
      const defaultLeft = ['banner', 'quests', 'scrolls', 'heatmap', 'exams'];
      const defaultRight = ['profile', 'stats', 'friends', 'shortcuts', 'halloffame', 'calendar', 'activity', 'tasks', 'jukebox', 'scratchpad'];

      if (left) {
        const parsed = JSON.parse(left);
        const merged = [...parsed.filter((id: string) => defaultLeft.includes(id)), ...defaultLeft.filter(id => !parsed.includes(id))];
        setModernLeftOrder(merged);
      }
      if (right) {
        const parsed = JSON.parse(right);
        const merged = [...parsed.filter((id: string) => defaultRight.includes(id)), ...defaultRight.filter(id => !parsed.includes(id))];
        setModernRightOrder(merged);
      }
    } catch (e) { /* ignore */ }
  }, []);

  const saveModernOrders = (left: string[], right: string[]) => {
    setModernLeftOrder(left);
    setModernRightOrder(right);
    try {
      localStorage.setItem('sq-modern-left-order', JSON.stringify(left));
      localStorage.setItem('sq-modern-right-order', JSON.stringify(right));
    } catch (e) { /* ignore */ }
  };

  const handleModernDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination } = result;

    let newLeft = [...modernLeftOrder];
    let newRight = [...modernRightOrder];

    let movedItem = '';
    if (source.droppableId === 'modern-left') {
      [movedItem] = newLeft.splice(source.index, 1);
    } else {
      [movedItem] = newRight.splice(source.index, 1);
    }

    if (destination.droppableId === 'modern-left') {
      newLeft.splice(destination.index, 0, movedItem);
    } else {
      newRight.splice(destination.index, 0, movedItem);
    }

    saveModernOrders(newLeft, newRight);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const activeNotifRef = dashboardMode === 'modern' ? modernNotifRef : classicNotifRef;
      if (activeNotifRef.current && !activeNotifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchQuery('');
      }
    };
    if (showNotifs || searchQuery) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs, searchQuery, dashboardMode]);

  const filteredSearchTasks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tasks.filter(t => t.title.toLowerCase().includes(q));
  }, [searchQuery, tasks]);

  const filteredSearchNotes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return notes.filter(n => n.title?.toLowerCase().includes(q) || n.folder?.toLowerCase().includes(q));
  }, [searchQuery, notes]);

  const copyFriendCode = () => {
    if (profile?.friendCode) {
      navigator.clipboard.writeText(profile.friendCode);
      toast.success('Friend code copied! 📋');
    }
  };

  const todayTasks = tasks.filter((t) => t.status !== 'done');
  const completedToday = tasks.filter((t) => {
    if (t.status !== 'done') return false;
    const today = getLocalDateString();
    return getLocalDateString(new Date(t.updatedAt)) === today;
  });

  const streakMessage = gamification?.streak && gamification.streak >= 3
    ? `You've studied for ${gamification.streak} days straight. ${
        gamification.streak < 10
          ? `Only ${10 - gamification.streak} more days until "Eternal Scholar"!`
          : 'Amazing dedication! 🏆'
      }`
    : 'Start a study streak to earn bonus XP!';

  const isNightOwlTime = new Date().getHours() >= 21;

  const handleAddQuest = async () => {
    if (!newQuest.trim()) return;
    await addQuest(newQuest);
    toast.success('Quest added! 🎯');
    setNewQuest('');
  };

  const handleToggleQuest = (id: string, wasCompleted: boolean) => {
    toggleQuest(id).catch(() => {});
    if (!wasCompleted) {
      awardXP(XP_AWARDS.TASK_COMPLETE, 'Daily quest completed').catch(() => {});
      playSuccess();
      toast.success('+25 XP! Quest complete! ⚡');
    }
  };

  const handleDeleteQuest = (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Delete this quest?</span>
        <button onClick={() => { deleteQuest(id); toast.dismiss(t.id); toast.success('Quest removed'); }} className="px-3 py-1 bg-[#FF6B6B] text-white rounded-lg text-xs font-bold">Yes</button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">No</button>
      </div>
    ), { duration: 5000 });
  };

  const getWeeklyDates = () => {
    const dates = [];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weeklyXPData = useMemo(() => {
    const dates = getWeeklyDates();
    return dates.map(d => {
      const dateStr = getLocalDateString(d);
      return xpHistory && xpHistory[dateStr] ? xpHistory[dateStr] : 0;
    });
  }, [xpHistory]);

  const svgPath = useMemo(() => {
    const maxVal = Math.max(10, ...weeklyXPData);
    const height = 60; // chart area height
    const width = 280; // chart area width
    const points = weeklyXPData.map((val, idx) => {
      const x = (idx / 6) * width;
      const y = height - (val / maxVal) * (height - 15) - 10; // leave margins
      return { x, y };
    });
    
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    
    const areaD = `${d} L 280 80 L 0 80 Z`;
    return { path: d, area: areaD, points };
  }, [weeklyXPData]);

  /* ============================================================
     Widget Map — each section is a keyed React node
     ============================================================ */
  const widgetMap = useMemo(() => ({
    /* ── Welcome Banner ── */
    'welcome': (
      <div className={`relative overflow-hidden rounded-[20px] bg-gradient-to-r ${timeOfDay.gradient} p-4 md:p-8 border-2 ${timeOfDay.border}`}>
        <div className="relative z-10">
          {/* Top row: emoji + greeting + bell */}
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary items-center justify-center text-2xl shadow-lg animate-float">{timeOfDay.emoji}</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-heading font-black mb-1 leading-tight">{timeOfDay.greeting}, {profile?.displayName?.split(' ')[0] || 'Adventurer'}! <span className={timeOfDay.accent}>{timeOfDay.tip}</span></h1>
              <p className="text-xs md:text-sm text-[var(--muted-foreground)]">{streakMessage}</p>
            </div>
            {/* Mode Selector Segment */}
            <div className="flex items-center bg-white/20 rounded-full p-0.5 border border-white/10 text-xs backdrop-blur-sm self-center mr-2">
              <button
                onClick={() => changeDashboardMode('classic')}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  (dashboardMode as string) === 'classic' ? 'bg-primary text-white shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                Classic
              </button>
              <button
                onClick={() => changeDashboardMode('modern')}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  (dashboardMode as string) === 'modern' ? 'bg-primary text-white shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                Modern
              </button>
              <button
                onClick={() => changeDashboardMode('lofi')}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  (dashboardMode as string) === 'lofi' ? 'bg-primary text-white shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                Lofi
              </button>
            </div>

            {/* Notification Bell */}
            <div className="relative flex-shrink-0" ref={classicNotifRef}>
              <motion.button onClick={() => setShowNotifs(!showNotifs)} className={`p-2.5 rounded-xl border-2 transition-colors relative ${showNotifs ? 'border-primary bg-primary/10' : 'border-[var(--card-border)] hover:border-primary/30'}`} whileTap={{ scale: 0.9 }}>
                <HiBell size={20} />
                {incomingRequests.length > 0 && (<span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-coral text-white text-[9px] font-bold flex items-center justify-center">{incomingRequests.length}</span>)}
              </motion.button>
              <AnimatePresence>
                {showNotifs && (
                  <motion.div className="absolute right-0 top-12 w-[min(288px,calc(100vw-2rem))] bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-xl z-50 overflow-hidden" initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}>
                    <div className="px-4 py-3 border-b-2 border-[var(--card-border)]"><p className="text-xs font-heading font-bold">Notifications</p></div>
                    {incomingRequests.length === 0 ? (
                      <div className="p-4 text-center"><p className="text-xs text-[var(--muted-foreground)]">All clear! No new notifications 🎉</p></div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto">
                        {incomingRequests.map((req) => (
                          <div key={req.id} className="px-4 py-3 border-b border-[var(--card-border)]/50 last:border-0">
                            <div className="flex items-center gap-2 mb-2">
                              <img src={getAvatarUrl(req.fromAvatar, req.fromAvatarStyle)} alt="" className="w-7 h-7 rounded-full" />
                              <p className="text-xs font-semibold flex-1">{req.fromName} wants to be friends!</p>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => { acceptRequest(req); toast.success(`You and ${req.fromName} are now friends!`); }} className="flex-1 px-2 py-1 bg-teal/15 text-teal text-[10px] font-bold rounded-lg hover:bg-teal/25 transition-colors">Accept</button>
                              <button onClick={() => { rejectRequest(req.id); toast('Request declined'); }} className="flex-1 px-2 py-1 bg-coral/15 text-coral text-[10px] font-bold rounded-lg hover:bg-coral/25 transition-colors">Decline</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {/* Bottom row: Chest + Streak — always visible on mobile */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <motion.button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all cursor-pointer ${
                chestAvailable
                  ? 'bg-amber-500/15 border-amber-400/30 hover:bg-amber-500/25 animate-pulse-scale'
                  : 'bg-[var(--card-border)]/30 border-[var(--card-border)] opacity-60'
              }`}
              onClick={() => { playClick(); setShowTreasureChest(true); }}
              title={chestAvailable ? 'Open Daily Treasure Chest!' : 'Already claimed today'}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-base">{chestAvailable ? '🎁' : '📦'}</span>
              <p className={`text-xs font-bold uppercase tracking-wider ${chestAvailable ? 'text-amber-500' : 'text-[var(--muted-foreground)]'}`}>
                {chestAvailable ? 'Daily Chest!' : 'Claimed'}
              </p>
              {chestAvailable && <span className="text-sm animate-pulse">✨</span>}
            </motion.button>
            {gamification && gamification.streak > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/15 border-2 border-orange-500/20 animate-pulse-scale">
                <HiFire className="text-orange-500" size={18} />
                <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">{gamification.streak} Day Streak</p>
              </div>
            )}
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 right-20 w-32 h-32 bg-secondary/10 rounded-full blur-2xl" />
      </div>
    ),

    /* ── Daily Quests + Level Journey ── */
    'daily-quests': (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 relative overflow-hidden" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><HiSparkles className="text-primary" size={18} /></div>
            <h3 className="text-base font-heading font-bold">Daily Quests</h3>
            <Badge variant="primary" size="sm" dot>Today</Badge>
            {todayTotal > 0 && (<Badge variant={todayCompleted >= todayTotal ? 'teal' : 'amber'} size="sm">{todayCompleted}/{todayTotal}</Badge>)}
          </div>
          <div className="flex gap-2 mb-3">
            <input type="text" placeholder="Add a quest for today..." value={newQuest} onChange={(e) => setNewQuest(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddQuest()} className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-[var(--card-border)] bg-transparent text-sm font-medium focus:border-primary focus:outline-none transition-colors" />
            <Button variant="primary" size="sm" icon={<HiPlus />} onClick={handleAddQuest}>Add</Button>
          </div>
          {quests.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-4">No quests yet. Add one above to get started! ⚡</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {quests.map((quest) => (
                <motion.div key={quest.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[var(--card-border)]/50 hover:border-primary/20 transition-colors" layout>
                  <motion.button onClick={() => handleToggleQuest(quest.id, quest.completed)} className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${quest.completed ? 'bg-teal/15 border-teal/30' : 'border-[var(--card-border)]'}`} whileTap={{ scale: 0.8 }}>
                    {quest.completed && <HiCheck className="text-teal" size={14} />}
                  </motion.button>
                  <span className={`flex-1 text-sm font-semibold ${quest.completed ? 'line-through opacity-50' : ''}`}>{quest.title}</span>
                  <button onClick={() => handleDeleteQuest(quest.id)} className="p-1 rounded-lg hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"><HiTrash size={14} /></button>
                </motion.div>
              ))}
            </div>
          )}
          {todayTotal > 0 && (
            <div className="mt-3">
              <div className="xp-bar-track h-2.5"><motion.div className="xp-bar-fill" animate={{ width: `${(todayCompleted / todayTotal) * 100}%` }} transition={{ duration: 0.8 }} /></div>
              {todayCompleted >= todayTotal && (<p className="text-xs text-teal font-bold mt-1.5">🎉 All quests complete!</p>)}
            </div>
          )}
        </Card>
        <Card className="relative overflow-hidden" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <LevelBadge level={gamification?.level || 0} size="lg" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Level Journey</p>
              <p className="text-2xl font-heading font-black">Level {gamification?.level || 0}</p>
            </div>
          </div>
          {gamification && <XPBar xp={gamification.xp} size="md" />}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">{gamification?.achievements.length || 0} achievements</span>
            <span className="text-[10px] font-bold text-primary-light">{gamification?.xp?.toLocaleString() || 0} total XP</span>
          </div>
        </Card>
      </div>
    ),

    /* ── Stat Cards ── */
    'stat-cards': (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding="md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center"><HiStar className="text-primary" size={22} /></div><div><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Total XP</p><motion.p className="text-xl font-heading font-black" key={gamification?.xp} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>{gamification?.xp?.toLocaleString() || 0}</motion.p></div></div></Card>
        <Card padding="md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center"><StreakCounter streak={gamification?.streak || 0} size="md" /></div><div><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Streak</p><p className="text-xl font-heading font-black">{gamification?.streak || 0} Days</p></div></div><p className="text-[9px] text-[var(--muted-foreground)] mt-1 font-semibold">Best: {gamification?.longestStreak || 0} days</p></Card>
        <Card padding="md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-teal/15 flex items-center justify-center"><HiClipboardCheck className="text-teal" size={22} /></div><div><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Active Quests</p><p className="text-xl font-heading font-black">{todayTasks.length}</p></div></div><p className="text-[9px] text-teal font-bold mt-1">✅ {completedToday.length} completed today</p></Card>
        <Card padding="md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber/15 flex items-center justify-center text-xl">🏆</div><div><p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Trophies</p><p className="text-xl font-heading font-black">{gamification?.achievements.length || 0}</p></div></div><p className="text-[9px] text-[var(--muted-foreground)] mt-1 font-semibold">of {ACHIEVEMENTS.length} total</p></Card>
      </div>
    ),

    /* ── Study Heatmap ── */
    'heatmap': (
      <Card padding="md" hover={false}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-heading font-bold flex items-center gap-2"><HiCalendar className="text-primary" /> Study Activity</h3>
          <Badge variant="primary" size="sm">Heatmap</Badge>
        </div>
        <StudyHeatmap xpByDate={xpHistory} />
      </Card>
    ),

    /* ── Daily Motivation ── */
    'motivation': (
      <TypewriterQuote />
    ),

    /* ── Music Player Widget ── */
    'music-player': (
      <MusicWidget />
    ),

    /* ── Quick Actions + Recent Notes ── */
    'quick-actions': (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2">
            <Link href="/tasks"><Button variant="primary" size="sm" icon={<HiPlus />} className="w-full justify-start">New Quest</Button></Link>
            <Link href="/timer"><Button variant="coral" size="sm" icon={<HiPlay />} className="w-full justify-start">Focus Session</Button></Link>
            <Link href="/notes"><Button variant="teal" size="sm" icon={<HiPlus />} className="w-full justify-start">New Scroll</Button></Link>
            <Link href="/habits"><Button variant="amber" size="sm" icon={<HiLightningBolt />} className="w-full justify-start">Daily Quests</Button></Link>
          </div>
        </div>
        <Card className="lg:col-span-2" padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-heading font-bold flex items-center gap-2"><HiPencilAlt className="text-teal" /> Recent Notes</h3>
            <Link href="/notes" className="text-[10px] text-primary font-bold hover:underline uppercase tracking-wider">View All →</Link>
          </div>
          {notes.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-3xl mb-2 block animate-float">📝</span>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">No notes yet. Start writing!</p>
              <Link href="/notes"><Button variant="teal" size="sm" icon={<HiPlus />}>Create Note</Button></Link>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.slice(0, 4).map((note, i) => (
                <Link key={note.id} href="/notes">
                  <motion.div className="flex items-center gap-3 p-3 rounded-xl border-2 border-[var(--card-border)] hover:border-teal/30 transition-all cursor-pointer" whileHover={{ x: 4 }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0"><HiPencilAlt className="text-teal" size={16} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{note.title || 'Untitled'}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{note.folder || 'General'} · {new Date(note.updatedAt).toLocaleDateString()}</p>
                    </div>
                    {note.tags.length > 0 && <Badge variant="teal" size="sm">{note.tags[0]}</Badge>}
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    ),

    /* ── Exam Countdown ── */
    'exam-countdown': (
      <Card padding="md" hover={false}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-heading font-bold flex items-center gap-2"><HiCalendar className="text-coral" /> Exam Countdown</h3>
          <Link href="/exams" className="text-[10px] text-primary font-bold hover:underline uppercase tracking-wider">View All →</Link>
        </div>
        {(!upcomingExams || upcomingExams.length === 0) ? (
          <div className="text-center py-6">
            <span className="text-3xl mb-2 block animate-float">📅</span>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">No upcoming exams scheduled.</p>
            <Link href="/exams"><Button variant="coral" size="sm" icon={<HiPlus />}>Add Exam</Button></Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingExams.slice(0, 3).map((exam, i) => {
              const daysLeft = Math.max(0, Math.ceil((new Date(exam.date).getTime() - Date.now()) / 86400000));
              const urgency = daysLeft <= 3 ? 'coral' : daysLeft <= 7 ? 'amber' : 'teal';
              return (
                <motion.div key={exam.id || i} className="flex items-center gap-3 p-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/20 transition-all" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ background: `color-mix(in srgb, var(--color-${urgency}) 15%, transparent)` }}>
                    <span className="text-lg font-heading font-black" style={{ color: `var(--color-${urgency})` }}>{daysLeft}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{exam.subject || 'Exam'}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <Badge variant={urgency as 'coral' | 'amber' | 'teal'} size="sm">{daysLeft === 0 ? 'Today!' : `${daysLeft}d`}</Badge>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    ),

    /* ── Bottom Grid (Active Quests + Hall of Fame + Friends) ── */
    'bottom-grid': (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Quests — left 2/3 */}
        <Card className="lg:col-span-2 relative overflow-hidden" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-bold flex items-center gap-2"><HiClipboardCheck className="text-primary" /> Active Quests</h3>
            <Link href="/tasks" className="text-xs text-primary font-bold hover:underline uppercase tracking-wider">View All →</Link>
          </div>
          {todayTasks.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block animate-float">🎉</span>
              <p className="text-sm font-semibold mb-1">All caught up!</p>
              <p className="text-xs text-[var(--muted-foreground)]">You&apos;ve crushed all your tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((task, i) => (
                <motion.div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-all" whileHover={{ x: 4 }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${task.priority === 'urgent' ? 'bg-coral' : task.priority === 'high' ? 'bg-orange-500' : task.priority === 'medium' ? 'bg-amber' : 'bg-teal'}`} />
                  <span className="text-sm font-semibold truncate flex-1">{task.title}</span>
                  <Badge variant={task.status === 'in-progress' ? 'amber' : 'muted'} size="sm">{task.status === 'in-progress' ? 'In Progress' : 'To Do'}</Badge>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Right column — 1/3 */}
        <div className="space-y-4">
          {isNightOwlTime && (
            <Card className="relative overflow-hidden" padding="md" gradient="linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(236, 72, 153, 0.15))">
              <div className="flex items-center gap-2 mb-2"><span className="text-2xl">🌙</span><div><p className="text-xs font-bold uppercase tracking-wider text-secondary">Night Owl Event!</p><p className="text-[10px] text-[var(--muted-foreground)]">Active now</p></div></div>
              <p className="text-xs text-[var(--muted-foreground)]">Study between 9PM - 12AM for 2x XP multipliers.</p>
            </Card>
          )}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-heading font-bold flex items-center gap-2">🏆 Hall of Fame</h3>
              <Link href="/analytics" className="text-[10px] text-primary font-bold hover:underline uppercase tracking-wider">View All</Link>
            </div>
            {(!gamification || gamification.achievements.length === 0) ? (
              <div className="text-center py-4"><span className="text-3xl mb-2 block">🏅</span><p className="text-xs text-[var(--muted-foreground)]">Complete quests to unlock achievements!</p></div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {gamification.achievements.slice(0, 6).map((id) => {
                  const a = ACHIEVEMENTS.find((x) => x.id === id);
                  if (!a) return null;
                  return (
                    <motion.div key={id} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--card-border)]/30" whileHover={{ scale: 1.1, y: -2 }} title={`${a.title}: ${a.description}`}>
                      <span className="text-2xl">{a.icon}</span>
                      <span className="text-[8px] font-bold text-center truncate w-full">{a.title}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-heading font-bold flex items-center gap-2"><HiTrendingUp className="text-teal" /> Friends {incomingRequests.length > 0 && <Badge variant="coral" size="sm">{incomingRequests.length} new</Badge>}</h3>
              <Link href="/groups" className="text-[10px] text-primary font-bold hover:underline uppercase tracking-wider">Manage</Link>
            </div>
            {friends.length === 0 ? (
              <div className="text-center py-3"><p className="text-xs text-[var(--muted-foreground)] mb-2">No friends yet!</p><Link href="/groups"><Button variant="primary" size="sm" icon={<HiUserAdd />}>Add Friends</Button></Link></div>
            ) : (
              <div>
                <div className="flex items-center -space-x-2 mb-2">
                  {friends.slice(0, 5).map((friend, i) => (
                    <motion.img key={friend.uid} src={getAvatarUrl(friend.avatarSeed, friend.avatarStyle)} alt={friend.displayName} className="w-9 h-9 rounded-full ring-2 ring-[var(--card-bg)] bg-surface-200" initial={{ scale: 0, x: -10 }} animate={{ scale: 1, x: 0 }} transition={{ delay: i * 0.08 }} title={friend.displayName} />
                  ))}
                  {friends.length > 5 && <div className="w-9 h-9 rounded-full ring-2 ring-[var(--card-bg)] bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">+{friends.length - 5}</div>}
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] font-semibold">{friends.length} friend{friends.length !== 1 ? 's' : ''}</p>
              </div>
            )}
            <div className="mt-3 pt-3 border-t-2 border-[var(--card-border)]">
              <p className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1">Your Friend Code</p>
              <div className="flex items-center gap-2">
                <span className="text-base font-heading font-black tracking-[0.2em] text-primary">{profile?.friendCode || '------'}</span>
                <button onClick={copyFriendCode} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Copy code"><HiClipboardCopy size={14} className="text-primary" /></button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [gamification, tasks, friends, incomingRequests, quests, newQuest, showNotifs, xpHistory, profile, todayTasks, completedToday, todayCompleted, todayTotal, streakMessage, isNightOwlTime, notes, timeOfDay, upcomingExams, chestAvailable, dashboardMode]);

  const modernWidgetMap = useMemo(() => ({
    'banner': (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-xl md:text-3xl font-heading font-black mb-2 leading-tight">
            The right choice of study quest
          </h2>
          <p className="text-xs md:text-sm text-blue-100 mb-6 leading-relaxed">
            Choose from your active notes scrolls, track daily habits, or run code runner files to level up your study adventure today.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/timer">
              <button className="px-5 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl shadow hover:bg-slate-800 transition-colors cursor-pointer">
                Start Focus Session
              </button>
            </Link>
            <button
              onClick={() => { playClick(); setShowTreasureChest(true); }}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-2 ${
                chestAvailable
                  ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse-scale'
                  : 'bg-white/10 text-white/50 cursor-not-allowed border border-white/10'
              }`}
            >
              <span>{chestAvailable ? '🎁 Open Daily Chest!' : '📦 Chest Claimed'}</span>
              {chestAvailable && <span className="text-[9px] bg-white text-amber-600 px-1.5 py-0.5 rounded-full font-black animate-pulse">NEW</span>}
            </button>
          </div>
        </div>
        <div className="absolute right-6 bottom-4 md:right-10 md:bottom-6 text-6xl animate-float">
          🐱
        </div>
      </div>
    ),
    'quests': (
      <div className="modern-card p-6 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-3xl text-left">
        <div className="flex items-center gap-2 mb-4 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <HiSparkles className="text-primary" size={18} />
            </div>
            <h3 className="text-base font-heading font-bold text-slate-800 dark:text-white">Daily Quests</h3>
          </div>
          {todayTotal > 0 && (
            <Badge variant={todayCompleted >= todayTotal ? 'teal' : 'amber'} size="sm">
              {todayCompleted}/{todayTotal}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Add a quest for today..."
            value={newQuest}
            onChange={(e) => setNewQuest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddQuest()}
            className="flex-1 min-w-0 px-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-blue-500 focus:outline-none transition-colors text-slate-700 dark:text-slate-300 font-medium"
          />
          <Button variant="primary" size="sm" icon={<HiPlus />} onClick={handleAddQuest}>
            Add
          </Button>
        </div>
        {quests.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No quests yet. Add one above to get started! ⚡</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {quests.map((quest) => (
              <motion.div
                key={quest.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800/20 bg-slate-50/50 dark:bg-slate-800/10 hover:border-blue-500/20 transition-all"
                layout
              >
                <motion.button
                  onClick={() => handleToggleQuest(quest.id, quest.completed)}
                  className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center border transition-all ${
                    quest.completed ? 'bg-teal/15 border-teal/40' : 'border-slate-300 dark:border-slate-700'
                  }`}
                  whileTap={{ scale: 0.8 }}
                >
                  {quest.completed && <HiCheck className="text-teal" size={12} />}
                </motion.button>
                <span className={`flex-1 text-xs font-semibold text-slate-750 dark:text-slate-300 ${quest.completed ? 'line-through opacity-50' : ''}`}>
                  {quest.title}
                </span>
                <button
                  onClick={() => handleDeleteQuest(quest.id)}
                  className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <HiTrash size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
        {todayTotal > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
              <span>Daily Quest Completion Journey</span>
              <span>{Math.round((todayCompleted / todayTotal) * 100)}%</span>
            </div>
            <div className="modern-progress-bar h-2">
              <div
                className="modern-progress-fill bg-teal"
                style={{ width: `${(todayCompleted / todayTotal) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    ),
    'scrolls': (
      <div className="text-left">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white">Your Scrolls & Notes</h3>
          <Link href="/notes" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
            All Notes
          </Link>
        </div>
        {notes.length === 0 ? (
          <div className="modern-card p-8 text-center bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800">
            <span className="text-3xl block mb-2">📝</span>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No scrolls yet. Start writing!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notes.slice(0, 3).map((note, idx) => {
              const mockCompletion = [45, 75, 25][idx % 3];
              const mockDays = ['4/12', '11/24', '4/18'][idx % 3];
              const coverGradient = [
                'from-blue-400/80 to-indigo-500/80',
                'from-purple-400/80 to-pink-500/80',
                'from-teal-400/80 to-emerald-500/80'
              ][idx % 3];
              return (
                <Link href="/notes" key={note.id}>
                  <div className="modern-card overflow-hidden flex flex-col h-full cursor-pointer bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800">
                    <div className={`h-28 bg-gradient-to-br ${coverGradient} relative p-3 flex flex-col justify-end`}>
                      <span className="absolute top-3 left-3 px-2 py-0.5 text-[9px] font-bold text-slate-700 bg-white/90 rounded-full uppercase tracking-wider">
                        {note.folder || 'General'}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col flex-1 gap-3">
                      <h4 className="font-heading font-bold text-sm text-slate-800 dark:text-white line-clamp-1 leading-snug">
                        {note.title || 'Untitled Scroll'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">👤</div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {profile?.displayName || 'Adventurer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-slate-500 dark:text-slate-400 font-semibold border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        <span>📁 {note.tags.length || 0} tags</span>
                        <span>📅 {new Date(note.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          <span>Completed: {mockCompletion}%</span>
                          <span>Days: {mockDays}</span>
                        </div>
                        <div className="modern-progress-bar">
                          <div className="modern-progress-fill" style={{ width: `${mockCompletion}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    ),
    'heatmap': (
      <div className="modern-card p-4 md:p-6 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-3xl text-left">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2 text-slate-800 dark:text-white">
            <HiCalendar className="text-primary" /> Study Activity
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            Heatmap
          </span>
        </div>
        <StudyHeatmap xpByDate={xpHistory} />
      </div>
    ),
    'exams': (
      <div className="modern-card p-4 md:p-6 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-3xl text-left">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2 text-slate-800 dark:text-white">
            <HiCalendar className="text-coral" /> Exam Countdown
          </h3>
          <Link href="/exams" className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline uppercase tracking-wider">View All →</Link>
        </div>
        {(!upcomingExams || upcomingExams.length === 0) ? (
          <div className="text-center py-6">
            <span className="text-3xl mb-2 block">📅</span>
            <p className="text-xs text-slate-400 mb-3">No upcoming exams scheduled.</p>
            <Link href="/exams">
              <button className="px-4 py-2 text-xs font-bold bg-coral/15 text-coral rounded-xl hover:bg-coral/25 transition-colors">+ Add Exam</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingExams.slice(0, 3).map((exam, i) => {
              const daysLeft = Math.max(0, Math.ceil((new Date(exam.date).getTime() - Date.now()) / 86400000));
              const urgencyColor = daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-amber-500' : 'bg-teal';
              const urgencyBg = daysLeft <= 3 ? 'bg-red-50 dark:bg-red-900/15' : daysLeft <= 7 ? 'bg-amber-50 dark:bg-amber-900/15' : 'bg-teal/5 dark:bg-teal/10';
              return (
                <motion.div
                  key={exam.id || i}
                  className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 ${urgencyBg} hover:border-blue-500/20 transition-all`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className={`w-10 h-10 rounded-xl ${urgencyColor}/15 flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-lg font-heading font-black ${daysLeft <= 3 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-teal'}`}>
                      {daysLeft}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{exam.subject || 'Exam'}</p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${daysLeft <= 3 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : daysLeft <= 7 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-teal/15 text-teal'}`}>
                    {daysLeft === 0 ? 'Today!' : `${daysLeft}d left`}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    ),
    'profile': (
      <div className="modern-card overflow-hidden bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 text-center">
        <div className="h-16 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="px-4 pb-4 -mt-8 flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 overflow-hidden relative shadow-sm mx-auto">
            <img src={profile ? getAvatarUrl(profile.avatarSeed, profile.avatarStyle) : ''} alt="" className="w-full h-full object-cover" />
          </div>
          <h3 className="font-heading font-black text-sm text-slate-800 dark:text-white flex items-center gap-1 mt-1 justify-center">
            {profile?.displayName || 'Adventurer'}
            <span className="text-blue-500 text-xs" title="Verified Expert">✔</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Level {gamification?.level || 1} Mage
          </p>
          {gamification && gamification.streak > 0 && (
            <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/15 border border-orange-200 dark:border-orange-800/30">
              <HiFire className="text-orange-500" size={14} />
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{gamification.streak} Day Streak</span>
            </div>
          )}
          <div className="w-full mt-3 px-1 text-left">
            <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
              <span>XP: {gamification?.xp ? (gamification.xp % 100) : 0}/100</span>
              <span>Total: {gamification?.xp?.toLocaleString() || 0} XP</span>
            </div>
            {gamification && <XPBar xp={gamification.xp} size="sm" />}
          </div>
          <p className="text-[9px] text-slate-400 font-semibold mt-2 text-center leading-relaxed">
            {streakMessage}
          </p>
        </div>
      </div>
    ),
    'stats': (
      <div className="grid grid-cols-6 gap-1 bg-slate-100/50 dark:bg-[#111328]/30 rounded-2xl p-1.5 border border-slate-200/50 dark:border-[#1e293b] text-left">
        <div className="flex flex-col items-center p-1.5 rounded-xl bg-white dark:bg-[#111328] border border-slate-100 dark:border-slate-800 shadow-sm" title="Total XP">
          <span className="text-xs">🏆</span>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {gamification ? Math.floor(gamification.xp / 100) : 0}
          </span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded-xl bg-white dark:bg-[#111328] border border-slate-100 dark:border-slate-800 shadow-sm" title="Active Streak">
          <span className="text-xs">🔥</span>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {gamification?.streak || 0}
          </span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded-xl bg-white dark:bg-[#111328] border border-slate-100 dark:border-slate-800 shadow-sm" title="Coins">
          <span className="text-xs">🪙</span>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {coins}
          </span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded-xl bg-white dark:bg-[#111328] border border-slate-100 dark:border-slate-800 shadow-sm" title="Achievements">
          <span className="text-xs">⭐</span>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {gamification?.achievements?.length || 0}
          </span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded-xl bg-white dark:bg-[#111328] border border-slate-100 dark:border-slate-800 shadow-sm" title="Active Quests">
          <span className="text-xs">📋</span>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {todayTasks.length}
          </span>
        </div>
        <div className="flex flex-col items-center p-1.5 rounded-xl bg-white dark:bg-[#111328] border border-slate-100 dark:border-slate-800 shadow-sm" title="Done Today">
          <span className="text-xs">✅</span>
          <span className="text-[10px] font-bold text-teal mt-0.5">
            {completedToday.length}
          </span>
        </div>
      </div>
    ),
    'friends': (
      <div className="modern-card p-4 bg-white dark:bg-[#111328] border border-slate-200 dark:border-[#1e293b] rounded-3xl text-left">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-800 dark:text-white">👥 Adventurer Team</span>
          <Link href="/groups" className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline">
            Manage
          </Link>
        </div>
        <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-wider font-bold text-slate-400">Friend Code</p>
            <p className="text-xs font-heading font-black tracking-widest text-primary">{profile?.friendCode || '------'}</p>
          </div>
          <button onClick={copyFriendCode} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Copy code">
            <HiClipboardCopy size={14} className="text-primary" />
          </button>
        </div>
        {friends.length === 0 ? (
          <p className="text-[10px] text-slate-400 text-center py-2">No friends yet. Add some to join quests!</p>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center -space-x-2">
              {friends.slice(0, 4).map((f) => (
                <img key={f.uid} src={getAvatarUrl(f.avatarSeed, f.avatarStyle)} alt={f.displayName} className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-surface-200" title={f.displayName} />
              ))}
              {friends.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[9px] font-black text-blue-600">
                  +{friends.length - 4}
                </div>
              )}
            </div>
            <span className="text-[9px] font-bold text-slate-400 ml-1">
              {friends.length} friend{friends.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    ),
    'shortcuts': (
      <div className="modern-card p-4 bg-white dark:bg-[#111328] border border-slate-200 dark:border-[#1e293b] rounded-3xl text-left">
        <span className="text-xs font-bold text-slate-800 dark:text-white block mb-3">Quick Shortcuts</span>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/tasks" className="w-full">
            <Button variant="primary" size="sm" icon={<HiPlus />} className="w-full justify-start text-[11px] h-9">
              New Task
            </Button>
          </Link>
          <Link href="/timer" className="w-full">
            <Button variant="coral" size="sm" icon={<HiPlay />} className="w-full justify-start text-[11px] h-9">
              Start Focus
            </Button>
          </Link>
          <Link href="/notes" className="w-full">
            <Button variant="teal" size="sm" icon={<HiPlus />} className="w-full justify-start text-[11px] h-9">
              New Note
            </Button>
          </Link>
          <Link href="/habits" className="w-full">
            <Button variant="amber" size="sm" icon={<HiLightningBolt />} className="w-full justify-start text-[11px] h-9">
              Daily Quests
            </Button>
          </Link>
        </div>
      </div>
    ),
    'halloffame': (
      <div className="modern-card p-4 bg-white dark:bg-[#111328] border border-slate-200 dark:border-[#1e293b] rounded-3xl text-left">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-800 dark:text-white">🏆 Hall of Fame</span>
          <Link href="/analytics" className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline">
            View all
          </Link>
        </div>
        {(!gamification || gamification.achievements.length === 0) ? (
          <p className="text-[10px] text-slate-400 text-center py-4">Unlock achievements by studying!</p>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {gamification.achievements.slice(0, 5).map((id) => {
              const a = ACHIEVEMENTS.find((x) => x.id === id);
              if (!a) return null;
              return (
                <div key={id} className="flex flex-col items-center p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800" title={`${a.title}: ${a.description}`}>
                  <span className="text-lg">{a.icon}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    'calendar': (
      <div className="modern-card p-4 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-3xl text-left">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-800 dark:text-white">Calendar Week</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {getWeeklyDates().map((d) => {
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div
                key={d.getTime()}
                className={`flex flex-col items-center p-1.5 rounded-xl ${
                  isToday ? 'calendar-capsule-today' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-[9px] font-bold opacity-60">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}
                </span>
                <span className="text-[10px] font-black mt-1">
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    ),
    'activity': (
      <div className="modern-card p-4 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-3xl text-left">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-800 dark:text-white">Your Activity</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            Last week
          </span>
        </div>
        <div className="w-full h-[80px]">
          <svg className="w-full h-full" viewBox="0 0 280 80">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={svgPath.path}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
            />
            <path
              d={svgPath.area}
              fill="url(#chartGrad)"
            />
            {svgPath.points.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />
            ))}
            {svgPath.points[new Date().getDay()] && (
              <circle
                cx={svgPath.points[new Date().getDay()].x}
                cy={svgPath.points[new Date().getDay()].y}
                r="5"
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            )}
          </svg>
        </div>
      </div>
    ),
    'tasks': (
      <div className="modern-card p-4 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-3xl text-left">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-800 dark:text-white">Upcoming Tasks</span>
          <Link href="/tasks" className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline">
            See all
          </Link>
        </div>
        {todayTasks.length === 0 ? (
          <p className="text-[10px] text-slate-400 text-center py-4">No upcoming tasks scheduled.</p>
        ) : (
          <div className="space-y-2">
            {todayTasks.slice(0, 2).map((task) => (
              <Link href="/tasks" key={task.id}>
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 hover:border-blue-500/20 transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-sm">
                    📝
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                      {task.title}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      Priority: {task.priority}
                    </p>
                  </div>
                  <span className="text-slate-400 text-xs font-bold">➔</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    ),
    'jukebox': (
      <div className="modern-card p-4 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-3xl text-left">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-800 dark:text-white">Lofi Music Player</span>
        </div>
        <MusicWidget />
      </div>
    ),
    'scratchpad': (
      <QuickScratchpad />
    )
  }), [gamification, tasks, friends, incomingRequests, quests, newQuest, showNotifs, xpHistory, profile, todayTasks, completedToday, todayCompleted, todayTotal, streakMessage, isNightOwlTime, notes, timeOfDay, upcomingExams, chestAvailable, coins, searchQuery]);

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto">
        {dashboardMode === 'lofi' ? (
          <div className="space-y-6">
            {/* Lofi Header with Selector */}
            <div className="flex justify-between items-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 flex-wrap gap-3">
              <div>
                <h2 className="text-base font-heading font-black">Lofi Study Sanctuary</h2>
                <p className="text-xs text-[var(--muted-foreground)]">Enjoy chill beats and study timers.</p>
              </div>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  onClick={() => changeDashboardMode('classic')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                    (dashboardMode as string) === 'classic' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Classic
                </button>
                <button
                  onClick={() => changeDashboardMode('modern')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                    (dashboardMode as string) === 'modern' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Modern
                </button>
                <button
                  onClick={() => changeDashboardMode('lofi')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                    (dashboardMode as string) === 'lofi' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Lofi
                </button>
              </div>
            </div>

            {/* Lofi Study Room */}
            <div className="pb-8">
              <LofiRoom />
            </div>

            {/* Compact widgets below the room */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Daily Quests */}
              <Card className="lg:col-span-2" padding="lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><HiSparkles className="text-primary" size={18} /></div>
                  <h3 className="text-base font-heading font-bold">Daily Quests</h3>
                  <Badge variant="primary" size="sm" dot>Today</Badge>
                  {todayTotal > 0 && (<Badge variant={todayCompleted >= todayTotal ? 'teal' : 'amber'} size="sm">{todayCompleted}/{todayTotal}</Badge>)}
                </div>
                <div className="flex gap-2 mb-3">
                  <input type="text" placeholder="Add a quest for today..." value={newQuest} onChange={(e) => setNewQuest(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddQuest()} className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-[var(--card-border)] bg-transparent text-sm font-medium focus:border-primary focus:outline-none transition-colors" />
                  <Button variant="primary" size="sm" icon={<HiPlus />} onClick={handleAddQuest}>Add</Button>
                </div>
                {quests.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] text-center py-4">No quests yet. Add one above! ⚡</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {quests.map((quest) => (
                      <motion.div key={quest.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[var(--card-border)]/50 hover:border-primary/20 transition-colors" layout>
                        <motion.button onClick={() => handleToggleQuest(quest.id, quest.completed)} className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${quest.completed ? 'bg-teal/15 border-teal/30' : 'border-[var(--card-border)]'}`} whileTap={{ scale: 0.8 }}>
                          {quest.completed && <HiCheck className="text-teal" size={14} />}
                        </motion.button>
                        <span className={`flex-1 text-sm font-semibold ${quest.completed ? 'line-through opacity-50' : ''}`}>{quest.title}</span>
                        <button onClick={() => handleDeleteQuest(quest.id)} className="p-1 rounded-lg hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"><HiTrash size={14} /></button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Quick Actions */}
              <div>
                <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2">
                  <Link href="/tasks"><Button variant="primary" size="sm" icon={<HiPlus />} className="w-full justify-start">New Quest</Button></Link>
                  <Link href="/timer"><Button variant="coral" size="sm" icon={<HiPlay />} className="w-full justify-start">Focus Session</Button></Link>
                  <Link href="/notes"><Button variant="teal" size="sm" icon={<HiPlus />} className="w-full justify-start">New Scroll</Button></Link>
                  <Link href="/habits"><Button variant="amber" size="sm" icon={<HiLightningBolt />} className="w-full justify-start">Daily Quests</Button></Link>
                </div>
              </div>
            </div>

            {/* Study Heatmap & Motivation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card padding="md" hover={false}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-heading font-bold flex items-center gap-2"><HiCalendar className="text-primary" /> Study Activity</h3>
                  <Badge variant="primary" size="sm">Heatmap</Badge>
                </div>
                <StudyHeatmap xpByDate={xpHistory} />
              </Card>
              <TypewriterQuote />
            </div>
          </div>
        ) : dashboardMode === 'modern' ? (
          <div className="space-y-4 relative min-h-[85vh] select-none">
            {/* Top Toolbar: Greeting + Search + Customize Button */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-3xl shadow-sm">
              <div>
                <h1 className="text-xl md:text-2xl font-heading font-black text-slate-800 dark:text-white">
                  Hello, {profile?.displayName?.split(' ')[0] || 'Adventurer'}! 👋
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Let's learn something new today!
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Search Bar */}
                <div className="relative" ref={searchRef}>
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search anything here..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 py-2 text-xs rounded-full bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 w-[140px] md:w-[170px] shadow-sm transition-colors text-slate-700 dark:text-slate-300 font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-sm font-bold"
                    >
                      ×
                    </button>
                  )}
                  <AnimatePresence>
                    {searchQuery.trim().length > 0 && (
                      <motion.div 
                        className="absolute left-0 top-11 w-72 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      >
                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/10">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results</span>
                          <button onClick={() => setSearchQuery('')} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold">Clear</button>
                        </div>
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                          {filteredSearchTasks.length === 0 && filteredSearchNotes.length === 0 ? (
                            <div className="p-4 text-center">
                              <p className="text-xs text-slate-400">No matches found for "{searchQuery}"</p>
                            </div>
                          ) : (
                            <>
                              {filteredSearchTasks.length > 0 && (
                                <div className="p-2">
                                  <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase">Tasks</div>
                                  {filteredSearchTasks.slice(0, 4).map((task) => (
                                    <Link href="/tasks" key={task.id} onClick={() => setSearchQuery('')}>
                                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                                        <span className="text-xs flex-shrink-0">📋</span>
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-355 truncate flex-1">{task.title}</span>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              )}
                              {filteredSearchNotes.length > 0 && (
                                <div className="p-2">
                                  <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase">Notes</div>
                                  {filteredSearchNotes.slice(0, 4).map((note) => (
                                    <Link href="/notes" key={note.id} onClick={() => setSearchQuery('')}>
                                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                                        <span className="text-xs flex-shrink-0">📝</span>
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-355 truncate flex-1">{note.title || 'Untitled Scroll'}</span>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notification Bell */}
                <div className="relative flex-shrink-0" ref={modernNotifRef}>
                  <motion.button onClick={() => setShowNotifs(!showNotifs)} className={`p-2 rounded-xl border transition-colors relative ${showNotifs ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111328] hover:border-primary/30'}`} whileTap={{ scale: 0.9 }}>
                    <HiBell size={18} className="text-slate-600 dark:text-slate-300" />
                    {incomingRequests.length > 0 && (<span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-coral text-white text-[8px] font-bold flex items-center justify-center">{incomingRequests.length}</span>)}
                  </motion.button>
                  <AnimatePresence>
                    {showNotifs && (
                      <motion.div className="absolute left-0 top-11 w-72 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden" initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}>
                        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800"><p className="text-xs font-heading font-bold text-slate-800 dark:text-white">Notifications</p></div>
                        {incomingRequests.length === 0 ? (
                          <div className="p-4 text-center"><p className="text-xs text-slate-400">All clear! No new notifications 🎉</p></div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto">
                            {incomingRequests.map((req) => (
                              <div key={req.id} className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/50 last:border-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <img src={getAvatarUrl(req.fromAvatar, req.fromAvatarStyle)} alt="" className="w-7 h-7 rounded-full" />
                                  <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex-1">{req.fromName} wants to be friends!</p>
                                </div>
                                <div className="flex gap-1.5">
                                  <button onClick={() => { acceptRequest(req); toast.success(`You and ${req.fromName} are now friends!`); }} className="flex-1 px-2 py-1 bg-teal/15 text-teal text-[9px] font-bold rounded-lg hover:bg-teal/25 transition-colors">Accept</button>
                                  <button onClick={() => { rejectRequest(req.id); toast('Request declined'); }} className="flex-1 px-2 py-1 bg-coral/15 text-coral text-[9px] font-bold rounded-lg hover:bg-coral/25 transition-colors">Decline</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Mode Selector Segment */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 border border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => changeDashboardMode('classic')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                      (dashboardMode as string) === 'classic' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Classic
                  </button>
                  <button
                    onClick={() => changeDashboardMode('modern')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                      (dashboardMode as string) === 'modern' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Modern
                  </button>
                  <button
                    onClick={() => changeDashboardMode('lofi')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                      (dashboardMode as string) === 'lofi' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Lofi
                  </button>
                </div>

                {/* Customize Dashboard layout */}
                <button
                  onClick={() => setIsModernEditMode(!isModernEditMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    isModernEditMode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-primary/30'
                  }`}
                >
                  <HiTemplate size={14} />
                  {isModernEditMode ? 'Done' : 'Customize'}
                </button>
              </div>
            </div>

            {/* Draggable Bento Columns */}
            <DragDropContext onDragEnd={handleModernDragEnd}>
              <div className="modern-dashboard-bg -mx-4 md:-mx-6 px-4 md:px-6 py-2 flex flex-col lg:flex-row gap-6">
                
                {/* LEFT Column (Droppable) */}
                <Droppable droppableId="modern-left">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 flex flex-col gap-6 min-w-0"
                    >
                      {modernLeftOrder.map((widgetId, index) => {
                        const widget = modernWidgetMap[widgetId as keyof typeof modernWidgetMap];
                        if (!widget) return null;

                        return (
                          <Draggable
                            key={widgetId}
                            draggableId={widgetId}
                            index={index}
                            isDragDisabled={!isModernEditMode}
                          >
                            {(dragProvided, snapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`transition-all duration-200 rounded-3xl ${
                                  snapshot.isDragging
                                    ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary/30 bg-white dark:bg-[#111328] z-50'
                                    : ''
                                } ${isModernEditMode ? 'relative border-2 border-dashed border-primary/25 p-2 bg-primary/5' : ''}`}
                              >
                                {isModernEditMode && (
                                  <div
                                    {...dragProvided.dragHandleProps}
                                    className="absolute left-3 top-3 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 text-white text-[9px] font-black uppercase tracking-wider cursor-grab active:cursor-grabbing backdrop-blur-sm shadow-md"
                                  >
                                    <span>:: Drag {widgetId}</span>
                                  </div>
                                )}
                                <div className={isModernEditMode ? 'pointer-events-none opacity-80' : ''}>
                                  {widget}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* RIGHT Column (Droppable) */}
                <Droppable droppableId="modern-right">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-6"
                    >
                      {modernRightOrder.map((widgetId, index) => {
                        const widget = modernWidgetMap[widgetId as keyof typeof modernWidgetMap];
                        if (!widget) return null;

                        return (
                          <Draggable
                            key={widgetId}
                            draggableId={widgetId}
                            index={index}
                            isDragDisabled={!isModernEditMode}
                          >
                            {(dragProvided, snapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`transition-all duration-200 rounded-3xl ${
                                  snapshot.isDragging
                                    ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary/30 bg-white dark:bg-[#111328] z-50'
                                    : ''
                                } ${isModernEditMode ? 'relative border-2 border-dashed border-primary/25 p-2 bg-primary/5' : ''}`}
                              >
                                {isModernEditMode && (
                                  <div
                                    {...dragProvided.dragHandleProps}
                                    className="absolute left-3 top-3 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 text-white text-[9px] font-black uppercase tracking-wider cursor-grab active:cursor-grabbing backdrop-blur-sm shadow-md"
                                  >
                                    <span>:: Drag {widgetId}</span>
                                  </div>
                                )}
                                <div className={isModernEditMode ? 'pointer-events-none opacity-80' : ''}>
                                  {widget}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

              </div>
            </DragDropContext>

          </div>
        ) : (
          <DraggableDashboard widgetMap={widgetMap} />
        )}

        {/* Treasure Chest Modal (shared across both dashboard modes) */}
        <TreasureChestModal
          isOpen={showTreasureChest}
          onClose={() => setShowTreasureChest(false)}
        />
      </div>
    </PageTransition>
  );
}

// Quick Scratchpad Component
function QuickScratchpad() {
  const [text, setText] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sq-dashboard-scratchpad');
      if (stored) setText(stored);
    } catch (e) { /* ignore */ }
  }, []);

  const handleChange = (newVal: string) => {
    setText(newVal);
    try {
      localStorage.setItem('sq-dashboard-scratchpad', newVal);
    } catch (e) { /* ignore */ }
  };

  const handleCopy = () => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard! 📋');
  };

  const handleClear = () => {
    if (!text.trim()) return;
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Clear scratchpad?</span>
        <button 
          onClick={() => { setText(''); localStorage.removeItem('sq-dashboard-scratchpad'); toast.dismiss(t.id); toast.success('Cleared!'); }}
          className="px-3 py-1 bg-[#FF6B6B] text-white rounded-lg text-xs font-bold"
        >
          Yes
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold">No</button>
      </div>
    ), { duration: 4000 });
  };

  return (
    <div className="p-4 bg-white dark:bg-[#111328] border border-slate-200 dark:border-slate-800 rounded-3xl text-left animate-modernFadeIn">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <span>💡</span> Quick Scratchpad
        </span>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            disabled={!text.trim()}
            className="text-[9px] font-bold text-blue-650 dark:text-blue-400 hover:underline uppercase disabled:opacity-40 disabled:hover:no-underline"
          >
            Copy
          </button>
          <span className="text-slate-300 dark:text-slate-750 text-[9px] font-bold">|</span>
          <button 
            onClick={handleClear}
            disabled={!text.trim()}
            className="text-[9px] font-bold text-red-500 hover:underline uppercase disabled:opacity-40 disabled:hover:no-underline"
          >
            Clear
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Type temporary thoughts, links, formulas, or code snippets here..."
        className="w-full h-28 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 text-[11px] font-medium text-slate-750 dark:text-slate-350 focus:outline-none focus:border-blue-500/30 resize-none font-mono placeholder:font-sans placeholder:italic transition-colors"
      />
      <div className="flex justify-between items-center mt-1 text-[8px] font-bold text-slate-400">
        <span>Auto-saving...</span>
        <span>{text.length} chars | {text.split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  );
}

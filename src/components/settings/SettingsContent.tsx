'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  HiUser, HiMail, HiKey, HiColorSwatch,
  HiClipboardCopy, HiCheck, HiSave, HiShieldCheck, HiLockClosed, HiViewGrid, HiHome,
  HiDownload, HiUpload, HiDatabase, HiExclamationCircle, HiFlag, HiTrash,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import { useTheme, THEMES, Theme } from '@/context/ThemeContext';
import { useGamification } from '@/hooks/useGamification';
import { useShop } from '@/hooks/useShop';
import { getProfileRef, setDocument } from '@/lib/firestore';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAvatarUrl, DICEBEAR_STYLES } from '@/lib/constants';
import { exportBackup, importBackup } from '@/lib/backup';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import AvatarBorder, { getAvatarTier } from '@/components/gamification/AvatarBorder';

export default function SettingsContent() {
  const { user, profile, deleteAccount } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const { gamification } = useGamification();
  const { addCoins } = useShop();

  const [displayName, setDisplayName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('adventurer');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Backup & Restore state
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bug report state
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [submittingBug, setSubmittingBug] = useState(false);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const userLevel = gamification?.level || 0;
  const tier = getAvatarTier(userLevel);

  // Dashboard mode preference
  const [dashboardMode, setDashboardModeState] = useState<'classic' | 'lofi'>('classic');

  useEffect(() => {
    if (!user?.uid) return;
    const loadPrefs = async () => {
      const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
      const snap = await getDoc(prefsRef);
      if (snap.exists() && snap.data().dashboardMode) {
        setDashboardModeState(snap.data().dashboardMode as 'classic' | 'lofi');
      }
    };
    loadPrefs();
  }, [user?.uid]);

  const handleDashboardMode = async (mode: 'classic' | 'lofi') => {
    setDashboardModeState(mode);
    if (user?.uid) {
      const prefsRef = doc(db, 'users', user.uid, 'data', 'preferences');
      await setDoc(prefsRef, { dashboardMode: mode, updatedAt: Date.now() }, { merge: true });
      toast.success(mode === 'lofi' ? '🏠 Lofi Room activated!' : '📊 Classic dashboard activated!');
    }
  };

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setAvatarSeed(profile.avatarSeed);
      setAvatarStyle(profile.avatarStyle);
      setOpenRouterKey(profile.openRouterKey || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const updatedName = displayName.trim() || 'Student';
    await setDocument(getProfileRef(user.uid), {
      displayName: updatedName,
      avatarSeed,
      avatarStyle,
      openRouterKey: openRouterKey.trim(),
      updatedAt: Date.now(),
    });

    // Sync to Firebase Auth profile (display name and photoURL)
    try {
      const { updateProfile } = await import('firebase/auth');
      const avatarUrl = getAvatarUrl(avatarSeed, avatarStyle);
      await updateProfile(user, {
        displayName: updatedName,
        photoURL: avatarUrl,
      });
    } catch (authErr) {
      console.warn('Failed to sync changes to Firebase Auth profile:', authErr);
    }

    // Sync to public leaderboard document
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'leaderboard', user.uid), {
        displayName: updatedName,
        avatarSeed,
        avatarStyle,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.error('Failed to sync settings to leaderboard:', err);
    }

    setSaving(false);
    setSaved(true);
    toast.success('Settings saved! ✨');
    setTimeout(() => setSaved(false), 2000);
  };

  const copyFriendCode = () => {
    if (profile?.friendCode) {
      navigator.clipboard.writeText(profile.friendCode);
      setCopied(true);
      toast.success('Friend code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleThemeSelect = (themeId: Theme) => {
    const themeInfo = THEMES.find((t) => t.id === themeId);
    if (themeInfo && themeInfo.requiredLevel > userLevel) {
      toast.error(`🔒 Reach Level ${themeInfo.requiredLevel} to unlock ${themeInfo.label}!`);
      return;
    }
    setTheme(themeId);
    toast.success(`${themeInfo?.emoji} ${themeInfo?.label} theme activated!`);
  };

  // ── Backup Handler ──
  const handleBackup = async () => {
    if (!user?.uid) return;
    setBackingUp(true);
    try {
      await exportBackup(user.uid);
      toast.success('✅ Backup downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Backup failed. Please try again.');
    } finally {
      setBackingUp(false);
    }
  };

  // ── Restore Handler ──
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a valid .json backup file.');
      return;
    }
    setRestoring(true);
    setRestoreProgress('Starting restore...');
    try {
      await importBackup(user.uid, file, (msg) => setRestoreProgress(msg));
      toast.success('🎉 Data restored successfully! Refresh to see all changes.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setRestoring(false);
      setRestoreProgress('');
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };



  const avatarUrl = getAvatarUrl(avatarSeed, avatarStyle);

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold">Settings</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Customize your StudyQuest experience.</p>
        </div>

        {/* Profile Section */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-4 flex items-center gap-2">
            <HiUser className="text-primary" /> Profile
          </h2>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar preview with level border */}
            <div className="flex flex-col items-center gap-3">
              <AvatarBorder level={userLevel} size={96}>
                <motion.img
                  key={`${avatarSeed}-${avatarStyle}`}
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </AvatarBorder>
              <div className="flex flex-col items-center gap-1">
                <Badge variant="primary" size="sm">{avatarStyle}</Badge>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: tier.shadowColor }}>
                  {tier.name} Border
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <Input
                label="Display Name"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                icon={<HiUser size={16} />}
              />

              <Input
                label="Avatar Seed"
                placeholder="Type anything to change avatar"
                value={avatarSeed}
                onChange={(e) => setAvatarSeed(e.target.value)}
                icon={<HiColorSwatch size={16} />}
              />

              {/* Avatar style picker */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
                  Avatar Style
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DICEBEAR_STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => setAvatarStyle(style)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border-2 ${
                        avatarStyle === style
                          ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]'
                          : 'border-[var(--card-border)] hover:border-primary/30'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Avatar Border Tiers Preview */}
          <div className="mt-5 pt-4 border-t-2 border-[var(--card-border)]">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-3">
              Avatar Border Tiers
            </p>
            <div className="flex flex-wrap gap-4 items-end">
              {[
                { name: 'Bronze', level: 1, emoji: '🥉' },
                { name: 'Silver', level: 5, emoji: '🥈' },
                { name: 'Gold', level: 10, emoji: '🥇' },
                { name: 'Diamond', level: 15, emoji: '💎' },
                { name: 'Legendary', level: 20, emoji: '👑' },
              ].map((t) => {
                const isUnlocked = userLevel >= t.level;
                return (
                  <div key={t.name} className="flex flex-col items-center gap-1">
                    <div className={!isUnlocked ? 'opacity-40 grayscale' : ''}>
                      <AvatarBorder level={t.level} size={36}>
                        <div className="w-full h-full flex items-center justify-center bg-[var(--card-bg)] text-lg">
                          {t.emoji}
                        </div>
                      </AvatarBorder>
                    </div>
                    <span className="text-[8px] font-bold text-[var(--muted-foreground)]">{t.name}</span>
                    <span className="text-[7px] text-[var(--muted)]">Lv.{t.level}+</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Friend Code */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-4 flex items-center gap-2">
            <HiShieldCheck className="text-teal" /> Friend Code
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-3xl font-heading font-bold tracking-[0.3em] text-primary">
                {profile?.friendCode || '------'}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                Share this code so friends can add you on StudyQuest.
              </p>
            </div>
            <motion.button
              onClick={copyFriendCode}
              className="p-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              {copied ? <HiCheck className="text-teal" size={20} /> : <HiClipboardCopy size={20} />}
            </motion.button>
          </div>
        </Card>

        {/* Appearance — Theme Picker */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-4 flex items-center gap-2">
            <HiColorSwatch className="text-secondary" /> Appearance
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Choose your theme. Some themes unlock at higher levels! 🎮
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const isUnlocked = t.requiredLevel <= userLevel;
              const isActive = theme === t.id;

              return (
                <motion.button
                  key={t.id}
                  onClick={() => handleThemeSelect(t.id)}
                  className={`relative p-3 rounded-2xl border-2 text-left transition-all ${
                    isActive
                      ? 'border-primary shadow-[0_0_16px_var(--color-primary-glow)]'
                      : isUnlocked
                        ? 'border-[var(--card-border)] hover:border-primary/30'
                        : 'border-[var(--card-border)] opacity-60'
                  }`}
                  whileHover={isUnlocked ? { scale: 1.02, y: -2 } : undefined}
                  whileTap={isUnlocked ? { scale: 0.98 } : undefined}
                >
                  {/* Color preview bar */}
                  <div className="flex gap-1 mb-2">
                    {t.previewColors.map((color, i) => (
                      <div
                        key={i}
                        className="h-6 flex-1 rounded-lg"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-heading font-bold flex items-center gap-1">
                        {t.emoji} {t.label}
                      </p>
                      <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5">{t.description}</p>
                    </div>
                  </div>

                  {/* Lock overlay */}
                  {!isUnlocked && (
                    <div className="absolute inset-0 rounded-2xl bg-[var(--background)]/60 flex items-center justify-center backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-1">
                        <HiLockClosed size={18} className="text-[var(--muted-foreground)]" />
                        <span className="text-[9px] font-bold text-[var(--muted-foreground)]">
                          Level {t.requiredLevel}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Active checkmark */}
                  {isActive && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <HiCheck size={12} className="text-white" />
                    </div>
                  )}

                  {/* Free badge */}
                  {t.requiredLevel === 0 && (
                    <div className="absolute top-2 right-2">
                      {!isActive && <Badge variant="teal" size="sm">Free</Badge>}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </Card>

        {/* Dashboard Style */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-2 flex items-center gap-2">
            <HiHome className="text-primary" /> Dashboard Style
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Choose how your dashboard looks when you open StudyQuest.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* Classic */}
            <motion.button
              onClick={() => handleDashboardMode('classic')}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                dashboardMode === 'classic'
                  ? 'border-primary shadow-[0_0_16px_var(--color-primary-glow)]'
                  : 'border-[var(--card-border)] hover:border-primary/30'
              }`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Mini preview — grid of colored blocks */}
              <div className="mb-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--card-border)]">
                <div className="space-y-1.5">
                  <div className="h-3 rounded bg-primary/20 w-full" />
                  <div className="grid grid-cols-3 gap-1">
                    <div className="h-6 rounded bg-primary/15" />
                    <div className="h-6 rounded bg-teal/15" />
                    <div className="h-6 rounded bg-amber/15" />
                  </div>
                  <div className="h-4 rounded bg-[var(--card-border)]/40 w-full" />
                  <div className="grid grid-cols-2 gap-1">
                    <div className="h-5 rounded bg-primary/10" />
                    <div className="h-5 rounded bg-coral/10" />
                  </div>
                </div>
              </div>
              <p className="text-sm font-heading font-bold flex items-center gap-1.5">
                <HiViewGrid size={14} className="text-primary" /> Classic
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                Widget grid with drag & drop
              </p>
              {dashboardMode === 'classic' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <HiCheck size={12} className="text-white" />
                </div>
              )}
            </motion.button>

            {/* Lofi Room */}
            <motion.button
              onClick={() => handleDashboardMode('lofi')}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                dashboardMode === 'lofi'
                  ? 'border-primary shadow-[0_0_16px_var(--color-primary-glow)]'
                  : 'border-[var(--card-border)] hover:border-primary/30'
              }`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Mini preview — illustrated room */}
              <div className="mb-3 p-3 rounded-xl border border-[var(--card-border)] overflow-hidden" style={{ background: 'linear-gradient(180deg, #2a1f3d 60%, #1a1428 100%)' }}>
                <div className="relative h-14">
                  {/* Mini window */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-5 rounded-sm border border-[#4a3a6a]" style={{ background: 'linear-gradient(180deg, #4FC3F7, #81D4FA)' }} />
                  {/* Mini desk */}
                  <div className="absolute bottom-1 left-1 w-12 h-1.5 rounded-sm bg-[#6d4c41]" />
                  {/* Mini pet */}
                  <div className="absolute bottom-2.5 left-2 text-[8px]">🦉</div>
                  {/* Mini stat bubble */}
                  <div className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-black/40 text-[5px] text-white font-bold">⭐ Lv.5</div>
                </div>
              </div>
              <p className="text-sm font-heading font-bold flex items-center gap-1.5">
                <span>🏠</span> Lofi Room
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                Animated study room with your pet
              </p>
              {dashboardMode === 'lofi' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <HiCheck size={12} className="text-white" />
                </div>
              )}
            </motion.button>
          </div>
        </Card>

        {/* AI Integration */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-4 flex items-center gap-2">
            🦉 Questie AI (OpenRouter)
          </h2>
          <Input
            label="OpenRouter API Key"
            type="password"
            placeholder="sk-or-..."
            value={openRouterKey}
            onChange={(e) => setOpenRouterKey(e.target.value)}
            icon={<HiKey size={16} />}
          />
          <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
            Get your key from{' '}
            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">
              openrouter.ai
            </a>
            . Used for Questie Chat and AI-powered features.
          </p>
        </Card>

        {/* Account Info */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-4 flex items-center gap-2">
            <HiMail className="text-sky" /> Account
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-[var(--card-border)]">
              <span className="text-[var(--muted-foreground)] font-semibold">Email</span>
              <span className="font-bold">{user?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--card-border)]">
              <span className="text-[var(--muted-foreground)] font-semibold">UID</span>
              <span className="font-mono text-xs text-[var(--muted-foreground)]">{user?.uid?.slice(0, 16)}...</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[var(--muted-foreground)] font-semibold">Member Since</span>
              <span className="font-bold">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </Card>

        {/* ── Data Management Card ── */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-1 flex items-center gap-2">
            <HiDatabase className="text-primary" /> Data Management
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-5">
            Keep your progress safe. Export a full backup of all your data, or restore from a previous backup file.
          </p>

          {/* Backup & Restore buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {/* BACKUP */}
            <motion.button
              onClick={handleBackup}
              disabled={backingUp}
              className="relative flex items-center gap-3 p-4 rounded-2xl border-2 border-[var(--card-border)] hover:border-primary/40 transition-all text-left group disabled:opacity-60"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                {backingUp
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  : <HiDownload className="text-primary" size={20} />}
              </div>
              <div>
                <p className="text-sm font-heading font-bold">Export Backup</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Download all your data as a .json file</p>
              </div>
            </motion.button>

            {/* RESTORE */}
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="relative flex items-center gap-3 p-4 rounded-2xl border-2 border-[var(--card-border)] hover:border-teal/40 transition-all text-left group disabled:opacity-60"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal/20 transition-colors">
                {restoring
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-teal border-t-transparent rounded-full" />
                  : <HiUpload className="text-teal" size={20} />}
              </div>
              <div>
                <p className="text-sm font-heading font-bold">Restore Backup</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {restoring ? restoreProgress || 'Restoring...' : 'Upload a .json backup file to restore'}
                </p>
              </div>
            </motion.button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleRestoreFile}
            className="hidden"
          />

          {/* Restore warning */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-5">
            <HiExclamationCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-amber-300/80 leading-relaxed">
              <strong className="text-amber-400">Restore is non-destructive</strong> — it merges backup data with your current account.
              Your API key and email are never exported for security.
            </p>
          </div>

        </Card>

        {/* ── Bug Report Card ── */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-1 flex items-center gap-2">
            <HiFlag className="text-coral" /> Report a Bug
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Found something broken? Let the dev team know so we can fix it!
          </p>

          {showBugReport ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="Bug title (e.g. Skill Tree not loading)"
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm font-semibold text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-primary/40"
              />
              <textarea
                placeholder="Describe the bug in detail... What were you doing? What happened vs what you expected?"
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-primary/40 resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowBugReport(false); setBugTitle(''); setBugDescription(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<HiFlag />}
                  loading={submittingBug}
                  onClick={async () => {
                    if (!bugTitle.trim() || !bugDescription.trim()) {
                      toast.error('Please fill in both title and description');
                      return;
                    }
                    setSubmittingBug(true);
                    try {
                      await addDoc(collection(db, 'bugReports'), {
                        uid: user?.uid || '',
                        userName: profile?.displayName || 'Anonymous',
                        userEmail: profile?.email || '',
                        title: bugTitle.trim(),
                        description: bugDescription.trim(),
                        status: 'open',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                      });
                      toast.success('Bug report submitted! Thanks for helping improve StudyQuest 💜');
                      setShowBugReport(false);
                      setBugTitle('');
                      setBugDescription('');
                    } catch {
                      toast.error('Failed to submit bug report');
                    } finally {
                      setSubmittingBug(false);
                    }
                  }}
                >
                  Submit Report
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              onClick={() => setShowBugReport(true)}
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-[var(--card-border)] hover:border-coral/40 transition-all text-left group w-full"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center flex-shrink-0 group-hover:bg-coral/20 transition-colors">
                <HiFlag className="text-coral" size={20} />
              </div>
              <div>
                <p className="text-sm font-heading font-bold">Report a Bug</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Help us fix issues and improve your experience</p>
              </div>
            </motion.button>
          )}
        </Card>

        {/* ── Danger Zone ── */}
        <Card padding="lg" hover={false} className="border-coral/30">
          <h2 className="text-sm font-heading font-bold mb-1 flex items-center gap-2 text-coral">
            <HiExclamationCircle className="text-coral" /> Danger Zone
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {deleteConfirm !== 'CONFIRM' ? (
            <div className="space-y-3">
              <p className="text-[10px] text-[var(--muted-foreground)]">
                Type <strong className="text-coral">CONFIRM</strong> below to enable the delete button.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
                  placeholder="Type CONFIRM"
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-[var(--card-border)] bg-transparent text-sm font-bold text-coral placeholder:text-[var(--muted)] focus:outline-none focus:border-coral/50"
                />
                <Button
                  variant="coral"
                  size="sm"
                  icon={<HiTrash />}
                  disabled={deleteConfirm !== 'CONFIRM'}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-start gap-2 p-3 rounded-xl bg-coral/10 border border-coral/20">
                <HiExclamationCircle className="text-coral flex-shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-coral/80 leading-relaxed">
                  <strong className="text-coral">This is permanent.</strong> All your notes, tasks, progress, XP, pets, and inventory will be permanently deleted.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm('')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="coral"
                  size="sm"
                  icon={<HiTrash />}
                  loading={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                      toast.success('Account deleted. Goodbye, adventurer.');
                    } catch (err: unknown) {
                      const msg = err instanceof Error && err.message.includes('requires-recent-login')
                        ? 'Please log out and log back in, then try again (security requirement).'
                        : 'Failed to delete account. Please try again.';
                      toast.error(msg);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className="flex-1"
                >
                  Permanently Delete My Account
                </Button>
              </div>
            </motion.div>
          )}
        </Card>

        {/* Save button */}
        <div className="flex justify-end pb-8">
          <Button
            variant="primary"
            size="lg"
            icon={saved ? <HiCheck /> : <HiSave />}
            onClick={handleSave}
            loading={saving}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

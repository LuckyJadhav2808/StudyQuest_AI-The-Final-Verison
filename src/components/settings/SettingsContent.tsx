'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiUser, HiMail, HiKey, HiColorSwatch, HiSun, HiMoon,
  HiClipboardCopy, HiCheck, HiSave, HiShieldCheck,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getProfileRef, setDocument } from '@/lib/firestore';
import { getAvatarUrl, DICEBEAR_STYLES } from '@/lib/constants';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';

export default function SettingsContent() {
  const { user, profile } = useAuthContext();
  const { theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('adventurer');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

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
    await setDocument(getProfileRef(user.uid), {
      displayName: displayName.trim() || 'Student',
      avatarSeed,
      avatarStyle,
      openRouterKey: openRouterKey.trim(),
      updatedAt: Date.now(),
    });
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

  const avatarUrl = getAvatarUrl(avatarSeed, avatarStyle);

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-black">Settings</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Customize your StudyQuest experience.</p>
        </div>

        {/* Profile Section */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-4 flex items-center gap-2">
            <HiUser className="text-primary" /> Profile
          </h2>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar preview */}
            <div className="flex flex-col items-center gap-3">
              <motion.img
                key={`${avatarSeed}-${avatarStyle}`}
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full bg-surface-200 ring-4 ring-primary/20"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <Badge variant="primary" size="sm">{avatarStyle}</Badge>
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
        </Card>

        {/* Friend Code */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-4 flex items-center gap-2">
            <HiShieldCheck className="text-teal" /> Friend Code
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-3xl font-heading font-black tracking-[0.3em] text-primary">
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

        {/* Appearance */}
        <Card padding="lg" hover={false}>
          <h2 className="text-sm font-heading font-bold mb-4 flex items-center gap-2">
            <HiColorSwatch className="text-secondary" /> Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Theme</p>
              <p className="text-xs text-[var(--muted-foreground)]">Switch between light and dark mode.</p>
            </div>
            <motion.button
              onClick={toggleTheme}
              className={`relative w-16 h-9 rounded-full transition-colors duration-300 ${
                theme === 'dark' ? 'bg-primary' : 'bg-amber'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md"
                animate={{ left: theme === 'dark' ? '32px' : '4px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {theme === 'dark' ? <HiMoon size={14} className="text-primary" /> : <HiSun size={14} className="text-amber" />}
              </motion.div>
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

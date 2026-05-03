'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiUser, HiMail, HiKey, HiColorSwatch, HiSun, HiMoon,
  HiClipboardCopy, HiCheck, HiSave, HiShieldCheck, HiLockClosed,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/context/AuthContext';
import { useTheme, THEMES, Theme } from '@/context/ThemeContext';
import { useGamification } from '@/hooks/useGamification';
import { getProfileRef, setDocument } from '@/lib/firestore';
import { getAvatarUrl, DICEBEAR_STYLES } from '@/lib/constants';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';
import AvatarBorder, { getAvatarTier } from '@/components/gamification/AvatarBorder';

export default function SettingsContent() {
  const { user, profile } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const { gamification } = useGamification();

  const [displayName, setDisplayName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('adventurer');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const userLevel = gamification?.level || 0;
  const tier = getAvatarTier(userLevel);

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

  const handleThemeSelect = (themeId: Theme) => {
    const themeInfo = THEMES.find((t) => t.id === themeId);
    if (themeInfo && themeInfo.requiredLevel > userLevel) {
      toast.error(`🔒 Reach Level ${themeInfo.requiredLevel} to unlock ${themeInfo.label}!`);
      return;
    }
    setTheme(themeId);
    toast.success(`${themeInfo?.emoji} ${themeInfo?.label} theme activated!`);
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

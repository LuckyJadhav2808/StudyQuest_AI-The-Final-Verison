'use client';

// ============================================================
// StudyQuest AI — Production-Grade Authentication & Landing Portal
// Engineered under /senior-production-dev, /senior-frontend, & /ui-ux-pro-max
// Benchmark Architecture: Smoked Obsidian Glass, 1px Specular Rims,
// Interactive Mini-Cockpit Preview & Full Mobile Ergonomics
// ============================================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  HiEnvelope,
  HiLockClosed,
  HiUser,
  HiArrowRight,
  HiEye,
  HiEyeSlash,
  HiSparkles,
  HiCheck,
  HiXMark,
  HiShieldCheck,
  HiClock,
  HiBolt,
  HiFire,
  HiCodeBracket,
  HiAcademicCap,
  HiMusicalNote,
} from 'react-icons/hi2';
import { FcGoogle } from 'react-icons/fc';
import { useAuthContext } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { playClick, playSuccess, playError, playXP } from '@/lib/sounds';
import ExpressiveOwlMascot from '@/components/gamification/ExpressiveOwlMascot';
import { MascotMood } from '@/components/gamification/QuestieMascot';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Focus & Mascot emotional states
  const [focusedField, setFocusedField] = useState<'none' | 'name' | 'email' | 'password'>('none');
  const [mascotSquish, setMascotSquish] = useState(false);

  // Interactive Mini-Cockpit preview state
  const [demoTimerPlaying, setDemoTimerPlaying] = useState(false);
  const [demoQuestDone, setDemoQuestDone] = useState(false);

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuthContext();
  const router = useRouter();

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-sky-400' };
      case 4:
        return { score: 4, label: 'Unbreakable', color: 'bg-emerald-400' };
      default:
        return { score: 0, label: '', color: 'bg-slate-700' };
    }
  }, [password]);

  // Dynamic mascot mood tied to user interaction & state
  const mascotMood = useMemo<MascotMood>(() => {
    if (loading) return 'celebration';
    if (error) return 'sleeping';
    if (focusedField === 'password' || focusedField === 'email' || focusedField === 'name') return 'focus';
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 5) return 'night-owl';
    return 'active';
  }, [loading, error, focusedField]);

  const handleMascotClick = () => {
    playClick();
    setMascotSquish(true);
    setTimeout(() => setMascotSquish(false), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        if (!displayName.trim()) {
          setError('Please enter your adventurer name');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await signUp(email.trim(), password, displayName.trim());
      }
      playSuccess();
      router.push('/');
    } catch (err: unknown) {
      playError();
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/wrong-password') ||
        msg.includes('auth/user-not-found')
      ) {
        setError('Invalid email or password. Please try again.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Sign in instead!');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password should be at least 6 characters long.');
      } else if (msg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('auth/too-many-requests')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    playClick();
    try {
      await signInWithGoogle();
      playSuccess();
      router.push('/');
    } catch (err: unknown) {
      playError();
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (msg.includes('auth/account-exists-with-different-credential')) {
        setError('An account already exists with this email using password. Please sign in with your password.');
      } else if (msg.includes('auth/popup-closed-by-user')) {
        setError('Sign-in cancelled. Tap again when ready.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      playSuccess();
      setResetSuccess(true);
      toast.success('Password reset email sent! Check your inbox 📧');
    } catch (err: unknown) {
      playError();
      const msg = err instanceof Error ? err.message : 'Failed to send reset link';
      if (msg.includes('auth/user-not-found')) {
        toast.error('No account found with this email address');
      } else {
        toast.error(msg);
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center bg-[#F0EDF8] dark:bg-[#070913] text-slate-900 dark:text-white selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* ============================================================
          LIVING ATMOSPHERIC AURORA MESH CANVAS (Unified with Dashboard)
          ============================================================ */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent blur-[140px] animate-pulse [animation-duration:9s]" />
        <div className="absolute top-1/3 -right-32 w-[520px] h-[520px] rounded-full bg-gradient-to-bl from-cyan-500/12 via-blue-500/8 to-transparent blur-[130px] animate-pulse [animation-duration:11s]" />
        <div className="absolute -bottom-40 left-1/4 w-[650px] h-[450px] rounded-full bg-gradient-to-t from-emerald-500/10 via-teal-500/5 to-transparent blur-[150px] animate-pulse [animation-duration:13s]" />
        {/* Subtle Precision Grid Matrix */}
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #7C3AED 1px, transparent 1px), linear-gradient(to bottom, #7C3AED 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Main Responsive Grid Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
        {/* ============================================================
            DESKTOP LEFT / MOBILE TOP: PRODUCT SHOWCASE & LIVE MINI-BENTO
            ============================================================ */}
        <div className="w-full lg:w-[55%] flex flex-col justify-between space-y-6 sm:space-y-8">
          {/* Brand Anchor & Operational Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-secondary flex items-center justify-center text-white shadow-[0_0_24px_rgba(124,58,237,0.45)] border border-white/30">
                <HiSparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <span className="font-heading font-black text-2xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Study<span className="text-gradient">Quest</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-mono font-bold border border-indigo-500/30">
                    v2.5
                  </span>
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  The Gamified Deep Work &amp; Productivity OS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-black/40 border border-emerald-500/30 shadow-xs text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Free &amp; Open Tier
              </span>
            </div>
          </div>

          {/* Hero Statement */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Master Your Syllabus.{' '}
              <span className="text-gradient">Level Up Your Deep Work.</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl font-medium">
              Transform study hours, DSA coding challenges, and exam preparation into a rewarding RPG quest.
              Compete, track velocity, and build unbreakable habits with zero distractions.
            </p>
          </div>

          {/* ============================================================
              INTERACTIVE MINI-COCKPIT PREVIEW (Linear & Raycast Benchmark)
              A real, high-density teaser of the active 2x2 Bento Dashboard!
              ============================================================ */}
          <div className="rounded-[24px] sm:rounded-[28px] bg-white/80 dark:bg-[#0B0D1E]/80 backdrop-blur-2xl border border-indigo-500/25 dark:border-white/[0.10] shadow-[0_16px_48px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] p-4 sm:p-5 space-y-3.5 relative overflow-hidden group">
            {/* Specular Ambient Jewel Glow */}
            <div className="absolute -top-16 -left-16 w-44 h-44 bg-indigo-500/12 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-2 border-b border-indigo-500/15 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  Live Cockpit Preview
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-500 dark:text-indigo-400">
                100vh Modular Bento
              </span>
            </div>

            {/* Mini Bento Grid: 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mini Card A: Flow Station */}
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-black/35 border border-indigo-500/20 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div
                    onClick={() => {
                      playClick();
                      setDemoTimerPlaying(!demoTimerPlaying);
                    }}
                    className="w-10 h-10 rounded-full bg-indigo-500/20 dark:bg-[#7C3AED]/25 border border-indigo-500/40 flex items-center justify-center text-indigo-500 dark:text-purple-300 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    title="Click to preview timer"
                  >
                    <HiClock size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-heading font-black text-slate-900 dark:text-white">
                        Flow Station
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-[8px] font-mono font-bold text-indigo-500">
                        {demoTimerPlaying ? '24:59' : '25m'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                      {demoTimerPlaying ? 'Focus Session Active' : 'Click to start focus'}
                    </p>
                  </div>
                </div>
                <span className="text-xs">⏱️</span>
              </div>

              {/* Mini Card B: Study Velocity Pillars */}
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-black/35 border border-emerald-500/20 dark:border-white/10 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 dark:bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-500">
                    <HiFire size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-heading font-black text-slate-900 dark:text-white">
                        Velocity
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        3d Streak
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                      85% Consistency Active
                    </p>
                  </div>
                </div>
                {/* 5 Mini Slender Pillars */}
                <div className="flex items-end gap-1 h-7">
                  <span className="w-1.5 h-3 rounded-full bg-emerald-500/40" />
                  <span className="w-1.5 h-4.5 rounded-full bg-emerald-500/60" />
                  <span className="w-1.5 h-3.5 rounded-full bg-emerald-500/50" />
                  <span className="w-1.5 h-6 rounded-full bg-emerald-500/90" />
                  <span className="w-1.5 h-7 rounded-full bg-gradient-to-t from-emerald-500 to-teal-300 shadow-[0_0_6px_#10B981]" />
                </div>
              </div>

              {/* Mini Card C: Interactive Daily Quest Bounty */}
              <div
                onClick={() => {
                  playXP();
                  setDemoQuestDone(!demoQuestDone);
                }}
                className="p-3 rounded-2xl bg-white/60 dark:bg-black/35 border border-amber-500/20 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs cursor-pointer hover:border-amber-500/40 transition-all group/quest"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                      demoQuestDone
                        ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                        : 'border-amber-500/40 text-transparent group-hover/quest:border-amber-400'
                    }`}
                  >
                    <HiCheck size={14} strokeWidth={3} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        demoQuestDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'
                      }`}
                    >
                      Solve 2 Graph Questions
                    </p>
                    <p className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {demoQuestDone ? '✓ Completed • +50 XP' : 'Daily Bounty • +50 XP'}
                    </p>
                  </div>
                </div>
                <span className="text-xs">⚔️</span>
              </div>

              {/* Mini Card D: DSA Forge & Code Arena */}
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-black/35 border border-violet-500/20 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shrink-0">
                    <HiCodeBracket size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-heading font-black text-slate-900 dark:text-white">
                        DSA Forge
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-violet-500/15 text-[8px] font-mono font-bold text-violet-400">
                        Rank S
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      2,360+ Curated Problems
                    </p>
                  </div>
                </div>
                <span className="text-xs">💻</span>
              </div>
            </div>
          </div>

          {/* Value Highlights Pill Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-white/60 dark:bg-black/35 border border-indigo-500/20 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <HiShieldCheck className="text-emerald-500" size={14} /> Local-First &amp; Cloud-Synced
            </span>
            <span className="px-3 py-1 rounded-full bg-white/60 dark:bg-black/35 border border-indigo-500/20 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <HiSparkles className="text-purple-400" size={14} /> Zero Distractions
            </span>
            <span className="px-3 py-1 rounded-full bg-white/60 dark:bg-black/35 border border-indigo-500/20 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <HiMusicalNote className="text-pink-400" size={14} /> Integrated Lofi Jukebox
            </span>
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN: PRODUCTION AUTH TERMINAL (Smoked Obsidian Glass)
            ============================================================ */}
        <div className="w-full lg:w-[45%] flex flex-col items-center">
          <div className="w-full max-w-md rounded-[28px] sm:rounded-[32px] bg-white/85 dark:bg-[#0B0D1E]/85 backdrop-blur-2xl border border-indigo-500/30 dark:border-white/[0.10] shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.20)] p-6 sm:p-8 xl:p-9 relative overflow-hidden transition-all group">
            {/* Specular Jewel Bloom */}
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Title + Reactive Companion Avatar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
                  {mode === 'login' ? 'Welcome Back' : 'Join the Guild'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {mode === 'login'
                    ? 'Resume your study quest and streak.'
                    : 'Create your adventurer account to earn XP.'}
                </p>
              </div>

              {/* Reactive Interactive Questie Companion Avatar */}
              <div
                onClick={handleMascotClick}
                className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-xs overflow-hidden p-1 shrink-0"
                title="Questie Companion • Ready for work"
              >
                <ExpressiveOwlMascot mood={mascotMood} isSquishing={mascotSquish} size={40} />
              </div>
            </div>

            {/* Tactile Segmented Pill Mode Switcher */}
            <div className="flex p-1 rounded-2xl bg-slate-200/60 dark:bg-black/50 border border-slate-300/60 dark:border-white/10 mb-5 relative">
              {(['login', 'register'] as const).map((tab) => {
                const isActive = mode === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      playClick();
                      setMode(tab);
                      setError('');
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-heading font-bold transition-colors duration-200 relative z-10 uppercase tracking-wider min-h-[44px] flex items-center justify-center cursor-pointer ${
                      isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="login-tab-indicator"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_4px_16px_rgba(99,102,241,0.4)]"
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">
                      {tab === 'login' ? 'Sign In' : 'Join Guild'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Fast 1-Click Google OAuth Button */}
            <motion.button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300/80 dark:border-white/10 bg-white/70 dark:bg-black/40 hover:bg-white dark:hover:bg-white/[0.06] text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-heading font-bold tracking-wide transition-all shadow-xs min-h-[48px] cursor-pointer"
            >
              <FcGoogle size={20} className="shrink-0" />
              <span>Continue with Google</span>
            </motion.button>

            {/* Dividing Rule */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono font-bold">
                or email
              </span>
              <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {/* Name Field (Register Mode Only) */}
              <AnimatePresence mode="wait">
                {mode === 'register' && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <label className="block text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Adventurer Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <HiUser size={17} />
                      </div>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField('none')}
                        placeholder="e.g. Alex Morgan"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 dark:bg-black/40 border border-slate-300/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[46px]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Address Field */}
              <div>
                <label className="block text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HiEnvelope size={17} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField('none')}
                    placeholder="scholar@university.edu"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    enterKeyHint="next"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 dark:bg-black/40 border border-slate-300/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[46px]"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-heading font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setForgotModalOpen(true);
                      }}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-bold transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HiLockClosed size={17} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField('none')}
                    placeholder={mode === 'register' ? 'Minimum 6 characters' : '••••••••'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    enterKeyHint="go"
                    required
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white/60 dark:bg-black/40 border border-slate-300/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[46px]"
                  />
                  {/* Password Visibility Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setShowPassword((prev) => !prev);
                    }}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer min-w-[44px] justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <HiEyeSlash size={17} /> : <HiEye size={17} />}
                  </button>
                </div>

                {/* Password Strength Meter (Register Mode Only) */}
                {mode === 'register' && password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">Security:</span>
                      <span className="font-bold text-slate-200 font-mono">{passwordStrength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full rounded-full transition-all duration-300 ${
                            passwordStrength.score >= step
                              ? passwordStrength.color
                              : 'bg-slate-300 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Error Alert with Tactile Shake */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5"
                  >
                    <span className="text-sm shrink-0">⚠️</span>
                    <span className="flex-1 leading-snug">{error}</span>
                    <button
                      type="button"
                      onClick={() => setError('')}
                      className="text-rose-400 hover:text-rose-200"
                    >
                      <HiXMark size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.30)] transition-all min-h-[48px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authorizing Session...</span>
                  </div>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Launch StudyQuest' : 'Create Adventurer Account'}</span>
                    <HiArrowRight size={15} />
                  </>
                )}
              </motion.button>
            </form>

            {/* Switch Mode Prompt */}
            <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              {mode === 'login' ? (
                <p>
                  New scholar?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setMode('register');
                      setError('');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-bold underline underline-offset-4 cursor-pointer"
                  >
                    Join the quest →
                  </button>
                </p>
              ) : (
                <p>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setMode('login');
                      setError('');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-bold underline underline-offset-4 cursor-pointer"
                  >
                    Sign in here →
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          FORGOT PASSWORD MODAL (Smoked Obsidian Glass)
          ============================================================ */}
      <AnimatePresence>
        {forgotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setForgotModalOpen(false);
                setResetSuccess(false);
              }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-[28px] bg-white/95 dark:bg-[#0B0D1E]/95 border border-indigo-500/30 dark:border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-2xl text-slate-900 dark:text-white"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(false);
                  setResetSuccess(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <HiXMark size={20} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-4 shadow-2xs">
                <HiEnvelope size={24} />
              </div>

              <h3 className="text-xl font-heading font-black">Reset Your Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
                Enter your account email and we will dispatch a secure recovery link to your inbox.
              </p>

              {resetSuccess ? (
                <div className="text-center py-4 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <HiCheck size={24} />
                  </div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                    Recovery link dispatched! Please check your email inbox and spam folder.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModalOpen(false);
                      setResetSuccess(false);
                    }}
                    className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white/10 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendResetLink} className="space-y-4">
                  <div>
                    <label className="block text-xs font-heading font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="scholar@university.edu"
                      inputMode="email"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-indigo-500 transition-all min-h-[46px]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(false)}
                      className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 text-xs font-heading font-bold uppercase tracking-wider min-h-[44px] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-heading font-bold uppercase tracking-wider shadow-lg transition-all min-h-[44px] disabled:opacity-50 cursor-pointer"
                    >
                      {resetLoading ? 'Sending...' : 'Send Link'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

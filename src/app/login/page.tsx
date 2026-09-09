'use client';

// ============================================================
// StudyQuest AI — Production-Grade Authentication Terminal
// Designed with UI/UX Pro, Mobile Ergonomics & Mascot Engine
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
} from 'react-icons/hi2';
import { FcGoogle } from 'react-icons/fc';
import { useAuthContext } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { playClick, playSuccess, playError } from '@/lib/sounds';

type AuthMode = 'login' | 'register';

const MASCOT_QUOTES = [
  'Consistency is your greatest superpower, scholar! ✨',
  'Ready to earn some XP and conquer today’s syllabus? 🚀',
  'Every expert was once an adventurous beginner! 🦉',
  'Your study streak is waiting for you. Let’s level up! 🔥',
  'Small daily quests lead to legendary milestones! 💎',
];

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
  const [customQuoteIdx, setCustomQuoteIdx] = useState(0);

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

  // Mascot contextual speech text
  const mascotSpeech = useMemo(() => {
    if (loading) return 'Decrypting quest log... ⚡';
    if (error) return 'Oops! Check your credentials and try again! 💡';
    if (focusedField === 'password') return 'Shhh! Your secret key is encrypted & safe! 🙈';
    if (focusedField === 'email') return 'Scanning student archives for your scroll... 📜';
    if (focusedField === 'name') return 'Choose a legendary adventurer name! ⚔️';
    if (mode === 'register') return 'Welcome, new recruit! Ready to embark on your quest? 🌟';
    return MASCOT_QUOTES[customQuoteIdx % MASCOT_QUOTES.length];
  }, [focusedField, loading, error, mode, customQuoteIdx]);

  const handleMascotClick = () => {
    playClick();
    setMascotSquish(true);
    setCustomQuoteIdx((prev) => prev + 1);
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
    <div className="min-h-screen w-full flex bg-[#090D16] text-white selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* Dynamic Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full bg-indigo-600/15 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full bg-purple-600/15 blur-[130px] mix-blend-screen" />
        <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[100px] mix-blend-screen" />
        {/* Subtle Cyber Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ============================================================ */}
      {/* DESKTOP LEFT COLUMN: CYBER-SCHOLAR BENTO SHOWCASE            */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-12 xl:p-16 border-r border-white/10 bg-slate-950/40 backdrop-blur-xl">
        {/* Top Branding Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20">
              <span className="text-xl">🦉</span>
            </div>
            <div>
              <span className="font-heading font-black text-xl tracking-tight text-white flex items-center gap-1.5">
                Study<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">Quest</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  v2.0
                </span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium">RPG Learning & Study Command Center</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-medium text-[11px]">Server Online</span>
          </div>
        </div>

        {/* Center: Reactive Mascot Hero + Bento Widgets */}
        <div className="my-auto space-y-8 max-w-lg">
          {/* Reactive Mascot Companion */}
          <div className="relative pt-6 flex flex-col items-center">
            {/* Dynamic Interactive Speech Bubble */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mascotSpeech}
                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className="relative z-20 mb-4 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl text-center max-w-xs"
              >
                <p className="text-xs font-medium text-slate-200 leading-snug">
                  {mascotSpeech}
                </p>
                {/* Bubble Pointer Arrow */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-indigo-500/30 rotate-45" />
              </motion.div>
            </AnimatePresence>

            {/* Clickable Floating Questie Mascot */}
            <motion.div
              onClick={handleMascotClick}
              whileHover={{ scale: 1.05 }}
              animate={mascotSquish ? { scale: [1, 0.88, 1.12, 1] } : { y: [0, -10, 0] }}
              transition={
                mascotSquish
                  ? { duration: 0.3 }
                  : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
              }
              className="relative cursor-pointer group flex items-center justify-center"
              title="Click Questie for wisdom!"
            >
              {/* Radial Aura Disk */}
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl scale-125 group-hover:bg-purple-500/30 transition-colors" />
              <img
                src="/pixel_study_owl.png"
                alt="Questie the Scholar Owl"
                className="w-36 h-36 object-contain relative z-10 filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.6)]"
                style={{ imageRendering: 'pixelated' }}
              />
            </motion.div>
            <p className="text-[10px] text-slate-400 font-mono mt-2 tracking-wide uppercase">
              Questie • Study Companion
            </p>
          </div>

          {/* Bento Feature Capability Cards (Authentic Platform Highlights) */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Bento Card 1: Gamified Learning & Quests */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md shadow-lg flex flex-col justify-between hover:border-indigo-500/30 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                    <HiSparkles size={12} /> Gamified Learning
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    Quests & XP
                  </span>
                </div>
                <p className="text-xs font-heading font-bold text-white mb-1.5">
                  Turn studying into an RPG adventure
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Complete tasks, solve coding problems, and build your study streak to earn XP and unlock titles.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-2 text-[10px] text-indigo-300 font-mono">
                <span>🎯 Daily Quests</span>
                <span>•</span>
                <span>⚔️ 2,360+ DSA Problems</span>
              </div>
            </div>

            {/* Bento Card 2: Companion & Focus */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md shadow-lg flex flex-col justify-between hover:border-purple-500/30 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1">
                    🦉 Study Companion
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                    Deep Work
                  </span>
                </div>
                <p className="text-xs font-heading font-bold text-white mb-1.5">
                  Stay accountable with your virtual pet
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your companion levels up as you complete Pomodoro sessions, master syllabus units, and take notes.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-2 text-[10px] text-purple-300 font-mono">
                <span>⏱️ Pomodoro Timer</span>
                <span>•</span>
                <span>🛡️ Streak Shield</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Pillars Strip (Honest & Authentic) */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <HiShieldCheck className="text-emerald-400 shrink-0" size={16} />
            <span className="text-[11px] font-medium text-slate-300">
              Private, Local-First &amp; Cloud-Synced • Zero Ads • 100% Free
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">SPPU &amp; Tech Interview Ready</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: PRODUCTION AUTH TERMINAL                      */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between items-center p-5 sm:p-8 md:p-12 z-10 min-h-screen overflow-y-auto">
        {/* Mobile-Only Top Header with Mini Questie Companion */}
        <div className="w-full max-w-md lg:hidden pt-2 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                onClick={handleMascotClick}
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-xl shadow-lg border border-white/20 active:scale-95 transition-transform cursor-pointer"
              >
                🦉
              </div>
              <div>
                <h1 className="text-lg font-heading font-black tracking-tight text-white flex items-center gap-1">
                  Study<span className="text-indigo-400">Quest</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    AI
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400">Level up your learning journey</p>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-white/10 text-[10px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Free Tier</span>
            </div>
          </div>

          {/* Mobile Mascot Speech Bubble */}
          <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-indigo-500/20 text-xs text-slate-300 flex items-center gap-2">
            <span className="text-base">✨</span>
            <span className="text-[11px] font-medium leading-snug line-clamp-1">{mascotSpeech}</span>
          </div>
        </div>

        {/* Main Glassmorphic Card Container */}
        <div className="w-full max-w-md my-auto py-2">
          {/* Card Frame */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            {/* Title & Subtitle */}
            <div className="mb-6 text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white">
                {mode === 'login' ? 'Welcome Back!' : 'Join the Guild'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Enter your credentials to resume your study quest.'
                  : 'Create your adventurer account and start earning XP.'}
              </p>
            </div>

            {/* Tactile Segmented Pill Mode Switcher */}
            <div className="flex p-1 rounded-2xl bg-slate-950/80 border border-white/10 mb-6 relative">
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
                    className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-heading font-bold transition-colors duration-200 relative z-10 uppercase tracking-wider min-h-[44px] flex items-center justify-center ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
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
                      {tab === 'login' ? 'Sign In' : 'Join Quest'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Google Fast Sign-In Button */}
            <motion.button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-white/10 bg-slate-950/60 hover:bg-slate-900 hover:border-indigo-500/40 text-slate-200 text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all shadow-md min-h-[48px] cursor-pointer"
            >
              <FcGoogle size={20} className="shrink-0" />
              <span>Continue with Google</span>
            </motion.button>

            {/* Dividing Rule */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span className="text-[11px] uppercase tracking-widest text-slate-400 font-mono font-bold">
                or email
              </span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                    <label className="block text-xs font-heading font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Adventurer Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <HiUser size={18} />
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
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-400 text-base md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[48px]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-heading font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HiEnvelope size={18} />
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-400 text-base md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[48px]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-heading font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setForgotModalOpen(true);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HiLockClosed size={18} />
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
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-400 text-base md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[48px]"
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
                    {showPassword ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
                  </button>
                </div>

                {/* Password Strength Meter (Register Mode Only) */}
                {mode === 'register' && password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Security Strength:</span>
                      <span className="font-bold text-slate-200">{passwordStrength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full rounded-full transition-all duration-300 ${
                            passwordStrength.score >= step
                              ? passwordStrength.color
                              : 'bg-slate-800'
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
                    className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2.5"
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
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-heading font-bold text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(99,102,241,0.35)] transition-all min-h-[48px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Accessing Quest Log...</span>
                  </div>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Start Quest' : 'Begin Adventure'}</span>
                    <HiArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>

            {/* Switch Mode Prompt */}
            <div className="mt-6 text-center text-xs text-slate-400">
              {mode === 'login' ? (
                <p>
                  New adventurer?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setMode('register');
                      setError('');
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4 cursor-pointer"
                  >
                    Join the quest! →
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
                    className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4 cursor-pointer"
                  >
                    Sign in here →
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Safe Area Bottom Bar */}
        <div className="w-full text-center text-[11px] text-slate-400 pb-[max(12px,env(safe-area-inset-bottom,12px))] pt-4">
          <span>Protected by Firebase Auth • StudyQuest AI 2026</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FORGOT PASSWORD GLASSMORPHIC MODAL / MOBILE BOTTOM SHEET     */}
      {/* ============================================================ */}
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
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-white/15 shadow-2xl"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(false);
                  setResetSuccess(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <HiXMark size={20} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <HiEnvelope size={24} />
              </div>

              <h3 className="text-xl font-heading font-black text-white">Reset Your Password</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Enter your account email and Questie will dispatch a magic recovery link to your inbox.
              </p>

              {resetSuccess ? (
                <div className="text-center py-4 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <HiCheck size={24} />
                  </div>
                  <p className="text-sm font-medium text-emerald-300">
                    Reset link sent! Please check your email inbox and spam folder.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModalOpen(false);
                      setResetSuccess(false);
                    }}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendResetLink} className="space-y-4">
                  <div>
                    <label className="block text-xs font-heading font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="scholar@university.edu"
                      inputMode="email"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-400 text-base md:text-sm focus:outline-none focus:border-indigo-500 transition-all min-h-[48px]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(false)}
                      className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-heading font-bold uppercase tracking-wider min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-heading font-bold uppercase tracking-wider shadow-lg transition-all min-h-[44px] disabled:opacity-50"
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

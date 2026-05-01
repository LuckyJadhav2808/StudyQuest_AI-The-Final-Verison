'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { HiMail, HiLockClosed, HiUser, HiArrowRight } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import { useAuthContext } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuthContext();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        if (!displayName.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
      }
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setError('Invalid email or password');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password must be at least 6 characters');
      } else if (msg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address');
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
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Left - Branding (Stitch-style with candy gradients) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 40%, #FFD166 100%)',
        }}
      >
        {/* Floating shapes — candy-colored circles */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { size: 220, x: '10%', y: '15%', color: 'rgba(255,255,255,0.12)', delay: 0 },
            { size: 160, x: '70%', y: '20%', color: 'rgba(255,255,255,0.08)', delay: 0.5 },
            { size: 120, x: '30%', y: '70%', color: 'rgba(255,255,255,0.10)', delay: 1 },
            { size: 180, x: '80%', y: '65%', color: 'rgba(255,255,255,0.06)', delay: 1.5 },
            { size: 100, x: '50%', y: '45%', color: 'rgba(255,255,255,0.14)', delay: 2 },
          ].map((shape, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: shape.size,
                height: shape.size,
                left: shape.x,
                top: shape.y,
                background: shape.color,
              }}
              animate={{
                y: [0, -20, 0],
                x: [0, 10, 0],
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 5 + i,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: shape.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center px-12 max-w-lg">
          {/* Questie Mascot */}
          <motion.div
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-5xl shadow-2xl border-4 border-white/30"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            🦉
          </motion.div>

          <motion.h1
            className="text-5xl font-heading font-black text-white mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            StudyQuest
          </motion.h1>

          <motion.p
            className="text-xl text-white/90 font-semibold mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Learn. Play. Level Up! 🚀
          </motion.p>

          <motion.p
            className="text-sm text-white/70 max-w-sm mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Transform studying into an adventure. Track quests, build streaks, and unlock achievements.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {['🔥 Streaks', '⚡ XP System', '🏆 Achievements', '🦉 Questie AI', '📊 Analytics'].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/15 text-white border-2 border-white/20 backdrop-blur-sm uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl">
              🦉
            </div>
            <h1 className="text-3xl font-heading font-black">
              Study<span className="text-gradient">Quest</span>
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1 font-semibold">
              Learn. Play. Level Up! 🚀
            </p>
          </div>

          {/* Tab Toggle (3D pill effect) */}
          <div className="flex rounded-2xl bg-[var(--card-border)]/40 p-1.5 mb-6 border-2 border-[var(--card-border)]">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setMode(tab); setError(''); }}
                className={`
                  flex-1 py-3 text-sm font-heading font-bold rounded-xl transition-all duration-200 relative uppercase tracking-wider
                  ${mode === tab ? 'text-white' : 'text-[var(--muted-foreground)]'}
                `}
              >
                {mode === tab && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-[0_4px_0_rgba(88,28,135,0.3)]"
                    layoutId="auth-tab"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {tab === 'login' ? 'Sign In' : 'Join Quest'}
                </span>
              </button>
            ))}
          </div>

          {/* Google Sign In (3D button style) */}
          <motion.button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] hover:border-primary/40 transition-all duration-200 font-heading font-bold text-sm uppercase tracking-wider shadow-[0_4px_0_rgba(0,0,0,0.05)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.05)]"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <FcGoogle size={22} />
            Continue with Google
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-[2px] bg-[var(--card-border)]" />
            <span className="text-xs text-[var(--muted-foreground)] font-bold uppercase tracking-wider">or</span>
            <div className="flex-1 h-[2px] bg-[var(--card-border)]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Input
                    label="Adventurer Name"
                    placeholder="What should we call you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    icon={<HiUser size={18} />}
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<HiMail size={18} />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<HiLockClosed size={18} />}
              required
            />

            {mode === 'login' && (
              <div className="text-right">
                <button type="button" className="text-xs text-primary font-bold hover:underline">
                  Forgot?
                </button>
              </div>
            )}

            {error && (
              <motion.div
                className="p-3 rounded-xl bg-coral/10 border-2 border-coral/20 text-coral text-sm font-semibold"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={<HiArrowRight />}
            >
              {mode === 'login' ? 'Start Quest' : 'Join the Adventure'}
            </Button>

            {mode === 'login' && (
              <p className="text-center text-xs text-[var(--muted-foreground)]">
                New here?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-primary font-bold hover:underline"
                >
                  Join the quest! →
                </button>
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}

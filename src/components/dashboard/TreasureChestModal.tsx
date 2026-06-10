'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShop } from '@/hooks/useShop';
import { useGamification } from '@/hooks/useGamification';
import { TreasureReward } from '@/lib/constants';
import { playCelebration, playSuccess, playXP } from '@/lib/sounds';
import toast from 'react-hot-toast';

/**
 * TreasureChestModal — A beautiful, cinematic daily reward experience.
 * Shows a glowing chest that opens with particles and reveals a reward.
 */

const RARITY_COLORS = {
  common:    { glow: '#a78bfa', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.5)', text: '#c4b5fd' },
  rare:      { glow: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.5)', text: '#93c5fd' },
  epic:      { glow: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(168, 85, 247, 0.5)', text: '#d8b4fe' },
  legendary: { glow: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.5)', text: '#fde68a' },
};

// Generate particles for the opening animation
const OPENING_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  angle: (i * 360) / 20,
  distance: 60 + Math.random() * 80,
  size: 4 + Math.random() * 6,
  delay: Math.random() * 0.3,
  emoji: ['✨', '⭐', '💫', '🌟', '💎', '🪙'][Math.floor(Math.random() * 6)],
}));

interface TreasureChestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TreasureChestModal({ isOpen, onClose }: TreasureChestModalProps) {
  const { canClaimTreasureChest, claimTreasureChest } = useShop();
  const { awardXP } = useGamification();
  const [phase, setPhase] = useState<'ready' | 'opening' | 'reveal' | 'claimed'>('ready');
  const [reward, setReward] = useState<TreasureReward | null>(null);

  const handleOpen = useCallback(async () => {
    if (!canClaimTreasureChest() || phase !== 'ready') return;

    // Phase 1: Opening animation
    setPhase('opening');
    playSuccess();

    try {
      // Wait for chest open animation
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Phase 2: Claim reward
      const result = await claimTreasureChest();
      if (!result) {
        setPhase('ready');
        return;
      }

      setReward(result);
      setPhase('reveal');

      // Play sound based on rarity
      if (result.rarity === 'legendary' || result.rarity === 'epic') {
        playCelebration();
      } else {
        playXP();
      }

      // Award XP if the reward includes any (non-blocking)
      if (result.xp > 0) {
        awardXP(result.xp, 'Treasure Chest Daily Reward').catch(() => {});
      }
    } catch (error) {
      console.error('Treasure Chest error:', error);
      toast.error('Something went wrong opening the chest. Try again!');
      setPhase('ready');
    }
  }, [canClaimTreasureChest, claimTreasureChest, awardXP, phase]);

  const handleClose = useCallback(() => {
    setPhase('ready');
    setReward(null);
    onClose();
  }, [onClose]);

  const canClaim = canClaimTreasureChest();
  const colors = reward ? RARITY_COLORS[reward.rarity] : RARITY_COLORS.common;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="treasure-chest-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              padding: '48px 56px',
              borderRadius: '24px',
              background: phase === 'reveal' ? colors.bg : 'rgba(30, 20, 50, 0.9)',
              border: `2px solid ${phase === 'reveal' ? colors.border : 'rgba(139, 92, 246, 0.3)'}`,
              boxShadow: phase === 'reveal'
                ? `0 0 60px ${colors.glow}40, 0 0 120px ${colors.glow}20`
                : '0 0 40px rgba(139, 92, 246, 0.15), 0 20px 60px rgba(0,0,0,0.4)',
              maxWidth: '420px',
              width: '90vw',
              transition: 'all 0.5s ease',
            }}
          >
            {/* Title */}
            <motion.h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #c4b5fd, #a78bfa, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
              }}
            >
              {phase === 'reveal' ? reward?.title : 'Daily Treasure Chest'}
            </motion.h2>

            {/* Chest / Reward Display */}
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              {/* Glow ring */}
              <motion.div
                animate={{
                  boxShadow: phase === 'opening'
                    ? [
                        '0 0 20px rgba(139, 92, 246, 0.3)',
                        '0 0 60px rgba(139, 92, 246, 0.6)',
                        '0 0 100px rgba(251, 191, 36, 0.8)',
                      ]
                    : phase === 'reveal'
                    ? `0 0 50px ${colors.glow}60`
                    : '0 0 20px rgba(139, 92, 246, 0.2)',
                  scale: phase === 'opening' ? [1, 1.1, 1.2] : 1,
                }}
                transition={{ duration: 1.2 }}
                style={{
                  position: 'absolute',
                  inset: -10,
                  borderRadius: '50%',
                }}
              />

              {/* The Chest Emoji / Reward Emoji */}
              <motion.div
                animate={{
                  scale: phase === 'opening' ? [1, 1.15, 0.95, 1.3] : 1,
                  rotate: phase === 'opening' ? [0, -5, 5, -5, 0] : 0,
                }}
                transition={{ duration: 1.2 }}
                style={{
                  fontSize: phase === 'reveal' ? '72px' : '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  filter: !canClaim && phase === 'ready' ? 'grayscale(0.7) opacity(0.5)' : 'none',
                }}
              >
                {phase === 'reveal' ? reward?.emoji : '🎁'}
              </motion.div>

              {/* Opening particles */}
              <AnimatePresence>
                {(phase === 'opening' || phase === 'reveal') && OPENING_PARTICLES.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
                      y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
                      scale: [0, 1.2, 0],
                    }}
                    transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      fontSize: `${p.size * 2}px`,
                      pointerEvents: 'none',
                      marginLeft: '-8px',
                      marginTop: '-8px',
                    }}
                  >
                    {p.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Reward Details (only in reveal phase) */}
            <AnimatePresence>
              {phase === 'reveal' && reward && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {/* Rarity badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.4 }}
                    style={{
                      padding: '4px 16px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      color: colors.text,
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {reward.rarity}
                  </motion.div>

                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)',
                    textAlign: 'center',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    {reward.description}
                  </p>

                  {/* Reward amounts */}
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    marginTop: '4px',
                  }}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.5 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>🪙</span>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#fde68a' }}>+{reward.coins}</span>
                    </motion.div>

                    {reward.xp > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.6 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>⚡</span>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#c4b5fd' }}>+{reward.xp} XP</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={phase === 'reveal' ? handleClose : handleOpen}
              disabled={phase === 'opening' || (!canClaim && phase === 'ready')}
              style={{
                padding: '12px 36px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: (!canClaim && phase === 'ready') || phase === 'opening' ? 'not-allowed' : 'pointer',
                border: 'none',
                background: (!canClaim && phase === 'ready')
                  ? 'rgba(100, 100, 120, 0.3)'
                  : phase === 'reveal'
                  ? `linear-gradient(135deg, ${colors.glow}, ${colors.glow}cc)`
                  : 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                color: (!canClaim && phase === 'ready') ? 'rgba(255,255,255,0.3)' : '#fff',
                boxShadow: (!canClaim && phase === 'ready')
                  ? 'none'
                  : '0 4px 20px rgba(124, 58, 237, 0.4)',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease',
              }}
            >
              {phase === 'opening' ? (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  Opening...
                </motion.span>
              ) : phase === 'reveal' ? (
                'Claim & Close'
              ) : canClaim ? (
                '✨ Open Chest'
              ) : (
                '🔒 Come back tomorrow!'
              )}
            </motion.button>

            {/* Close button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '12px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

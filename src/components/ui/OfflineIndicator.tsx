'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import toast from 'react-hot-toast';

/**
 * A sleek floating indicator that appears when the user goes offline.
 * Shows "Deep Work Mode 📴" when offline, and briefly shows
 * "Syncing... ☁️" when reconnecting before disappearing.
 */
export default function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const hasBeenOffline = useRef(false);

  // Track when user goes offline so we only toast on real reconnects
  useEffect(() => {
    if (!isOnline) {
      hasBeenOffline.current = true;
    }
  }, [isOnline]);

  // Fire a toast when user reconnects after being offline
  useEffect(() => {
    if (isOnline && wasOffline && hasBeenOffline.current) {
      hasBeenOffline.current = false;
      // Small delay so the syncing banner appears first
      const timer = setTimeout(() => {
        toast.success(
          'All your offline progress has been synced & saved! ☁️✅',
          {
            duration: 4000,
            icon: '🔄',
            style: {
              background: 'var(--card-bg)',
              color: 'var(--foreground)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              fontWeight: 600,
              fontSize: '13px',
            },
          }
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const showIndicator = !isOnline || wasOffline;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: !isOnline
                ? '0 0 30px rgba(139, 92, 246, 0.3), 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 0 20px rgba(16, 185, 129, 0.3), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
              background: !isOnline
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(109, 40, 217, 0.2))'
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.2))',
              border: !isOnline
                ? '1.5px solid rgba(139, 92, 246, 0.4)'
                : '1.5px solid rgba(16, 185, 129, 0.4)',
              color: !isOnline
                ? '#c4b5fd'
                : '#6ee7b7',
            }}
          >
            {/* Animated pulse dot */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.6, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: !isOnline ? '#a78bfa' : '#34d399',
                boxShadow: !isOnline
                  ? '0 0 8px rgba(167, 139, 250, 0.6)'
                  : '0 0 8px rgba(52, 211, 153, 0.6)',
              }}
            />

            {!isOnline ? (
              <span>📴 Deep Work Mode — Your progress is saved locally</span>
            ) : (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                ☁️ Back online — Syncing your progress...
              </motion.span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

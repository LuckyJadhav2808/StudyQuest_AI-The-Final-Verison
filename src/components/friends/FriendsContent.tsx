'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiUserAdd, HiCheck, HiX, HiTrash, HiClipboardCopy,
  HiStatusOnline, HiStatusOffline, HiUsers, HiMail,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useFriends } from '@/hooks/useFriends';
import { useAuthContext } from '@/context/AuthContext';
import { getAvatarUrl } from '@/lib/constants';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';

function isOnline(lastSeen?: number): boolean {
  if (!lastSeen) return false;
  return Date.now() - lastSeen < 5 * 60 * 1000; // 5 minutes
}

export default function FriendsContent() {
  const { profile } = useAuthContext();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
  } = useFriends();

  const [showAddModal, setShowAddModal] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSendRequest = async () => {
    setAddError('');
    setAddSuccess(false);
    setAddLoading(true);
    const result = await sendRequest(friendCode);
    setAddLoading(false);
    if (result.success) {
      setAddSuccess(true);
      setFriendCode('');
      setTimeout(() => { setShowAddModal(false); setAddSuccess(false); }, 1500);
    } else {
      setAddError(result.error || 'Something went wrong');
    }
  };

  const copyCode = () => {
    if (profile?.friendCode) {
      navigator.clipboard.writeText(profile.friendCode);
      setCopied(true);
      toast.success('Friend code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black">Friends</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Study together, grow together.</p>
          </div>
          <Button variant="primary" size="sm" icon={<HiUserAdd />} onClick={() => setShowAddModal(true)}>
            Add Friend
          </Button>
        </div>

        {/* Your Friend Code */}
        <Card padding="md" hover={false} className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1">
                Your Friend Code
              </p>
              <p className="text-2xl font-heading font-black tracking-[0.3em] text-primary">
                {profile?.friendCode || '------'}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                Share this code with friends so they can add you!
              </p>
            </div>
            <motion.button
              onClick={copyCode}
              className="p-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              {copied ? <HiCheck className="text-teal" size={20} /> : <HiClipboardCopy size={20} />}
            </motion.button>
          </div>
          {copied && (
            <motion.p
              className="text-xs text-teal font-bold mt-2"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ✅ Copied to clipboard!
            </motion.p>
          )}
        </Card>

        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
              <HiMail className="text-secondary" size={14} />
              Friend Requests
              <Badge variant="coral" size="sm">{incomingRequests.length}</Badge>
            </h2>
            <div className="space-y-2">
              {incomingRequests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card padding="md" hover={false}>
                    <div className="flex items-center gap-3">
                      <img
                        src={getAvatarUrl(req.fromAvatar, req.fromAvatarStyle)}
                        alt={req.fromName}
                        className="w-10 h-10 rounded-full ring-2 ring-secondary/30"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-heading font-bold">{req.fromName}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">Wants to be your friend!</p>
                      </div>
                      <div className="flex gap-1.5">
                        <motion.button
                          onClick={() => { acceptRequest(req); toast.success(`You and ${req.fromName} are now friends!`); }}
                          className="p-2 rounded-lg bg-teal/15 text-teal hover:bg-teal/25 transition-colors"
                          whileTap={{ scale: 0.9 }}
                          title="Accept"
                        >
                          <HiCheck size={18} />
                        </motion.button>
                        <motion.button
                          onClick={() => { rejectRequest(req.id); toast('Request declined'); }}
                          className="p-2 rounded-lg bg-coral/15 text-coral hover:bg-coral/25 transition-colors"
                          whileTap={{ scale: 0.9 }}
                          title="Decline"
                        >
                          <HiX size={18} />
                        </motion.button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Requests */}
        {outgoingRequests.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3">
              Pending Requests
            </h2>
            <div className="space-y-2">
              {outgoingRequests.map((req) => (
                <Card key={req.id} padding="sm" hover={false}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                      <HiUserAdd className="text-primary" size={16} />
                    </div>
                    <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                      Request sent — waiting for response...
                    </p>
                    <Badge variant="amber" size="sm">Pending</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h2 className="text-xs uppercase tracking-[0.15em] font-bold text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
            <HiUsers className="text-primary" size={14} />
            All Friends
            <Badge variant="primary" size="sm">{friends.length}</Badge>
          </h2>

          {friends.length === 0 && !loading ? (
            <Card padding="lg" hover={false}>
              <div className="text-center py-8">
                <motion.span
                  className="text-5xl block mb-4"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🤝
                </motion.span>
                <h3 className="text-lg font-heading font-bold mb-2">No friends yet!</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  Share your friend code or add someone by their code.
                </p>
                <Button variant="primary" icon={<HiUserAdd />} onClick={() => setShowAddModal(true)}>
                  Add Your First Friend
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {friends.map((friend, i) => (
                <motion.div
                  key={friend.uid}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card padding="md" hover={false}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={getAvatarUrl(friend.avatarSeed, friend.avatarStyle)}
                          alt={friend.displayName}
                          className="w-11 h-11 rounded-full ring-2 ring-primary/20"
                        />
                        {/* Online indicator dot */}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--card-bg)] ${
                          isOnline() ? 'bg-teal' : 'bg-[var(--muted)]'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-heading font-bold truncate">{friend.displayName}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-[var(--muted-foreground)] font-semibold">
                            Code: {friend.friendCode}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setConfirmRemove(friend.uid)}
                        className="p-2 rounded-lg hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"
                        title="Remove friend"
                      >
                        <HiTrash size={16} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Add Friend Modal */}
        <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddError(''); setAddSuccess(false); }} title="Add Friend">
          <div className="space-y-4">
            {addSuccess ? (
              <motion.div
                className="text-center py-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                <span className="text-5xl block mb-3">🎉</span>
                <p className="text-sm font-heading font-bold text-teal">Friend request sent!</p>
              </motion.div>
            ) : (
              <>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Enter your friend&apos;s 6-character code to send them a request.
                </p>
                <Input
                  label="Friend Code"
                  placeholder="e.g. A3B7K2"
                  value={friendCode}
                  onChange={(e) => {
                    setFriendCode(e.target.value.toUpperCase().slice(0, 6));
                    setAddError('');
                  }}
                  icon={<HiUserAdd size={16} />}
                />

                {addError && (
                  <motion.p
                    className="text-xs text-coral font-bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    ❌ {addError}
                  </motion.p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setShowAddModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSendRequest}
                    loading={addLoading}
                    disabled={friendCode.length < 4}
                    className="flex-1"
                  >
                    Send Request
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Remove Confirm */}
        <Modal isOpen={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove Friend">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            This will remove them from your friends list and you from theirs. You can always re-add each other later.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmRemove(null)} className="flex-1">Cancel</Button>
            <Button
              variant="coral"
              onClick={async () => {
                if (confirmRemove) await removeFriend(confirmRemove);
                setConfirmRemove(null);
                toast.success('Friend removed');
              }}
              className="flex-1"
            >
              Remove
            </Button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

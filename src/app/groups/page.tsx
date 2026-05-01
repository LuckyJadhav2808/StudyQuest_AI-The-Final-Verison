'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiUserGroup, HiUsers, HiChatAlt2, HiPaperAirplane,
  HiTrash, HiLink, HiPhotograph, HiDocumentText,
  HiClipboardCopy, HiCheck, HiLogout, HiUserAdd, HiX,
  HiChevronLeft, HiCollection, HiExternalLink,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useGroups, useGroupChat, useGroupResources, Group, GroupResource } from '@/hooks/useGroups';
import { useFriends } from '@/hooks/useFriends';
import { useAuthContext } from '@/context/AuthContext';
import { getAvatarUrl } from '@/lib/constants';
import FriendsContent from '@/components/friends/FriendsContent';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';

type Tab = 'friends' | 'groups';

export default function GroupsPage() {
  const [tab, setTab] = useState<Tab>('groups');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Tab Selector */}
        {!selectedGroup && (
          <>
            <div className="flex rounded-2xl bg-[var(--card-border)]/40 p-1.5 border-2 border-[var(--card-border)]">
              {([
                { id: 'groups' as Tab, label: '🏰 Study Groups', icon: HiUserGroup },
                { id: 'friends' as Tab, label: '🤝 Friends', icon: HiUsers },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-3 text-sm font-heading font-bold rounded-xl transition-all duration-200 relative uppercase tracking-wider ${tab === t.id ? 'text-white' : 'text-[var(--muted-foreground)]'}`}
                >
                  {tab === t.id && (
                    <motion.div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-secondary shadow-[0_4px_0_rgba(88,28,135,0.3)]" layoutId="groups-tab" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
                  )}
                  <span className="relative z-10">{t.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Content */}
        {selectedGroup ? (
          <GroupDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} />
        ) : tab === 'friends' ? (
          <FriendsContent />
        ) : (
          <GroupsList onSelectGroup={setSelectedGroup} />
        )}
      </div>
    </PageTransition>
  );
}

// =================== Groups List ===================
function GroupsList({ onSelectGroup }: { onSelectGroup: (g: Group) => void }) {
  const { groups, loading, createGroup, deleteGroup } = useGroups();
  const { friends } = useFriends();
  const { user, profile } = useAuthContext();
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  const handleCreate = async () => {
    if (!groupName.trim()) { toast.error('Group name required'); return; }
    const memberNames: Record<string, string> = {};
    selectedFriends.forEach((uid) => {
      const f = friends.find((fr) => fr.uid === uid);
      if (f) memberNames[uid] = f.displayName;
    });
    await createGroup(groupName.trim(), Array.from(selectedFriends), memberNames);
    toast.success('Group created! 🏰');
    setGroupName('');
    setSelectedFriends(new Set());
    setShowCreate(false);
  };

  const handleDelete = (groupId: string, name: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Delete &quot;{name}&quot;?</span>
        <button onClick={() => { deleteGroup(groupId); toast.dismiss(t.id); toast.success('Group deleted'); }} className="px-3 py-1 bg-[#FF6B6B] text-white rounded-lg text-xs font-bold">Yes</button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">No</button>
      </div>
    ), { duration: 5000 });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-black">Study Groups</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Collaborate, chat, and share resources with your study crew.</p>
        </div>
        <Button variant="primary" size="sm" icon={<HiPlus />} onClick={() => setShowCreate(true)}>New Group</Button>
      </div>

      {groups.length === 0 && !loading ? (
        <Card padding="lg" hover={false}>
          <div className="text-center py-8">
            <motion.span className="text-5xl block mb-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>🏰</motion.span>
            <h3 className="text-lg font-heading font-bold mb-2">No groups yet!</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">Create a study group and invite your friends to collaborate.</p>
            <Button variant="primary" icon={<HiPlus />} onClick={() => setShowCreate(true)}>Create First Group</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card padding="md" className="cursor-pointer" onClick={() => onSelectGroup(g)}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xl">🏰</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-heading font-bold truncate">{g.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="primary" size="sm">{g.memberIds.length} members</Badge>
                      {g.ownerId === user?.uid && <Badge variant="teal" size="sm">Owner</Badge>}
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {g.memberIds.slice(0, 3).map((uid) => (
                      <div key={uid} className="w-7 h-7 rounded-full bg-primary/15 ring-2 ring-[var(--card-bg)] flex items-center justify-center text-[8px] font-bold">{(g.memberNames[uid] || '?')[0]}</div>
                    ))}
                    {g.memberIds.length > 3 && <div className="w-7 h-7 rounded-full bg-primary/10 ring-2 ring-[var(--card-bg)] flex items-center justify-center text-[8px] font-bold text-primary">+{g.memberIds.length - 3}</div>}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Study Group">
        <div className="space-y-4">
          <Input label="Group Name" placeholder="e.g. Physics Study Crew" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Add Friends</label>
            {friends.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">Add friends first to invite them to groups.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f.uid}
                    onClick={() => {
                      const next = new Set(selectedFriends);
                      next.has(f.uid) ? next.delete(f.uid) : next.add(f.uid);
                      setSelectedFriends(next);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${selectedFriends.has(f.uid) ? 'border-primary bg-primary/10' : 'border-[var(--card-border)] hover:border-primary/30'}`}
                  >
                    <img src={getAvatarUrl(f.avatarSeed, f.avatarStyle)} alt="" className="w-7 h-7 rounded-full" />
                    <span className="text-xs font-semibold flex-1 text-left">{f.displayName}</span>
                    {selectedFriends.has(f.uid) && <HiCheck className="text-primary" size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button variant="primary" onClick={handleCreate} className="flex-1">Create Group</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// =================== Group Detail ===================
function GroupDetail({ group, onBack }: { group: Group; onBack: () => void }) {
  const { user, profile } = useAuthContext();
  const { friends } = useFriends();
  const { addMember, removeMember, leaveGroup, deleteGroup } = useGroups();
  const { messages, sendMessage } = useGroupChat(group.id);
  const { resources, addResource, deleteResource } = useGroupResources(group.id);

  const [activeTab, setActiveTab] = useState<'chat' | 'resources' | 'members'>('chat');
  const [msgInput, setMsgInput] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resType, setResType] = useState<GroupResource['type']>('link');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOwner = group.ownerId === user?.uid;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    if (!msgInput.trim() || !user || !profile) return;
    sendMessage(msgInput, user.uid, profile.displayName);
    setMsgInput('');
  };

  const handleAddResource = async () => {
    if (!resTitle.trim() || !user || !profile) return;
    await addResource({ groupId: group.id, title: resTitle.trim(), type: resType, url: resUrl.trim(), addedBy: user.uid, addedByName: profile.displayName });
    toast.success('Resource shared! 📎');
    setResTitle(''); setResUrl(''); setShowAddResource(false);
  };

  // Friends not yet in this group
  const availableFriends = friends.filter((f) => !group.memberIds.includes(f.uid));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors"><HiChevronLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-heading font-black">{group.name}</h1>
          <p className="text-[10px] text-[var(--muted-foreground)]">{group.memberIds.length} members · Created by {group.ownerName}</p>
        </div>
        <div className="flex gap-1.5">
          {isOwner ? (
            <Button variant="coral" size="sm" icon={<HiTrash size={14} />} onClick={() => { deleteGroup(group.id); toast.success('Group deleted'); onBack(); }}>Delete</Button>
          ) : (
            <Button variant="coral" size="sm" icon={<HiLogout size={14} />} onClick={() => { leaveGroup(group.id); toast.success('Left group'); onBack(); }}>Leave</Button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex rounded-xl bg-[var(--card-border)]/40 p-1 border-2 border-[var(--card-border)]">
        {([
          { id: 'chat' as const, label: 'Chat', icon: HiChatAlt2 },
          { id: 'resources' as const, label: 'Resources', icon: HiCollection },
          { id: 'members' as const, label: 'Members', icon: HiUsers },
        ]).map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-2.5 text-xs font-heading font-bold rounded-lg transition-all relative ${activeTab === t.id ? 'text-white' : 'text-[var(--muted-foreground)]'}`}>
            {activeTab === t.id && <motion.div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary to-secondary" layoutId="group-tab" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}
            <span className="relative z-10 flex items-center justify-center gap-1.5"><t.icon size={14} />{t.label}</span>
          </button>
        ))}
      </div>

      {/* =================== CHAT =================== */}
      {activeTab === 'chat' && (
        <Card padding="none" hover={false} className="flex flex-col" style={{ height: 'calc(100vh - 20rem)' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full"><p className="text-xs text-[var(--muted-foreground)]">No messages yet. Say hello! 👋</p></div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <motion.div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    {!isMe && <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{msg.senderName[0]}</div>}
                    <div className={`max-w-[70%] ${isMe ? 'order-1' : ''}`}>
                      {!isMe && <p className="text-[9px] font-bold text-[var(--muted-foreground)] mb-0.5">{msg.senderName}</p>}
                      <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-md' : 'bg-[var(--card-border)]/40 rounded-bl-md'}`}>
                        {msg.content}
                      </div>
                      <p className="text-[8px] text-[var(--muted-foreground)] mt-0.5 px-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div className="border-t-2 border-[var(--card-border)] p-3 flex gap-2">
            <input
              type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..." className="flex-1 px-3 py-2 rounded-xl border-2 border-[var(--card-border)] bg-transparent text-sm font-medium focus:border-primary focus:outline-none transition-colors"
            />
            <motion.button onClick={handleSend} disabled={!msgInput.trim()} className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white disabled:opacity-50 shadow-[0_3px_0_rgba(88,28,135,0.3)]" whileTap={{ scale: 0.95 }}><HiPaperAirplane size={18} className="rotate-90" /></motion.button>
          </div>
        </Card>
      )}

      {/* =================== RESOURCES =================== */}
      {activeTab === 'resources' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="primary" size="sm" icon={<HiPlus />} onClick={() => setShowAddResource(true)}>Add Resource</Button>
          </div>

          {resources.length === 0 ? (
            <Card padding="lg" hover={false}>
              <div className="text-center py-6">
                <span className="text-3xl block mb-2">📎</span>
                <p className="text-sm text-[var(--muted-foreground)]">No resources shared yet. Add notes, links, or files!</p>
              </div>
            </Card>
          ) : (
            resources.map((res, i) => (
              <motion.div key={res.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card padding="md" hover={false}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${res.type === 'link' ? 'bg-sky/15' : res.type === 'note' ? 'bg-primary/15' : res.type === 'image' ? 'bg-teal/15' : 'bg-coral/15'}`}>
                      {res.type === 'link' ? <HiLink className="text-sky" size={20} /> : res.type === 'note' ? <HiDocumentText className="text-primary" size={20} /> : res.type === 'image' ? <HiPhotograph className="text-teal" size={20} /> : <HiDocumentText className="text-coral" size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-heading font-bold truncate">{res.title}</h4>
                      <p className="text-[10px] text-[var(--muted-foreground)]">by {res.addedByName} · <Badge variant="muted" size="sm">{res.type}</Badge></p>
                    </div>
                    <div className="flex gap-1">
                      {res.url && (
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"><HiExternalLink size={16} /></a>
                      )}
                      <button onClick={() => { navigator.clipboard.writeText(res.url || res.content || res.title); toast.success('Copied!'); }} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"><HiClipboardCopy size={16} /></button>
                      {res.addedBy === user?.uid && (
                        <button onClick={() => { deleteResource(res.id); toast.success('Resource removed'); }} className="p-1.5 rounded-lg hover:bg-coral/10 hover:text-coral transition-colors"><HiTrash size={16} /></button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}

          <Modal isOpen={showAddResource} onClose={() => setShowAddResource(false)} title="Add Resource">
            <div className="space-y-4">
              <Input label="Title" placeholder="e.g. Chapter 5 Notes" value={resTitle} onChange={(e) => setResTitle(e.target.value)} />
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">Type</label>
                <div className="flex gap-1.5">
                  {(['link', 'note', 'image', 'pdf'] as const).map((t) => (
                    <button key={t} onClick={() => setResType(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border-2 transition-all ${resType === t ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/30'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <Input label="URL / Link" placeholder="https://..." value={resUrl} onChange={(e) => setResUrl(e.target.value)} icon={<HiLink size={16} />} />
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowAddResource(false)} className="flex-1">Cancel</Button>
                <Button variant="primary" onClick={handleAddResource} className="flex-1">Share</Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* =================== MEMBERS =================== */}
      {activeTab === 'members' && (
        <div className="space-y-3">
          {isOwner && (
            <div className="flex justify-end">
              <Button variant="primary" size="sm" icon={<HiUserAdd />} onClick={() => setShowAddMember(true)}>Add Member</Button>
            </div>
          )}

          {group.memberIds.map((uid) => (
            <Card key={uid} padding="md" hover={false}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold">{(group.memberNames[uid] || '?')[0]}</div>
                <div className="flex-1">
                  <p className="text-sm font-heading font-bold">{group.memberNames[uid] || 'Unknown'}</p>
                  <div className="flex gap-1.5 mt-0.5">
                    {uid === group.ownerId && <Badge variant="teal" size="sm">Owner</Badge>}
                    {uid === user?.uid && <Badge variant="primary" size="sm">You</Badge>}
                  </div>
                </div>
                {isOwner && uid !== user?.uid && (
                  <button onClick={() => { removeMember(group.id, uid); toast.success('Member removed'); }} className="p-2 rounded-lg hover:bg-coral/10 hover:text-coral transition-colors"><HiX size={16} /></button>
                )}
              </div>
            </Card>
          ))}

          <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member">
            <div className="space-y-2">
              {availableFriends.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] py-4 text-center">All your friends are already in this group!</p>
              ) : (
                availableFriends.map((f) => (
                  <button
                    key={f.uid}
                    onClick={async () => { await addMember(group.id, f.uid, f.displayName); toast.success(`${f.displayName} added!`); setShowAddMember(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 transition-colors"
                  >
                    <img src={getAvatarUrl(f.avatarSeed, f.avatarStyle)} alt="" className="w-8 h-8 rounded-full" />
                    <span className="text-xs font-semibold flex-1 text-left">{f.displayName}</span>
                    <HiPlus className="text-primary" size={16} />
                  </button>
                ))
              )}
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}

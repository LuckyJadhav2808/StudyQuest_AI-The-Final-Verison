'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, onSnapshot, deleteDoc, query, where, orderBy, limit, addDoc, updateDoc, arrayUnion, arrayRemove, getDoc, getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';
import { setDocument } from '@/lib/firestore';

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  createdAt: number;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: number;
}

export interface GroupResource {
  id: string;
  groupId: string;
  title: string;
  type: 'note' | 'link' | 'image' | 'pdf';
  url: string;
  content?: string;
  addedBy: string;
  addedByName: string;
  createdAt: number;
}

interface UseGroupsReturn {
  groups: Group[];
  loading: boolean;
  createGroup: (name: string, memberIds: string[], memberNames: Record<string, string>) => Promise<string>;
  deleteGroup: (id: string) => Promise<void>;
  addMember: (groupId: string, memberId: string, memberName: string) => Promise<void>;
  removeMember: (groupId: string, memberId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
}

export function useGroups(): UseGroupsReturn {
  const { user, profile } = useAuthContext();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setGroups([]); setLoading(false); return; }

    // Listen to groups where user is a member
    const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group);
      items.sort((a, b) => b.createdAt - a.createdAt);
      setGroups(items);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const createGroup = useCallback(async (name: string, memberIds: string[], memberNames: Record<string, string>): Promise<string> => {
    if (!user || !profile) return '';
    const allMemberIds = [user.uid, ...memberIds.filter((id) => id !== user.uid)];
    const allMemberNames = { ...memberNames, [user.uid]: profile.displayName };
    const ref = await addDoc(collection(db, 'groups'), {
      name,
      ownerId: user.uid,
      ownerName: profile.displayName,
      memberIds: allMemberIds,
      memberNames: allMemberNames,
      createdAt: Date.now(),
    });
    return ref.id;
  }, [user, profile]);

  const deleteGroup = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'groups', id));
  }, []);

  const addMember = useCallback(async (groupId: string, memberId: string, memberName: string) => {
    const ref = doc(db, 'groups', groupId);
    await updateDoc(ref, {
      memberIds: arrayUnion(memberId),
      [`memberNames.${memberId}`]: memberName,
    });
  }, []);

  const removeMember = useCallback(async (groupId: string, memberId: string) => {
    const ref = doc(db, 'groups', groupId);
    await updateDoc(ref, {
      memberIds: arrayRemove(memberId),
    });
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user) return;
    await removeMember(groupId, user.uid);
  }, [user, removeMember]);

  return { groups, loading, createGroup, deleteGroup, addMember, removeMember, leaveGroup };
}

// =================== Group Chat Hook ===================
export function useGroupChat(groupId: string | null) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) { setMessages([]); setLoading(false); return; }
    const q = query(
      collection(db, 'groups', groupId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupMessage));
      setLoading(false);
    });
    return () => unsub();
  }, [groupId]);

  const sendMessage = useCallback(async (content: string, senderId: string, senderName: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (!groupId || !content.trim()) return;
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      groupId,
      senderId,
      senderName,
      content: content.trim(),
      type,
      createdAt: Date.now(),
    });
  }, [groupId]);

  return { messages, loading, sendMessage };
}

// =================== Group Resources Hook ===================
export function useGroupResources(groupId: string | null) {
  const [resources, setResources] = useState<GroupResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) { setResources([]); setLoading(false); return; }
    const q = query(collection(db, 'groups', groupId, 'resources'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupResource));
      setLoading(false);
    });
    return () => unsub();
  }, [groupId]);

  const addResource = useCallback(async (resource: Omit<GroupResource, 'id' | 'createdAt'>) => {
    if (!groupId) return;
    await addDoc(collection(db, 'groups', groupId, 'resources'), {
      ...resource,
      createdAt: Date.now(),
    });
  }, [groupId]);

  const deleteResource = useCallback(async (resourceId: string) => {
    if (!groupId) return;
    await deleteDoc(doc(db, 'groups', groupId, 'resources', resourceId));
  }, [groupId]);

  return { resources, loading, addResource, deleteResource };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  query,
  where,
  getDocs,
  collection,
  collectionGroup,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';
import {
  getFriendsCollection,
  getFriendRequestsCollection,
  setDocument,
  getProfileRef,
  getDocument,
} from '@/lib/firestore';
import { Friend, FriendRequest, UserProfile } from '@/types';

interface UseFriendsReturn {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  loading: boolean;
  sendRequest: (friendCode: string) => Promise<{ success: boolean; error?: string }>;
  acceptRequest: (request: FriendRequest) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  resendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendUid: string) => Promise<void>;
}

export function useFriends(): UseFriendsReturn {
  const { user, profile } = useAuthContext();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to friends list
  useEffect(() => {
    if (!user) { setFriends([]); setLoading(false); return; }
    const unsub = onSnapshot(getFriendsCollection(user.uid), (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data() }) as Friend);
      setFriends(items);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to incoming friend requests
  useEffect(() => {
    if (!user) { setIncomingRequests([]); return; }
    const q = query(
      getFriendRequestsCollection(),
      where('toUid', '==', user.uid),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setIncomingRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FriendRequest));
    });
    return () => unsub();
  }, [user]);

  // Subscribe to outgoing friend requests
  useEffect(() => {
    if (!user) { setOutgoingRequests([]); return; }
    const q = query(
      getFriendRequestsCollection(),
      where('fromUid', '==', user.uid),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setOutgoingRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FriendRequest));
    });
    return () => unsub();
  }, [user]);

  // Send a friend request by friend code
  const sendRequest = useCallback(async (friendCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || !profile) return { success: false, error: 'Not logged in' };

    try {
      const code = friendCode.trim().toUpperCase();
      if (code === profile.friendCode?.toUpperCase()) {
        return { success: false, error: "You can't add yourself!" };
      }

      // Find user by friendCode — query top-level users docs
      const usersRef = collection(db, 'users');
      const codeQuery = query(usersRef, where('friendCode', '==', code));
      const codeSnap = await getDocs(codeQuery);

      let targetUid: string | null = null;
      let targetProfile: Partial<UserProfile> | null = null;

      if (!codeSnap.empty) {
        // Found via direct top-level query
        const foundDoc = codeSnap.docs[0];
        targetUid = foundDoc.id;
        const profRef = doc(db, 'users', targetUid, 'data', 'profile');
        const p = await getDocument<UserProfile>(profRef);
        targetProfile = p || { displayName: 'Adventurer', friendCode: code };
      } else {
        // Fallback for older users: scan user profile subcollections
        const allUsersSnap = await getDocs(usersRef);
        for (const uDoc of allUsersSnap.docs) {
          const uid = uDoc.id;
          if (uid === user.uid) continue;
          const profRef = doc(db, 'users', uid, 'data', 'profile');
          const p = await getDocument<UserProfile>(profRef);
          if (p && p.friendCode?.toUpperCase() === code) {
            targetUid = uid;
            targetProfile = p;
            // Backfill top-level doc so future lookups are instant
            await setDocument(doc(db, 'users', uid), { friendCode: code, uid }, true).catch(() => {});
            break;
          }
        }
      }

      if (!targetUid || !targetProfile) {
        return { success: false, error: 'No user found with that code' };
      }

      // Check if already friends
      const alreadyFriend = friends.find((f) => f.uid === targetUid);
      if (alreadyFriend) {
        return { success: false, error: 'Already friends!' };
      }

      // Check for existing pending request — bump timestamp to resend
      const existingOut = outgoingRequests.find((r) => r.toUid === targetUid);
      if (existingOut) {
        await setDocument(doc(db, 'friendRequests', existingOut.id), {
          status: 'pending',
          createdAt: Date.now(),
        });
        return { success: true };
      }

      // Check for incoming request from them (auto-accept)
      const existingIn = incomingRequests.find((r) => r.fromUid === targetUid);
      if (existingIn) {
        await acceptRequest(existingIn);
        return { success: true };
      }

      // Create friend request
      const requestId = crypto.randomUUID();
      await setDocument(doc(db, 'friendRequests', requestId), {
        id: requestId,
        fromUid: user.uid,
        fromName: profile.displayName,
        fromAvatar: profile.avatarSeed,
        fromAvatarStyle: profile.avatarStyle,
        toUid: targetUid,
        status: 'pending',
        createdAt: Date.now(),
      }, false);

      return { success: true };
    } catch (error) {
      console.error('sendRequest failed:', error);
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  }, [user, profile, friends, outgoingRequests, incomingRequests]);

  // Accept a friend request
  const acceptRequest = useCallback(async (request: FriendRequest) => {
    if (!user || !profile) return;

    // Get requester's profile, falling back to metadata on request if profile lookup returns null
    const requesterProfile = await getDocument<UserProfile>(getProfileRef(request.fromUid));
    const displayName = requesterProfile?.displayName || request.fromName || 'Adventurer';
    const avatarSeed = requesterProfile?.avatarSeed || request.fromAvatar || request.fromUid;
    const avatarStyle = requesterProfile?.avatarStyle || request.fromAvatarStyle || 'adventurer';
    const friendCode = requesterProfile?.friendCode || '';

    // Add to MY friends list
    const myFriend: Friend = {
      uid: request.fromUid,
      displayName,
      avatarSeed,
      avatarStyle,
      friendCode,
      addedAt: Date.now(),
    };
    await setDocument(doc(db, 'users', user.uid, 'friends', request.fromUid), myFriend, false);

    // Add to THEIR friends list (catch write errors gracefully if rules restrict cross-user subcollection writes)
    const theirFriend: Friend = {
      uid: user.uid,
      displayName: profile.displayName,
      avatarSeed: profile.avatarSeed,
      avatarStyle: profile.avatarStyle,
      friendCode: profile.friendCode,
      addedAt: Date.now(),
    };
    await setDocument(doc(db, 'users', request.fromUid, 'friends', user.uid), theirFriend, false).catch(() => {});

    // Update request status
    await setDocument(doc(db, 'friendRequests', request.id), { status: 'accepted' });
  }, [user, profile]);

  // Reject a friend request
  const rejectRequest = useCallback(async (requestId: string) => {
    await setDocument(doc(db, 'friendRequests', requestId), { status: 'rejected' });
  }, []);

  // Cancel an outgoing request
  const cancelRequest = useCallback(async (requestId: string) => {
    await deleteDoc(doc(db, 'friendRequests', requestId));
  }, []);

  // Resend an outgoing request (bump timestamp to trigger new alert)
  const resendRequest = useCallback(async (requestId: string) => {
    await setDocument(doc(db, 'friendRequests', requestId), {
      status: 'pending',
      createdAt: Date.now(),
    });
  }, []);

  // Remove a friend
  const removeFriend = useCallback(async (friendUid: string) => {
    if (!user) return;
    // Remove from both sides
    await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid));
    await deleteDoc(doc(db, 'users', friendUid, 'friends', user.uid));
  }, [user]);

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    resendRequest,
    removeFriend,
  };
}

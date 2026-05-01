'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  query,
  where,
  getDocs,
  collection,
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

    const code = friendCode.trim().toUpperCase();
    if (code === profile.friendCode) {
      return { success: false, error: "You can't add yourself!" };
    }

    // Find user by friendCode — query top-level users docs
    const usersRef = collection(db, 'users');
    const codeQuery = query(usersRef, where('friendCode', '==', code));
    const codeSnap = await getDocs(codeQuery);

    let targetUid: string | null = null;
    let targetProfile: UserProfile | null = null;

    if (codeSnap.empty) {
      // Fallback: scan profile subcollections (for users created before the top-level write)
      const allUsersSnap = await getDocs(usersRef);
      for (const userDoc of allUsersSnap.docs) {
        const profRef = doc(db, 'users', userDoc.id, 'data', 'profile');
        const profSnap = await getDocument<UserProfile>(profRef);
        if (profSnap && profSnap.friendCode === code) {
          targetUid = userDoc.id;
          targetProfile = profSnap;
          // Backfill top-level doc so future lookups are fast
          await setDocument(doc(db, 'users', userDoc.id), { friendCode: code, uid: userDoc.id });
          break;
        }
      }
    } else {
      // Found via direct query
      const foundDoc = codeSnap.docs[0];
      targetUid = foundDoc.id;
      // Now fetch their full profile
      const profRef = doc(db, 'users', targetUid, 'data', 'profile');
      targetProfile = await getDocument<UserProfile>(profRef);
    }

    if (!targetUid || !targetProfile) {
      return { success: false, error: 'No user found with that code' };
    }

    // Check if already friends
    const alreadyFriend = friends.find((f) => f.uid === targetUid);
    if (alreadyFriend) {
      return { success: false, error: 'Already friends!' };
    }

    // Check for existing pending request
    const existingOut = outgoingRequests.find((r) => r.toUid === targetUid);
    if (existingOut) {
      return { success: false, error: 'Request already sent!' };
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
  }, [user, profile, friends, outgoingRequests, incomingRequests]);

  // Accept a friend request
  const acceptRequest = useCallback(async (request: FriendRequest) => {
    if (!user || !profile) return;

    // Get requester's profile
    const requesterProfile = await getDocument<UserProfile>(getProfileRef(request.fromUid));
    if (!requesterProfile) return;

    // Add to MY friends list
    const myFriend: Friend = {
      uid: request.fromUid,
      displayName: requesterProfile.displayName,
      avatarSeed: requesterProfile.avatarSeed,
      avatarStyle: requesterProfile.avatarStyle,
      friendCode: requesterProfile.friendCode,
      addedAt: Date.now(),
    };
    await setDocument(doc(db, 'users', user.uid, 'friends', request.fromUid), myFriend, false);

    // Add to THEIR friends list
    const theirFriend: Friend = {
      uid: user.uid,
      displayName: profile.displayName,
      avatarSeed: profile.avatarSeed,
      avatarStyle: profile.avatarStyle,
      friendCode: profile.friendCode,
      addedAt: Date.now(),
    };
    await setDocument(doc(db, 'users', request.fromUid, 'friends', user.uid), theirFriend, false);

    // Update request status
    await setDocument(doc(db, 'friendRequests', request.id), { status: 'accepted' });
  }, [user, profile]);

  // Reject a friend request
  const rejectRequest = useCallback(async (requestId: string) => {
    await setDocument(doc(db, 'friendRequests', requestId), { status: 'rejected' });
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
    removeFriend,
  };
}

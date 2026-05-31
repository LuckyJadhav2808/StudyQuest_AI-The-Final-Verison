// ============================================================
// StudyQuest AI — Firestore Helper Utilities
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

// ----- User Document Paths -----
export const getUserRef = (uid: string) => doc(db, 'users', uid);
export const getProfileRef = (uid: string) => doc(db, 'users', uid, 'data', 'profile');
export const getGamificationRef = (uid: string) => doc(db, 'users', uid, 'data', 'gamification');

// ----- Subcollection Paths -----
export const getTasksCollection = (uid: string) => collection(db, 'users', uid, 'tasks');
export const getEventsCollection = (uid: string) => collection(db, 'users', uid, 'events');
export const getHabitsCollection = (uid: string) => collection(db, 'users', uid, 'habits');
export const getNotesCollection = (uid: string) => collection(db, 'users', uid, 'notes');
export const getFocusSessionsCollection = (uid: string) => collection(db, 'users', uid, 'focusSessions');
export const getTimetableCollection = (uid: string) => collection(db, 'users', uid, 'timetable');
export const getSnippetsCollection = (uid: string) => collection(db, 'users', uid, 'snippets');
export const getSavedQueriesCollection = (uid: string) => collection(db, 'users', uid, 'savedQueries');
export const getFriendsCollection = (uid: string) => collection(db, 'users', uid, 'friends');
export const getResourceFoldersCollection = (uid: string) => collection(db, 'users', uid, 'resourceFolders');
export const getResourcesCollection = (uid: string) => collection(db, 'users', uid, 'resources');
export const getCodeProjectsCollection = (uid: string) => collection(db, 'users', uid, 'codeProjects');
export const getCodeFilesCollection = (uid: string, projectId: string) => collection(db, 'users', uid, 'codeProjects', projectId, 'files');
export const getExamsCollection = (uid: string) => collection(db, 'users', uid, 'exams');
export const getStickiesCollection = (uid: string) => collection(db, 'users', uid, 'stickies');
export const getChatMessagesCollection = (uid: string) => collection(db, 'users', uid, 'chatMessages');
export const getWhiteboardsCollection = (uid: string) => collection(db, 'users', uid, 'whiteboards');
export const getUserPrefsRef = (uid: string) => doc(db, 'users', uid, 'data', 'preferences');
export const getSqlDataRef = (uid: string) => doc(db, 'users', uid, 'data', 'sqlPlayground');

// ----- Global Collections -----
export const getFriendRequestsCollection = () => collection(db, 'friendRequests');

// ----- Generic CRUD Operations -----

/** Get a single document */
export async function getDocument<T>(docRef: ReturnType<typeof doc>): Promise<T | null> {
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/** Get all documents in a collection, optionally ordered */
export async function getCollection<T>(
  collectionRef: ReturnType<typeof collection>,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const q = constraints.length > 0 ? query(collectionRef, ...constraints) : query(collectionRef);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

/** Set a document (create or overwrite) */
export async function setDocument(
  docRef: ReturnType<typeof doc>,
  data: DocumentData,
  merge: boolean = true,
): Promise<void> {
  await setDoc(docRef, data, { merge });
}

/** Update specific fields of a document */
export async function updateDocument(
  docRef: ReturnType<typeof doc>,
  data: Partial<DocumentData>,
): Promise<void> {
  await updateDoc(docRef, data);
}

/** Delete a document */
export async function removeDocument(docRef: ReturnType<typeof doc>): Promise<void> {
  await deleteDoc(docRef);
}

/** Subscribe to a collection in real-time */
export function subscribeToCollection<T>(
  collectionRef: ReturnType<typeof collection>,
  callback: (items: T[]) => void,
  ...constraints: QueryConstraint[]
): Unsubscribe {
  const q = constraints.length > 0
    ? query(collectionRef, ...constraints)
    : query(collectionRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    callback(items);
  }, (error) => {
    console.error('Firestore subscription error (collection):', error);
    callback([]); // Return empty array so the UI doesn't stay stuck loading
  });
}

/** Subscribe to a single document in real-time */
export function subscribeToDocument<T>(
  docRef: ReturnType<typeof doc>,
  callback: (data: T | null) => void,
): Unsubscribe {
  return onSnapshot(docRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() } as T);
  }, (error) => {
    console.error('Firestore subscription error (document):', error);
    callback(null); // Return null so the UI doesn't stay stuck loading
  });
}

export { serverTimestamp, doc, collection, query, orderBy };

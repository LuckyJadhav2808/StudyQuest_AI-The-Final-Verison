// ============================================================
// StudyQuest AI — Backup & Restore Utility
// ============================================================
// Exports all user data as a single JSON file (client-side).
// Restores by writing the JSON back into Firestore.
// ============================================================

import { db } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';

// All collections and documents to back up
const BACKUP_COLLECTIONS = [
  'tasks',
  'notes',
  'habits',
  'exams',
  'events',
  'snippets',
  'stickies',
  'whiteboards',
  'resourceFolders',
  'resources',
  'codeProjects',
  'focusSessions',
  'timetable',
  'savedQueries',
] as const;

const BACKUP_DOCS = [
  'profile',
  'gamification',
  'inventory',
  'preferences',
  'sqlPlayground',
] as const;

export interface StudyQuestBackup {
  version: string;
  uid: string;
  exportedAt: number;
  exportedAtISO: string;
  docs: Record<string, unknown>;
  collections: Record<string, unknown[]>;
}

// ── EXPORT ──────────────────────────────────────────────────
export async function exportBackup(uid: string): Promise<void> {
  const docs: Record<string, unknown> = {};
  const collections: Record<string, unknown[]> = {};

  // Read all singular documents
  await Promise.all(
    BACKUP_DOCS.map(async (docName) => {
      try {
        const ref = doc(db, 'users', uid, 'data', docName);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          docs[docName] = snap.data();
        }
      } catch (err) {
        console.warn(`Backup: could not read doc "${docName}"`, err);
      }
    })
  );

  // Read all collection items
  await Promise.all(
    BACKUP_COLLECTIONS.map(async (colName) => {
      try {
        const ref = collection(db, 'users', uid, colName);
        const snap = await getDocs(ref);
        collections[colName] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn(`Backup: could not read collection "${colName}"`, err);
        collections[colName] = [];
      }
    })
  );

  const backup: StudyQuestBackup = {
    version: '1.0',
    uid,
    exportedAt: Date.now(),
    exportedAtISO: new Date().toISOString(),
    docs,
    collections,
  };

  // Trigger browser download
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `studyquest-backup-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── IMPORT ──────────────────────────────────────────────────
export async function importBackup(
  uid: string,
  file: File,
  onProgress?: (msg: string) => void
): Promise<void> {
  const text = await file.text();
  let backup: StudyQuestBackup;

  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('Invalid backup file — could not parse JSON.');
  }

  // Basic validation
  if (!backup.version || !backup.uid || !backup.docs || !backup.collections) {
    throw new Error('Invalid backup file — missing required fields.');
  }

  // Warn if UID mismatch but allow import (user may have different account)
  if (backup.uid !== uid) {
    console.warn(`Backup was from UID ${backup.uid}, restoring to ${uid}`);
  }

  onProgress?.('Restoring profile data...');

  // Restore singular documents
  for (const [docName, data] of Object.entries(backup.docs)) {
    try {
      const ref = doc(db, 'users', uid, 'data', docName);
      // Do NOT restore openRouterKey — security sensitive
      const safeData = { ...(data as Record<string, unknown>) };
      if (docName === 'profile') {
        delete safeData.openRouterKey;
        // Preserve current UID and email
        safeData.uid = uid;
      }
      await setDoc(ref, safeData, { merge: true });
    } catch (err) {
      console.warn(`Restore: could not write doc "${docName}"`, err);
    }
  }

  onProgress?.('Restoring collections...');

  // Restore collection documents in batches of 499 (Firestore limit is 500)
  for (const [colName, items] of Object.entries(backup.collections)) {
    if (!Array.isArray(items) || items.length === 0) continue;

    try {
      const chunks = chunkArray(items, 499);
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const item of chunk) {
          const { id, ...rest } = item as Record<string, unknown>;
          const ref = doc(db, 'users', uid, colName, String(id));
          batch.set(ref, rest, { merge: true });
        }
        await batch.commit();
      }
      onProgress?.(`Restored ${items.length} ${colName}...`);
    } catch (err) {
      console.warn(`Restore: could not write collection "${colName}"`, err);
    }
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

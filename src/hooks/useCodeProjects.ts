'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuthContext } from '@/context/AuthContext';
import {
  getCodeProjectsCollection,
  setDocument,
  removeDocument,
} from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { CodeProject, CodeFile } from '@/types';

export function useCodeProjects() {
  const { user } = useAuthContext();
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to projects list
  useEffect(() => {
    if (!user) { setProjects([]); setLoading(false); return; }

    const q = query(getCodeProjectsCollection(user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }) as CodeProject);
      setProjects(items);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // ----- Project CRUD -----
  const addProject = useCallback(async (name: string, language: string) => {
    if (!user) return '';
    const id = crypto.randomUUID();
    const project: CodeProject = {
      id, name, language,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDocument(doc(db, 'users', user.uid, 'codeProjects', id), project, false);
    return id;
  }, [user]);

  const updateProject = useCallback(async (projectId: string, data: Partial<CodeProject>) => {
    if (!user) return;
    await setDocument(doc(db, 'users', user.uid, 'codeProjects', projectId), {
      ...data,
      updatedAt: Date.now(),
    });
  }, [user]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (!user) return;
    // Delete all files in project first
    const filesRef = collection(db, 'users', user.uid, 'codeProjects', projectId, 'files');
    const snap = await getDocs(filesRef);
    for (const d of snap.docs) {
      await removeDocument(doc(db, 'users', user.uid, 'codeProjects', projectId, 'files', d.id));
    }
    await removeDocument(doc(db, 'users', user.uid, 'codeProjects', projectId));
  }, [user]);

  // ----- File CRUD -----
  const addFile = useCallback(async (projectId: string, name: string, content: string = '') => {
    if (!user) return '';
    const id = crypto.randomUUID();
    const file: CodeFile = {
      id, projectId, name, content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDocument(
      doc(db, 'users', user.uid, 'codeProjects', projectId, 'files', id),
      file, false
    );
    return id;
  }, [user]);

  const updateFile = useCallback(async (projectId: string, fileId: string, data: Partial<CodeFile>) => {
    if (!user) return;
    await setDocument(
      doc(db, 'users', user.uid, 'codeProjects', projectId, 'files', fileId),
      { ...data, updatedAt: Date.now() }
    );
  }, [user]);

  const deleteFile = useCallback(async (projectId: string, fileId: string) => {
    if (!user) return;
    await removeDocument(
      doc(db, 'users', user.uid, 'codeProjects', projectId, 'files', fileId)
    );
  }, [user]);

  const getProjectFiles = useCallback(async (projectId: string): Promise<CodeFile[]> => {
    if (!user) return [];
    const filesRef = collection(db, 'users', user.uid, 'codeProjects', projectId, 'files');
    const q = query(filesRef, orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as CodeFile);
  }, [user]);

  // Real-time subscription to project files
  const subscribeToFiles = useCallback((projectId: string, callback: (files: CodeFile[]) => void) => {
    if (!user) return () => {};
    const filesRef = collection(db, 'users', user.uid, 'codeProjects', projectId, 'files');
    const q = query(filesRef, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      const files = snap.docs.map(d => ({ id: d.id, ...d.data() }) as CodeFile);
      callback(files);
    });
  }, [user]);

  return {
    projects, loading,
    addProject, updateProject, deleteProject,
    addFile, updateFile, deleteFile,
    getProjectFiles, subscribeToFiles,
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, where, query as firestoreQuery } from 'firebase/firestore';
import { useAuthContext } from '@/context/AuthContext';
import {
  getResourceFoldersCollection,
  getResourcesCollection,
  subscribeToCollection,
  setDocument,
  removeDocument,
  getCollection,
} from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { ResourceFolder, Resource } from '@/types';

export function useResources() {
  const { user } = useAuthContext();
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to folders
  useEffect(() => {
    if (!user) { setFolders([]); setResources([]); setLoading(false); return; }

    let loadedFolders = false;
    let loadedResources = false;
    const checkDone = () => {
      if (loadedFolders && loadedResources) setLoading(false);
    };

    const unsubFolders = subscribeToCollection<ResourceFolder>(
      getResourceFoldersCollection(user.uid),
      (items) => { setFolders(items); loadedFolders = true; checkDone(); },
    );

    const unsubResources = subscribeToCollection<Resource>(
      getResourcesCollection(user.uid),
      (items) => { setResources(items); loadedResources = true; checkDone(); },
    );

    return () => { unsubFolders(); unsubResources(); };
  }, [user]);

  // ----- Folder CRUD -----
  const addFolder = useCallback(async (data: Omit<ResourceFolder, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const folder: ResourceFolder = {
      id,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDocument(doc(db, 'users', user.uid, 'resourceFolders', id), folder, false);
    return id;
  }, [user]);

  const updateFolder = useCallback(async (folderId: string, data: Partial<ResourceFolder>) => {
    if (!user) return;
    await setDocument(doc(db, 'users', user.uid, 'resourceFolders', folderId), {
      ...data,
      updatedAt: Date.now(),
    });
  }, [user]);

  const deleteFolder = useCallback(async (folderId: string) => {
    if (!user) return;
    // Delete all resources in folder first
    const folderResources = resources.filter(r => r.folderId === folderId);
    for (const r of folderResources) {
      await removeDocument(doc(db, 'users', user.uid, 'resources', r.id));
    }
    await removeDocument(doc(db, 'users', user.uid, 'resourceFolders', folderId));
  }, [user, resources]);

  // ----- Resource CRUD -----
  const addResource = useCallback(async (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const resource: Resource = {
      id,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDocument(doc(db, 'users', user.uid, 'resources', id), resource, false);
    return id;
  }, [user]);

  const updateResource = useCallback(async (resourceId: string, data: Partial<Resource>) => {
    if (!user) return;
    await setDocument(doc(db, 'users', user.uid, 'resources', resourceId), {
      ...data,
      updatedAt: Date.now(),
    });
  }, [user]);

  const deleteResource = useCallback(async (resourceId: string) => {
    if (!user) return;
    await removeDocument(doc(db, 'users', user.uid, 'resources', resourceId));
  }, [user]);

  const getResourcesByFolder = useCallback((folderId: string) => {
    return resources.filter(r => r.folderId === folderId);
  }, [resources]);

  return {
    folders, resources, loading,
    addFolder, updateFolder, deleteFolder,
    addResource, updateResource, deleteResource,
    getResourcesByFolder,
  };
}

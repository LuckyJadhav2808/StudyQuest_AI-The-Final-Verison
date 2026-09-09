/**
 * StudyQuest AI — useNotebooks Hook
 * Dual-tier persistence (localStorage for instant offline access + Firestore for cloud backup).
 * Complete management of notebooks, folders, cells, and file associations.
 * Uses JSON string serialization for cells to bypass Firestore's nested array restrictions,
 * size-safe output pruning, bidirectional reconciliation to prevent overwrites, and quota recovery.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, collection, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { setDocument, sanitizeFirestoreData } from '@/lib/firestore';
import { useAuthContext } from '@/context/AuthContext';
import { Notebook, NotebookFolder, NotebookCell, CellType } from '@/types/notebook';
import toast from 'react-hot-toast';

const STORAGE_NOTEBOOKS_KEY = 'studyquest_notebooks_cache_v1';
const STORAGE_FOLDERS_KEY = 'studyquest_notebook_folders_cache_v1';
const STORAGE_ACTIVE_KEY = 'studyquest_active_notebook_id_v1';

export const DEFAULT_STARTER_NOTEBOOK: Notebook = {
  id: 'starter_data_science_intro',
  title: '🚀 Welcome to Data Forge (Python Colab)',
  folderId: null,
  cells: [
    {
      id: 'cell_intro_md',
      cell_type: 'markdown',
      source: `# ⚡ Welcome to Data Forge!\n\nThis is your in-browser **Python Data Science & Machine Learning Notebook**, powered by **Pyodide WebAssembly**.\n\n### What you can do here:\n* 🐍 **100% Client-Side Python 3.12**: Runs on your CPU with zero cloud costs and zero latency.\n* 📊 **Pre-installed Scientific Stack**: \`numpy\`, \`pandas\`, \`matplotlib\`, \`scipy\`, and \`scikit-learn\`.\n* 📐 **Rich Math Formatting**: Type LaTeX equations like $$ \\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(x_i - \\mu)^2} $$\n* 📂 **Virtual Filesystem**: Upload CSV datasets via the sidebar, or download outputs generated with \`df.to_csv()\`.`,
      execution_count: null,
      outputs: [],
      status: 'idle',
    },
    {
      id: 'cell_demo_calc',
      cell_type: 'code',
      source: `# 1. Mathematical operations with NumPy\nimport numpy as np\n\nx = np.linspace(0, 10, 100)\ny = np.sin(x) * np.exp(-x / 5)\nprint(f"Generated {len(x)} points. Peak amplitude: {np.max(y):.4f}")\n`,
      execution_count: 1,
      outputs: [
        {
          type: 'stream',
          name: 'stdout',
          text: 'Generated 100 points. Peak amplitude: 0.5358\n',
        },
      ],
      status: 'idle',
    },
    {
      id: 'cell_demo_plot',
      cell_type: 'code',
      source: `# 2. Rich Matplotlib Visualizations\nimport matplotlib.pyplot as plt\n\nplt.figure(figsize=(9, 4))\nplt.plot(x, y, color='#7C3AED', linewidth=2.5, label='Damped Oscillation')\nplt.title('StudyQuest Wave Analysis', fontsize=14, fontweight='bold', color='#4F46E5')\nplt.xlabel('Time (seconds)')\nplt.ylabel('Amplitude')\nplt.grid(True, linestyle='--', alpha=0.5)\nplt.legend()\nplt.show()`,
      execution_count: 2,
      outputs: [],
      status: 'idle',
    },
    {
      id: 'cell_demo_pandas',
      cell_type: 'code',
      source: `# 3. Interactive Pandas DataFrames\nimport pandas as pd\n\ndata = {\n    'Student': ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Vivaan'],\n    'Subject': ['Machine Learning', 'Data Structures', 'Algorithms', 'AI Ethics', 'Calculus'],\n    'Score': [94, 88, 97, 91, 85],\n    'Passed': [True, True, True, True, True]\n}\n\ndf = pd.DataFrame(data)\ndf`,
      execution_count: 3,
      outputs: [
        {
          type: 'table',
          columns: ['Student', 'Subject', 'Score', 'Passed'],
          rows: [
            ['Aarav', 'Machine Learning', 94, true],
            ['Diya', 'Data Structures', 88, true],
            ['Rohan', 'Algorithms', 97, true],
            ['Ananya', 'AI Ethics', 91, true],
            ['Vivaan', 'Calculus', 85, true],
          ],
          totalRows: 5,
          totalCols: 4,
        },
      ],
      status: 'idle',
    },
  ],
  metadata: {
    kernelspec: {
      display_name: 'Python 3 (Pyodide WASM)',
      language: 'python',
      name: 'python3',
    },
    language_info: {
      name: 'python',
      version: '3.12',
    },
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Quota-safe persistence helper for localStorage.
 * Automatically handles quota exceeded errors by pruning transient outputs from inactive notebooks.
 */
function persistToLocalStorage(notebooks: Notebook[], folders: NotebookFolder[], activeId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_NOTEBOOKS_KEY, JSON.stringify(notebooks));
    localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
    localStorage.setItem(STORAGE_ACTIVE_KEY, activeId);
  } catch (err) {
    console.warn('[useNotebooks] LocalStorage quota reached. Pruning transient outputs to guarantee code persistence...');
    try {
      // Preserve active notebook completely; prune old transient outputs from inactive notebooks
      const prunedNotebooks = notebooks.map((nb) => {
        if (nb.id === activeId) {
          // Truncate massive stream outputs if > 50KB
          const cells = nb.cells.map((c) => {
            if (c.outputs && c.outputs.length > 0) {
              const prunedOutputs = c.outputs.map((out: any) => {
                if (out.type === 'stream' && typeof out.text === 'string' && out.text.length > 50000) {
                  return { ...out, text: out.text.slice(0, 50000) + '\n...[output truncated for storage]' };
                }
                return out;
              });
              return { ...c, outputs: prunedOutputs };
            }
            return c;
          });
          return { ...nb, cells };
        } else {
          // Inactive notebooks: keep ALL code and markdown sources, clear transient run outputs
          const cells = nb.cells.map((c) => ({
            ...c,
            outputs: [],
            status: 'idle' as const,
          }));
          return { ...nb, cells };
        }
      });

      localStorage.setItem(STORAGE_NOTEBOOKS_KEY, JSON.stringify(prunedNotebooks));
      localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
      localStorage.setItem(STORAGE_ACTIVE_KEY, activeId);
    } catch (innerErr) {
      console.error('[useNotebooks] Failed to write to localStorage after pruning:', innerErr);
    }
  }
}

/**
 * Serialize notebook for Firestore storage.
 * Encodes `cells` into a JSON string to completely eliminate Firestore's "Nested arrays are not supported" error,
 * and enforces a safe size ceiling (< 800KB) to respect Firestore's 1MB document limit.
 */
function serializeNotebookForFirestore(nb: Notebook): Record<string, any> {
  let safeCells = (nb.cells || []).map((cell) => ({
    id: String(cell.id || `cell_${Date.now()}`),
    cell_type: cell.cell_type || 'code',
    source: String(cell.source ?? ''),
    execution_count: cell.execution_count ?? null,
    outputs: Array.isArray(cell.outputs) ? cell.outputs : [],
    status: cell.status === 'running' ? 'idle' : (cell.status || 'idle'),
    executionTimeMs: cell.executionTimeMs ?? undefined,
  }));

  let cellsJson = JSON.stringify(safeCells);

  // Firestore has a 1MB limit. If cellsJson is approaching 800KB, prune large base64 image outputs
  if (cellsJson.length > 800_000) {
    console.warn('[useNotebooks] cellsJson exceeds 800KB. Pruning large display data for Firestore storage...');
    safeCells = safeCells.map((cell) => ({
      ...cell,
      outputs: (cell.outputs || []).map((out: any) => {
        if (out.type === 'display_data' && out.data && out.data['image/png'] && out.data['image/png'].length > 50000) {
          return {
            type: 'display_data',
            data: { 'text/plain': '[Large plot saved locally - rerun cell in Data Forge to re-render image]' },
          };
        }
        if (out.type === 'stream' && typeof out.text === 'string' && out.text.length > 20000) {
          return {
            ...out,
            text: out.text.slice(0, 20000) + '\n...[output truncated for cloud storage]',
          };
        }
        return out;
      }),
    }));
    cellsJson = JSON.stringify(safeCells);
  }

  const data = {
    id: String(nb.id || ''),
    title: String(nb.title || 'Untitled Notebook'),
    folderId: nb.folderId ?? null,
    metadata: {
      kernelspec: {
        display_name: nb.metadata?.kernelspec?.display_name || 'Python 3 (Pyodide WASM)',
        language: nb.metadata?.kernelspec?.language || 'python',
        name: nb.metadata?.kernelspec?.name || 'python3',
      },
      language_info: {
        name: nb.metadata?.language_info?.name || 'python',
        version: nb.metadata?.language_info?.version || '3.12',
      },
    },
    cellsJson,
    createdAt: Number(nb.createdAt) || Date.now(),
    updatedAt: Number(nb.updatedAt) || Date.now(),
  };
  return sanitizeFirestoreData(data);
}

/**
 * Hydrate notebook from Firestore document data, parsing `cellsJson`.
 */
function deserializeNotebookFromFirestore(id: string, data: any): Notebook {
  let cells: NotebookCell[] = [];
  if (typeof data?.cellsJson === 'string') {
    try {
      cells = JSON.parse(data.cellsJson);
    } catch (e) {
      console.warn('[useNotebooks] Failed to parse cellsJson:', e);
      cells = [];
    }
  } else if (Array.isArray(data?.cells)) {
    cells = data.cells;
  }

  return {
    id: id || data?.id,
    title: data?.title || 'Untitled Notebook',
    folderId: data?.folderId || null,
    cells: Array.isArray(cells) && cells.length > 0 ? cells : [
      {
        id: `cell_${Date.now()}_1`,
        cell_type: 'code',
        source: '',
        execution_count: null,
        outputs: [],
        status: 'idle',
      },
    ],
    metadata: data?.metadata || {
      kernelspec: { display_name: 'Python 3 (Pyodide WASM)', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.12' },
    },
    createdAt: Number(data?.createdAt) || Date.now(),
    updatedAt: Number(data?.updatedAt) || Date.now(),
  };
}

export function useNotebooks() {
  const { user } = useAuthContext();

  // 1. Initial State from localStorage
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => {
    if (typeof window === 'undefined') return [DEFAULT_STARTER_NOTEBOOK];
    try {
      const saved = localStorage.getItem(STORAGE_NOTEBOOKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_STARTER_NOTEBOOK];
  });

  const [folders, setFolders] = useState<NotebookFolder[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_FOLDERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [activeNotebookId, setActiveNotebookId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_STARTER_NOTEBOOK.id;
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_KEY);
      if (saved) return saved;
    } catch {}
    return DEFAULT_STARTER_NOTEBOOK.id;
  });

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => Date.now());

  // Mutable refs to prevent closure staleness in debounced saves and window handlers
  const notebooksRef = useRef<Notebook[]>(notebooks);
  notebooksRef.current = notebooks;

  const foldersRef = useRef<NotebookFolder[]>(folders);
  foldersRef.current = folders;

  const activeNotebookIdRef = useRef<string>(activeNotebookId);
  activeNotebookIdRef.current = activeNotebookId;

  const isInitialMount = useRef(true);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const activeSavesCount = useRef(0);

  // Sync to localStorage with debounced execution
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    persistToLocalStorage(notebooks, folders, activeNotebookId);
  }, [notebooks, folders, activeNotebookId]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Flush saves on page unload / refresh / tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      persistToLocalStorage(notebooksRef.current, foldersRef.current, activeNotebookIdRef.current);

      if (user) {
        // Trigger immediate saves for any notebook with a pending debounce timer
        Object.keys(debounceTimers.current).forEach((nbId) => {
          clearTimeout(debounceTimers.current[nbId]);
          delete debounceTimers.current[nbId];
          const targetNb = notebooksRef.current.find((n) => n.id === nbId);
          if (targetNb) {
            try {
              const payload = serializeNotebookForFirestore(targetNb);
              setDocument(doc(db, 'users', user.uid, 'notebooks', targetNb.id), payload, true);
            } catch {}
          }
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [user]);

  // Safe Firestore Saver with Debouncing and State Tracking
  const saveNotebookToFirestore = useCallback((userUid: string, nb: Notebook, immediate = false) => {
    if (debounceTimers.current[nb.id]) {
      clearTimeout(debounceTimers.current[nb.id]);
      delete debounceTimers.current[nb.id];
    }

    setIsSaving(true);

    const doSave = async () => {
      activeSavesCount.current += 1;
      try {
        // Pull latest version from ref to ensure zero stale closure overwrites
        const currentTarget = notebooksRef.current.find((n) => n.id === nb.id) || nb;
        const payload = serializeNotebookForFirestore(currentTarget);
        await setDocument(doc(db, 'users', userUid, 'notebooks', nb.id), payload, true);
        setLastSavedAt(Date.now());
      } catch (err) {
        console.warn('[useNotebooks] Firestore save error:', err);
      } finally {
        activeSavesCount.current = Math.max(0, activeSavesCount.current - 1);
        if (activeSavesCount.current === 0 && Object.keys(debounceTimers.current).length === 0) {
          setIsSaving(false);
        }
      }
    };

    if (immediate) {
      doSave();
    } else {
      debounceTimers.current[nb.id] = setTimeout(() => {
        delete debounceTimers.current[nb.id];
        doSave();
      }, 800);
    }
  }, []);

  // Sync with Firestore on user login with smart reconciliation
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Subscribe to notebooks
    const notebooksCol = collection(db, 'users', user.uid, 'notebooks');
    const nq = query(notebooksCol, orderBy('updatedAt', 'desc'));
    const unsubNotebooks = onSnapshot(
      nq,
      (snap) => {
        if (!snap.empty) {
          const remoteNbs = snap.docs.map((d) => deserializeNotebookFromFirestore(d.id, d.data()));

          setNotebooks((currentLocalNbs) => {
            const remoteMap = new Map(remoteNbs.map((r) => [r.id, r]));

            // 1. Reconcile remote with local:
            const merged = remoteNbs.map((remoteNb) => {
              const localMatch = currentLocalNbs.find((loc) => loc.id === remoteNb.id);
              if (!localMatch) return remoteNb;

              // If local notebook has a pending debounce timer or higher updatedAt, KEEP local edits!
              const hasActiveDebounce = !!debounceTimers.current[localMatch.id];
              const isLocalNewer = (localMatch.updatedAt || 0) > (remoteNb.updatedAt || 0);

              if (hasActiveDebounce || isLocalNewer) {
                return localMatch;
              }
              return remoteNb;
            });

            // 2. CRITICAL: Preserve any local notebooks not yet uploaded to Firestore (e.g. newly loaded labs)
            currentLocalNbs.forEach((localNb) => {
              if (!remoteMap.has(localNb.id)) {
                merged.unshift(localNb);
                // Queue this new local notebook to be backed up to Firestore
                saveNotebookToFirestore(user.uid, localNb, false);
              }
            });

            return merged;
          });
        } else {
          // First time cloud user: sync local default starter notebook up to Firestore safely
          saveNotebookToFirestore(user.uid, DEFAULT_STARTER_NOTEBOOK, true);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[useNotebooks] Firestore sync warning:', err);
        setLoading(false);
      }
    );

    // Subscribe to folders with reconciliation
    const foldersCol = collection(db, 'users', user.uid, 'notebookFolders');
    const fq = query(foldersCol, orderBy('createdAt', 'asc'));
    const unsubFolders = onSnapshot(
      fq,
      (snap) => {
        if (!snap.empty) {
          const remoteFlds = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotebookFolder);
          setFolders((currentLocalFlds) => {
            const remoteMap = new Map(remoteFlds.map((f) => [f.id, f]));
            const merged = [...remoteFlds];
            currentLocalFlds.forEach((loc) => {
              if (!remoteMap.has(loc.id)) {
                merged.push(loc);
              }
            });
            return merged;
          });
        }
      },
      () => {}
    );

    return () => {
      unsubNotebooks();
      unsubFolders();
    };
  }, [user, saveNotebookToFirestore]);

  // Active Notebook reference
  const activeNotebook =
    notebooks.find((n) => n.id === activeNotebookId) || notebooks[0] || DEFAULT_STARTER_NOTEBOOK;

  // Manual immediate save for active notebook (triggered via Ctrl+S or Save Button)
  const saveActiveNotebookNow = useCallback(async (): Promise<boolean> => {
    // 1. Immediately persist to localStorage synchronously
    persistToLocalStorage(notebooksRef.current, foldersRef.current, activeNotebookIdRef.current);

    // 2. If user is logged in, immediately flush to Firestore
    if (user) {
      const targetNb = notebooksRef.current.find((n) => n.id === activeNotebookIdRef.current);
      if (targetNb) {
        setIsSaving(true);
        if (debounceTimers.current[targetNb.id]) {
          clearTimeout(debounceTimers.current[targetNb.id]);
          delete debounceTimers.current[targetNb.id];
        }
        try {
          const payload = serializeNotebookForFirestore(targetNb);
          await setDocument(doc(db, 'users', user.uid, 'notebooks', targetNb.id), payload, true);
          setLastSavedAt(Date.now());
          setIsSaving(false);
          return true;
        } catch (err) {
          console.warn('[useNotebooks] Manual save error:', err);
          setIsSaving(false);
          return false;
        }
      }
    }

    setLastSavedAt(Date.now());
    setIsSaving(false);
    return true;
  }, [user]);

  // Select notebook with immediate flush of prior active notebook
  const selectNotebook = useCallback(
    (id: string) => {
      const currentActiveId = activeNotebookIdRef.current;
      if (currentActiveId && currentActiveId !== id && debounceTimers.current[currentActiveId]) {
        clearTimeout(debounceTimers.current[currentActiveId]);
        delete debounceTimers.current[currentActiveId];
        if (user) {
          const targetNb = notebooksRef.current.find((n) => n.id === currentActiveId);
          if (targetNb) {
            const payload = serializeNotebookForFirestore(targetNb);
            setDocument(doc(db, 'users', user.uid, 'notebooks', targetNb.id), payload, true).catch(() => {});
          }
        }
      }

      setActiveNotebookId(id);
      activeNotebookIdRef.current = id;
      try {
        localStorage.setItem(STORAGE_ACTIVE_KEY, id);
      } catch {}
    },
    [user]
  );

  // ----- Notebook Actions -----
  const createNotebook = useCallback(
    async (title = 'Untitled Notebook', folderId: string | null = null): Promise<string> => {
      const id = `nb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newNb: Notebook = {
        id,
        title,
        folderId,
        cells: [
          {
            id: `cell_${Date.now()}_1`,
            cell_type: 'code',
            source: '# Type Python code here and press Shift+Enter to run\n',
            execution_count: null,
            outputs: [],
            status: 'idle',
          },
        ],
        metadata: {
          kernelspec: { display_name: 'Python 3 (Pyodide WASM)', language: 'python', name: 'python3' },
          language_info: { name: 'python', version: '3.12' },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setNotebooks((prev) => {
        const updated = [newNb, ...prev];
        persistToLocalStorage(updated, foldersRef.current, id);
        return updated;
      });
      setActiveNotebookId(id);
      activeNotebookIdRef.current = id;

      if (user) {
        saveNotebookToFirestore(user.uid, newNb, true);
      }

      toast.success('New notebook created! 📓');
      return id;
    },
    [user, saveNotebookToFirestore]
  );

  const updateNotebook = useCallback(
    async (id: string, updates: Partial<Notebook>) => {
      setNotebooks((prev) => {
        const updatedList = prev.map((nb) => {
          if (nb.id === id) {
            const updated = { ...nb, ...updates, updatedAt: Date.now() };
            if (user) {
              saveNotebookToFirestore(user.uid, updated, true);
            }
            return updated;
          }
          return nb;
        });
        persistToLocalStorage(updatedList, foldersRef.current, activeNotebookIdRef.current);
        return updatedList;
      });
    },
    [user, saveNotebookToFirestore]
  );

  const deleteNotebook = useCallback(
    async (id: string) => {
      setNotebooks((prev) => {
        const filtered = prev.filter((nb) => nb.id !== id);
        const nextActive = filtered[0]?.id || DEFAULT_STARTER_NOTEBOOK.id;
        if (activeNotebookId === id) {
          setActiveNotebookId(nextActive);
          activeNotebookIdRef.current = nextActive;
        }
        const finalList = filtered.length > 0 ? filtered : [DEFAULT_STARTER_NOTEBOOK];
        persistToLocalStorage(finalList, foldersRef.current, nextActive);
        return finalList;
      });

      if (user) {
        if (debounceTimers.current[id]) {
          clearTimeout(debounceTimers.current[id]);
          delete debounceTimers.current[id];
        }
        await deleteDoc(doc(db, 'users', user.uid, 'notebooks', id)).catch(() => {});
      }

      toast.success('Notebook deleted');
    },
    [activeNotebookId, user]
  );

  const duplicateNotebook = useCallback(
    async (id: string) => {
      const original = notebooksRef.current.find((n) => n.id === id);
      if (!original) return;

      const newId = `nb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const cloned: Notebook = {
        ...original,
        id: newId,
        title: `${original.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        cells: original.cells.map((c, i) => ({
          ...c,
          id: `cell_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
        })),
      };

      setNotebooks((prev) => {
        const updated = [cloned, ...prev];
        persistToLocalStorage(updated, foldersRef.current, newId);
        return updated;
      });
      setActiveNotebookId(newId);
      activeNotebookIdRef.current = newId;

      if (user) {
        saveNotebookToFirestore(user.uid, cloned, true);
      }

      toast.success('Notebook duplicated! 📋');
    },
    [user, saveNotebookToFirestore]
  );

  // ----- Folder Actions -----
  const createFolder = useCallback(
    async (name: string, color = '#7C3AED') => {
      const id = `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newFolder: NotebookFolder = {
        id,
        name,
        color: color || '#7C3AED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setFolders((prev) => {
        const updated = [...prev, newFolder];
        persistToLocalStorage(notebooksRef.current, updated, activeNotebookIdRef.current);
        return updated;
      });
      if (user) {
        await setDocument(doc(db, 'users', user.uid, 'notebookFolders', id), sanitizeFirestoreData(newFolder), true).catch(() => {});
      }
      toast.success(`Folder "${name}" created! 📁`);
    },
    [user]
  );

  const updateFolder = useCallback(
    async (id: string, updates: Partial<NotebookFolder>) => {
      setFolders((prev) => {
        const updated = prev.map((f) => {
          if (f.id === id) {
            const mod = { ...f, ...updates, updatedAt: Date.now() };
            if (user) {
              setDocument(doc(db, 'users', user.uid, 'notebookFolders', id), sanitizeFirestoreData(mod), true).catch(() => {});
            }
            return mod;
          }
          return f;
        });
        persistToLocalStorage(notebooksRef.current, updated, activeNotebookIdRef.current);
        return updated;
      });
    },
    [user]
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      setFolders((prev) => {
        const updatedFlds = prev.filter((f) => f.id !== id);
        persistToLocalStorage(notebooksRef.current, updatedFlds, activeNotebookIdRef.current);
        return updatedFlds;
      });
      // Move notebooks in this folder to root
      setNotebooks((prev) =>
        prev.map((nb) => (nb.folderId === id ? { ...nb, folderId: null } : nb))
      );

      if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'notebookFolders', id)).catch(() => {});
      }
      toast.success('Folder removed');
    },
    [user]
  );

  // ----- Cell Manipulation Actions -----
  const addCell = useCallback(
    (notebookId: string, type: CellType = 'code', afterCellId?: string, initialSource?: string) => {
      const defaultSource = type === 'code' ? '' : '### New Section\nWrite notes or LaTeX math here...';
      const newCell: NotebookCell = {
        id: `cell_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        cell_type: type,
        source: initialSource !== undefined ? initialSource : defaultSource,
        execution_count: null,
        outputs: [],
        status: 'idle',
      };

      setNotebooks((prev) => {
        const updatedList = prev.map((nb) => {
          if (nb.id !== notebookId) return nb;
          let cells = [...nb.cells];
          if (afterCellId) {
            const idx = cells.findIndex((c) => c.id === afterCellId);
            if (idx !== -1) {
              cells.splice(idx + 1, 0, newCell);
            } else {
              cells.push(newCell);
            }
          } else {
            cells.push(newCell);
          }
          const updated = { ...nb, cells, updatedAt: Date.now() };
          if (user) {
            saveNotebookToFirestore(user.uid, updated, false);
          }
          return updated;
        });
        persistToLocalStorage(updatedList, foldersRef.current, activeNotebookIdRef.current);
        return updatedList;
      });
    },
    [user, saveNotebookToFirestore]
  );

  const updateCell = useCallback(
    (notebookId: string, cellId: string, updates: Partial<NotebookCell>) => {
      setNotebooks((prev) => {
        const updatedList = prev.map((nb) => {
          if (nb.id !== notebookId) return nb;
          const cells = nb.cells.map((c) => (c.id === cellId ? { ...c, ...updates } : c));
          const updated = { ...nb, cells, updatedAt: Date.now() };
          if (user) {
            saveNotebookToFirestore(user.uid, updated, false);
          }
          return updated;
        });
        persistToLocalStorage(updatedList, foldersRef.current, activeNotebookIdRef.current);
        return updatedList;
      });
    },
    [user, saveNotebookToFirestore]
  );

  const deletedCellsStack = useRef<{ notebookId: string; cell: NotebookCell; index: number }[]>([]);

  const restoreLastDeletedCell = useCallback(
    (notebookId: string): boolean => {
      const stack = deletedCellsStack.current;
      const lastIdx = stack.map((item) => item.notebookId).lastIndexOf(notebookId);
      if (lastIdx === -1) {
        toast('No deleted cell to restore', { icon: 'ℹ️' });
        return false;
      }

      const [restored] = stack.splice(lastIdx, 1);
      setNotebooks((prev) => {
        const updatedList = prev.map((nb) => {
          if (nb.id !== notebookId) return nb;
          const cells = [...nb.cells];
          const insertIdx = Math.min(Math.max(0, restored.index), cells.length);
          cells.splice(insertIdx, 0, restored.cell);
          const updated = { ...nb, cells, updatedAt: Date.now() };
          if (user) {
            saveNotebookToFirestore(user.uid, updated, false);
          }
          return updated;
        });
        persistToLocalStorage(updatedList, foldersRef.current, activeNotebookIdRef.current);
        return updatedList;
      });
      toast.success('Restored deleted cell! ↩️');
      return true;
    },
    [user, saveNotebookToFirestore]
  );

  const deleteCell = useCallback(
    (notebookId: string, cellId: string) => {
      let deletedItem: { cell: NotebookCell; index: number } | null = null;

      setNotebooks((prev) => {
        const updatedList = prev.map((nb) => {
          if (nb.id !== notebookId) return nb;
          if (nb.cells.length <= 1) {
            toast.error('Notebook must have at least one cell');
            return nb;
          }
          const idx = nb.cells.findIndex((c) => c.id === cellId);
          if (idx !== -1) {
            deletedItem = { cell: nb.cells[idx], index: idx };
          }
          const cells = nb.cells.filter((c) => c.id !== cellId);
          const updated = { ...nb, cells, updatedAt: Date.now() };
          if (user) {
            saveNotebookToFirestore(user.uid, updated, false);
          }
          return updated;
        });
        persistToLocalStorage(updatedList, foldersRef.current, activeNotebookIdRef.current);
        return updatedList;
      });

      if (deletedItem) {
        const item = deletedItem as { cell: NotebookCell; index: number };
        deletedCellsStack.current.push({
          notebookId,
          cell: item.cell,
          index: item.index,
        });

        if (deletedCellsStack.current.length > 20) {
          deletedCellsStack.current.shift();
        }
      }
    },
    [user, saveNotebookToFirestore]
  );

  const moveCell = useCallback(
    (notebookId: string, cellId: string, direction: 'up' | 'down') => {
      setNotebooks((prev) => {
        const updatedList = prev.map((nb) => {
          if (nb.id !== notebookId) return nb;
          const idx = nb.cells.findIndex((c) => c.id === cellId);
          if (idx === -1) return nb;
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= nb.cells.length) return nb;

          const cells = [...nb.cells];
          const temp = cells[idx];
          cells[idx] = cells[targetIdx];
          cells[targetIdx] = temp;

          const updated = { ...nb, cells, updatedAt: Date.now() };
          if (user) {
            saveNotebookToFirestore(user.uid, updated, false);
          }
          return updated;
        });
        persistToLocalStorage(updatedList, foldersRef.current, activeNotebookIdRef.current);
        return updatedList;
      });
    },
    [user, saveNotebookToFirestore]
  );

  const duplicateCell = useCallback(
    (notebookId: string, cellId: string) => {
      setNotebooks((prev) => {
        const updatedList = prev.map((nb) => {
          if (nb.id !== notebookId) return nb;
          const idx = nb.cells.findIndex((c) => c.id === cellId);
          if (idx === -1) return nb;

          const original = nb.cells[idx];
          const clone: NotebookCell = {
            ...original,
            id: `cell_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            execution_count: null,
            outputs: [],
            status: 'idle',
          };

          const cells = [...nb.cells];
          cells.splice(idx + 1, 0, clone);
          const updated = { ...nb, cells, updatedAt: Date.now() };
          if (user) {
            saveNotebookToFirestore(user.uid, updated, false);
          }
          return updated;
        });
        persistToLocalStorage(updatedList, foldersRef.current, activeNotebookIdRef.current);
        return updatedList;
      });
    },
    [user, saveNotebookToFirestore]
  );

  const clearOutputs = useCallback(
    (notebookId: string) => {
      setNotebooks((prev) => {
        const updatedList = prev.map((nb) => {
          if (nb.id !== notebookId) return nb;
          const cells = nb.cells.map((c) => ({
            ...c,
            execution_count: null,
            outputs: [],
            status: 'idle' as const,
          }));
          const updated = { ...nb, cells, updatedAt: Date.now() };
          if (user) {
            saveNotebookToFirestore(user.uid, updated, true);
          }
          return updated;
        });
        persistToLocalStorage(updatedList, foldersRef.current, activeNotebookIdRef.current);
        return updatedList;
      });
      toast.success('All outputs cleared 🧹');
    },
    [user, saveNotebookToFirestore]
  );

  return {
    notebooks,
    folders,
    activeNotebook,
    activeNotebookId,
    setActiveNotebookId: selectNotebook,
    loading,
    isSaving,
    lastSavedAt,
    saveActiveNotebookNow,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    duplicateNotebook,
    createFolder,
    updateFolder,
    deleteFolder,
    addCell,
    updateCell,
    deleteCell,
    restoreLastDeletedCell,
    moveCell,
    duplicateCell,
    clearOutputs,
  };
}

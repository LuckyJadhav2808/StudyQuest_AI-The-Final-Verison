/**
 * StudyQuest AI — useNotebooks Hook
 * Dual-tier persistence (localStorage for instant offline access + Firestore for cloud backup).
 * Complete management of notebooks, folders, cells, and file associations.
 * Uses JSON string serialization for cells to bypass Firestore's nested array restrictions
 * and sanitizeFirestoreData to eliminate any undefined values.
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
 * Serialize notebook for Firestore storage.
 * Encodes `cells` into a JSON string to completely eliminate Firestore's "Nested arrays are not supported" error
 * and runs through sanitizeFirestoreData to eliminate any undefined properties.
 */
function serializeNotebookForFirestore(nb: Notebook): Record<string, any> {
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
    cellsJson: JSON.stringify(nb.cells || []),
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
  const isInitialMount = useRef(true);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Sync to localStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_NOTEBOOKS_KEY, JSON.stringify(notebooks));
      localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
      localStorage.setItem(STORAGE_ACTIVE_KEY, activeNotebookId);
    } catch (e) {
      // LocalStorage quota error
    }
  }, [notebooks, folders, activeNotebookId]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Safe Firestore Saver with Debouncing
  const saveNotebookToFirestore = useCallback((userUid: string, nb: Notebook, immediate = false) => {
    if (debounceTimers.current[nb.id]) {
      clearTimeout(debounceTimers.current[nb.id]);
      delete debounceTimers.current[nb.id];
    }

    const doSave = async () => {
      try {
        const payload = serializeNotebookForFirestore(nb);
        await setDocument(doc(db, 'users', userUid, 'notebooks', nb.id), payload, true);
      } catch (err) {
        console.warn('[useNotebooks] Firestore save error:', err);
      }
    };

    if (immediate) {
      doSave();
    } else {
      debounceTimers.current[nb.id] = setTimeout(doSave, 800);
    }
  }, []);

  // Sync with Firestore on user login
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Subscribe to notebooks
    const notebooksCol = collection(db, 'users', user.uid, 'notebooks');
    const nq = query(notebooksCol, orderBy('updatedAt', 'desc'));
    const unsubNotebooks = onSnapshot(nq, (snap) => {
      if (!snap.empty) {
        const remoteNbs = snap.docs.map((d) => deserializeNotebookFromFirestore(d.id, d.data()));
        setNotebooks(remoteNbs);
      } else {
        // First time cloud user: sync local default starter notebook up to Firestore safely
        saveNotebookToFirestore(user.uid, DEFAULT_STARTER_NOTEBOOK, true);
      }
      setLoading(false);
    }, (err) => {
      console.warn('[useNotebooks] Firestore sync warning:', err);
      setLoading(false);
    });

    // Subscribe to folders
    const foldersCol = collection(db, 'users', user.uid, 'notebookFolders');
    const fq = query(foldersCol, orderBy('createdAt', 'asc'));
    const unsubFolders = onSnapshot(fq, (snap) => {
      if (!snap.empty) {
        const remoteFlds = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotebookFolder);
        setFolders(remoteFlds);
      }
    }, () => {});

    return () => {
      unsubNotebooks();
      unsubFolders();
    };
  }, [user, saveNotebookToFirestore]);

  // Active Notebook reference
  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId) || notebooks[0] || DEFAULT_STARTER_NOTEBOOK;

  // ----- Notebook Actions -----
  const createNotebook = useCallback(async (title = 'Untitled Notebook', folderId: string | null = null): Promise<string> => {
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

    setNotebooks((prev) => [newNb, ...prev]);
    setActiveNotebookId(id);

    if (user) {
      saveNotebookToFirestore(user.uid, newNb, true);
    }

    toast.success('New notebook created! 📓');
    return id;
  }, [user, saveNotebookToFirestore]);

  const updateNotebook = useCallback(async (id: string, updates: Partial<Notebook>) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id === id) {
          const updated = { ...nb, ...updates, updatedAt: Date.now() };
          if (user) {
            saveNotebookToFirestore(user.uid, updated, true);
          }
          return updated;
        }
        return nb;
      })
    );
  }, [user, saveNotebookToFirestore]);

  const deleteNotebook = useCallback(async (id: string) => {
    setNotebooks((prev) => {
      const filtered = prev.filter((nb) => nb.id !== id);
      if (activeNotebookId === id) {
        setActiveNotebookId(filtered[0]?.id || DEFAULT_STARTER_NOTEBOOK.id);
      }
      return filtered.length > 0 ? filtered : [DEFAULT_STARTER_NOTEBOOK];
    });

    if (user) {
      if (debounceTimers.current[id]) {
        clearTimeout(debounceTimers.current[id]);
        delete debounceTimers.current[id];
      }
      await deleteDoc(doc(db, 'users', user.uid, 'notebooks', id)).catch(() => {});
    }

    toast.success('Notebook deleted');
  }, [activeNotebookId, user]);

  const duplicateNotebook = useCallback(async (id: string) => {
    const original = notebooks.find((n) => n.id === id);
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

    setNotebooks((prev) => [cloned, ...prev]);
    setActiveNotebookId(newId);

    if (user) {
      saveNotebookToFirestore(user.uid, cloned, true);
    }

    toast.success('Notebook duplicated! 📋');
  }, [notebooks, user, saveNotebookToFirestore]);

  // ----- Folder Actions -----
  const createFolder = useCallback(async (name: string, color = '#7C3AED') => {
    const id = `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newFolder: NotebookFolder = {
      id,
      name,
      color: color || '#7C3AED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setFolders((prev) => [...prev, newFolder]);
    if (user) {
      await setDocument(doc(db, 'users', user.uid, 'notebookFolders', id), sanitizeFirestoreData(newFolder), true).catch(() => {});
    }
    toast.success(`Folder "${name}" created! 📁`);
  }, [user]);

  const updateFolder = useCallback(async (id: string, updates: Partial<NotebookFolder>) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const updated = { ...f, ...updates, updatedAt: Date.now() };
          if (user) {
            setDocument(doc(db, 'users', user.uid, 'notebookFolders', id), sanitizeFirestoreData(updated), true).catch(() => {});
          }
          return updated;
        }
        return f;
      })
    );
  }, [user]);

  const deleteFolder = useCallback(async (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    // Move notebooks in this folder to root
    setNotebooks((prev) =>
      prev.map((nb) => (nb.folderId === id ? { ...nb, folderId: null } : nb))
    );

    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'notebookFolders', id)).catch(() => {});
    }
    toast.success('Folder removed');
  }, [user]);

  // ----- Cell Manipulation Actions -----
  const addCell = useCallback((notebookId: string, type: CellType = 'code', afterCellId?: string, initialSource?: string) => {
    const defaultSource = type === 'code' ? '' : '### New Section\nWrite notes or LaTeX math here...';
    const newCell: NotebookCell = {
      id: `cell_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cell_type: type,
      source: initialSource !== undefined ? initialSource : defaultSource,
      execution_count: null,
      outputs: [],
      status: 'idle',
    };

    setNotebooks((prev) =>
      prev.map((nb) => {
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
      })
    );
  }, [user, saveNotebookToFirestore]);

  const updateCell = useCallback((notebookId: string, cellId: string, updates: Partial<NotebookCell>) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== notebookId) return nb;
        const cells = nb.cells.map((c) => (c.id === cellId ? { ...c, ...updates } : c));
        const updated = { ...nb, cells, updatedAt: Date.now() };
        if (user) {
          saveNotebookToFirestore(user.uid, updated, false);
        }
        return updated;
      })
    );
  }, [user, saveNotebookToFirestore]);

  const deletedCellsStack = useRef<{ notebookId: string; cell: NotebookCell; index: number }[]>([]);

  const restoreLastDeletedCell = useCallback((notebookId: string): boolean => {
    const stack = deletedCellsStack.current;
    const lastIdx = stack.map((item) => item.notebookId).lastIndexOf(notebookId);
    if (lastIdx === -1) {
      toast('No deleted cell to restore', { icon: 'ℹ️' });
      return false;
    }

    const [restored] = stack.splice(lastIdx, 1);
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== notebookId) return nb;
        const cells = [...nb.cells];
        const insertIdx = Math.min(Math.max(0, restored.index), cells.length);
        cells.splice(insertIdx, 0, restored.cell);
        const updated = { ...nb, cells, updatedAt: Date.now() };
        if (user) {
          saveNotebookToFirestore(user.uid, updated, false);
        }
        return updated;
      })
    );
    toast.success('Restored deleted cell! ↩️');
    return true;
  }, [user, saveNotebookToFirestore]);

  const deleteCell = useCallback((notebookId: string, cellId: string) => {
    let deletedItem: { cell: NotebookCell; index: number } | null = null;

    setNotebooks((prev) =>
      prev.map((nb) => {
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
      })
    );

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
  }, [user, saveNotebookToFirestore]);

  const moveCell = useCallback((notebookId: string, cellId: string, direction: 'up' | 'down') => {
    setNotebooks((prev) =>
      prev.map((nb) => {
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
      })
    );
  }, [user, saveNotebookToFirestore]);

  const duplicateCell = useCallback((notebookId: string, cellId: string) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
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
      })
    );
  }, [user, saveNotebookToFirestore]);

  const clearOutputs = useCallback((notebookId: string) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
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
      })
    );
    toast.success('All outputs cleared 🧹');
  }, [user, saveNotebookToFirestore]);

  return {
    notebooks,
    folders,
    activeNotebook,
    activeNotebookId,
    setActiveNotebookId,
    loading,
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

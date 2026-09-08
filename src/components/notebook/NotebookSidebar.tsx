/**
 * StudyQuest AI — Data Forge Notebook Sidebar Drawer
 * 4 Tabs:
 *  1. 📁 Notebooks & Folders: Organize multiple notebooks and college projects.
 *  2. 📂 Virtual Files: Colab File Explorer (Upload CSV datasets, download generated outputs).
 *  3. 📑 Table of Contents: Auto-generated from Markdown headings for instant navigation.
 *  4. 🔍 Variables Inspector: Live active Python in-memory variables, types, and shapes.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  HiFolder,
  HiDocumentText,
  HiDatabase,
  HiCube,
  HiPlus,
  HiTrash,
  HiDuplicate,
  HiUpload,
  HiDownload,
  HiRefresh,
  HiViewList,
  HiVariable,
  HiChevronRight,
  HiChevronDown,
  HiX,
  HiSearch,
  HiLightningBolt,
  HiCheck,
} from 'react-icons/hi';
import { Notebook, NotebookFolder, VirtualFile, VariableInfo, InstalledPackage } from '@/types/notebook';
import { pyodideBridge } from '@/lib/pyodideBridge';
import CreateFolderModal from './CreateFolderModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

type SidebarTab = 'notebooks' | 'files' | 'datasets' | 'packages' | 'outline' | 'variables';

interface NotebookSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notebooks: Notebook[];
  folders: NotebookFolder[];
  activeNotebookId: string;
  onSelectNotebook: (id: string) => void;
  onCreateNotebook: (title?: string, folderId?: string | null) => void;
  onDeleteNotebook: (id: string) => void;
  onDuplicateNotebook: (id: string) => void;
  onCreateFolder: (name: string, color?: string) => void;
  onDeleteFolder: (id: string) => void;
  onScrollToCell: (cellId: string) => void;
  activeNotebook: Notebook;
  onInsertDatasetCell?: (code: string) => void;
}

export default function NotebookSidebar({
  isOpen,
  onClose,
  notebooks,
  folders,
  activeNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onDeleteNotebook,
  onDuplicateNotebook,
  onCreateFolder,
  onDeleteFolder,
  onScrollToCell,
  activeNotebook,
  onInsertDatasetCell,
}: NotebookSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('notebooks');
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);
  const [variables, setVariables] = useState<VariableInfo[]>([]);
  const [openFolderIds, setOpenFolderIds] = useState<Record<string, boolean>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<NotebookFolder | null>(null);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datasets Hub State
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState('');
  const [mountingId, setMountingId] = useState<string | null>(null);

  // Packages State
  const [packages, setPackages] = useState<InstalledPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [pkgSearch, setPkgSearch] = useState('');
  const [newPkgInput, setNewPkgInput] = useState('');
  const [installingPkg, setInstallingPkg] = useState<string | null>(null);

  // Load Virtual Files from Pyodide
  const refreshFiles = async () => {
    try {
      const list = await pyodideBridge.listFiles();
      setVirtualFiles(list);
    } catch {
      setVirtualFiles([]);
    }
  };

  // Load Variables from Pyodide
  const refreshVariables = async () => {
    try {
      const vars = await pyodideBridge.getVariables();
      setVariables(vars);
    } catch {
      setVariables([]);
    }
  };

  // Load Available Datasets
  const loadDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const res = await fetch('/api/notebook/datasets');
      const data = await res.json();
      if (Array.isArray(data?.datasets)) {
        setDatasets(data.datasets);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingDatasets(false);
    }
  };

  // Load Installed Packages
  const refreshPackages = async () => {
    setLoadingPackages(true);
    try {
      const pkgs = await pyodideBridge.getPackages();
      setPackages(pkgs);
    } catch {
      setPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Mount Dataset into /workspace
  const handleMountDataset = async (dataset: any) => {
    setMountingId(dataset.id);
    const toastId = toast.loading(`Mounting ${dataset.filename} into /workspace...`);
    try {
      const res = await fetch(`/api/notebook/datasets?file=${encodeURIComponent(dataset.filename)}`);
      if (!res.ok) throw new Error('Failed to download dataset');
      const csvText = await res.text();
      await pyodideBridge.writeFile(dataset.filename, csvText, false);
      await refreshFiles();

      if (onInsertDatasetCell && dataset.starterCode) {
        onInsertDatasetCell(dataset.starterCode);
      }
      toast.success(`${dataset.name} mounted into /workspace! 🚀`, { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mount dataset', { id: toastId });
    } finally {
      setMountingId(null);
    }
  };

  // Install package via micropip
  const handleQuickInstall = async (pkgName: string) => {
    setInstallingPkg(pkgName);
    const toastId = toast.loading(`Installing '${pkgName}' via micropip...`);
    try {
      await pyodideBridge.installPackage(pkgName);
      await refreshPackages();
      toast.success(`'${pkgName}' is ready to import! 📦`, { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || `Failed to install '${pkgName}'`, { id: toastId });
    } finally {
      setInstallingPkg(null);
    }
  };

  const handleInstallNewPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPkgInput.trim();
    if (!trimmed) return;
    await handleQuickInstall(trimmed);
    setNewPkgInput('');
  };

  // Sync tab data when tab changes or opens
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'files') refreshFiles();
    if (activeTab === 'variables') refreshVariables();
    if (activeTab === 'datasets' && datasets.length === 0) loadDatasets();
    if (activeTab === 'packages') refreshPackages();
  }, [activeTab, isOpen]);

  // Handle Virtual File Upload (e.g. CSV dataset)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${file.name} to virtual workspace...`);

    try {
      const buffer = await file.arrayBuffer();
      await pyodideBridge.writeFile(file.name, buffer, true);
      await refreshFiles();
      toast.success(`${file.name} is ready for Python! 📊`, { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Virtual File Download
  const handleFileDownload = async (file: VirtualFile) => {
    try {
      const content = await pyodideBridge.readFile(file.name, true);
      const blob = new Blob([content]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download file');
    }
  };

  // Parse Table of Contents from Markdown cells
  const outlineItems = React.useMemo(() => {
    const items: { cellId: string; title: string; level: number }[] = [];
    activeNotebook.cells.forEach((cell) => {
      if (cell.cell_type === 'markdown') {
        const lines = cell.source.split('\n');
        lines.forEach((line) => {
          const match = line.match(/^(#{1,3})\s+(.+)$/);
          if (match) {
            items.push({
              cellId: cell.id,
              level: match[1].length,
              title: match[2].trim(),
            });
          }
        });
      }
    });
    return items;
  }, [activeNotebook.cells]);

  if (!isOpen) return null;

  return (
    <aside className="w-80 border-r border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col shrink-0 select-none z-20 h-full overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-[var(--card-border)] bg-slate-900/10 p-1">
        <div className="flex items-center gap-0.5 text-xs">
          {[
            { id: 'notebooks' as SidebarTab, label: 'Notebooks', icon: HiFolder },
            { id: 'files' as SidebarTab, label: 'Files', icon: HiDocumentText },
            { id: 'datasets' as SidebarTab, label: 'Datasets Hub', icon: HiDatabase },
            { id: 'packages' as SidebarTab, label: 'Packages', icon: HiCube },
            { id: 'outline' as SidebarTab, label: 'Outline', icon: HiViewList },
            { id: 'variables' as SidebarTab, label: 'Variables', icon: HiVariable },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                title={t.label}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 font-bold ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/50'
                }`}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[var(--muted-foreground)] hover:text-rose-500 rounded-lg"
          title="Close sidebar"
        >
          <HiX size={16} />
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {/* ================= TAB 1: NOTEBOOKS & FOLDERS ================= */}
        {activeTab === 'notebooks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                Notebooks & Projects
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setIsCreateFolderOpen(true)}
                  title="New Folder"
                  className="p-1.5 rounded-lg border border-[var(--card-border)] hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <HiFolder size={13} />
                </button>
                <button
                  onClick={() => onCreateNotebook()}
                  title="New Notebook"
                  className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 shadow-sm"
                >
                  <HiPlus size={13} />
                </button>
              </div>
            </div>

            {/* Folders */}
            {folders.map((folder) => {
              const isOpenFolder = openFolderIds[folder.id];
              const folderNbs = notebooks.filter((n) => n.folderId === folder.id);

              return (
                <div key={folder.id} className="rounded-xl border border-[var(--card-border)] overflow-hidden">
                  <div
                    onClick={() =>
                      setOpenFolderIds((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))
                    }
                    className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-900/50 cursor-pointer hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {isOpenFolder ? <HiChevronDown size={14} /> : <HiChevronRight size={14} />}
                      <HiFolder size={14} style={{ color: folder.color || '#7C3AED' }} />
                      <span>{folder.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({folderNbs.length})</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderToDelete(folder);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      title="Delete folder"
                    >
                      <HiTrash size={12} />
                    </button>
                  </div>

                  {isOpenFolder && (
                    <div className="p-1.5 space-y-1 bg-[var(--card-bg)]">
                      {folderNbs.map((nb) => (
                        <NotebookItem
                          key={nb.id}
                          nb={nb}
                          isActive={nb.id === activeNotebookId}
                          onSelect={() => onSelectNotebook(nb.id)}
                          onDuplicate={() => onDuplicateNotebook(nb.id)}
                          onDelete={() => setNotebookToDelete(nb)}
                        />
                      ))}
                      {folderNbs.length === 0 && (
                        <p className="text-[11px] text-slate-400 p-2 italic">Folder is empty.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Root Notebooks */}
            <div className="space-y-1">
              {notebooks
                .filter((n) => !n.folderId)
                .map((nb) => (
                  <NotebookItem
                    key={nb.id}
                    nb={nb}
                    isActive={nb.id === activeNotebookId}
                    onSelect={() => onSelectNotebook(nb.id)}
                    onDuplicate={() => onDuplicateNotebook(nb.id)}
                    onDelete={() => setNotebookToDelete(nb)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: VIRTUAL FILESYSTEM (COLAB FILES) ================= */}
        {activeTab === 'files' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                /workspace Files
              </span>
              <div className="flex gap-1">
                <button
                  onClick={refreshFiles}
                  title="Refresh files"
                  className="p-1.5 rounded-lg border border-[var(--card-border)] hover:border-primary/40 hover:text-primary"
                >
                  <HiRefresh size={13} />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-sm"
                >
                  <HiUpload size={12} />
                  <span>Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".csv,.json,.txt,.png,.jpg,.parquet"
                />
              </div>
            </div>

            <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              Files uploaded here are accessible in Python via <code className="text-primary font-bold">open(&apos;filename&apos;)</code> or <code className="text-primary font-bold">pd.read_csv(&apos;filename&apos;)</code>.
            </p>

            <div className="space-y-1 pt-1">
              {virtualFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-[var(--card-border)] hover:border-primary/40 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <HiDocumentText size={16} className="text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold truncate text-[11px]">{file.name}</p>
                      <p className="text-[9px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleFileDownload(file)}
                      title="Download file"
                      className="p-1 hover:text-primary rounded"
                    >
                      <HiDownload size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete ${file.name}?`)) {
                          await pyodideBridge.deleteFile(file.name);
                          await refreshFiles();
                        }
                      }}
                      title="Delete file"
                      className="p-1 hover:text-rose-500 rounded"
                    >
                      <HiTrash size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {virtualFiles.length === 0 && (
                <div className="text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                  <HiUpload size={24} className="mx-auto text-slate-400 mb-2 opacity-60" />
                  <p className="text-xs font-bold text-slate-500">No files in workspace</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Upload a CSV or create one in Python with df.to_csv()
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: DATASETS HUB ================= */}
        {activeTab === 'datasets' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                Datasets Hub ({datasets.length})
              </span>
              <button
                onClick={loadDatasets}
                title="Refresh datasets"
                className="p-1 text-slate-400 hover:text-primary rounded"
              >
                <HiRefresh size={13} className={loadingDatasets ? 'animate-spin' : ''} />
              </button>
            </div>

            <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              1-click mount real CSV datasets directly to <code className="text-primary font-bold">/workspace</code> with pre-configured starter code!
            </p>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={datasetSearch}
                onChange={(e) => setDatasetSearch(e.target.value)}
                placeholder="Search datasets..."
                className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-xs text-[var(--foreground)] outline-none focus:border-primary"
              />
              <HiSearch className="absolute left-2 top-2 text-slate-400" size={13} />
            </div>

            {/* Datasets List */}
            <div className="space-y-2.5">
              {datasets
                .filter(
                  (d) =>
                    !datasetSearch ||
                    d.name.toLowerCase().includes(datasetSearch.toLowerCase()) ||
                    d.description.toLowerCase().includes(datasetSearch.toLowerCase()) ||
                    d.category.toLowerCase().includes(datasetSearch.toLowerCase())
                )
                .map((ds) => (
                  <div
                    key={ds.id}
                    className="p-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-primary/40 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs min-w-0">
                        <span className="text-base shrink-0">{ds.icon}</span>
                        <span className="truncate text-[var(--foreground)]">{ds.name}</span>
                      </div>
                      <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                        {ds.category}
                      </span>
                    </div>

                    <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                      {ds.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-[var(--card-border)]/50">
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                        {ds.rows > 0 ? `${ds.rows} rows · ` : ''}{ds.filename}
                      </span>
                      <button
                        onClick={() => handleMountDataset(ds)}
                        disabled={mountingId === ds.id}
                        className="px-2 py-1 rounded-lg bg-primary text-white text-[10px] font-bold flex items-center gap-1 hover:bg-primary/90 shadow-sm disabled:opacity-50 transition-all shrink-0"
                      >
                        {mountingId === ds.id ? (
                          <HiRefresh size={10} className="animate-spin" />
                        ) : (
                          <HiLightningBolt size={10} />
                        )}
                        <span>Mount & Code</span>
                      </button>
                    </div>
                  </div>
                ))}
              {loadingDatasets && (
                <div className="text-center py-6 text-slate-400 text-xs flex items-center justify-center gap-2">
                  <HiRefresh size={14} className="animate-spin text-primary" />
                  <span>Loading datasets catalogue...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: PACKAGE MANAGER ================= */}
        {activeTab === 'packages' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                Package Manager ({packages.length})
              </span>
              <button
                onClick={refreshPackages}
                title="Refresh installed packages"
                className="p-1 text-slate-400 hover:text-primary rounded"
              >
                <HiRefresh size={13} className={loadingPackages ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Quick Install Bar */}
            <form onSubmit={handleInstallNewPackage} className="flex gap-1.5">
              <input
                type="text"
                value={newPkgInput}
                onChange={(e) => setNewPkgInput(e.target.value)}
                placeholder="pip install package_name..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-xs text-[var(--foreground)] outline-none focus:border-primary font-mono"
              />
              <button
                type="submit"
                disabled={!newPkgInput.trim() || !!installingPkg}
                className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 shadow-sm shrink-0"
              >
                {installingPkg === newPkgInput.trim() ? (
                  <HiRefresh size={12} className="animate-spin" />
                ) : (
                  <HiPlus size={12} />
                )}
                <span>Install</span>
              </button>
            </form>

            {/* Quick Add Chips */}
            <div>
              <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block mb-1.5">
                Popular Quick-Add Libraries
              </span>
              <div className="flex flex-wrap gap-1">
                {['plotly', 'sympy', 'networkx', 'statsmodels', 'wordcloud', 'regex', 'pillow', 'tabulate'].map((pkg) => {
                  const isInstalled = packages.some((p) => p.name.toLowerCase() === pkg.toLowerCase());
                  return (
                    <button
                      key={pkg}
                      type="button"
                      disabled={isInstalled || !!installingPkg}
                      onClick={() => handleQuickInstall(pkg)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-all flex items-center gap-1 border ${
                        isInstalled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 opacity-70 cursor-default'
                          : 'bg-slate-100 dark:bg-slate-800 text-[var(--foreground)] border-[var(--card-border)] hover:border-primary hover:text-primary'
                      }`}
                    >
                      {installingPkg === pkg ? (
                        <HiRefresh size={9} className="animate-spin text-primary" />
                      ) : isInstalled ? (
                        <HiCheck size={9} className="text-emerald-400" />
                      ) : (
                        <HiPlus size={9} />
                      )}
                      <span>{pkg}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Installed List Filter */}
            <div className="relative">
              <input
                type="text"
                value={pkgSearch}
                onChange={(e) => setPkgSearch(e.target.value)}
                placeholder="Filter installed packages..."
                className="w-full pl-7 pr-2 py-1 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-xs text-[var(--foreground)] outline-none focus:border-primary"
              />
              <HiSearch className="absolute left-2 top-2 text-slate-400" size={12} />
            </div>

            {/* Installed List */}
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {packages
                .filter((p) => !pkgSearch || p.name.toLowerCase().includes(pkgSearch.toLowerCase()))
                .map((pkg) => (
                  <div
                    key={pkg.name}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-slate-100/50 dark:bg-slate-900/40 border border-[var(--card-border)]/60 text-xs font-mono"
                  >
                    <span className="font-semibold truncate text-[var(--foreground)]">{pkg.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-400 shrink-0">
                      {pkg.version}
                    </span>
                  </div>
                ))}
              {packages.length === 0 && (
                <p className="text-[11px] text-slate-400 p-2 italic">
                  {loadingPackages ? 'Loading installed packages...' : 'No packages detected.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: TABLE OF CONTENTS (OUTLINE) ================= */}
        {activeTab === 'outline' && (
          <div className="space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Notebook Outline
            </span>

            <div className="space-y-1">
              {outlineItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onScrollToCell(item.cellId)}
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                  className="py-1.5 pr-2 rounded-lg hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors text-[11px] font-medium truncate flex items-center gap-1.5"
                >
                  <span className="text-primary font-bold">#</span>
                  <span className="truncate">{item.title}</span>
                </div>
              ))}

              {outlineItems.length === 0 && (
                <p className="text-[11px] text-slate-400 p-3 italic">
                  No headings found. Add Markdown cells with # Heading to build an outline.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: VARIABLE INSPECTOR ================= */}
        {activeTab === 'variables' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                Active Variables
              </span>
              <button
                onClick={refreshVariables}
                title="Refresh variables"
                className="p-1.5 rounded-lg border border-[var(--card-border)] hover:border-primary/40 hover:text-primary"
              >
                <HiRefresh size={13} />
              </button>
            </div>

            <div className="space-y-1.5">
              {variables.map((v) => (
                <div
                  key={v.name}
                  className="p-2.5 rounded-xl border border-[var(--card-border)] bg-slate-900/40 font-mono text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-400">{v.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400">
                      {v.type}
                    </span>
                  </div>
                  {v.shape && <p className="text-[10px] text-emerald-400">Shape: {v.shape}</p>}
                  <p className="text-[10px] text-slate-400 truncate">{v.value}</p>
                </div>
              ))}

              {variables.length === 0 && (
                <p className="text-[11px] text-slate-400 p-3 italic">
                  No active variables. Execute a code cell to define variables.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreateFolder={(name, color) => onCreateFolder(name, color)}
      />

      {/* Delete Folder Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={() => {
          if (folderToDelete) {
            onDeleteFolder(folderToDelete.id);
            setFolderToDelete(null);
          }
        }}
        title="Delete Folder"
        message={`Are you sure you want to delete "${folderToDelete?.name}"? Notebooks inside will be moved to the root list.`}
        confirmLabel="Delete Folder"
        variant="danger"
      />

      {/* Delete Notebook Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!notebookToDelete}
        onClose={() => setNotebookToDelete(null)}
        onConfirm={() => {
          if (notebookToDelete) {
            onDeleteNotebook(notebookToDelete.id);
            setNotebookToDelete(null);
          }
        }}
        title="Delete Notebook"
        message={`Are you sure you want to delete "${notebookToDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete Notebook"
        variant="danger"
      />
    </aside>
  );
}

// Single Notebook Item
function NotebookItem({
  nb,
  isActive,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  nb: Notebook;
  isActive: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
        isActive
          ? 'bg-primary/15 text-primary border border-primary/30 font-bold'
          : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-[var(--foreground)] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <HiDocumentText size={15} className={isActive ? 'text-primary' : 'text-slate-400'} />
        <span className="truncate text-xs">{nb.title}</span>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate notebook"
          className="p-1 hover:text-primary rounded"
        >
          <HiDuplicate size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete notebook"
          className="p-1 hover:text-rose-500 rounded transition-colors"
        >
          <HiTrash size={13} />
        </button>
      </div>
    </div>
  );
}

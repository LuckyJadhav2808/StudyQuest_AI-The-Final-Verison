'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus,
  HiSearch,
  HiCollection,
  HiBookmark,
  HiViewGrid,
  HiViewList,
  HiX,
  HiFilter,
} from 'react-icons/hi';
import { FaYoutube, FaGoogleDrive } from 'react-icons/fa';
import { useResources } from '@/hooks/useResources';
import FolderSidebar from './FolderSidebar';
import ResourceCard from './ResourceCard';
import AddResourceModal from './AddResourceModal';
import ResourceViewerModal from './ResourceViewerModal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Resource, ResourceType } from '@/types';

type FilterType = 'all' | ResourceType;

export default function ResourcesContent() {
  const {
    folders,
    resources,
    loading,
    addFolder,
    updateFolder,
    deleteFolder,
    addResource,
    updateResource,
    deleteResource,
    getResourcesByFolder,
    togglePinResource,
  } = useResources();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<FilterType>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isListView, setIsListView] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Compute folder counts
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach((r) => {
      counts[r.folderId] = (counts[r.folderId] || 0) + 1;
    });
    return counts;
  }, [resources]);

  // Compute vault stats
  const stats = useMemo(() => {
    let youtubeCount = 0;
    let drivePdfCount = 0;
    let pinnedCount = 0;

    resources.forEach((r) => {
      if (r.type === 'youtube') youtubeCount++;
      if (r.type === 'drive' || r.type === 'pdf') drivePdfCount++;
      if (r.isPinned) pinnedCount++;
    });

    return {
      total: resources.length,
      youtube: youtubeCount,
      drivePdf: drivePdfCount,
      pinned: pinnedCount,
    };
  }, [resources]);

  // Compute unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    resources.forEach((r) => {
      r.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [resources]);

  // Filtered and sorted resources (Pinned first, then date descending)
  const filteredResources = useMemo(() => {
    let items: Resource[] = selectedFolderId ? getResourcesByFolder(selectedFolderId) : resources;

    // Filter by type
    if (selectedType !== 'all') {
      items = items.filter((r: Resource) => r.type === selectedType);
    }

    // Filter by tag
    if (selectedTag) {
      items = items.filter((r: Resource) => r.tags?.includes(selectedTag));
    }

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (r: Resource) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          r.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    // Sort: Pinned items on top, then newest first
    return items.sort((a: Resource, b: Resource) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [selectedFolderId, resources, search, selectedType, selectedTag, getResourcesByFolder]);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* 1. Header & Main Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-[var(--foreground)]">
            Academic Resources Vault
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">
            Organize YouTube lectures, Google Drive textbooks, PDFs, notes, and study bookmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile folder sidebar toggle */}
          <button
            onClick={() => setShowSidebar(true)}
            className="lg:hidden p-2.5 rounded-xl border-2 border-[var(--card-border)] hover:bg-[var(--card-border)]/40 text-[var(--foreground)] transition-colors"
            title="Open Folders"
          >
            <HiCollection size={18} />
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)]">
            <button
              onClick={() => setIsListView(false)}
              className={`p-1.5 rounded-lg transition-colors ${
                !isListView ? 'bg-primary text-white' : 'text-[var(--muted-foreground)] hover:text-white'
              }`}
              title="Grid View"
            >
              <HiViewGrid size={16} />
            </button>
            <button
              onClick={() => setIsListView(true)}
              className={`p-1.5 rounded-lg transition-colors ${
                isListView ? 'bg-primary text-white' : 'text-[var(--muted-foreground)] hover:text-white'
              }`}
              title="List View"
            >
              <HiViewList size={16} />
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<HiPlus size={16} />}
            onClick={() => {
              setEditingResource(null);
              setShowAddModal(true);
            }}
          >
            Add Resource
          </Button>
        </div>
      </div>

      {/* 2. Vault Quick Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
            <HiCollection size={20} />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-[var(--foreground)]">{stats.total}</div>
            <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Total Saved
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-base">
            <FaYoutube size={18} />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-[var(--foreground)]">{stats.youtube}</div>
            <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              YouTube Videos
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-base">
            <FaGoogleDrive size={18} />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-[var(--foreground)]">{stats.drivePdf}</div>
            <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Drive / PDFs
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-base">
            <HiBookmark size={20} />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-[var(--foreground)]">{stats.pinned}</div>
            <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Pinned Items
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Vault Workspace Grid */}
      <div className="flex gap-4 relative items-start">
        {/* Folder Sidebar - Desktop (Sticky) */}
        <div className="hidden lg:block w-[260px] flex-shrink-0">
          <Card
            padding="none"
            hover={false}
            className="sticky top-4 max-h-[calc(100vh-140px)] overflow-hidden flex flex-col border-[var(--card-border)]"
          >
            <FolderSidebar
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onAddFolder={addFolder}
              onRenameFolder={(id, name) => updateFolder(id, { name })}
              onDeleteFolder={deleteFolder}
              folderCounts={folderCounts}
              totalCount={resources.length}
            />
          </Card>
        </div>

        {/* Mobile Slide-Out Folder Drawer */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              className="lg:hidden fixed inset-0 z-[999]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={() => setShowSidebar(false)}
              />
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-[290px] bg-[var(--card-bg)] border-r-2 border-[var(--card-border)] shadow-2xl flex flex-col"
                initial={{ x: -290 }}
                animate={{ x: 0 }}
                exit={{ x: -290 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              >
                <div className="flex items-center justify-between p-3 border-b border-[var(--card-border)]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Collections
                  </span>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <HiX size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <FolderSidebar
                    folders={folders}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={(id) => {
                      setSelectedFolderId(id);
                      setShowSidebar(false);
                    }}
                    onAddFolder={addFolder}
                    onRenameFolder={(id, name) => updateFolder(id, { name })}
                    onDeleteFolder={deleteFolder}
                    folderCounts={folderCounts}
                    totalCount={resources.length}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Resource Cards / List Area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search & Type Filter Controls */}
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <HiSearch
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${selectedFolder ? `in "${selectedFolder.name}"` : 'all resources'} by title, tags, or domain...`}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <HiX size={16} />
                </button>
              )}
            </div>

            {/* Type Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 ${
                  selectedType === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-white'
                }`}
              >
                All Formats
              </button>
              <button
                onClick={() => setSelectedType('youtube')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                  selectedType === 'youtube'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-red-400'
                }`}
              >
                <FaYoutube size={14} /> YouTube
              </button>
              <button
                onClick={() => setSelectedType('drive')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                  selectedType === 'drive'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-blue-400'
                }`}
              >
                <FaGoogleDrive size={14} /> Drive
              </button>
              <button
                onClick={() => setSelectedType('pdf')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 ${
                  selectedType === 'pdf'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-amber-400'
                }`}
              >
                PDFs
              </button>
              <button
                onClick={() => setSelectedType('text')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 ${
                  selectedType === 'text'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-emerald-400'
                }`}
              >
                Notes
              </button>
              <button
                onClick={() => setSelectedType('github')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 ${
                  selectedType === 'github'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-purple-400'
                }`}
              >
                GitHub
              </button>
              <button
                onClick={() => setSelectedType('link')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 ${
                  selectedType === 'link'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-sky-400'
                }`}
              >
                Web
              </button>
            </div>

            {/* Tag Cloud Filter Bar */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-[11px]">
                <span className="text-[var(--muted-foreground)] font-semibold flex items-center gap-1 mr-1 flex-shrink-0">
                  <HiFilter size={12} /> Tags:
                </span>
                {allTags.map((tag) => {
                  const isActive = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isActive ? null : tag)}
                      className={`px-2 py-0.5 rounded-lg font-medium transition-colors flex-shrink-0 ${
                        isActive
                          ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                          : 'bg-[var(--card-bg)] text-[var(--muted-foreground)] border border-[var(--card-border)] hover:border-slate-500/40'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-[10px] text-coral hover:underline font-semibold flex-shrink-0 ml-1"
                  >
                    Clear tag
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Folder Subheader */}
          {selectedFolder && (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedFolder.icon}</span>
                <h2 className="font-heading font-black text-lg text-[var(--foreground)]">
                  {selectedFolder.name}
                </h2>
                <span className="text-xs text-[var(--muted-foreground)] font-mono">
                  ({filteredResources.length} items)
                </span>
              </div>
              <button
                onClick={() => setSelectedFolderId(null)}
                className="text-xs text-primary hover:underline font-semibold"
              >
                View all folders
              </button>
            </div>
          )}

          {/* Resource Display: Cards or List */}
          {filteredResources.length > 0 ? (
            isListView ? (
              <div className="space-y-2">
                {filteredResources.map((resource: Resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onDelete={deleteResource}
                    onEdit={(r: Resource) => {
                      setEditingResource(r);
                      setShowAddModal(true);
                    }}
                    onView={(r: Resource) => setViewingResource(r)}
                    onTogglePin={togglePinResource}
                    isListView={true}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredResources.map((resource: Resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onDelete={deleteResource}
                    onEdit={(r: Resource) => {
                      setEditingResource(r);
                      setShowAddModal(true);
                    }}
                    onView={(r: Resource) => setViewingResource(r)}
                    onTogglePin={togglePinResource}
                    isListView={false}
                  />
                ))}
              </div>
            )
          ) : (
            <Card hover={false} className="text-center py-16 border-[var(--card-border)]">
              <HiCollection className="mx-auto text-[var(--muted)] mb-3" size={44} />
              <h3 className="font-heading font-bold text-lg mb-1 text-[var(--foreground)]">
                {search || selectedType !== 'all' || selectedTag
                  ? 'No matching resources found'
                  : 'Your Vault is empty'}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] max-w-md mx-auto mb-4">
                {search || selectedType !== 'all' || selectedTag
                  ? 'Try clearing active filters or searching with a different term.'
                  : 'Start adding YouTube lectures, Google Drive PDFs, cheat sheets, or web references.'}
              </p>
              {!search && selectedType === 'all' && !selectedTag ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<HiPlus size={14} />}
                  onClick={() => {
                    setEditingResource(null);
                    setShowAddModal(true);
                  }}
                >
                  Add Your First Resource
                </Button>
              ) : (
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedType('all');
                    setSelectedTag(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-colors"
                >
                  Reset All Filters
                </button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* 4. In-App Study Viewer Modal */}
      <ResourceViewerModal
        isOpen={!!viewingResource}
        onClose={() => setViewingResource(null)}
        resource={viewingResource}
        onTogglePin={togglePinResource}
      />

      {/* 5. Add / Edit Resource Modal */}
      <AddResourceModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingResource(null);
        }}
        folders={folders}
        selectedFolderId={selectedFolderId}
        onAdd={addResource}
        editingResource={editingResource}
        onUpdate={updateResource}
        onAddFolder={addFolder}
      />
    </div>
  );
}

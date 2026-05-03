'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiSearch, HiCollection } from 'react-icons/hi';
import { useResources } from '@/hooks/useResources';
import FolderSidebar from './FolderSidebar';
import ResourceCard from './ResourceCard';
import AddResourceModal from './AddResourceModal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Resource } from '@/types';

export default function ResourcesContent() {
  const {
    folders, resources, loading,
    addFolder, updateFolder, deleteFolder,
    addResource, updateResource, deleteResource,
    getResourcesByFolder,
  } = useResources();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [search, setSearch] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

  // Filtered resources
  const filteredResources = useMemo(() => {
    let items = selectedFolderId ? getResourcesByFolder(selectedFolderId) : resources;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [selectedFolderId, resources, search, getResourcesByFolder]);

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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-heading font-black">Resources Vault</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Organize your study links, PDFs, and notes in folders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-2 rounded-xl border-2 border-[var(--card-border)] hover:bg-[var(--card-border)]/40 transition-colors"
          >
            <HiCollection size={18} />
          </button>
          <Button
            variant="primary"
            size="sm"
            icon={<HiPlus size={14} />}
            onClick={() => {
              setEditingResource(null);
              setShowAddModal(true);
            }}
          >
            Add Resource
          </Button>
        </div>
      </div>

      <div className="flex gap-4 relative">
        {/* Folder Sidebar - Desktop */}
        <div className="hidden lg:block w-[240px] flex-shrink-0">
          <Card padding="none" hover={false} className="sticky top-4 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
            <FolderSidebar
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onAddFolder={addFolder}
              onRenameFolder={(id, name) => updateFolder(id, { name })}
              onDeleteFolder={deleteFolder}
            />
          </Card>
        </div>

        {/* Folder Sidebar - Mobile overlay */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              className="lg:hidden fixed inset-0 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-[280px] bg-[var(--card-bg)] border-r-2 border-[var(--card-border)] shadow-2xl"
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
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
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search bar */}
          <div className="mb-4 relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${selectedFolder ? `in "${selectedFolder.name}"` : 'all resources'}...`}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors"
            />
          </div>

          {/* Folder name header */}
          {selectedFolder && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{selectedFolder.icon}</span>
              <h2 className="font-heading font-bold text-lg">{selectedFolder.name}</h2>
              <span className="text-xs text-[var(--muted-foreground)]">
                ({filteredResources.length} {filteredResources.length === 1 ? 'item' : 'items'})
              </span>
            </div>
          )}

          {/* Resources grid */}
          {filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onDelete={deleteResource}
                  onEdit={(r) => {
                    setEditingResource(r);
                    setShowAddModal(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <Card hover={false} className="text-center py-16">
              <HiCollection className="mx-auto text-[var(--muted)] mb-3" size={48} />
              <h3 className="font-heading font-bold text-lg mb-1">
                {search ? 'No results found' : 'No resources yet'}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                {search
                  ? 'Try a different search term'
                  : 'Save your first link, PDF, or text note to get started!'}
              </p>
              {!search && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<HiPlus size={14} />}
                  onClick={() => {
                    setEditingResource(null);
                    setShowAddModal(true);
                  }}
                >
                  Add Resource
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Add / Edit Resource Modal */}
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
      />
    </div>
  );
}

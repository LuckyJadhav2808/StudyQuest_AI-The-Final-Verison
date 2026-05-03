'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiPencil, HiTrash, HiFolder, HiFolderOpen } from 'react-icons/hi';
import { ResourceFolder } from '@/types';

const FOLDER_COLORS = [
  '#7C3AED', '#EC4899', '#10B981', '#FF6B6B', '#06D6A0',
  '#FFD166', '#4CC9F0', '#FF85A1', '#B5E48C', '#F59E0B',
];

const FOLDER_ICONS = ['📁', '📚', '🔗', '📄', '💡', '🎯', '⚡', '🧠', '🎨', '🛠️', '📐', '🔬'];

interface FolderSidebarProps {
  folders: ResourceFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onAddFolder: (data: Omit<ResourceFolder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

export default function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);
  const [newIcon, setNewIcon] = useState('📁');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onAddFolder({ name: newName.trim(), color: newColor, icon: newIcon });
    setNewName('');
    setShowCreate(false);
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    onRenameFolder(id, editName.trim());
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--card-border)]">
        <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">
          Folders
        </span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
          title="New Folder"
        >
          <HiPlus size={16} />
        </button>
      </div>

      {/* Create folder form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="px-3 py-3 border-b border-[var(--card-border)] space-y-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Folder name..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            {/* Color picker */}
            <div className="flex gap-1 flex-wrap">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-primary' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            {/* Icon picker */}
            <div className="flex gap-1 flex-wrap">
              {FOLDER_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`w-7 h-7 text-sm rounded-lg flex items-center justify-center transition-all ${newIcon === icon ? 'bg-primary/20 scale-110' : 'hover:bg-[var(--card-border)]'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreate}
              className="w-full py-1.5 rounded-lg bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary-dark transition-colors"
            >
              Create Folder
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Resources option */}
      <button
        onClick={() => onSelectFolder(null)}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all ${
          selectedFolderId === null
            ? 'bg-primary/10 text-primary border-r-3 border-primary'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40'
        }`}
      >
        <HiFolderOpen size={16} />
        <span>All Resources</span>
        </button>

      {/* Folder list */}
      <div className="flex-1 overflow-y-auto py-1">
        {folders.map((folder) => (
          <div key={folder.id} className="group relative">
            {editingId === folder.id ? (
              <div className="flex items-center gap-1 px-3 py-1.5">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1 rounded-md bg-[var(--background)] border border-[var(--card-border)] text-xs outline-none focus:border-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(folder.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
                <button onClick={() => handleRename(folder.id)} className="text-xs text-primary font-bold">✓</button>
              </div>
            ) : (
              <button
                onClick={() => onSelectFolder(folder.id)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  selectedFolderId === folder.id
                    ? 'bg-primary/10 text-primary border-r-3 border-primary'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40'
                }`}
              >
                <span className="text-base">{folder.icon}</span>
                <span className="truncate flex-1 text-left">{folder.name}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: folder.color }}
                />
              </button>
            )}

            {/* Actions */}
            {editingId !== folder.id && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(folder.id);
                    setEditName(folder.name);
                  }}
                  className="p-1 rounded hover:bg-[var(--muted)]/30 text-[var(--muted-foreground)]"
                >
                  <HiPencil size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this folder and all its resources?')) onDeleteFolder(folder.id);
                  }}
                  className="p-1 rounded hover:bg-coral/10 text-coral"
                >
                  <HiTrash size={12} />
                </button>
              </div>
            )}
          </div>
        ))}

        {folders.length === 0 && !showCreate && (
          <div className="px-4 py-8 text-center">
            <HiFolder className="mx-auto text-[var(--muted)] mb-2" size={32} />
            <p className="text-xs text-[var(--muted-foreground)]">No folders yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 text-xs text-primary font-semibold hover:underline"
            >
              Create your first folder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

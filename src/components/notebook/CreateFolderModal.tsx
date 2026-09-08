/**
 * StudyQuest AI — CreateFolderModal for Data Forge
 * Interactive modal allowing users to name a new folder, pick a custom color accent,
 * see a live preview of the folder badge, and submit via Enter key.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { HiFolder, HiCheck, HiPlus } from 'react-icons/hi';

export const FOLDER_COLOR_PRESETS = [
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Rose', hex: '#EC4899' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Teal', hex: '#14B8A6' },
];

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, color: string) => void;
}

export default function CreateFolderModal({
  isOpen,
  onClose,
  onCreateFolder,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLOR_PRESETS[0].hex);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setSelectedColor(FOLDER_COLOR_PRESETS[0].hex);
      setError('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) {
      setError('Please enter a folder name');
      inputRef.current?.focus();
      return;
    }
    onCreateFolder(trimmed, selectedColor);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Folder" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header Visual */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-[var(--card-border)]">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner transition-colors duration-200"
            style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}
          >
            <HiFolder size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--muted-foreground)] font-medium">Live Preview</p>
            <p className="text-sm font-bold truncate text-[var(--foreground)]">
              {folderName.trim() || 'Untitled Folder'}
            </p>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[var(--background)] border border-[var(--card-border)] text-[var(--muted-foreground)]">
            Folder
          </span>
        </div>

        {/* Name Input */}
        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
            Folder Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={folderName}
              maxLength={40}
              onChange={(e) => {
                setFolderName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Deep Learning, Data Structures, Sem 5 ML..."
              className={`w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 outline-none transition-all ${
                error
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-[var(--card-border)] focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)]">
              {folderName.length}/40
            </span>
          </div>
          {error && <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>}
        </div>

        {/* Color Accent Picker */}
        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-2">
            Folder Color Accent
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {FOLDER_COLOR_PRESETS.map((color) => {
              const isSelected = selectedColor === color.hex;
              return (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(color.hex)}
                  title={color.name}
                  className={`group relative h-9 rounded-xl flex items-center justify-center transition-all transform active:scale-95 ${
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-[var(--card-bg)] scale-105 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: color.hex,
                    outlineColor: color.hex,
                  }}
                >
                  {isSelected && (
                    <HiCheck className="text-white drop-shadow-sm animate-in zoom-in-50 duration-150" size={16} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--card-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="text-xs px-4 py-2 flex items-center gap-1.5 shadow-md"
            disabled={!folderName.trim()}
          >
            <HiPlus size={14} />
            Create Folder
          </Button>
        </div>
      </form>
    </Modal>
  );
}

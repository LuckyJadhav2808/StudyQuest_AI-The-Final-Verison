'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { HiFolder } from 'react-icons/hi';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, folder: string) => Promise<void>;
  defaultFolder?: string;
}

export function CreateNoteModal({
  isOpen,
  onClose,
  onCreate,
  defaultFolder = 'General',
}: CreateNoteModalProps) {
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState(defaultFolder);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setFolder(defaultFolder);
      setIsCreating(false);
    }
  }, [isOpen, defaultFolder]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onCreate(title.trim(), folder.trim() || 'General');
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Scroll">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          placeholder="e.g. Physics Chapter 4 — Quantum Mechanics"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <Input
          label="Folder / Category"
          placeholder="e.g. Physics, Computer Science, General"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          icon={<HiFolder size={16} />}
        />
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={isCreating}
            disabled={!title.trim()}
            className="flex-1"
          >
            Create Scroll
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface RenameNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle: string;
  initialFolder: string;
  onRename: (title: string, folder: string) => Promise<void>;
}

export function RenameNoteModal({
  isOpen,
  onClose,
  initialTitle,
  initialFolder,
  onRename,
}: RenameNoteModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [folder, setFolder] = useState(initialFolder);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setFolder(initialFolder);
      setIsSaving(false);
    }
  }, [isOpen, initialTitle, initialFolder]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onRename(title.trim(), folder.trim() || 'General');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rename Note & Organize">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Note Title"
          placeholder="e.g. Algorithms & Data Structures"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <Input
          label="Folder"
          placeholder="e.g. Algorithms, General"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          icon={<HiFolder size={16} />}
        />
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={isSaving}
            disabled={!title.trim()}
            className="flex-1"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

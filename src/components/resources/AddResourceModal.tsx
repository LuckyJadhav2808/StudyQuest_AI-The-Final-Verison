'use client';

import React, { useState } from 'react';
import { HiLink, HiDocumentText, HiX } from 'react-icons/hi';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Resource, ResourceType, ResourceFolder } from '@/types';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: ResourceFolder[];
  selectedFolderId: string | null;
  onAdd: (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingResource?: Resource | null;
  onUpdate?: (id: string, data: Partial<Resource>) => void;
}

const TYPE_OPTIONS: { type: ResourceType; icon: React.ReactNode; label: string; desc: string }[] = [
  { type: 'link', icon: <HiLink size={20} />, label: 'Link', desc: 'Save a URL' },
  { type: 'pdf', icon: <HiDocumentText size={20} />, label: 'PDF', desc: 'Link to a PDF' },
  { type: 'text', icon: <HiDocumentText size={20} />, label: 'Text', desc: 'Save a note' },
];

export default function AddResourceModal({
  isOpen,
  onClose,
  folders,
  selectedFolderId,
  onAdd,
  editingResource,
  onUpdate,
}: AddResourceModalProps) {
  const [type, setType] = useState<ResourceType>(editingResource?.type || 'link');
  const [title, setTitle] = useState(editingResource?.title || '');
  const [content, setContent] = useState(editingResource?.content || '');
  const [description, setDescription] = useState(editingResource?.description || '');
  const [tags, setTags] = useState(editingResource?.tags.join(', ') || '');
  const [folderId, setFolderId] = useState(editingResource?.folderId || selectedFolderId || '');

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (editingResource) {
        setType(editingResource.type);
        setTitle(editingResource.title);
        setContent(editingResource.content);
        setDescription(editingResource.description);
        setTags(editingResource.tags.join(', '));
        setFolderId(editingResource.folderId);
      } else {
        setType('link');
        setTitle('');
        setContent('');
        setDescription('');
        setTags('');
        setFolderId(selectedFolderId || folders[0]?.id || '');
      }
    }
  }, [isOpen, editingResource, selectedFolderId, folders]);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim() || !folderId) return;

    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);

    if (editingResource && onUpdate) {
      onUpdate(editingResource.id, {
        type, title: title.trim(), content: content.trim(),
        description: description.trim(), tags: parsedTags, folderId,
      });
    } else {
      onAdd({
        type, title: title.trim(), content: content.trim(),
        description: description.trim(), tags: parsedTags, folderId,
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingResource ? 'Edit Resource' : 'Add Resource'} maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Type selector */}
        {!editingResource && (
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-2 block">
              Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setType(opt.type)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                    type === opt.type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-[var(--card-border)] hover:border-primary/30'
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Folder selector */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5 block">
            Folder
          </label>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm font-semibold focus:border-primary outline-none transition-colors appearance-none"
          >
            <option value="">Select folder...</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.icon} {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5 block">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resource title..."
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Content (varies by type) */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5 block">
            {type === 'link' ? 'URL' : type === 'pdf' ? 'PDF URL / Google Drive Link' : 'Text Content'}
          </label>
          {type === 'text' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your text..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors resize-none"
            />
          ) : (
            <input
              type="url"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'link' ? 'https://...' : 'https://drive.google.com/... or PDF URL'}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors"
            />
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5 block">
            Description <span className="text-[var(--muted)]">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description..."
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5 block">
            Tags <span className="text-[var(--muted)]">(comma-separated, optional)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., dsa, important, exam"
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" size="md" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            className="flex-1"
            disabled={!title.trim() || !content.trim() || !folderId}
          >
            {editingResource ? 'Update' : 'Save Resource'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

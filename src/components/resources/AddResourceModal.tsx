'use client';

import React, { useState, useEffect } from 'react';
import {
  HiX,
  HiBookmark,
  HiOutlineBookmark,
  HiSparkles,
  HiGlobeAlt,
  HiDocumentText,
  HiCode,
} from 'react-icons/hi';
import { FaYoutube, FaGoogleDrive } from 'react-icons/fa';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Resource, ResourceType, ResourceFolder } from '@/types';
import {
  detectResourceType,
  extractYouTubeId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  getDrivePreviewUrl,
} from '@/lib/resourceUtils';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: ResourceFolder[];
  selectedFolderId: string | null;
  onAdd: (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingResource?: Resource | null;
  onUpdate?: (id: string, data: Partial<Resource>) => void;
  onAddFolder?: (data: Omit<ResourceFolder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | undefined>;
}

const TYPE_OPTIONS: {
  type: ResourceType;
  icon: React.ReactNode;
  label: string;
  desc: string;
  activeColor: string;
}[] = [
  {
    type: 'youtube',
    icon: <FaYoutube size={18} className="text-red-500" />,
    label: 'YouTube',
    desc: 'Lecture / Video',
    activeColor: 'border-red-500/50 bg-red-500/10 text-red-400',
  },
  {
    type: 'drive',
    icon: <FaGoogleDrive size={18} className="text-blue-500" />,
    label: 'Drive',
    desc: 'Docs / Sheets',
    activeColor: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  },
  {
    type: 'pdf',
    icon: <HiDocumentText size={18} className="text-amber-500" />,
    label: 'PDF',
    desc: 'Textbook / Notes',
    activeColor: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  },
  {
    type: 'text',
    icon: <HiDocumentText size={18} className="text-emerald-400" />,
    label: 'Note',
    desc: 'Markdown / Text',
    activeColor: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  },
  {
    type: 'link',
    icon: <HiGlobeAlt size={18} className="text-sky-400" />,
    label: 'Web Link',
    desc: 'Articles / Sites',
    activeColor: 'border-sky-500/50 bg-sky-500/10 text-sky-400',
  },
  {
    type: 'github',
    icon: <HiCode size={18} className="text-purple-400" />,
    label: 'GitHub',
    desc: 'Code / Repos',
    activeColor: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
  },
];

export default function AddResourceModal({
  isOpen,
  onClose,
  folders,
  selectedFolderId,
  onAdd,
  editingResource,
  onUpdate,
  onAddFolder,
}: AddResourceModalProps) {
  const [type, setType] = useState<ResourceType>(editingResource?.type || 'link');
  const [title, setTitle] = useState(editingResource?.title || '');
  const [content, setContent] = useState(editingResource?.content || '');
  const [description, setDescription] = useState(editingResource?.description || '');
  const [tags, setTags] = useState(editingResource?.tags.join(', ') || '');
  const [folderId, setFolderId] = useState(editingResource?.folderId || selectedFolderId || '');
  const [isPinned, setIsPinned] = useState(editingResource?.isPinned || false);

  // New folder inline creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Auto-detection badge indicator
  const [autoDetected, setAutoDetected] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingResource) {
        setType(editingResource.type);
        setTitle(editingResource.title);
        setContent(editingResource.content);
        setDescription(editingResource.description);
        setTags(editingResource.tags.join(', '));
        setFolderId(editingResource.folderId);
        setIsPinned(editingResource.isPinned || false);
        setAutoDetected(null);
      } else {
        setType('youtube');
        setTitle('');
        setContent('');
        setDescription('');
        setTags('');
        setFolderId(selectedFolderId || folders[0]?.id || '');
        setIsPinned(false);
        setAutoDetected(null);
        setIsCreatingFolder(false);
        setNewFolderName('');
      }
    }
  }, [isOpen, editingResource, selectedFolderId, folders]);

  // Smart URL Auto-detection on content change
  const handleContentChange = (val: string) => {
    setContent(val);
    if (!editingResource && val.trim().startsWith('http')) {
      const detected = detectResourceType(val);
      if (detected !== type) {
        setType(detected);
        setAutoDetected(detected.toUpperCase());
        setTimeout(() => setAutoDetected(null), 3000);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !onAddFolder) return;
    const newId = await onAddFolder({
      name: newFolderName.trim(),
      color: '#4F46E5',
      icon: '📁',
    });
    if (newId) {
      setFolderId(newId);
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim() || !folderId) return;

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    let thumbnailUrl: string | undefined = editingResource?.thumbnailUrl;
    let embedUrl: string | undefined = editingResource?.embedUrl;

    if (type === 'youtube') {
      const ytId = extractYouTubeId(content);
      if (ytId) {
        thumbnailUrl = getYouTubeThumbnail(ytId);
        embedUrl = getYouTubeEmbedUrl(ytId);
      }
    } else if (type === 'drive' || type === 'pdf') {
      const driveEmbed = getDrivePreviewUrl(content);
      if (driveEmbed) {
        embedUrl = driveEmbed;
      }
    }

    if (editingResource && onUpdate) {
      onUpdate(editingResource.id, {
        type,
        title: title.trim(),
        content: content.trim(),
        description: description.trim(),
        tags: parsedTags,
        folderId,
        isPinned,
        thumbnailUrl,
        embedUrl,
      });
    } else {
      onAdd({
        type,
        title: title.trim(),
        content: content.trim(),
        description: description.trim(),
        tags: parsedTags,
        folderId,
        isPinned,
        thumbnailUrl,
        embedUrl,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingResource ? 'Edit Academic Resource' : 'Add New Resource to Vault'}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Type selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">
              Resource Format
            </label>
            {autoDetected && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary animate-pulse">
                <HiSparkles size={12} /> Auto-detected as {autoDetected}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const isSelected = type === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setType(opt.type)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all text-center ${
                    isSelected
                      ? opt.activeColor
                      : 'border-[var(--card-border)] bg-[var(--card-bg)]/40 hover:border-slate-500/40 text-[var(--muted-foreground)]'
                  }`}
                >
                  <div className="mb-1">{opt.icon}</div>
                  <span className="text-xs font-bold leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content URL / Text Input */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5 block">
            {type === 'youtube'
              ? 'YouTube URL / Playlist Link'
              : type === 'drive'
              ? 'Google Drive / Docs Link'
              : type === 'pdf'
              ? 'PDF Document URL / Link'
              : type === 'github'
              ? 'GitHub Repository URL'
              : type === 'link'
              ? 'Target Website URL'
              : 'Study Note / Markdown Text'}
          </label>
          {type === 'text' ? (
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Write formulas, algorithmic notes, or quick revision points..."
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm font-mono focus:border-primary outline-none transition-colors resize-none"
            />
          ) : (
            <input
              type="url"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={
                type === 'youtube'
                  ? 'https://www.youtube.com/watch?v=...'
                  : type === 'drive'
                  ? 'https://drive.google.com/file/d/...'
                  : type === 'pdf'
                  ? 'https://example.com/syllabus.pdf'
                  : type === 'github'
                  ? 'https://github.com/username/repo'
                  : 'https://...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors"
            />
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5 block">
            Resource Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Graph Algorithms Lecture #4, Cormen CLRS PDF..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm font-medium focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Folder Selector + Inline Creator */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">
              Folder Collection
            </label>
            {onAddFolder && !isCreatingFolder && (
              <button
                type="button"
                onClick={() => setIsCreatingFolder(true)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                + New Folder
              </button>
            )}
          </div>

          {isCreatingFolder ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name (e.g., Gate CS, OS Papers)..."
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--card-border)] text-sm focus:border-primary outline-none"
              />
              <Button size="sm" variant="primary" onClick={handleCreateFolder}>
                Save
              </Button>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <HiX size={16} />
              </button>
            </div>
          ) : (
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm font-semibold focus:border-primary outline-none transition-colors"
            >
              <option value="">Select Folder...</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.icon || '📁'} {f.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5 block">
            Description & Key Timestamps <span className="text-[var(--muted)] font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Important takeaways, key timestamps (e.g. 14:20 Dijkstra proof), or chapter breakdown..."
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors resize-none"
          />
        </div>

        {/* Tags & Pin Toggle Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] mb-1.5 block">
              Tags <span className="text-[var(--muted)] font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="gate, dsa, pyq, formulas"
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--background)] border-2 border-[var(--card-border)] text-sm focus:border-primary outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`flex items-center justify-between p-2.5 rounded-xl border-2 transition-all ${
                isPinned
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 font-semibold'
                  : 'border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-slate-500/40'
              }`}
            >
              <span className="text-xs font-semibold flex items-center gap-1.5">
                {isPinned ? <HiBookmark className="text-amber-400" size={16} /> : <HiOutlineBookmark size={16} />}
                Pin to top of folder
              </span>
              <span
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  isPinned ? 'bg-amber-400 border-amber-400' : 'border-slate-500'
                }`}
              >
                {isPinned && <span className="w-1.5 h-1.5 bg-black rounded-full" />}
              </span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-[var(--card-border)]">
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
            {editingResource ? 'Update Resource' : 'Save Resource'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

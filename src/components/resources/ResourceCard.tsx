'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiExternalLink, HiDocumentText, HiLink, HiTrash, HiPencil } from 'react-icons/hi';
import { Resource } from '@/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ResourceCardProps {
  resource: Resource;
  onDelete: (id: string) => void;
  onEdit: (resource: Resource) => void;
}

function getTypeConfig(type: string) {
  switch (type) {
    case 'link':
      return { icon: HiLink, color: 'text-sky', bg: 'bg-sky/10', label: 'Link', border: 'border-sky/30' };
    case 'pdf':
      return { icon: HiDocumentText, color: 'text-coral', bg: 'bg-coral/10', label: 'PDF', border: 'border-coral/30' };
    case 'text':
      return { icon: HiDocumentText, color: 'text-teal', bg: 'bg-teal/10', label: 'Text', border: 'border-teal/30' };
    default:
      return { icon: HiDocumentText, color: 'text-primary', bg: 'bg-primary/10', label: 'Resource', border: 'border-primary/30' };
  }
}

export default function ResourceCard({ resource, onDelete, onEdit }: ResourceCardProps) {
  const config = getTypeConfig(resource.type);
  const Icon = config.icon;

  const [showConfirm, setShowConfirm] = useState(false);

  const handleOpen = () => {
    if (resource.type === 'link') {
      window.open(resource.content, '_blank', 'noopener,noreferrer');
    } else if (resource.type === 'pdf') {
      window.open(resource.content, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      className={`card-glass p-4 group cursor-default`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl ${config.bg} flex-shrink-0`}>
          <Icon size={18} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-bold text-sm truncate">{resource.title}</h4>
          {resource.description && (
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{resource.description}</p>
          )}
        </div>
        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Resource main preview/content area */}
      <div className="mt-3">
        {resource.type === 'text' ? (
          <p className="text-xs font-mono whitespace-pre-wrap line-clamp-4 bg-[var(--background)] p-2.5 rounded-xl border border-[var(--card-border)]">
            {resource.content}
          </p>
        ) : (
          <button
            onClick={handleOpen}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--background)] hover:border-primary/40 transition-colors text-left"
          >
            <span className="text-xs font-mono truncate max-w-[85%]">{resource.content}</span>
            <HiExternalLink size={14} className="text-[var(--muted-foreground)]" />
          </button>
        )}
      </div>

      {/* Tags */}
      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[var(--muted)]/40 text-[var(--muted-foreground)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--card-border)]">
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {new Date(resource.createdAt).toLocaleDateString()}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(resource)}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-[var(--muted-foreground)] hover:text-primary transition-colors"
          >
            <HiPencil size={13} />
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"
          >
            <HiTrash size={13} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          onDelete(resource.id);
          setShowConfirm(false);
        }}
        title="Delete Resource"
        message="Are you sure you want to delete this resource? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </motion.div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HiExternalLink, HiDocumentText, HiLink, HiTrash, HiPencil } from 'react-icons/hi';
import { Resource } from '@/types';

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

      {/* Content preview */}
      <div className="mt-3">
        {resource.type === 'link' && (
          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate w-full text-left"
          >
            <HiExternalLink size={12} />
            <span className="truncate">{resource.content}</span>
          </button>
        )}
        {resource.type === 'pdf' && (
          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 text-xs text-coral hover:underline truncate w-full text-left"
          >
            <HiExternalLink size={12} />
            <span className="truncate">Open PDF</span>
          </button>
        )}
        {resource.type === 'text' && (
          <div className="text-xs text-[var(--muted-foreground)] bg-[var(--background)] rounded-lg p-2.5 line-clamp-3 leading-relaxed">
            {resource.content}
          </div>
        )}
      </div>

      {/* Tags */}
      {resource.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {resource.tags.map((tag) => (
            <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
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
            onClick={() => {
              if (confirm('Delete this resource?')) onDelete(resource.id);
            }}
            className="p-1.5 rounded-lg hover:bg-coral/10 text-[var(--muted-foreground)] hover:text-coral transition-colors"
          >
            <HiTrash size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiExternalLink,
  HiDocumentText,
  HiGlobeAlt,
  HiTrash,
  HiPencil,
  HiBookmark,
  HiOutlineBookmark,
  HiClipboardCopy,
  HiCheck,
  HiPlay,
  HiCode,
  HiEye,
} from 'react-icons/hi';
import { FaYoutube, FaGoogleDrive } from 'react-icons/fa';
import { Resource } from '@/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getCleanDomain } from '@/lib/resourceUtils';

interface ResourceCardProps {
  resource: Resource;
  onDelete: (id: string) => void;
  onEdit: (resource: Resource) => void;
  onView: (resource: Resource) => void;
  onTogglePin?: (id: string) => void;
  isListView?: boolean;
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'youtube':
      return {
        icon: FaYoutube,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        label: 'YouTube',
      };
    case 'drive':
      return {
        icon: FaGoogleDrive,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        label: 'Drive',
      };
    case 'pdf':
      return {
        icon: HiDocumentText,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        label: 'PDF',
      };
    case 'github':
      return {
        icon: HiCode,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        label: 'GitHub',
      };
    case 'text':
      return {
        icon: HiDocumentText,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        label: 'Note',
      };
    default:
      return {
        icon: HiGlobeAlt,
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/30',
        label: 'Link',
      };
  }
}

export default function ResourceCard({
  resource,
  onDelete,
  onEdit,
  onView,
  onTogglePin,
  isListView = false,
}: ResourceCardProps) {
  const badge = getTypeBadge(resource.type);
  const Icon = badge.icon;
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(resource.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (resource.type === 'text') {
      onView(resource);
    } else {
      window.open(resource.content, '_blank', 'noopener,noreferrer');
    }
  };

  /* ----- List View Rendering ----- */
  if (isListView) {
    return (
      <motion.div
        className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-200 ${
          resource.isPinned
            ? 'bg-amber-500/[0.04] border-amber-500/30 shadow-sm'
            : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-primary/40'
        }`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        {/* Left: Icon & Title */}
        <div
          onClick={() => onView(resource)}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        >
          <div className={`p-2 rounded-xl ${badge.bg} ${badge.color} flex-shrink-0`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {resource.isPinned && (
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                  <HiBookmark size={12} /> PINNED
                </span>
              )}
              <h4 className="font-heading font-bold text-sm truncate text-[var(--foreground)] hover:text-primary transition-colors">
                {resource.title}
              </h4>
            </div>
            {resource.description && (
              <p className="text-xs text-[var(--muted-foreground)] truncate max-w-xl">
                {resource.description}
              </p>
            )}
          </div>
        </div>

        {/* Middle: Tags & Domain */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {resource.type !== 'text' && (
            <span className="text-[11px] font-mono text-[var(--muted-foreground)] px-2 py-0.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)]">
              {getCleanDomain(resource.content)}
            </span>
          )}
          {resource.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--muted)]/30 text-[var(--muted-foreground)]"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onTogglePin && (
            <button
              onClick={() => onTogglePin(resource.id)}
              title={resource.isPinned ? 'Unpin' : 'Pin to top'}
              className={`p-1.5 rounded-lg transition-colors ${
                resource.isPinned
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-[var(--muted-foreground)] hover:text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <HiBookmark size={15} />
            </button>
          )}

          <button
            onClick={() => onView(resource)}
            title="Open in Viewer"
            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
          >
            <HiEye size={16} />
          </button>

          <button
            onClick={handleCopy}
            title="Copy URL"
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
          >
            {copied ? <HiCheck size={15} className="text-emerald-400" /> : <HiClipboardCopy size={15} />}
          </button>

          {resource.type !== 'text' && (
            <button
              onClick={handleOpenExternal}
              title="Open in new tab"
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
            >
              <HiExternalLink size={15} />
            </button>
          )}

          <button
            onClick={() => onEdit(resource)}
            title="Edit"
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <HiPencil size={14} />
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            title="Delete"
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-coral hover:bg-coral/10 transition-colors"
          >
            <HiTrash size={14} />
          </button>
        </div>

        <ConfirmDialog
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={() => {
            onDelete(resource.id);
            setShowConfirm(false);
          }}
          title="Delete Resource"
          message="Are you sure you want to delete this resource?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
        />
      </motion.div>
    );
  }

  /* ----- Grid Card View Rendering ----- */
  return (
    <motion.div
      className={`relative flex flex-col rounded-2xl sm:rounded-3xl border transition-all duration-300 group overflow-hidden ${
        resource.isPinned
          ? 'bg-[var(--card-bg)] border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20'
          : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-primary/40 hover:shadow-xl hover:-translate-y-1'
      }`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Pinned Ribbon Indicator */}
      {resource.isPinned && (
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold backdrop-blur-sm shadow-sm">
          <HiBookmark size={11} /> PINNED
        </div>
      )}

      {/* 1. Media Thumbnail Area (YouTube) */}
      {resource.type === 'youtube' && resource.thumbnailUrl && (
        <div
          onClick={() => onView(resource)}
          className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer group/thumb"
        >
          <img
            src={resource.thumbnailUrl}
            alt={resource.title}
            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 group-hover/thumb:bg-red-600 transition-all">
              <HiPlay size={22} className="ml-0.5" />
            </div>
          </div>
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm">
            <FaYoutube size={12} className="text-red-500" /> Watch In-App
          </span>
        </div>
      )}

      {/* Main Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Row (Type Badge + Format Label) */}
          {(!resource.thumbnailUrl || resource.type !== 'youtube') && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${badge.bg} ${badge.color}`}>
                  <Icon size={16} />
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${badge.bg} ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          )}

          {/* Title & Description */}
          <h4
            onClick={() => onView(resource)}
            className="font-heading font-bold text-sm leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors text-[var(--foreground)]"
            title={resource.title}
          >
            {resource.title}
          </h4>

          {resource.description && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1.5 line-clamp-2 leading-relaxed">
              {resource.description}
            </p>
          )}

          {/* Text Note Preview or URL Domain */}
          <div className="mt-3">
            {resource.type === 'text' ? (
              <div
                onClick={() => onView(resource)}
                className="text-xs font-mono whitespace-pre-wrap line-clamp-3 bg-[var(--background)] p-2.5 rounded-xl border border-[var(--card-border)] text-[var(--foreground)]/80 cursor-pointer hover:border-primary/40 transition-colors"
              >
                {resource.content}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onView(resource)}
                className="w-full flex items-center justify-between p-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] hover:border-primary/40 transition-colors text-left group/link"
              >
                <span className="text-xs font-mono truncate max-w-[85%] text-[var(--muted-foreground)] group-hover/link:text-primary">
                  {getCleanDomain(resource.content)}
                </span>
                <HiEye size={14} className="text-[var(--muted-foreground)] group-hover/link:text-primary" />
              </button>
            )}
          </div>

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {resource.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--muted)]/30 text-[var(--muted-foreground)]"
                >
                  #{tag}
                </span>
              ))}
              {resource.tags.length > 3 && (
                <span className="text-[10px] text-[var(--muted-foreground)] font-semibold self-center">
                  +{resource.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--card-border)]">
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {new Date(resource.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>

          <div className="flex items-center gap-1">
            {onTogglePin && (
              <button
                onClick={() => onTogglePin(resource.id)}
                title={resource.isPinned ? 'Unpin' : 'Pin to top'}
                className={`p-1.5 rounded-lg transition-colors ${
                  resource.isPinned
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-[var(--muted-foreground)] hover:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <HiBookmark size={15} />
              </button>
            )}

            <button
              onClick={handleCopy}
              title="Copy link"
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
            >
              {copied ? <HiCheck size={14} className="text-emerald-400" /> : <HiClipboardCopy size={14} />}
            </button>

            {resource.type !== 'text' && (
              <button
                onClick={handleOpenExternal}
                title="Open in new tab"
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/40 transition-colors"
              >
                <HiExternalLink size={14} />
              </button>
            )}

            <button
              onClick={() => onEdit(resource)}
              title="Edit"
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <HiPencil size={14} />
            </button>

            <button
              onClick={() => setShowConfirm(true)}
              title="Delete"
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-coral hover:bg-coral/10 transition-colors"
            >
              <HiTrash size={14} />
            </button>
          </div>
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
        message="Are you sure you want to delete this resource?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </motion.div>
  );
}

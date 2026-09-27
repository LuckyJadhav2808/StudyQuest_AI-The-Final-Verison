'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiX,
  HiExternalLink,
  HiClipboardCopy,
  HiCheck,
  HiBookmark,
  HiOutlineBookmark,
  HiDocumentText,
  HiCode,
  HiGlobeAlt,
} from 'react-icons/hi';
import { FaYoutube, FaGoogleDrive } from 'react-icons/fa';
import { Resource } from '@/types';
import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getDrivePreviewUrl,
  getCleanDomain,
} from '@/lib/resourceUtils';

interface ResourceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  onTogglePin?: (id: string) => void;
}

export default function ResourceViewerModal({
  isOpen,
  onClose,
  resource,
  onTogglePin,
}: ResourceViewerModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !resource) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(resource.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    if (resource.type === 'text') return;
    window.open(resource.content, '_blank', 'noopener,noreferrer');
  };

  // Determine embed source URL
  let embedUrl: string | null = null;
  if (resource.type === 'youtube') {
    const ytId = extractYouTubeId(resource.content);
    if (ytId) embedUrl = getYouTubeEmbedUrl(ytId);
  } else if (resource.type === 'drive') {
    embedUrl = resource.embedUrl || getDrivePreviewUrl(resource.content) || resource.content;
  } else if (resource.type === 'pdf') {
    const drivePreview = getDrivePreviewUrl(resource.content);
    embedUrl = drivePreview || resource.content;
  }

  // Type badge icon & color
  const getTypeBadge = () => {
    switch (resource.type) {
      case 'youtube':
        return {
          icon: <FaYoutube className="text-red-500" size={16} />,
          label: 'YouTube Lecture',
          bg: 'bg-red-500/10 text-red-500 border-red-500/20',
        };
      case 'drive':
        return {
          icon: <FaGoogleDrive className="text-blue-500" size={16} />,
          label: 'Google Drive',
          bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        };
      case 'pdf':
        return {
          icon: <HiDocumentText className="text-amber-500" size={16} />,
          label: 'PDF Document',
          bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        };
      case 'github':
        return {
          icon: <HiCode className="text-purple-400" size={16} />,
          label: 'GitHub Repo',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
      case 'text':
        return {
          icon: <HiDocumentText className="text-emerald-400" size={16} />,
          label: 'Study Note',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      default:
        return {
          icon: <HiGlobeAlt className="text-sky-400" size={16} />,
          label: getCleanDomain(resource.content),
          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        };
    }
  };

  const badge = getTypeBadge();

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          className="relative w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-white/10 bg-[#0F172A] text-slate-100"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-slate-900/80 backdrop-blur-lg flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.bg}`}
              >
                {badge.icon}
                <span className="hidden sm:inline">{badge.label}</span>
              </span>
              <h2 className="text-sm sm:text-base font-bold truncate text-white" title={resource.title}>
                {resource.title}
              </h2>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {onTogglePin && (
                <button
                  onClick={() => onTogglePin(resource.id)}
                  title={resource.isPinned ? 'Unpin' : 'Pin to top'}
                  className={`p-2 rounded-xl border transition-colors ${
                    resource.isPinned
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {resource.isPinned ? <HiBookmark size={18} /> : <HiOutlineBookmark size={18} />}
                </button>
              )}

              <button
                onClick={handleCopy}
                title="Copy URL or note text"
                className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                {copied ? <HiCheck size={18} className="text-emerald-400" /> : <HiClipboardCopy size={18} />}
              </button>

              {resource.type !== 'text' && (
                <button
                  onClick={handleOpenExternal}
                  title="Open in new browser tab"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <HiExternalLink size={16} />
                  <span className="hidden sm:inline">Open in Tab</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
                aria-label="Close viewer"
              >
                <HiX size={20} />
              </button>
            </div>
          </div>

          {/* Main Viewer Body */}
          <div className="flex-1 overflow-y-auto flex flex-col bg-slate-950/60">
            {/* 1. YouTube Player Mode */}
            {resource.type === 'youtube' && embedUrl && (
              <div className="flex-1 flex flex-col p-3 sm:p-6 max-w-4xl mx-auto w-full">
                <div className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
                  <iframe
                    src={embedUrl}
                    title={resource.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-0"
                  />
                </div>

                {/* Video Info Section */}
                <div className="mt-4 p-4 rounded-xl border border-white/5 bg-slate-900/60">
                  <h3 className="text-base font-bold text-white mb-1">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-sm text-slate-300 leading-relaxed mb-3 whitespace-pre-line">
                      {resource.description}
                    </p>
                  )}
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {resource.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Google Drive / PDF Viewer Mode */}
            {(resource.type === 'drive' || resource.type === 'pdf') && (
              <div className="flex-1 flex flex-col h-full w-full">
                {embedUrl ? (
                  <div className="flex-1 relative w-full h-full min-h-[500px] bg-slate-900">
                    <iframe
                      src={embedUrl}
                      title={resource.title}
                      className="w-full h-full border-0"
                      allow="autoplay"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <FaGoogleDrive size={48} className="text-blue-400 mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Google Drive Resource</h3>
                    <p className="text-sm text-slate-400 max-w-md mb-4">
                      This Drive resource is ready to be opened in your browser.
                    </p>
                    <button
                      onClick={handleOpenExternal}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm inline-flex items-center gap-2 transition-colors shadow-lg"
                    >
                      <HiExternalLink size={18} /> Open in Google Drive
                    </button>
                  </div>
                )}

                {/* Details Footer */}
                {resource.description && (
                  <div className="px-5 py-3 border-t border-white/10 bg-slate-900/70 text-xs text-slate-300">
                    <span className="font-semibold text-slate-200">Notes: </span>
                    {resource.description}
                  </div>
                )}
              </div>
            )}

            {/* 3. Text & Study Notes Mode */}
            {resource.type === 'text' && (
              <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full flex flex-col">
                <div className="p-4 sm:p-6 rounded-2xl border border-white/10 bg-slate-900/70 shadow-lg flex-1 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 text-xs text-slate-400">
                    <span>
                      {resource.content.length} characters • {resource.content.trim().split(/\s+/).length} words
                    </span>
                    <button
                      onClick={handleCopy}
                      className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      {copied ? 'Copied to clipboard!' : 'Copy full note'}
                    </button>
                  </div>
                  <div className="flex-1 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text text-slate-200 bg-slate-950/60 p-4 rounded-xl border border-white/5 overflow-y-auto">
                    {resource.content}
                  </div>
                  {resource.description && (
                    <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">Context: </span>
                      {resource.description}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. GitHub Repo Mode */}
            {resource.type === 'github' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                  <HiCode size={36} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{resource.title}</h3>
                <p className="text-sm text-slate-400 mb-4">
                  {resource.description || 'GitHub Code Repository & Project Files'}
                </p>

                {/* Clone snippet */}
                <div className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 mb-4 text-left font-mono text-xs text-slate-300 flex items-center justify-between">
                  <span className="truncate mr-2">git clone {resource.content}.git</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`git clone ${resource.content}.git`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex-shrink-0"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <button
                  onClick={handleOpenExternal}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm inline-flex items-center gap-2 transition-colors shadow-lg"
                >
                  <HiExternalLink size={18} /> View on GitHub
                </button>
              </div>
            )}

            {/* 5. General Web Link Mode */}
            {resource.type === 'link' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                  <HiGlobeAlt size={36} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{resource.title}</h3>
                <p className="text-sm text-slate-400 mb-2">{getCleanDomain(resource.content)}</p>
                {resource.description && (
                  <p className="text-sm text-slate-300 mb-6 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                    {resource.description}
                  </p>
                )}
                <button
                  onClick={handleOpenExternal}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 text-white font-semibold text-sm inline-flex items-center gap-2 transition-all shadow-lg"
                >
                  <HiExternalLink size={18} /> Launch Website
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

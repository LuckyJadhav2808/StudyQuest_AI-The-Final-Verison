'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import { CodeFile } from '@/types';
import { getFileIcon } from '@/lib/webPreview';

interface EditorTabsProps {
  openFiles: CodeFile[];
  activeFileId: string | null;
  onSelectTab: (file: CodeFile) => void;
  onCloseTab: (fileId: string) => void;
}

export default function EditorTabs({
  openFiles,
  activeFileId,
  onSelectTab,
  onCloseTab,
}: EditorTabsProps) {
  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center border-b-2 border-[var(--card-border)] overflow-x-auto bg-[var(--card-bg)]">
      {openFiles.map((file) => {
        const isActive = file.id === activeFileId;
        return (
          <div
            key={file.id}
            className={`relative flex items-center gap-1.5 px-3 py-2 cursor-pointer text-xs font-medium border-r border-[var(--card-border)] transition-colors whitespace-nowrap group ${
              isActive
                ? 'bg-[var(--background)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--background)]/50'
            }`}
            onClick={() => onSelectTab(file)}
          >
            {/* Active indicator */}
            {isActive && (
              <motion.div
                className="absolute top-0 left-0 right-0 h-[2px] bg-primary"
                layoutId="active-tab"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            <span className="text-[10px]">{getFileIcon(file.name)}</span>
            <span>{file.name}</span>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(file.id);
              }}
              className="p-0.5 rounded hover:bg-[var(--muted)]/30 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            >
              <HiX size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

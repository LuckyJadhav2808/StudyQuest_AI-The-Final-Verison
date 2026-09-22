'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiDownload, HiBookOpen, HiRefresh, HiClipboardCopy, HiPencil } from 'react-icons/hi';
import Button from '@/components/ui/Button';

interface StudioToolbarProps {
  toolTitle: string;
  toolDescription: string;
  badgeText?: string;
  icon?: React.ReactNode;
  onBack: () => void;
  onReset?: () => void;
  onDownload?: () => void;
  downloadLabel?: string;
  isDownloadDisabled?: boolean;
  onOpenInReader?: () => void;
  onSendToNotes?: () => void;
  extraActions?: React.ReactNode;
  fileName?: string;
  onFileNameChange?: (name: string) => void;
  fileExtension?: string;
}

export default function StudioToolbar({
  toolTitle,
  toolDescription,
  badgeText,
  icon,
  onBack,
  onReset,
  onDownload,
  downloadLabel = 'Download File',
  isDownloadDisabled = false,
  onOpenInReader,
  onSendToNotes,
  extraActions,
  fileName,
  onFileNameChange,
  fileExtension,
}: StudioToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-border">
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border text-foreground hover:bg-muted/80 transition-colors shadow-sm"
          title="Return to Studio Hub"
        >
          <HiArrowLeft className="w-3.5 h-3.5" />
          <span>Studio Hub</span>
        </motion.button>

        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg shadow-inner">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">{toolTitle}</h2>
              {badgeText && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {badgeText}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{toolDescription}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        {/* Editable File Name Capsule */}
        {fileName !== undefined && onFileNameChange && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs shadow-2xs hover:border-primary/50 transition-colors">
            <HiPencil className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={fileName}
              onChange={(e) => onFileNameChange(e.target.value)}
              className="bg-transparent font-semibold text-foreground focus:outline-hidden text-xs max-w-[120px] sm:max-w-[180px] truncate"
              placeholder="Filename"
              title="Click to rename file"
            />
            {fileExtension && (
              <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded font-mono shrink-0">
                {fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`}
              </span>
            )}
          </div>
        )}

        {extraActions}

        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} title="Reset current workbench">
            <HiRefresh className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        )}

        {onSendToNotes && (
          <Button variant="outline" size="sm" onClick={onSendToNotes} title="Send to StudyQuest Notes">
            <HiClipboardCopy className="w-3.5 h-3.5 mr-1 text-primary" />
            To Notes
          </Button>
        )}

        {onOpenInReader && (
          <Button variant="outline" size="sm" onClick={onOpenInReader} title="Open directly in Split Reader">
            <HiBookOpen className="w-3.5 h-3.5 mr-1 text-primary" />
            In Reader
          </Button>
        )}

        {onDownload && (
          <Button
            variant="primary"
            size="sm"
            onClick={onDownload}
            disabled={isDownloadDisabled}
            className="shadow-sm"
          >
            <HiDownload className="w-3.5 h-3.5 mr-1" />
            {downloadLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

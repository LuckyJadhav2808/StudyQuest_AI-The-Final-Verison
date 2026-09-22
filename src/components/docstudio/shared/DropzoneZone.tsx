'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiUpload, HiDocumentAdd } from 'react-icons/hi';

interface DropzoneZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  description?: string;
  allowedFormatsText?: string;
  maxFilesText?: string;
  compact?: boolean;
}

export default function DropzoneZone({
  onFilesSelected,
  accept = 'image/*,application/pdf',
  multiple = false,
  title = 'Drop your files here',
  description = 'Drag & drop from your computer, or click to browse',
  allowedFormatsText = 'PDF, PNG, JPG, WebP',
  maxFilesText,
  compact = false,
}: DropzoneZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(multiple ? filesArray : [filesArray[0]]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(multiple ? filesArray : [filesArray[0]]);
      e.target.value = ''; // Reset input so re-uploading same file triggers change
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative cursor-pointer transition-all duration-200 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center group ${
        compact ? 'p-6' : 'p-10'
      } ${
        isDragging
          ? 'border-primary bg-primary/10 scale-[1.01] shadow-lg shadow-primary/10'
          : 'border-border/80 hover:border-primary/60 bg-surface/50 hover:bg-surface'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        className={`rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner ${
          compact ? 'w-10 h-10 mb-2 text-xl' : 'w-14 h-14 mb-4 text-2xl'
        }`}
      >
        {multiple ? <HiDocumentAdd /> : <HiUpload />}
      </div>

      <h3 className={`font-bold text-foreground mb-1 ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>
        {title}
      </h3>
      <p className={`text-muted-foreground max-w-sm mb-3 ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-muted text-muted-foreground border border-border">
          {allowedFormatsText}
        </span>
        {maxFilesText && (
          <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-primary/10 text-primary border border-primary/20">
            {maxFilesText}
          </span>
        )}
        <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          🔒 100% Client-Side
        </span>
      </div>
    </div>
  );
}

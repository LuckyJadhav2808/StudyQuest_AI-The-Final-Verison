'use client';

import React, { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { HiDocumentText, HiLightningBolt, HiUpload, HiX, HiCheck } from 'react-icons/hi';
import { compileStudyQuestMarkdown } from '@/lib/markdownCompiler';
import toast from 'react-hot-toast';

interface MarkdownImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditingSource?: boolean;
  initialValue?: string;
  onImport: (compiledHtml: string, rawMarkdown: string, suggestedTitle?: string) => Promise<void>;
}

export default function MarkdownImportModal({
  isOpen,
  onClose,
  isEditingSource = false,
  initialValue = '',
  onImport,
}: MarkdownImportModalProps) {
  const [markdownInput, setMarkdownInput] = useState('');
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMarkdownInput(initialValue);
      setLoadedFileName(null);
      setIsDragging(false);
    }
  }, [isOpen, initialValue]);

  const handleFileChange = async (file: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      setMarkdownInput(text);
      setLoadedFileName(file.name);
      toast.success(`Loaded "${file.name}"! 📄`);
    } catch (err) {
      console.error('Failed to read markdown file:', err);
      toast.error('Could not read the selected file.');
    }
  };

  const handleProcess = async () => {
    if (!markdownInput.trim()) return;

    setIsCompiling(true);
    const toastId = toast.loading('Compiling 19-feature markdown & diagrams...');

    try {
      // Suggest title if loaded from file or first heading
      let suggestedTitle: string | undefined = undefined;
      const headingMatch = markdownInput.match(/^#\s+(.+)$/m);
      if (headingMatch && headingMatch[1].trim()) {
        suggestedTitle = headingMatch[1].replace(/[*`_#]/g, '').trim();
      } else if (loadedFileName) {
        suggestedTitle = loadedFileName.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]/g, ' ');
      }

      const sanitizedHtml = await compileStudyQuestMarkdown(markdownInput);
      await onImport(sanitizedHtml, markdownInput, suggestedTitle);
      toast.success(isEditingSource ? 'Note updated! 📝' : 'Markdown imported! 📄', { id: toastId });
      onClose();
    } catch (err: any) {
      console.error('Markdown processing failed:', err);
      toast.error('Failed to parse Markdown. Please check formatting.', { id: toastId });
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditingSource ? 'Edit Markdown Source' : 'Import Markdown / .md File'}
    >
      <div className="space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          accept=".md,.markdown,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileChange(e.target.files[0]);
              e.target.value = '';
            }
          }}
        />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed flex-1 min-w-[200px]">
            {isEditingSource
              ? 'Edit the raw Markdown source below. Mermaid diagrams (```mermaid) and KaTeX formulas will be re-rendered.'
              : 'Paste Markdown or upload a .md file directly from your computer.'}
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary transition-all text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 cursor-pointer"
            title="Browse and load a .md file"
          >
            <HiUpload size={14} />
            <span>Upload .md File</span>
          </button>
        </div>

        {loadedFileName && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/25 text-xs text-primary font-medium">
            <span className="flex items-center gap-1.5 truncate">
              <HiCheck className="text-emerald-400 shrink-0" size={14} />
              <span className="truncate">Loaded file: <b>{loadedFileName}</b></span>
            </span>
            <button
              type="button"
              onClick={() => {
                setLoadedFileName(null);
                setMarkdownInput(initialValue);
              }}
              className="hover:text-red-400 p-0.5 rounded transition-colors"
              title="Remove file"
            >
              <HiX size={14} />
            </button>
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileChange(e.dataTransfer.files[0]);
            }
          }}
          className={`relative rounded-xl transition-all ${
            isDragging ? 'ring-2 ring-primary ring-offset-2' : ''
          }`}
        >
          <textarea
            value={markdownInput}
            onChange={(e) => {
              setMarkdownInput(e.target.value);
              if (loadedFileName) setLoadedFileName(null);
            }}
            placeholder={`# My Notes\n\nPaste your markdown here or drop a .md file...\n\n## Section 1\n- Key point\n\n\`\`\`mermaid\ngraph TD\n  A[Start] --> B[Result]\n\`\`\``}
            className="w-full h-80 p-4 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-mono text-[var(--foreground)] focus:border-primary focus:outline-none transition-colors resize-y leading-relaxed"
          />

          {isDragging && (
            <div className="absolute inset-0 rounded-xl bg-primary/25 backdrop-blur-xs flex items-center justify-center border-2 border-dashed border-primary pointer-events-none">
              <span className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5">
                <HiUpload size={14} /> Drop .md file here
              </span>
            </div>
          )}
        </div>

        {isEditingSource && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <HiLightningBolt className="text-amber-500 flex-shrink-0" size={14} />
            <p className="text-[10px] text-amber-500 font-semibold">
              This will update the entire note content with the newly re-rendered markdown.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isCompiling} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleProcess}
            loading={isCompiling}
            disabled={!markdownInput.trim()}
            className="flex-1"
            icon={<HiDocumentText size={14} />}
          >
            {isEditingSource ? 'Update & Render' : 'Import & Render'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

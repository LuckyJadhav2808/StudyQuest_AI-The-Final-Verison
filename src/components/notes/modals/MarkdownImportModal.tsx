'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { HiDocumentText, HiLightningBolt } from 'react-icons/hi';
import { compileStudyQuestMarkdown } from '@/lib/markdownCompiler';
import toast from 'react-hot-toast';

interface MarkdownImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditingSource?: boolean;
  initialValue?: string;
  onImport: (compiledHtml: string, rawMarkdown: string) => Promise<void>;
}

export default function MarkdownImportModal({
  isOpen,
  onClose,
  isEditingSource = false,
  initialValue = '',
  onImport,
}: MarkdownImportModalProps) {
  const [markdownInput, setMarkdownInput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMarkdownInput(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleProcess = async () => {
    if (!markdownInput.trim()) return;

    setIsCompiling(true);
    const toastId = toast.loading('Compiling 19-feature markdown & diagrams...');

    try {
      const sanitizedHtml = await compileStudyQuestMarkdown(markdownInput);
      await onImport(sanitizedHtml, markdownInput);
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
      title={isEditingSource ? 'Edit Markdown Source' : 'Import Markdown / README'}
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          {isEditingSource
            ? 'Edit the raw Markdown source below. Mermaid diagrams (```mermaid) and KaTeX formulas will be re-rendered.'
            : 'Paste raw Markdown or README.md content below. It will be sanitized, compiled to rich text, and saved into your scroll.'}
        </p>

        <textarea
          value={markdownInput}
          onChange={(e) => setMarkdownInput(e.target.value)}
          placeholder={`# My Notes\n\nPaste your markdown here...\n\n## Section 1\n- Key point\n\n\`\`\`mermaid\ngraph TD\n  A[Start] --> B[Result]\n\`\`\``}
          className="w-full h-80 p-4 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-mono text-[var(--foreground)] focus:border-primary focus:outline-none transition-colors resize-y leading-relaxed"
        />

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

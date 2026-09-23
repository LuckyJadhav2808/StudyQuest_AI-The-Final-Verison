'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { HiSparkles, HiLightningBolt } from 'react-icons/hi';
import { sanitizeNoteHtml } from '@/lib/sanitize';

interface BeautifyPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  beforeHtml: string;
  afterHtml: string;
  hasSelection?: boolean;
  onApply: () => void;
}

export default function BeautifyPreviewModal({
  isOpen,
  onClose,
  beforeHtml,
  afterHtml,
  hasSelection = false,
  onApply,
}: BeautifyPreviewModalProps) {
  const safeBefore = sanitizeNoteHtml(beforeHtml);
  const safeAfter = sanitizeNoteHtml(afterHtml);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ AI Beautify Preview">
      <div className="space-y-4">
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          {hasSelection
            ? 'Review the formatted version of your selected text below. Only the highlighted selection will be updated.'
            : 'Review the formatted version below. All your notes have been preserved — headings, emphasis, bullets, and formulas have been enhanced.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Before */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1.5">
              📄 Original Notes
            </span>
            <div className="p-3 rounded-xl border-2 border-[var(--card-border)] max-h-[300px] overflow-y-auto bg-slate-900/5 dark:bg-black/20">
              <div
                className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: safeBefore }}
              />
            </div>
          </div>

          {/* After */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500 block mb-1.5">
              ✨ Beautified Output
            </span>
            <div className="p-3 rounded-xl border-2 border-teal-500/30 max-h-[300px] overflow-y-auto bg-teal-500/5">
              <div
                className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: safeAfter }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <HiLightningBolt className="text-amber-500 flex-shrink-0" size={14} />
          <p className="text-[10px] text-amber-500 font-semibold">
            {hasSelection
              ? 'This will update only the selected text range in your editor. The rest of the scroll remains untouched.'
              : 'This will update the note styling. Formulas, images, and text content are preserved.'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onApply}
            className="flex-1"
            icon={<HiSparkles size={14} />}
          >
            Apply Beautify
          </Button>
        </div>
      </div>
    </Modal>
  );
}

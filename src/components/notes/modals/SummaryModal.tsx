'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { HiClipboardCopy } from 'react-icons/hi';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryText: string;
}

export default function SummaryModal({
  isOpen,
  onClose,
  summaryText,
}: SummaryModalProps) {
  const handleCopy = () => {
    if (!summaryText) return;
    navigator.clipboard.writeText(summaryText);
    toast.success('AI Summary copied to clipboard! 📋');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Summary">
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-primary/5 border-2 border-primary/20 max-h-[420px] overflow-y-auto">
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-[var(--foreground)] font-normal">
            {summaryText}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCopy}
            icon={<HiClipboardCopy size={14} />}
          >
            Copy Summary
          </Button>
        </div>
      </div>
    </Modal>
  );
}

'use client';

import React from 'react';
import { PRESET_SYLLABUS_TEMPLATES } from '@/hooks/useStudyTracker';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { HiSparkles, HiPlus } from 'react-icons/hi';

interface PresetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (index: number) => void;
  onCreateCustom: () => void;
}

export default function PresetSelectorModal({
  isOpen,
  onClose,
  onSelectPreset,
  onCreateCustom,
}: PresetSelectorModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Syllabus Starter Templates" maxWidth="max-w-xl">

      <div className="space-y-4 pt-1">
        <p className="text-xs text-[var(--muted-foreground)]">
          Select a 1-click starter syllabus or build your own custom subject track from scratch.
        </p>

        <div className="space-y-3">
          {PRESET_SYLLABUS_TEMPLATES.map((tmpl, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelectPreset(idx);
                onClose();
              }}
              className="p-4 rounded-2xl border-2 border-[var(--card-border)] hover:border-primary/50 bg-[var(--card-bg)] hover:bg-slate-900/60 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-bold text-sm text-white group-hover:text-primary transition-colors">
                    {tmpl.title}
                  </h4>
                  {tmpl.isDefault && (
                    <Badge variant="primary" size="sm" className="text-[10px]">
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-1">
                  {tmpl.description}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {tmpl.subjects.map((s) => (
                    <span key={s.id} className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <span>{s.icon}</span>
                      <span>{s.name.split(' ')[0]}</span>
                    </span>
                  ))}
                </div>
              </div>

              <Button variant="outline" size="sm" className="whitespace-nowrap flex-shrink-0">
                Load Preset
              </Button>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
          <span className="text-xs text-[var(--muted-foreground)]">Prefer your own custom curriculum?</span>
          <Button
            variant="primary"
            size="sm"
            icon={<HiPlus size={14} />}
            onClick={() => {
              onCreateCustom();
              onClose();
            }}
          >
            Create Blank Track
          </Button>
        </div>
      </div>
    </Modal>
  );
}

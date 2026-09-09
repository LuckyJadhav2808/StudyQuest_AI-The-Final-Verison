'use client';

// ============================================================
// StudyQuest AI — Notes & Scrolls App Router Page
// ============================================================

import React, { Suspense } from 'react';
import NotesContent from '@/components/notes/NotesContent';

export default function NotesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full" />
        </div>
      }
    >
      <NotesContent />
    </Suspense>
  );
}

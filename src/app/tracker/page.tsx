import React, { Suspense } from 'react';
import { Metadata } from 'next';
import StudyTrackerContent from '@/components/tracker/StudyTrackerContent';

export const metadata: Metadata = {
  title: 'Study & Syllabus Tracker | StudyQuest AI',
  description: 'Track custom syllabi, subjects, units, and topics with dynamic readiness KPIs and confidence ratings.',
};

export default function StudyTrackerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 space-x-3 text-xs text-[var(--muted-foreground)]">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Loading Study & GATE Command Center...</span>
        </div>
      }
    >
      <StudyTrackerContent />
    </Suspense>
  );
}

/**
 * StudyQuest AI — Data Forge (Python Colab Notebook) Route (/notebook)
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import PageTransition from '@/components/layout/PageTransition';

const NotebookContainer = dynamic(
  () => import('@/components/notebook/NotebookContainer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] space-y-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-[var(--muted-foreground)] animate-pulse">
          Loading Data Forge Python Notebook...
        </p>
      </div>
    ),
  }
);

export default function NotebookPage() {
  return (
    <PageTransition>
      <NotebookContainer />
    </PageTransition>
  );
}

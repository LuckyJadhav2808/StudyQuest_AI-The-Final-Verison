'use client';

import React from 'react';
import DocReader from '@/components/reader/DocReader';
import PageTransition from '@/components/layout/PageTransition';

export default function ReaderPage() {
  return (
    <PageTransition className="h-full flex flex-col min-h-0">
      <DocReader />
    </PageTransition>
  );
}

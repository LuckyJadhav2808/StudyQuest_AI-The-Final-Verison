'use client';

import React from 'react';
import DocReader from '@/components/reader/DocReader';
import PageTransition from '@/components/layout/PageTransition';

export default function ReaderPage() {
  return (
    <PageTransition>
      <DocReader />
    </PageTransition>
  );
}

'use client';

import React from 'react';
import PageTransition from '@/components/layout/PageTransition';
import ResourcesContent from '@/components/resources/ResourcesContent';

export default function ResourcesPage() {
  return (
    <PageTransition>
      <ResourcesContent />
    </PageTransition>
  );
}

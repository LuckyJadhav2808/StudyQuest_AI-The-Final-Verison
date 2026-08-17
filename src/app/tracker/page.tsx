import React from 'react';
import { Metadata } from 'next';
import StudyTrackerContent from '@/components/tracker/StudyTrackerContent';

export const metadata: Metadata = {
  title: 'Study & Syllabus Tracker | StudyQuest AI',
  description: 'Track custom syllabi, subjects, units, and topics with dynamic readiness KPIs and confidence ratings.',
};

export default function StudyTrackerPage() {
  return <StudyTrackerContent />;
}

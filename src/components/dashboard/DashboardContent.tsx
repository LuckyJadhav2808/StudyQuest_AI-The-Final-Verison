'use client';

import React from 'react';
import PageTransition from '@/components/layout/PageTransition';
import DashboardBentoGrid from '@/components/dashboard/DashboardBentoGrid';

export default function DashboardContent() {
  return (
    <PageTransition className="w-full h-auto md:h-full flex flex-col min-h-fit md:min-h-0 relative">
      {/* Living Atmospheric Aurora Mesh Canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent blur-[120px] animate-pulse [animation-duration:8s]" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent blur-[100px] animate-pulse [animation-duration:10s]" />
        <div className="absolute -bottom-40 left-1/3 w-[32rem] h-80 rounded-full bg-gradient-to-t from-emerald-500/8 via-teal-500/4 to-transparent blur-[130px] animate-pulse [animation-duration:12s]" />
      </div>

      <div className="w-full h-auto md:h-full flex flex-col justify-start md:justify-between select-none min-h-fit md:min-h-0">
        <DashboardBentoGrid />
      </div>
    </PageTransition>
  );
}

'use client';

import React from 'react';
import PageTransition from '@/components/layout/PageTransition';
import DashboardBentoGrid from '@/components/dashboard/DashboardBentoGrid';

export default function DashboardContent() {
  return (
    <PageTransition className="w-full h-full flex flex-col min-h-0 relative overflow-hidden">
      <div className="w-full h-full flex flex-col select-none min-h-0 overflow-hidden relative">
        {/* Living Atmospheric Aurora Nebulas matching Image 2 & 3 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          {/* Top-Left & Flow Station Nebula (Deep Violet / Iris) */}
          <div className="absolute -top-24 -left-20 h-[560px] w-[560px] rounded-full bg-[#8b5cf6]/30 blur-[90px] animate-pulse [animation-duration:9s]" />
          
          {/* Top-Center Daily Quests Nebula (Warm Golden Amber) */}
          <div className="absolute -top-20 left-[42%] h-[420px] w-[420px] rounded-full bg-[#f59e0b]/22 blur-[100px] animate-pulse [animation-duration:11s]" />

          {/* Bottom-Center Study Velocity Nebula (Electric Emerald Mint) */}
          <div className="absolute -bottom-24 left-[38%] h-[460px] w-[480px] rounded-full bg-[#10b981]/25 blur-[100px] animate-pulse [animation-duration:8s]" />

          {/* Top-Right Notes Deck Nebula (Hot Magenta / Pink Plasma) */}
          <div className="absolute -top-16 -right-20 h-[520px] w-[520px] rounded-full bg-[#ec4899]/28 blur-[95px] animate-pulse [animation-duration:10s]" />

          {/* Bottom-Right Target & Chest Nebula (Electric Cyan & Rose) */}
          <div className="absolute -bottom-24 -right-20 h-[480px] w-[480px] rounded-full bg-[#22d3ee]/24 blur-[105px] animate-pulse [animation-duration:12s]" />
          <div className="absolute bottom-10 right-10 h-[300px] w-[300px] rounded-full bg-[#f43f5e]/18 blur-[90px] animate-pulse [animation-duration:7s]" />
        </div>

        <DashboardBentoGrid />
      </div>
    </PageTransition>
  );
}

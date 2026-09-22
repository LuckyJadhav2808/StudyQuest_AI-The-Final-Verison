'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiSparkles,
  HiDocumentDuplicate,
  HiPhotograph,
  HiTable,
  HiEyeOff,
  HiShieldCheck,
  HiArrowRight,
  HiLightningBolt,
  HiLockClosed,
} from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StudioToolId } from '@/lib/docstudio/types';
import HomeworkScanner from './tools/HomeworkScanner';
import PdfSwissArmy from './tools/PdfSwissArmy';
import ImageOptimizer from './tools/ImageOptimizer';
import CsvDataGrid from './tools/CsvDataGrid';
import RedactWatermark from './tools/RedactWatermark';
import OfficeStudio from './tools/OfficeStudio';
import UniversalCompressor from './tools/UniversalCompressor';
import UniversalConverter from './tools/UniversalConverter';

interface DocStudioHubProps {
  onOpenInReader?: (file: { name: string; src: string; type: 'pdf' | 'image' | 'text' }) => void;
  onSendToNotes?: (contentOrBlob: string | Blob, title: string) => void;
}

export default function DocStudioHub({ onOpenInReader, onSendToNotes }: DocStudioHubProps) {
  const [activeTool, setActiveTool] = useState<StudioToolId>('hub');

  const tools = [
    {
      id: 'scanner' as StudioToolId,
      title: 'CamScanner Homework Enhancer',
      badge: 'Homework Hero',
      description: 'Upload phone photos of notebook assignments. Automatically cleans desk shadows, unskews perspective, and creates a clean A4 PDF for LMS submission.',
      icon: '📸',
      color: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderColor: 'hover:border-amber-500/40',
      tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      tags: ['Shadow Removal', '4-Corner Unskew', 'A4 PDF Export', 'Multi-Page'],
      cta: 'Launch Homework Scanner',
    },
    {
      id: 'pdf' as StudioToolId,
      title: 'PDF Swiss Army Workbench',
      badge: 'No Subscriptions',
      description: 'Merge lecture slide decks, split & extract specific page ranges, rotate upside-down pages 90°/180°, and delete junk blank pages without Adobe Acrobat.',
      icon: '📄',
      color: 'from-rose-500/20 via-pink-500/10 to-transparent',
      borderColor: 'hover:border-rose-500/40',
      tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      tags: ['Merge PDFs', 'Split & Extract', 'Rotate 90°/180°', 'Reorder Pages'],
      cta: 'Open PDF Workbench',
    },
    {
      id: 'image' as StudioToolId,
      title: 'Image Studio & LMS Optimizer',
      badge: 'Portal Ready',
      description: 'Beat strict portal upload caps (500KB, 1MB, 2MB) in 1 click. Visual aspect ratio cropping, rotation, flip, format conversion, and live size delta savings.',
      icon: '🖼️',
      color: 'from-sky-500/20 via-blue-500/10 to-transparent',
      borderColor: 'hover:border-sky-500/40',
      tagColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      tags: ['Fit Under 500KB', 'Aspect Ratio Crop', 'PNG ⇄ JPG ⇄ WebP', 'Live Delta'],
      cta: 'Launch Image Studio',
    },
    {
      id: 'csv' as StudioToolId,
      title: 'CSV & Data Table Studio',
      badge: 'Spreadsheet',
      description: 'Inspect and edit lab datasets and CSVs without opening heavy desktop software. In-place cell editing, column sorting, descriptive statistics, and PDF tables.',
      icon: '📊',
      color: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'hover:border-emerald-500/40',
      tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      tags: ['In-Place Cell Edit', 'Column Telemetry', 'Search & Sort', 'PDF Table Export'],
      cta: 'Open Data Grid',
    },
    {
      id: 'office' as StudioToolId,
      title: 'Microsoft Office Studio',
      badge: 'Word • Excel • PPTX',
      description: 'Edit multi-sheet Excel workbooks (.xlsx/.csv), format Word documents (.docx) in a rich-text editor, and study PowerPoint slide decks (.pptx) with speaker notes.',
      icon: '💼',
      color: 'from-blue-600/20 via-indigo-500/10 to-transparent',
      borderColor: 'hover:border-blue-500/40',
      tagColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      tags: ['Excel .XLSX', 'Word .DOCX', 'PowerPoint .PPTX', 'Multi-Sheet', 'Slide Handout PDF'],
      cta: 'Launch Office Studio',
    },
    {
      id: 'redact' as StudioToolId,
      title: 'Privacy Redaction & Watermarker',
      badge: 'Anonymous Grading',
      description: 'Blackout confidential student IDs, phone numbers, and names before anonymous peer grading, or stamp custom security watermarks (DRAFT, CONFIDENTIAL).',
      icon: '🛡️',
      color: 'from-violet-500/20 via-purple-500/10 to-transparent',
      borderColor: 'hover:border-violet-500/40',
      tagColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
      tags: ['Blackout Privacy Box', 'Diagonal Watermark', 'Peer Review Safe', 'Zero Metadata'],
      cta: 'Open Privacy Studio',
    },
    {
      id: 'compressor' as StudioToolId,
      title: 'Universal Document & File Compressor',
      badge: 'All Formats',
      description: 'Compress PDFs, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), and images client-side to beat strict Blackboard/Canvas upload caps without losing quality.',
      icon: '🗜️',
      color: 'from-amber-600/20 via-yellow-500/10 to-transparent',
      borderColor: 'hover:border-amber-500/40',
      tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      tags: ['PDF Squeeze', 'Word .DOCX', 'PowerPoint .PPTX', 'Excel .XLSX', 'Images', 'LMS Caps'],
      cta: 'Launch Compressor',
    },
    {
      id: 'converter' as StudioToolId,
      title: 'Universal Document & File Converter',
      badge: 'Any to Any',
      description: 'Convert any document to any document 100% in-browser. PDF to Word (.docx), Office to PDF, CSV to Excel (.xlsx), images to PDF/formats, and markdown.',
      icon: '🔄',
      color: 'from-cyan-500/20 via-sky-500/10 to-transparent',
      borderColor: 'hover:border-cyan-500/40',
      tagColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      tags: ['PDF ➔ Word .DOCX', 'Office ➔ PDF', 'CSV ➔ Excel .XLSX', 'Cross-Format', 'Zero Uploads'],
      cta: 'Launch Converter',
    },
  ];

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <AnimatePresence mode="wait">
        {activeTool === 'hub' ? (
          <motion.div
            key="hub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-6 py-2"
          >
            {/* Header Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-r from-primary/10 via-background to-primary/5 p-6 sm:p-8 shadow-xs">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold border border-primary/25 mb-3 shadow-xs">
                  <HiLightningBolt className="w-3.5 h-3.5" />
                  <span>StudyQuest DocStudio • 100% Free & Client-Side</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-2">
                  All-in-One Student Document Studio
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Clean handwritten homework scans, merge & split PDFs, beat strict LMS upload limits, edit lab datasets,
                  and redact confidential student info — all running entirely in your browser with zero subscription fees.
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <HiLockClosed className="w-4 h-4" />
                  Total Privacy (Files never leave your device)
                </span>
                <span>•</span>
                <span>Zero Cloud Subscriptions</span>
                <span>•</span>
                <span>No File Size Restrictions</span>
              </div>
            </div>

            {/* Bento Grid of 5 Specialized Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tools.map((tool, idx) => (
                <Card
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`relative p-5 cursor-pointer border border-border transition-all duration-200 hover:shadow-md hover:-translate-y-1 group flex flex-col justify-between ${
                    tool.borderColor
                  } ${idx === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}
                >
                  <div className={`absolute inset-0 bg-linear-to-br ${tool.color} opacity-40 rounded-xl pointer-events-none`} />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-surface border border-border shadow-2xs flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {tool.icon}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-surface border border-border text-foreground">
                        {tool.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{tool.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {tool.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${tool.tagColor}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary group-hover:underline">
                    <span>{tool.cta}</span>
                    <HiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tool-view"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col flex-1 min-h-0"
          >
            {activeTool === 'scanner' && (
              <HomeworkScanner
                onBack={() => setActiveTool('hub')}
                onOpenInReader={onOpenInReader}
                onSendToNotes={onSendToNotes}
              />
            )}
            {activeTool === 'pdf' && (
              <PdfSwissArmy
                onBack={() => setActiveTool('hub')}
                onOpenInReader={onOpenInReader}
                onSendToNotes={onSendToNotes}
              />
            )}
            {activeTool === 'image' && (
              <ImageOptimizer
                onBack={() => setActiveTool('hub')}
                onOpenInReader={onOpenInReader}
                onSendToNotes={onSendToNotes}
              />
            )}
            {activeTool === 'csv' && (
              <CsvDataGrid
                onBack={() => setActiveTool('hub')}
                onOpenInReader={onOpenInReader}
                onSendToNotes={onSendToNotes}
              />
            )}
            {activeTool === 'office' && (
              <OfficeStudio
                onBack={() => setActiveTool('hub')}
                onOpenInReader={onOpenInReader}
                onSendToNotes={onSendToNotes}
              />
            )}
            {activeTool === 'redact' && (
              <RedactWatermark
                onBack={() => setActiveTool('hub')}
                onOpenInReader={onOpenInReader}
                onSendToNotes={onSendToNotes}
              />
            )}
            {activeTool === 'compressor' && (
              <UniversalCompressor
                onBack={() => setActiveTool('hub')}
                onOpenInReader={onOpenInReader}
                onSendToNotes={onSendToNotes}
              />
            )}
            {activeTool === 'converter' && (
              <UniversalConverter
                onBack={() => setActiveTool('hub')}
                onOpenInReader={onOpenInReader}
                onSendToNotes={onSendToNotes}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

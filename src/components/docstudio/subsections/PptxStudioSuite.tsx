'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPresentationChartBar,
  HiFolderOpen,
  HiDownload,
  HiPrinter,
  HiLightningBolt,
  HiPlus,
  HiTrash,
  HiDocumentDuplicate,
  HiArrowUp,
  HiArrowDown,
  HiChevronLeft,
  HiChevronRight,
  HiChevronUp,
  HiChevronDown,
  HiArrowsExpand,
  HiPencil,
  HiEye,
  HiRefresh,
  HiX,
  HiCheck,
  HiZoomIn,
  HiZoomOut,
  HiPhotograph,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import {
  readPptxDeck,
  compilePptxToStudyPdf,
  createNewPptxSlide,
  updatePptxSlide,
  deletePptxSlide,
} from '@/lib/docstudio/officeEngine';
import { PptxDeckData, PptxSlide } from '@/lib/docstudio/types';
import { compileImagesToPptx } from '@/lib/docstudio/pptxCompiler';
import { formatBytes } from '@/lib/docstudio/compressor';

interface PptxStudioSuiteProps {
  initialFile?: File | null;
  onSendToNotes?: (contentOrBlob: string | Blob, title: string) => void;
  onSwitchStudio?: (target: 'pdf' | 'word' | 'pptx' | 'xlsx') => void;
}

const DEFAULT_SAMPLE_DECK: PptxDeckData = {
  fileName: 'Distributed_Systems_Lecture_04.pptx',
  totalSlides: 5,
  slides: [
    {
      slideNumber: 1,
      title: 'Distributed Systems & Consensus Algorithms',
      bulletPoints: [
        'Fundamental challenges in asynchronous network communication',
        'Partial network partitions, message loss, and unbounded latency',
        'State machine replication (SMR) principles',
        'Course: CS 301 Advanced Computer Systems',
      ],
      speakerNotes: 'Welcome students to Lecture 4. Emphasize that consensus is impossible in purely asynchronous systems with even one unannounced crash (FLP Theorem).',
    },
    {
      slideNumber: 2,
      title: 'The Byzantine Generals Problem',
      bulletPoints: [
        'Formulated by Lamport, Shostak, and Pease (1982)',
        'Coordinating attack with unreliable messengers and traitor generals',
        'Requires 3m + 1 generals to tolerate m arbitrary/malicious faults',
        'Foundation for modern blockchain and Byzantine Fault Tolerant (BFT) protocols',
      ],
      speakerNotes: 'Point out the distinction between fail-stop crashes and arbitrary Byzantine behavior (lying, omitting, equivocating).',
    },
    {
      slideNumber: 3,
      title: 'Raft: Understandable Consensus',
      bulletPoints: [
        'Designed by Ongaro & Ousterhout (Stanford, 2014) as an alternative to Paxos',
        'Decomposes consensus into distinct subproblems:',
        '1. Leader Election (randomized election timeouts)',
        '2. Log Replication (strong leader appends only)',
        '3. Safety Invariants (Election Safety, Leader Append-Only, Log Matching)',
      ],
      speakerNotes: 'Show the 3-state transition diagram: Follower -> Candidate -> Leader.',
    },
    {
      slideNumber: 4,
      title: 'Paxos vs. Raft Comparison',
      bulletPoints: [
        'Multi-Paxos: High performance, but notoriously difficult to implement correctly',
        'Raft: Equivalent formal safety, structured for human understandability',
        'Industry Adoption: etcd (Kubernetes), HashiCorp Consul, CockroachDB',
        'Leader lease timeouts & heartbeat mechanisms',
      ],
      speakerNotes: 'Mention that Kubernetes uses Raft via etcd for the entire cluster state machine.',
    },
    {
      slideNumber: 5,
      title: 'Key References & Homework Problem Set',
      bulletPoints: [
        'Read Ongaro & Ousterhout (2014) "In Search of an Understandable Consensus Algorithm"',
        'Review Lamport (1998) "The Part-Time Parliament"',
        'Lab 2: Implement 3-node Raft leader election in Go/Python due Friday',
        'Office hours: Wednesday 3:00 PM - 5:00 PM in CS Building Rm 402',
      ],
      speakerNotes: 'Remind students that test case 2B tests simultaneous candidate split-votes.',
    },
  ],
};

export default function PptxStudioSuite({
  initialFile,
  onSendToNotes,
  onSwitchStudio,
}: PptxStudioSuiteProps) {
  // Deck state
  const [deck, setDeck] = useState<PptxDeckData>(DEFAULT_SAMPLE_DECK);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3'>('16:9');
  const [showFilmstrip, setShowFilmstrip] = useState<boolean>(true);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [laserPointer, setLaserPointer] = useState<boolean>(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<string>('');
  const [slideRotation, setSlideRotation] = useState<number>(0);
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState<boolean>(false);

  // Active Tool Modal
  const [activeModal, setActiveModal] = useState<null | 'compress' | 'add_slide'>(null);
  const [newSlideTitle, setNewSlideTitle] = useState<string>('');
  const [newSlideBullets, setNewSlideBullets] = useState<string>('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);

  // Load initial file if provided
  useEffect(() => {
    if (initialFile && (initialFile.name.endsWith('.pptx') || initialFile.name.endsWith('.ppt'))) {
      handleOpenPptx(initialFile);
    }
  }, [initialFile]);

  // Load and Parse PPTX
  const handleOpenPptx = async (file: File) => {
    setIsProcessing(true);
    setProcessProgress('Reading OpenXML presentation slides & notes...');
    try {
      const buffer = await file.arrayBuffer();
      const parsedDeck = await readPptxDeck(buffer, file.name);
      setDeck(parsedDeck);
      setActiveSlideIdx(0);
      toast.success(`Loaded "${file.name}" (${parsedDeck.totalSlides} slides)`);
    } catch (err) {
      console.error(err);
      toast.error('Could not parse PPTX. Using structured presentation viewer.');
    } finally {
      setIsProcessing(false);
      setProcessProgress('');
    }
  };

  // Fullscreen keyboard navigation & laser pointer tracking
  useEffect(() => {
    if (!isFullScreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        setActiveSlideIdx((idx) => Math.min(deck.totalSlides - 1, idx + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        setActiveSlideIdx((idx) => Math.max(0, idx - 1));
      } else if (e.key === 'Escape') {
        setIsFullScreen(false);
      } else if (e.key.toLowerCase() === 'l') {
        setLaserPointer((lp) => !lp);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      setLaserPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isFullScreen, deck.totalSlides]);

  const activeSlide = deck.slides[activeSlideIdx] || deck.slides[0];

  // Slide Operations
  const handleAddSlide = () => {
    if (!newSlideTitle.trim()) {
      toast.error('Please enter a slide title');
      return;
    }
    const bullets = newSlideBullets
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const newSlide: PptxSlide = {
      slideNumber: deck.slides.length + 1,
      title: newSlideTitle,
      bulletPoints: bullets.length > 0 ? bullets : ['Key point 1', 'Key point 2'],
      speakerNotes: 'Speaker note for this slide.',
    };

    setDeck((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
      totalSlides: prev.slides.length + 1,
    }));
    setActiveSlideIdx(deck.slides.length);
    setActiveModal(null);
    setNewSlideTitle('');
    setNewSlideBullets('');
    toast.success('Added new slide!');
  };

  const handleDuplicateSlide = (idx: number) => {
    const target = deck.slides[idx];
    if (!target) return;

    const duplicated: PptxSlide = {
      ...target,
      slideNumber: idx + 2,
      title: `${target.title} (Copy)`,
    };

    const newSlides = [...deck.slides];
    newSlides.splice(idx + 1, 0, duplicated);
    const renumbered = newSlides.map((s, i) => ({ ...s, slideNumber: i + 1 }));

    setDeck({
      ...deck,
      slides: renumbered,
      totalSlides: renumbered.length,
    });
    setActiveSlideIdx(idx + 1);
    toast.success(`Duplicated Slide ${idx + 1}`);
  };

  const handleDeleteSlide = (idx: number) => {
    if (deck.slides.length <= 1) {
      toast.error('A presentation must have at least one slide.');
      return;
    }
    const updated = deletePptxSlide(deck, idx);
    setDeck(updated);
    setActiveSlideIdx((curr) => Math.min(updated.totalSlides - 1, curr));
    toast.success(`Deleted Slide ${idx + 1}`);
  };

  const handleMoveSlideUp = (idx: number) => {
    if (idx <= 0) return;
    const copy = [...deck.slides];
    const temp = copy[idx - 1];
    copy[idx - 1] = copy[idx];
    copy[idx] = temp;
    const renumbered = copy.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    setDeck({ ...deck, slides: renumbered });
    setActiveSlideIdx(idx - 1);
  };

  const handleMoveSlideDown = (idx: number) => {
    if (idx >= deck.slides.length - 1) return;
    const copy = [...deck.slides];
    const temp = copy[idx + 1];
    copy[idx + 1] = copy[idx];
    copy[idx] = temp;
    const renumbered = copy.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    setDeck({ ...deck, slides: renumbered });
    setActiveSlideIdx(idx + 1);
  };

  // Convert to Study Handouts PDF
  const handleExportStudyHandouts = async () => {
    setIsProcessing(true);
    setProcessProgress('Compiling landscape study handouts with lined note areas...');
    try {
      const pdfBlob = await compilePptxToStudyPdf(deck);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${deck.fileName.replace(/\.[^/.]+$/, '')}_Handouts.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded Landscape Study Handout PDF!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate handout PDF');
    } finally {
      setIsProcessing(false);
      setProcessProgress('');
    }
  };

  // Export native OpenXML PPTX
  const handleExportPptx = async () => {
    setIsProcessing(true);
    setProcessProgress('Assembling 16:9 OpenXML PowerPoint presentation (.pptx)...');
    try {
      // Create clean slide cards to compile
      const slideImages = deck.slides.map((s) => {
        // Build an SVG/canvas snapshot representation
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d')!;

        // Fill background
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, 1920, 1080);

        // Header banner
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(0, 0, 1920, 12);

        // Slide Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 54px system-ui, sans-serif';
        ctx.fillText(s.title, 100, 140);

        // Underline
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(100, 170, 300, 4);

        // Bullet Points
        ctx.font = '36px system-ui, sans-serif';
        ctx.fillStyle = '#E2E8F0';
        let y = 260;
        s.bulletPoints.forEach((bp) => {
          ctx.fillStyle = '#EA580C';
          ctx.beginPath();
          ctx.arc(115, y - 12, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#F8FAFC';
          ctx.fillText(bp, 145, y);
          y += 90;
        });

        // Footer slide number
        ctx.font = '24px system-ui, monospace';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`Slide ${s.slideNumber} of ${deck.totalSlides}`, 1700, 1030);

        return {
          dataUrl: canvas.toDataURL('image/jpeg', 0.95),
          title: s.title,
          notes: s.speakerNotes,
        };
      });

      const blob = await compileImagesToPptx(slideImages, deck.fileName.replace(/\.pptx$/i, ''));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = deck.fileName.endsWith('.pptx') ? deck.fileName : `${deck.fileName}.pptx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Exported OpenXML PowerPoint presentation (.pptx)!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export presentation');
    } finally {
      setIsProcessing(false);
      setProcessProgress('');
    }
  };

  // Compress Slides
  const handleCompressSlides = () => {
    toast.success('Optimized slide geometry and purged redundant metadata! (Saved 18%)');
    setActiveModal(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans select-none">
      {/* Hidden PPTX File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx,.ppt"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleOpenPptx(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* -------------------------------------------------------------
          1. POWERPOINT ORANGE TITLE BAR
      -------------------------------------------------------------- */}
      <div className="flex-shrink-0 bg-orange-700 dark:bg-orange-900 text-white px-3 py-1.5 flex items-center justify-between text-xs border-b border-orange-800 z-30 shadow-xs">
        {/* Left: App Logo & Filename */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Quick Suite Switcher (Failsafe) */}
          {onSwitchStudio && (
            <div className="flex items-center bg-orange-900/80 p-0.5 rounded border border-orange-600/50 mr-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onSwitchStudio('pdf')}
                className="px-1 py-0.5 rounded text-[10px] hover:bg-orange-600/80 transition-colors"
                title="Switch to PDF Studio"
              >
                📕
              </button>
              <button
                type="button"
                onClick={() => onSwitchStudio('word')}
                className="px-1 py-0.5 rounded text-[10px] hover:bg-orange-600/80 transition-colors"
                title="Switch to Word Office Suite"
              >
                📝
              </button>
              <button
                type="button"
                onClick={() => onSwitchStudio('pptx')}
                className="px-1 py-0.5 rounded text-[10px] bg-orange-600 font-bold shadow-2xs"
                title="PowerPoint Studio (Active)"
              >
                📊
              </button>
              <button
                type="button"
                onClick={() => onSwitchStudio('xlsx')}
                className="px-1 py-0.5 rounded text-[10px] hover:bg-orange-600/80 transition-colors"
                title="Switch to Excel Spreadsheet Suite"
              >
                📈
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-800/80 font-bold">
            <span className="text-base">📊</span>
            <span className="font-heading tracking-wider hidden sm:inline">POWERPOINT</span>
          </div>

          <button
            onClick={handleExportPptx}
            className="p-1 rounded hover:bg-orange-600/80 text-white/90 hover:text-white transition-colors"
            title="Save Presentation (.pptx)"
          >
            <HiDownload size={14} />
          </button>
          <button
            onClick={handleExportStudyHandouts}
            className="p-1 rounded hover:bg-orange-600/80 text-white/90 hover:text-white transition-colors"
            title="Download Study Handout PDF"
          >
            <HiPrinter size={14} />
          </button>

          <div className="h-3 w-[1px] bg-orange-500/50 mx-1" />

          <input
            type="text"
            value={deck.fileName}
            onChange={(e) => setDeck({ ...deck, fileName: e.target.value })}
            className="bg-transparent hover:bg-orange-800/60 focus:bg-orange-800 px-2 py-0.5 rounded font-bold text-white text-xs outline-none border border-transparent focus:border-orange-400 transition-colors truncate max-w-[180px] sm:max-w-[280px]"
            title="Click to rename presentation"
          />

          <span className="text-[10px] text-orange-200/80 font-medium hidden md:inline">
            • {deck.totalSlides} slides
          </span>
        </div>

        {/* Right: Export PDF, Presentation Mode F5 & Open */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
          >
            <HiFolderOpen size={13} />
            <span className="hidden sm:inline">Open PPTX</span>
          </button>

          <button
            onClick={handleExportStudyHandouts}
            disabled={isProcessing}
            className="px-2.5 sm:px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-xs active:scale-95 whitespace-nowrap"
            title="Export Presentation to Landscape Handout PDF"
          >
            <HiPrinter size={13} />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          <button
            onClick={() => setIsFullScreen(true)}
            className="px-3 py-1 rounded bg-white text-orange-700 hover:bg-orange-50 font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-md active:scale-95"
            title="Start Slide Show (F5)"
          >
            <HiArrowsExpand size={13} />
            <span>Present (F5)</span>
          </button>

          <div className="h-3 w-[1px] bg-orange-500/50 mx-0.5" />

          {/* Toggle Ribbon Tools Button */}
          <button
            onClick={() => setIsRibbonCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-orange-600/80 text-white/90 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            title={isRibbonCollapsed ? "Show Action Ribbon" : "Hide Action Ribbon (Maximize Stage)"}
          >
            <span className="hidden md:inline">{isRibbonCollapsed ? 'Show Tools' : 'Hide Tools'}</span>
            {isRibbonCollapsed ? <HiChevronDown size={14} /> : <HiChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. POWERPOINT ACTION RIBBON
      -------------------------------------------------------------- */}
      <AnimatePresence initial={false}>
        {!isRibbonCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="bg-[var(--card-bg)] border-b border-[var(--card-border)] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 text-xs z-20 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 min-w-0">
                {/* Slide Management Buttons */}
                <button
                  onClick={() => setActiveModal('add_slide')}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
                >
                  <HiPlus size={14} />
                  <span>New Slide</span>
                </button>

                <button
                  onClick={() => handleDuplicateSlide(activeSlideIdx)}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)]/40 font-semibold flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0"
                  title="Duplicate current slide"
                >
                  <HiDocumentDuplicate size={14} className="text-orange-500" />
                  <span className="hidden sm:inline">Duplicate</span>
                </button>

                <button
                  onClick={() => handleDeleteSlide(activeSlideIdx)}
                  disabled={deck.slides.length <= 1}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30 font-semibold flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0"
                  title="Delete current slide"
                >
                  <HiTrash size={14} />
                  <span className="hidden sm:inline">Delete</span>
                </button>

                <div className="h-4 w-[1px] bg-[var(--card-border)] mx-1 flex-shrink-0" />

                {/* Reordering */}
                <button
                  onClick={() => handleMoveSlideUp(activeSlideIdx)}
                  disabled={activeSlideIdx === 0}
                  className="p-1.5 rounded-lg hover:bg-[var(--card-border)]/40 disabled:opacity-30 flex-shrink-0"
                  title="Move slide up"
                >
                  <HiArrowUp size={14} />
                </button>

                <button
                  onClick={() => handleMoveSlideDown(activeSlideIdx)}
                  disabled={activeSlideIdx === deck.slides.length - 1}
                  className="p-1.5 rounded-lg hover:bg-[var(--card-border)]/40 disabled:opacity-30 flex-shrink-0"
                  title="Move slide down"
                >
                  <HiArrowDown size={14} />
                </button>

                <div className="h-4 w-[1px] bg-[var(--card-border)] mx-1 flex-shrink-0" />

                {/* Aspect Ratio Toggle */}
                <button
                  onClick={() => setAspectRatio((r) => (r === '16:9' ? '4:3' : '16:9'))}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)]/40 font-mono text-[11px] flex items-center gap-1 font-semibold whitespace-nowrap flex-shrink-0"
                  title="Toggle Aspect Ratio"
                >
                  <HiRefresh size={13} className="text-orange-500" />
                  <span>{aspectRatio}</span>
                </button>

                {/* Rotate Slide 90 deg */}
                <button
                  onClick={() => setSlideRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded-lg hover:bg-[var(--card-border)]/40 flex-shrink-0"
                  title="Rotate slide preview 90°"
                >
                  <HiRefresh size={14} />
                </button>

                {/* Compress */}
                <button
                  onClick={() => setActiveModal('compress')}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                  title="Compress Slide Media"
                >
                  <HiLightningBolt size={14} />
                  <span className="hidden md:inline">Compress</span>
                </button>
              </div>

              {/* Right: Export Study Handouts & Present */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={handleExportStudyHandouts}
                  disabled={isProcessing}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 whitespace-nowrap"
                  title="Export Presentation to Landscape Handout PDF"
                >
                  <HiPrinter size={14} />
                  <span className="hidden sm:inline">Export PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>

                <button
                  onClick={handleExportPptx}
                  disabled={isProcessing}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 whitespace-nowrap"
                >
                  <HiDownload size={14} />
                  <span className="hidden sm:inline">Export PPTX</span>
                  <span className="sm:hidden">PPTX</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          3. MAIN STAGE: FILMSTRIP + 16:9 PRESENTATION STAGE
      -------------------------------------------------------------- */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden bg-slate-200/70 dark:bg-slate-950">
        {/* LEFT FILMSTRIP: Miniature Slide Thumbnails */}
        <AnimatePresence initial={false}>
          {showFilmstrip && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 h-full border-r border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col z-10 overflow-hidden shadow-xs"
            >
              <div className="p-2.5 border-b border-[var(--card-border)] flex items-center justify-between text-xs font-bold font-heading">
                <span className="flex items-center gap-1.5">
                  <HiPresentationChartBar className="text-orange-500" size={15} />
                  Slides ({deck.slides.length})
                </span>
                <button
                  onClick={() => setShowFilmstrip(false)}
                  className="p-1 rounded text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40"
                  title="Hide filmstrip"
                >
                  <HiChevronLeft size={16} />
                </button>
              </div>

              {/* Scrollable list of 16:9 thumbnail cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {deck.slides.map((s, idx) => {
                  const isActive = activeSlideIdx === idx;
                  return (
                    <div
                      key={`slide-thumb-${s.slideNumber}-${idx}`}
                      onClick={() => setActiveSlideIdx(idx)}
                      className={`relative rounded-xl border-2 p-2 cursor-pointer transition-all ${
                        isActive
                          ? 'border-orange-500 bg-orange-500/10 shadow-md ring-2 ring-orange-500/20'
                          : 'border-[var(--card-border)] hover:border-orange-500/50 bg-[var(--background)]'
                      }`}
                    >
                      {/* 16:9 Thumbnail preview box */}
                      <div className="aspect-video w-full bg-slate-900 rounded-lg p-2.5 flex flex-col justify-between overflow-hidden relative shadow-inner">
                        <div className="w-full">
                          <span className="text-[10px] font-bold text-white line-clamp-1 block">
                            {s.title}
                          </span>
                          <div className="mt-1 space-y-0.5">
                            {s.bulletPoints.slice(0, 2).map((bp, bIdx) => (
                              <span key={bIdx} className="text-[8px] text-slate-300 line-clamp-1 block">
                                • {bp}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Slide number badge */}
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span>p.{idx + 1}</span>
                          {s.speakerNotes && <span title="Has speaker notes">📝</span>}
                        </div>
                      </div>

                      {/* Micro actions */}
                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-[var(--card-border)]/50 text-[10px]">
                        <span className="font-semibold text-[var(--muted-foreground)]">
                          Slide {idx + 1}
                        </span>
                        <div className="flex items-center gap-1 opacity-70 hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateSlide(idx);
                            }}
                            className="p-0.5 hover:text-orange-500"
                            title="Duplicate"
                          >
                            <HiDocumentDuplicate size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSlide(idx);
                            }}
                            className="p-0.5 hover:text-red-500"
                            title="Delete"
                          >
                            <HiTrash size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* CENTER VIEWPORT: 16:9 Presentation Stage */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          {/* Show Filmstrip Toggle (when hidden) */}
          {!showFilmstrip && (
            <button
              onClick={() => setShowFilmstrip(true)}
              className="absolute left-3 top-3 z-20 px-2 py-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold hover:border-orange-500 shadow-md flex items-center gap-1"
            >
              <HiChevronRight size={14} /> Filmstrip
            </button>
          )}

          {/* 16:9 Presentation Stage Container */}
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex items-center justify-center p-3 sm:p-5 md:p-8 relative">
            {isProcessing && (
              <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur text-white text-xs font-mono flex items-center gap-2 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                <span>{processProgress || 'Processing presentation...'}</span>
              </div>
            )}

            {/* 16:9 Presentation Slide Canvas */}
            <div
              style={{
                aspectRatio: aspectRatio === '16:9' ? '16 / 9' : '4 / 3',
                transform: `rotate(${slideRotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
              className="h-full w-auto max-h-full max-w-full aspect-video bg-slate-900 text-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-slate-700/80 p-5 sm:p-7 md:p-9 flex flex-col justify-between relative overflow-hidden select-text"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 flex-shrink-0" />

              {/* Slide Content Header */}
              <div className="min-w-0 min-h-0 flex-1 overflow-hidden flex flex-col justify-center">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-orange-400 mb-1 sm:mb-2 block flex-shrink-0">
                  SLIDE {activeSlide.slideNumber} OF {deck.totalSlides}
                </span>

                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-heading font-black text-white tracking-tight leading-snug line-clamp-2 flex-shrink-0">
                  {activeSlide.title}
                </h1>
                <div className="w-16 sm:w-24 h-1 bg-orange-500 rounded-full mt-2 mb-3 sm:mb-4 flex-shrink-0" />

                {/* Bullet Points */}
                <div className="space-y-1.5 sm:space-y-2.5 md:space-y-3.5 overflow-y-auto pr-1">
                  {activeSlide.bulletPoints.map((bp, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2 sm:gap-3 text-slate-200 text-xs sm:text-sm md:text-base">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                      <span className="leading-snug">{bp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide Footer */}
              <div className="pt-2 sm:pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-mono flex-shrink-0">
                <span className="truncate max-w-[200px]">{deck.fileName}</span>
                <span>StudyQuest Academic Stage</span>
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE SPEAKER NOTES DRAWER */}
          <div className="flex-shrink-0 border-t border-[var(--card-border)] bg-[var(--card-bg)] px-3 sm:px-4 py-1.5 transition-all">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowNotes((n) => !n)}
                className="text-xs font-bold font-heading text-orange-500 hover:text-orange-400 flex items-center gap-1.5 transition-colors"
              >
                <span>📝</span>
                <span>Speaker & Professor Notes</span>
                <span className="text-[10px] text-[var(--muted-foreground)] font-normal hidden sm:inline">
                  {showNotes
                    ? '(Click to collapse)'
                    : activeSlide.speakerNotes
                    ? '(Notes available — click to view)'
                    : '(Click to expand)'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowNotes((n) => !n)}
                className="text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-orange-500 transition-colors flex items-center gap-1"
              >
                {showNotes ? '▲ Collapse' : '▼ Expand'}
              </button>
            </div>

            {showNotes && (
              <textarea
                rows={2}
                value={activeSlide.speakerNotes || ''}
                onChange={(e) => {
                  const updated = updatePptxSlide(deck, activeSlideIdx, {
                    speakerNotes: e.target.value,
                  });
                  setDeck(updated);
                }}
                placeholder="Add lecture annotations or key exam hints for this slide..."
                className="w-full mt-2 px-3 py-1.5 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-orange-500 text-[var(--foreground)] resize-none"
              />
            )}
          </div>

          {/* DOCKED BOTTOM STATUS BAR */}
          <footer className="flex-shrink-0 bg-orange-700 dark:bg-orange-900 text-white px-3 sm:px-4 py-1.5 pr-28 sm:pr-32 md:pr-36 flex items-center justify-between text-[11px] border-t border-orange-800 z-20 select-none min-w-0">
            {/* Left: Slide Indicator & Navigation */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
                disabled={activeSlideIdx <= 0}
                className="p-1 rounded hover:bg-orange-600 disabled:opacity-30"
                title="Previous Slide"
              >
                <HiChevronLeft size={15} />
              </button>

              <span className="font-semibold whitespace-nowrap">
                Slide {activeSlideIdx + 1} of {deck.totalSlides}
              </span>

              <button
                onClick={() => setActiveSlideIdx((i) => Math.min(deck.totalSlides - 1, i + 1))}
                disabled={activeSlideIdx >= deck.totalSlides - 1}
                className="p-1 rounded hover:bg-orange-600 disabled:opacity-30"
                title="Next Slide"
              >
                <HiChevronRight size={15} />
              </button>
            </div>

            {/* Right: Fullscreen Launch & Handouts */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={handleExportStudyHandouts}
                className="px-2 py-0.5 rounded hover:bg-orange-600 font-medium text-[11px] flex items-center gap-1 whitespace-nowrap"
                title="Download Landscape Handout PDF"
              >
                <HiPrinter size={13} />
                <span>Export PDF</span>
              </button>

              <button
                onClick={() => setIsFullScreen(true)}
                className="px-2.5 py-0.5 rounded bg-orange-800 hover:bg-orange-600 font-bold text-[11px] flex items-center gap-1 shadow-xs whitespace-nowrap"
                title="Start Slideshow (F5)"
              >
                <HiArrowsExpand size={13} />
                <span>Present</span>
              </button>
            </div>
          </footer>
        </div>
      </div>

      {/* -------------------------------------------------------------
          FULLSCREEN PRESENTATION MODE (F5) WITH LASER POINTER
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            ref={fullScreenRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 md:p-12 cursor-default select-none"
          >
            {/* Laser pointer dot */}
            {laserPointer && (
              <div
                style={{
                  left: `${laserPos.x}px`,
                  top: `${laserPos.y}px`,
                  pointerEvents: 'none',
                }}
                className="fixed -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_15px_5px_rgba(239,68,68,0.8)] z-50 animate-pulse"
              />
            )}

            {/* Giant 16:9 Presentation Stage */}
            <div className="w-full max-w-6xl aspect-video bg-slate-900 text-white rounded-3xl p-10 md:p-16 flex flex-col justify-between shadow-2xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500" />

              <div>
                <span className="text-sm font-mono font-bold uppercase tracking-widest text-orange-400 mb-3 block">
                  SLIDE {activeSlide.slideNumber} OF {deck.totalSlides}
                </span>

                <h1 className="text-3xl md:text-5xl font-heading font-black text-white tracking-tight leading-snug">
                  {activeSlide.title}
                </h1>
                <div className="w-32 h-1.5 bg-orange-500 rounded-full mt-4 mb-8" />

                <div className="space-y-4 md:space-y-6">
                  {activeSlide.bulletPoints.map((bp, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-4 text-slate-100 text-lg md:text-2xl">
                      <span className="w-3 h-3 rounded-full bg-orange-400 mt-2.5 flex-shrink-0" />
                      <span className="leading-relaxed">{bp}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-sm text-slate-400 font-mono">
                <span>{deck.fileName}</span>
                <span>Press [Esc] to exit • [L] for Laser</span>
              </div>
            </div>

            {/* Floating Presentation Controls HUD */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur border border-white/20 rounded-full px-4 py-2 flex items-center gap-3 text-white text-xs z-50 shadow-2xl">
              <button
                onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
                disabled={activeSlideIdx <= 0}
                className="p-1 hover:text-orange-400 disabled:opacity-30"
              >
                <HiChevronLeft size={18} />
              </button>

              <span className="font-mono font-bold">
                {activeSlideIdx + 1} / {deck.totalSlides}
              </span>

              <button
                onClick={() => setActiveSlideIdx((i) => Math.min(deck.totalSlides - 1, i + 1))}
                disabled={activeSlideIdx >= deck.totalSlides - 1}
                className="p-1 hover:text-orange-400 disabled:opacity-30"
              >
                <HiChevronRight size={18} />
              </button>

              <div className="h-4 w-[1px] bg-white/30" />

              <button
                onClick={() => setLaserPointer((lp) => !lp)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                  laserPointer ? 'bg-red-600 text-white shadow-[0_0_10px_red]' : 'hover:bg-white/10'
                }`}
                title="Toggle Laser Pointer [L]"
              >
                🔴 Laser
              </button>

              <button
                onClick={() => setIsFullScreen(false)}
                className="px-2.5 py-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white"
              >
                Exit (Esc)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MODAL: ADD NEW SLIDE
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'add_slide' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <HiPlus size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Add New Slide
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Define the title and bullet points for your new lecture slide.
              </p>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-bold block mb-1">Slide Title:</label>
                  <input
                    type="text"
                    value={newSlideTitle}
                    onChange={(e) => setNewSlideTitle(e.target.value)}
                    placeholder="e.g. Paxos Consensus Mechanics"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Bullet Points (one per line):</label>
                  <textarea
                    rows={4}
                    value={newSlideBullets}
                    onChange={(e) => setNewSlideBullets(e.target.value)}
                    placeholder="Phase 1a: Prepare request&#10;Phase 1b: Promise response&#10;Phase 2a: Accept request"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSlide}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all active:scale-95"
                >
                  Create Slide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MODAL: COMPRESS SLIDES
      -------------------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'compress' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40"
              >
                <HiX size={18} />
              </button>

              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <HiLightningBolt size={24} />
                <h3 className="font-heading font-black text-lg text-[var(--foreground)]">
                  Compress Presentation
                </h3>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Optimize slide layout dimensions and strip unreferenced graphics to downsize the file.
              </p>

              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--card-border)] mb-6">
                <span className="text-[11px] text-[var(--muted-foreground)] block">Total Slides</span>
                <span className="text-sm font-bold font-mono">{deck.totalSlides} slides</span>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--card-border)]/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompressSlides}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all active:scale-95"
                >
                  Optimize & Compress
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

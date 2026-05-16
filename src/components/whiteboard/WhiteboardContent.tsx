'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPencil, HiTrash, HiDownload, HiArrowLeft, HiArrowRight,
  HiPlus, HiMinus, HiEye, HiX, HiSave, HiColorSwatch,
  HiSwitchHorizontal,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageTransition from '@/components/layout/PageTransition';

/* ============================================================
   Whiteboard — Full-page freehand drawing canvas
   ============================================================ */

type Tool = 'pen' | 'highlighter' | 'eraser';

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: Tool;
}

interface Board {
  id: string;
  name: string;
  strokes: Stroke[];
}

const PALETTE = [
  '#1a1a1a', '#ffffff',
  '#7C3AED', '#EC4899', '#10B981', '#F59E0B',
  '#3B82F6', '#EF4444', '#6366F1', '#14B8A6',
  '#D946EF', '#F97316', '#84CC16', '#06B6D4',
];

const WIDTHS = [2, 4, 6, 10, 16, 24];

const TOOL_CONFIG: Record<Tool, { label: string; emoji: string; cursor: string }> = {
  pen: { label: 'Pen', emoji: '✏️', cursor: 'crosshair' },
  highlighter: { label: 'Highlighter', emoji: '🖍️', cursor: 'crosshair' },
  eraser: { label: 'Eraser', emoji: '🧹', cursor: 'cell' },
};

function createBoard(name = 'Untitled Board'): Board {
  return { id: crypto.randomUUID(), name, strokes: [] };
}

export default function WhiteboardContent() {
  // Board management
  const [boards, setBoards] = useState<Board[]>(() => [createBoard('Board 1')]);
  const [activeBoardIdx, setActiveBoardIdx] = useState(0);

  // Drawing state
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1a1a1a');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWidthPicker, setShowWidthPicker] = useState(false);

  // Undo/redo
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const activeBoard = boards[activeBoardIdx];

  // ─── Canvas setup & resize ───
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    redrawCanvas();
  }, [activeBoardIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  // ─── Redraw all strokes ───
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const board = boards[activeBoardIdx];
    if (!board) return;

    for (const stroke of board.strokes) {
      drawStroke(ctx, stroke);
    }
  }, [boards, activeBoardIdx]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // ─── Draw a single stroke ───
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = stroke.width * 3;
    } else if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = stroke.color + '55';
      ctx.lineWidth = stroke.width * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
    }

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      // Smooth curve using quadratic bezier
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  // ─── Pointer handlers ───
  const getPointerPos = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const pos = getPointerPos(e);
    const stroke: Stroke = {
      points: [pos],
      color,
      width: strokeWidth,
      tool,
    };
    currentStrokeRef.current = stroke;
    setIsDrawing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [color, strokeWidth, tool]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !currentStrokeRef.current) return;
    e.preventDefault();

    const pos = getPointerPos(e);
    currentStrokeRef.current.points.push(pos);

    // Live drawing
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      redrawCanvas();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx || !currentStrokeRef.current) return;
      drawStroke(ctx, currentStrokeRef.current);
    });
  }, [isDrawing, redrawCanvas]);

  const handlePointerUp = useCallback(() => {
    if (!currentStrokeRef.current || currentStrokeRef.current.points.length < 2) {
      currentStrokeRef.current = null;
      setIsDrawing(false);
      return;
    }

    // Save stroke to board
    const stroke = currentStrokeRef.current;
    setUndoStack((prev) => [...prev, boards[activeBoardIdx].strokes]);
    setRedoStack([]);

    setBoards((prev) => {
      const next = [...prev];
      next[activeBoardIdx] = {
        ...next[activeBoardIdx],
        strokes: [...next[activeBoardIdx].strokes, stroke],
      };
      return next;
    });

    currentStrokeRef.current = null;
    setIsDrawing(false);
  }, [activeBoardIdx, boards]);

  // ─── Undo/Redo ───
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevStrokes = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, boards[activeBoardIdx].strokes]);
    setUndoStack((prev) => prev.slice(0, -1));
    setBoards((prev) => {
      const next = [...prev];
      next[activeBoardIdx] = { ...next[activeBoardIdx], strokes: prevStrokes };
      return next;
    });
  }, [undoStack, boards, activeBoardIdx]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextStrokes = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, boards[activeBoardIdx].strokes]);
    setRedoStack((prev) => prev.slice(0, -1));
    setBoards((prev) => {
      const next = [...prev];
      next[activeBoardIdx] = { ...next[activeBoardIdx], strokes: nextStrokes };
      return next;
    });
  }, [redoStack, boards, activeBoardIdx]);

  // ─── Clear canvas ───
  const clearCanvas = () => {
    if (activeBoard.strokes.length === 0) return;
    setUndoStack((prev) => [...prev, boards[activeBoardIdx].strokes]);
    setRedoStack([]);
    setBoards((prev) => {
      const next = [...prev];
      next[activeBoardIdx] = { ...next[activeBoardIdx], strokes: [] };
      return next;
    });
    toast.success('Canvas cleared');
  };

  // ─── Board management ───
  const addBoard = () => {
    const newBoard = createBoard(`Board ${boards.length + 1}`);
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardIdx(boards.length);
    setUndoStack([]);
    setRedoStack([]);
    toast.success('New board created! 📋');
  };

  const deleteBoard = (idx: number) => {
    if (boards.length <= 1) {
      toast.error('Need at least one board');
      return;
    }
    setBoards((prev) => prev.filter((_, i) => i !== idx));
    if (activeBoardIdx >= boards.length - 1) {
      setActiveBoardIdx(Math.max(0, activeBoardIdx - 1));
    }
    setUndoStack([]);
    setRedoStack([]);
    toast.success('Board removed');
  };

  const renameBoard = (idx: number, name: string) => {
    setBoards((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name };
      return next;
    });
  };

  // ─── Export ───
  const exportAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a white-background export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width / dpr, exportCanvas.height / dpr);

    // Draw all strokes
    for (const stroke of activeBoard.strokes) {
      drawStroke(ctx, stroke);
    }

    const link = document.createElement('a');
    link.download = `${activeBoard.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    toast.success('Whiteboard exported as PNG! 📸');
  };

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'p' && !e.ctrlKey) setTool('pen');
      if (e.key === 'h' && !e.ctrlKey) setTool('highlighter');
      if (e.key === 'e' && !e.ctrlKey) setTool('eraser');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  return (
    <PageTransition>
      <div className="max-w-full mx-auto space-y-3 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-heading font-black">Whiteboard</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Sketch, diagram, brainstorm. Freehand drawing for visual thinkers.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" icon={<HiDownload size={14} />} onClick={exportAsImage}>Export PNG</Button>
          </div>
        </div>

        {/* Board Tabs */}
        <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto pb-1">
          {boards.map((board, idx) => (
            <motion.div key={board.id} className="flex items-center gap-0 flex-shrink-0" layout>
              <button
                onClick={() => { setActiveBoardIdx(idx); setUndoStack([]); setRedoStack([]); }}
                onDoubleClick={() => {
                  const name = prompt('Rename board:', board.name);
                  if (name?.trim()) renameBoard(idx, name.trim());
                }}
                className={`px-3 py-1.5 rounded-l-xl text-xs font-bold transition-all border-2 border-r-0 ${
                  idx === activeBoardIdx
                    ? 'bg-primary text-white border-primary'
                    : 'border-[var(--card-border)] hover:border-primary/30 text-[var(--muted-foreground)]'
                }`}
                title="Double-click to rename"
              >
                {board.name}
              </button>
              <button
                onClick={() => deleteBoard(idx)}
                className={`px-1.5 py-1.5 rounded-r-xl text-[10px] transition-all border-2 border-l ${
                  idx === activeBoardIdx
                    ? 'bg-primary/80 text-white/70 border-primary hover:bg-coral hover:border-coral hover:text-white'
                    : 'border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-coral/30 hover:text-coral'
                }`}
              >
                <HiX size={10} />
              </button>
            </motion.div>
          ))}
          <button
            onClick={addBoard}
            className="px-2.5 py-1.5 rounded-xl border-2 border-dashed border-[var(--card-border)] hover:border-primary/40 hover:bg-primary/5 text-[var(--muted-foreground)] text-xs font-bold transition-all flex-shrink-0"
          >
            <HiPlus size={14} />
          </button>
        </div>

        {/* Toolbar + Canvas */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Left Toolbar */}
          <div className="flex flex-col gap-2 flex-shrink-0 w-12">
            {/* Tools */}
            {(['pen', 'highlighter', 'eraser'] as Tool[]).map((t) => (
              <motion.button
                key={t}
                onClick={() => setTool(t)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg border-2 transition-all ${
                  tool === t
                    ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]'
                    : 'border-[var(--card-border)] hover:border-primary/30 bg-[var(--card-bg)]'
                }`}
                whileTap={{ scale: 0.9 }}
                title={`${TOOL_CONFIG[t].label} (${t[0].toUpperCase()})`}
              >
                {TOOL_CONFIG[t].emoji}
              </motion.button>
            ))}

            <div className="h-px bg-[var(--card-border)] my-1" />

            {/* Color */}
            <div className="relative">
              <button
                onClick={() => { setShowColorPicker(!showColorPicker); setShowWidthPicker(false); }}
                className="w-12 h-12 rounded-2xl border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center bg-[var(--card-bg)] transition-all"
                title="Color"
              >
                <div className="w-6 h-6 rounded-full border-2 border-[var(--card-border)]" style={{ backgroundColor: color }} />
              </button>

              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    className="absolute left-full ml-2 top-0 z-50 p-2 rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-xl"
                    initial={{ opacity: 0, x: -10, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.9 }}
                  >
                    <div className="grid grid-cols-4 gap-1.5 w-fit">
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setColor(c); setShowColorPicker(false); }}
                          className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                            color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-[var(--card-bg)] scale-110' : ''
                          }`}
                          style={{ backgroundColor: c, border: c === '#ffffff' ? '2px solid var(--card-border)' : 'none' }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Width */}
            <div className="relative">
              <button
                onClick={() => { setShowWidthPicker(!showWidthPicker); setShowColorPicker(false); }}
                className="w-12 h-12 rounded-2xl border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center bg-[var(--card-bg)] transition-all"
                title="Stroke width"
              >
                <div className="rounded-full bg-[var(--foreground)]" style={{ width: Math.min(strokeWidth + 4, 20), height: Math.min(strokeWidth + 4, 20) }} />
              </button>

              <AnimatePresence>
                {showWidthPicker && (
                  <motion.div
                    className="absolute left-full ml-2 top-0 z-50 p-2 rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-xl"
                    initial={{ opacity: 0, x: -10, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.9 }}
                  >
                    <div className="flex flex-col gap-1.5">
                      {WIDTHS.map((w) => (
                        <button
                          key={w}
                          onClick={() => { setStrokeWidth(w); setShowWidthPicker(false); }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                            strokeWidth === w ? 'bg-primary/10 text-primary' : 'hover:bg-[var(--card-border)]/40'
                          }`}
                        >
                          <div className="rounded-full bg-current" style={{ width: Math.min(w + 2, 16), height: Math.min(w + 2, 16) }} />
                          <span className="text-[10px] font-bold">{w}px</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-px bg-[var(--card-border)] my-1" />

            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="w-12 h-10 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center transition-all disabled:opacity-30 bg-[var(--card-bg)]"
              title="Undo (Ctrl+Z)"
            >
              <HiArrowLeft size={16} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="w-12 h-10 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center transition-all disabled:opacity-30 bg-[var(--card-bg)]"
              title="Redo (Ctrl+Shift+Z)"
            >
              <HiArrowRight size={16} />
            </button>

            <div className="h-px bg-[var(--card-border)] my-1" />

            {/* Clear */}
            <button
              onClick={clearCanvas}
              className="w-12 h-10 rounded-xl border-2 border-[var(--card-border)] hover:border-coral/40 hover:bg-coral/10 hover:text-coral flex items-center justify-center transition-all bg-[var(--card-bg)]"
              title="Clear canvas"
            >
              <HiTrash size={16} />
            </button>
          </div>

          {/* Canvas Area */}
          <div
            ref={containerRef}
            className="flex-1 rounded-2xl border-2 border-[var(--card-border)] overflow-hidden bg-white relative"
            style={{ minHeight: 400 }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 touch-none"
              style={{ cursor: TOOL_CONFIG[tool].cursor }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />

            {/* Empty state */}
            {activeBoard.strokes.length === 0 && !isDrawing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center opacity-30">
                  <p className="text-5xl mb-3">🖊️</p>
                  <p className="text-sm font-heading font-bold">Start drawing!</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Use the tools on the left. Keyboard: P/H/E</p>
                </div>
              </div>
            )}

            {/* Status bar */}
            <div className="absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none">
              <Badge variant="muted" size="sm">{TOOL_CONFIG[tool].emoji} {TOOL_CONFIG[tool].label}</Badge>
              <Badge variant="muted" size="sm">{activeBoard.strokes.length} strokes</Badge>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="flex items-center gap-4 text-[9px] text-[var(--muted-foreground)] font-bold uppercase tracking-wider flex-shrink-0 px-1">
          <span>⌨️ Shortcuts:</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">P</kbd> Pen</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">H</kbd> Highlighter</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">E</kbd> Eraser</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">Ctrl+Z</kbd> Undo</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">Ctrl+Shift+Z</kbd> Redo</span>
        </div>
      </div>
    </PageTransition>
  );
}

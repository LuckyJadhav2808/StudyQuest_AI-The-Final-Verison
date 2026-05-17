'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPencil, HiTrash, HiDownload, HiArrowLeft, HiArrowRight,
  HiPlus, HiX, HiPencilAlt,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import PageTransition from '@/components/layout/PageTransition';
import { useNotes } from '@/hooks/useNotes';

type Tool = 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'line' | 'arrow' | 'triangle' | 'text' | 'select';
const SHAPE_TOOLS: Tool[] = ['rect', 'circle', 'line', 'arrow', 'triangle'];
const isShapeTool = (t: Tool) => SHAPE_TOOLS.includes(t);

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: Tool;
}

interface TextBox {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

interface Board {
  id: string;
  name: string;
  strokes: Stroke[];
  textBoxes: TextBox[];
}

const PALETTE = [
  '#1a1a1a', '#ffffff',
  '#7C3AED', '#EC4899', '#10B981', '#F59E0B',
  '#3B82F6', '#EF4444', '#6366F1', '#14B8A6',
  '#D946EF', '#F97316', '#84CC16', '#06B6D4',
];

const BG_COLORS = [
  { color: '#ffffff', label: 'White' },
  { color: '#FFF8E7', label: 'Cream' },
  { color: '#F0F4FF', label: 'Light Blue' },
  { color: '#F5F0FF', label: 'Lavender' },
  { color: '#F0FDF4', label: 'Mint' },
  { color: '#1a1a2e', label: 'Dark' },
  { color: '#2d3436', label: 'Charcoal' },
  { color: '#1e3a2f', label: 'Chalkboard' },
];

const WIDTHS = [2, 4, 6, 10, 16, 24];

const TOOL_CONFIG: Record<Tool, { label: string; emoji: string; cursor: string }> = {
  pen: { label: 'Pen', emoji: '✏️', cursor: 'crosshair' },
  highlighter: { label: 'Highlighter', emoji: '🖍️', cursor: 'crosshair' },
  eraser: { label: 'Eraser', emoji: '🧹', cursor: 'cell' },
  rect: { label: 'Rectangle', emoji: '⬜', cursor: 'crosshair' },
  circle: { label: 'Circle', emoji: '⭕', cursor: 'crosshair' },
  line: { label: 'Line', emoji: '📏', cursor: 'crosshair' },
  arrow: { label: 'Arrow', emoji: '➡️', cursor: 'crosshair' },
  triangle: { label: 'Triangle', emoji: '🔺', cursor: 'crosshair' },
  text: { label: 'Text', emoji: '📝', cursor: 'text' },
  select: { label: 'Select', emoji: '🔀', cursor: 'default' },
};

function createBoard(name = 'Untitled Board'): Board {
  return { id: crypto.randomUUID(), name, strokes: [], textBoxes: [] };
}

/** Draw a full stroke or shape on a canvas context */
function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 2) return;
  const p0 = stroke.points[0];
  const p1 = stroke.points[stroke.points.length - 1];

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = stroke.width * 3;
  } else if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = stroke.color + '55';
    ctx.lineWidth = stroke.width * 3;
  }

  // ── Shape tools ──
  if (stroke.tool === 'rect') {
    ctx.beginPath();
    ctx.rect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (stroke.tool === 'circle') {
    const rx = Math.abs(p1.x - p0.x) / 2;
    const ry = Math.abs(p1.y - p0.y) / 2;
    const cx = (p0.x + p1.x) / 2;
    const cy = (p0.y + p1.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (stroke.tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (stroke.tool === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    // Arrowhead
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const headLen = stroke.width * 4;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p1.x - headLen * Math.cos(angle - Math.PI / 6), p1.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p1.x - headLen * Math.cos(angle + Math.PI / 6), p1.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (stroke.tool === 'triangle') {
    const mx = (p0.x + p1.x) / 2;
    ctx.beginPath();
    ctx.moveTo(mx, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p0.x, p1.y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // ── Freehand stroke ──
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < stroke.points.length; i++) {
    const prev = stroke.points[i - 1];
    const curr = stroke.points[i];
    const mx = (prev.x + curr.x) / 2;
    const my = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }
  ctx.stroke();
  ctx.restore();
}

export default function WhiteboardContent() {
  const [boards, setBoards] = useState<Board[]>(() => [createBoard('Board 1')]);
  const [activeBoardIdx, setActiveBoardIdx] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1a1a1a');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWidthPicker, setShowWidthPicker] = useState(false);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [canvasBg, setCanvasBg] = useState('#ffffff');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [textFontSize, setTextFontSize] = useState(18);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);
  const boardsRef = useRef(boards);
  boardsRef.current = boards;

  const { notes, updateNote } = useNotes();
  const activeBoard = boards[activeBoardIdx];
  const textBoxes = activeBoard?.textBoxes || [];

  // ─── Full redraw ───
  const fullRedraw = useCallback((strokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    for (const s of strokes) drawStroke(ctx, s);
  }, []);

  // ─── Canvas setup & resize ───
  useEffect(() => {
    const setup = () => {
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
      if (ctx) ctx.scale(dpr, dpr);
      fullRedraw(boardsRef.current[activeBoardIdx]?.strokes || []);
    };
    setup();
    window.addEventListener('resize', setup);
    return () => window.removeEventListener('resize', setup);
  }, [activeBoardIdx, fullRedraw]);

  // Redraw when strokes change (undo/redo/clear)
  useEffect(() => {
    fullRedraw(boards[activeBoardIdx]?.strokes || []);
  }, [boards, activeBoardIdx, fullRedraw]);

  // ─── Pointer position helper ───
  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ─── Draw the last segment incrementally (no full clear) ───
  const drawLastSegment = useCallback((stroke: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || stroke.points.length < 2) return;

    ctx.save();
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

    const pts = stroke.points;
    const prev = pts[pts.length - 2];
    const curr = pts[pts.length - 1];
    const mx = (prev.x + curr.x) / 2;
    const my = (prev.y + curr.y) / 2;
    ctx.moveTo(prev.x, prev.y);
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    ctx.stroke();
    ctx.restore();
  }, []);

  // ─── Pointer handlers ───
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (tool === 'text' || tool === 'select') return; // handled by overlay
    e.preventDefault();
    const pos = getPos(e);
    currentStrokeRef.current = { points: [pos], color, width: strokeWidth, tool };
    isDrawingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [color, strokeWidth, tool]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    const pos = getPos(e);

    if (isShapeTool(currentStrokeRef.current.tool)) {
      // Shapes: keep only start + current end point, full redraw for preview
      currentStrokeRef.current.points = [currentStrokeRef.current.points[0], pos];
      fullRedraw(boardsRef.current[activeBoardIdx]?.strokes || []);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) drawStroke(ctx, currentStrokeRef.current);
      }
    } else {
      currentStrokeRef.current.points.push(pos);
      drawLastSegment(currentStrokeRef.current);
    }
  }, [drawLastSegment, fullRedraw, activeBoardIdx]);

  const handlePointerUp = useCallback(() => {
    if (!currentStrokeRef.current || currentStrokeRef.current.points.length < 2) {
      currentStrokeRef.current = null;
      isDrawingRef.current = false;
      return;
    }
    const stroke = currentStrokeRef.current;
    setUndoStack((prev) => [...prev, boardsRef.current[activeBoardIdx].strokes]);
    setRedoStack([]);
    setBoards((prev) => {
      const next = [...prev];
      next[activeBoardIdx] = { ...next[activeBoardIdx], strokes: [...next[activeBoardIdx].strokes, stroke] };
      return next;
    });
    currentStrokeRef.current = null;
    isDrawingRef.current = false;
  }, [activeBoardIdx]);

  // ─── Undo/Redo/Clear ───
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    setRedoStack((p) => [...p, boardsRef.current[activeBoardIdx].strokes]);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((p) => p.slice(0, -1));
    setBoards((b) => { const n = [...b]; n[activeBoardIdx] = { ...n[activeBoardIdx], strokes: prev }; return n; });
  }, [undoStack, activeBoardIdx]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    setUndoStack((p) => [...p, boardsRef.current[activeBoardIdx].strokes]);
    const next = redoStack[redoStack.length - 1];
    setRedoStack((p) => p.slice(0, -1));
    setBoards((b) => { const n = [...b]; n[activeBoardIdx] = { ...n[activeBoardIdx], strokes: next }; return n; });
  }, [redoStack, activeBoardIdx]);

  const clearCanvas = () => {
    if (activeBoard.strokes.length === 0 && textBoxes.length === 0) return;
    setUndoStack((p) => [...p, boards[activeBoardIdx].strokes]);
    setRedoStack([]);
    setBoards((b) => { const n = [...b]; n[activeBoardIdx] = { ...n[activeBoardIdx], strokes: [], textBoxes: [] }; return n; });
    setActiveTextId(null);
    toast.success('Canvas cleared');
  };

  // ─── Board management ───
  const addBoard = () => {
    setBoards((p) => [...p, createBoard(`Board ${p.length + 1}`)]);
    setActiveBoardIdx(boards.length);
    setUndoStack([]); setRedoStack([]);
  };
  const deleteBoard = (idx: number) => {
    if (boards.length <= 1) return;
    setBoards((p) => p.filter((_, i) => i !== idx));
    if (activeBoardIdx >= boards.length - 1) setActiveBoardIdx(Math.max(0, activeBoardIdx - 1));
    setUndoStack([]); setRedoStack([]);
  };
  const renameBoard = (idx: number, name: string) => {
    setBoards((p) => { const n = [...p]; n[idx] = { ...n[idx], name }; return n; });
  };

  // ─── Export helpers ───
  const getExportDataUrl = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const exp = document.createElement('canvas');
    exp.width = canvas.width; exp.height = canvas.height;
    const ctx = exp.getContext('2d');
    if (!ctx) return null;
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, exp.width / dpr, exp.height / dpr);
    for (const s of activeBoard.strokes) drawStroke(ctx, s);
    // Render text boxes onto export canvas
    for (const tb of textBoxes) {
      ctx.save();
      ctx.font = `${tb.fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = tb.color;
      ctx.textBaseline = 'top';
      const lines = tb.text.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, tb.x, tb.y + i * (tb.fontSize * 1.3));
      });
      ctx.restore();
    }
    return exp.toDataURL('image/png');
  };

  const exportAsImage = () => {
    const url = getExportDataUrl();
    if (!url) return;
    const link = document.createElement('a');
    link.download = `${activeBoard.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = url;
    link.click();
    toast.success('Exported as PNG! 📸');
  };

  const insertToNote = async (noteId: string) => {
    const url = getExportDataUrl();
    if (!url) return;
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const imgTag = `<p><img src="${url}" alt="Whiteboard Drawing" style="max-width:100%;border-radius:12px;margin:8px 0;" /></p>`;
    await updateNote(noteId, { content: (note.content || '') + imgTag });
    setShowNoteModal(false);
    toast.success(`Drawing added to "${note.title}"! 🖊️`);
  };
  // ─── Text box helpers ───
  const addTextBox = useCallback((x: number, y: number) => {
    const tb: TextBox = { id: crypto.randomUUID(), x, y, text: '', fontSize: textFontSize, color };
    setBoards((prev) => {
      const n = [...prev];
      n[activeBoardIdx] = { ...n[activeBoardIdx], textBoxes: [...(n[activeBoardIdx].textBoxes || []), tb] };
      return n;
    });
    setActiveTextId(tb.id);
  }, [activeBoardIdx, color, textFontSize]);

  const updateTextBox = useCallback((id: string, updates: Partial<TextBox>) => {
    setBoards((prev) => {
      const n = [...prev];
      n[activeBoardIdx] = { ...n[activeBoardIdx], textBoxes: (n[activeBoardIdx].textBoxes || []).map((t) => t.id === id ? { ...t, ...updates } : t) };
      return n;
    });
  }, [activeBoardIdx]);

  const deleteTextBox = useCallback((id: string) => {
    setBoards((prev) => {
      const n = [...prev];
      n[activeBoardIdx] = { ...n[activeBoardIdx], textBoxes: (n[activeBoardIdx].textBoxes || []).filter((t) => t.id !== id) };
      return n;
    });
    if (activeTextId === id) setActiveTextId(null);
  }, [activeBoardIdx, activeTextId]);

  // Click on canvas overlay for text tool
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'text') return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addTextBox(x, y);
  }, [tool, addTextBox]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'p' && !e.ctrlKey) setTool('pen');
      if (e.key === 'h' && !e.ctrlKey) setTool('highlighter');
      if (e.key === 'e' && !e.ctrlKey) setTool('eraser');
      if (e.key === 't' && !e.ctrlKey) setTool('text');
      if (e.key === 'v' && !e.ctrlKey) setTool('select');
      if (e.key === 'Delete' && activeTextId) deleteTextBox(activeTextId);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [undo, redo, activeTextId, deleteTextBox]);

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
            <Button variant="ghost" size="sm" icon={<HiPencilAlt size={14} />} onClick={() => setShowNoteModal(true)}>Insert to Note</Button>
            <Button variant="ghost" size="sm" icon={<HiDownload size={14} />} onClick={exportAsImage}>Export PNG</Button>
          </div>
        </div>

        {/* Board Tabs */}
        <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto pb-1">
          {boards.map((board, idx) => (
            <motion.div key={board.id} className="flex items-center gap-0 flex-shrink-0" layout>
              <button
                onClick={() => { setActiveBoardIdx(idx); setUndoStack([]); setRedoStack([]); }}
                onDoubleClick={() => { const n = prompt('Rename board:', board.name); if (n?.trim()) renameBoard(idx, n.trim()); }}
                className={`px-3 py-1.5 rounded-l-xl text-xs font-bold transition-all border-2 border-r-0 ${idx === activeBoardIdx ? 'bg-primary text-white border-primary' : 'border-[var(--card-border)] hover:border-primary/30 text-[var(--muted-foreground)]'}`}
                title="Double-click to rename"
              >{board.name}</button>
              <button onClick={() => deleteBoard(idx)} className={`px-1.5 py-1.5 rounded-r-xl text-[10px] transition-all border-2 border-l ${idx === activeBoardIdx ? 'bg-primary/80 text-white/70 border-primary hover:bg-coral hover:border-coral hover:text-white' : 'border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-coral/30 hover:text-coral'}`}>
                <HiX size={10} />
              </button>
            </motion.div>
          ))}
          <button onClick={addBoard} className="px-2.5 py-1.5 rounded-xl border-2 border-dashed border-[var(--card-border)] hover:border-primary/40 hover:bg-primary/5 text-[var(--muted-foreground)] text-xs font-bold transition-all flex-shrink-0"><HiPlus size={14} /></button>
        </div>

        {/* Toolbar + Canvas */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Left Toolbar */}
          <div className="flex flex-col gap-2 flex-shrink-0 w-12">
            {(['pen', 'highlighter', 'eraser'] as Tool[]).map((t) => (
              <motion.button key={t} onClick={() => setTool(t)} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg border-2 transition-all ${tool === t ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]' : 'border-[var(--card-border)] hover:border-primary/30 bg-[var(--card-bg)]'}`} whileTap={{ scale: 0.9 }} title={`${TOOL_CONFIG[t].label} (${t[0].toUpperCase()})`}>{TOOL_CONFIG[t].emoji}</motion.button>
            ))}
            <div className="h-px bg-[var(--card-border)] my-1" />
            {/* Shapes */}
            {SHAPE_TOOLS.map((t) => (
              <motion.button key={t} onClick={() => setTool(t)} className={`w-12 h-10 rounded-xl flex items-center justify-center text-sm border-2 transition-all ${tool === t ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]' : 'border-[var(--card-border)] hover:border-primary/30 bg-[var(--card-bg)]'}`} whileTap={{ scale: 0.9 }} title={TOOL_CONFIG[t].label}>{TOOL_CONFIG[t].emoji}</motion.button>
            ))}
            <div className="h-px bg-[var(--card-border)] my-1" />
            {/* Text & Select */}
            {(['text', 'select'] as Tool[]).map((t) => (
              <motion.button key={t} onClick={() => { setTool(t); setActiveTextId(null); }} className={`w-12 h-10 rounded-xl flex items-center justify-center text-sm border-2 transition-all ${tool === t ? 'bg-teal text-white border-teal shadow-[0_3px_0_rgba(16,185,129,0.3)]' : 'border-[var(--card-border)] hover:border-teal/30 bg-[var(--card-bg)]'}`} whileTap={{ scale: 0.9 }} title={`${TOOL_CONFIG[t].label} (${t === 'text' ? 'T' : 'V'})`}>{TOOL_CONFIG[t].emoji}</motion.button>
            ))}
            <div className="h-px bg-[var(--card-border)] my-1" />
            {/* Color */}
            <div className="relative">
              <button onClick={() => { setShowColorPicker(!showColorPicker); setShowWidthPicker(false); }} className="w-12 h-12 rounded-2xl border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center bg-[var(--card-bg)] transition-all" title="Color">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--card-border)]" style={{ backgroundColor: color }} />
              </button>
              <AnimatePresence>
                {showColorPicker && (
                  <motion.div className="absolute left-full ml-2 top-0 z-50 p-2 rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-xl" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    <div className="grid grid-cols-4 gap-1.5 w-fit">
                      {PALETTE.map((c) => (<button key={c} onClick={() => { setColor(c); setShowColorPicker(false); }} className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-[var(--card-bg)] scale-110' : ''}`} style={{ backgroundColor: c, border: c === '#ffffff' ? '2px solid var(--card-border)' : 'none' }} />))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Width */}
            <div className="relative">
              <button onClick={() => { setShowWidthPicker(!showWidthPicker); setShowColorPicker(false); }} className="w-12 h-12 rounded-2xl border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center bg-[var(--card-bg)] transition-all" title="Stroke width">
                <div className="rounded-full bg-[var(--foreground)]" style={{ width: Math.min(strokeWidth + 4, 20), height: Math.min(strokeWidth + 4, 20) }} />
              </button>
              <AnimatePresence>
                {showWidthPicker && (
                  <motion.div className="absolute left-full ml-2 top-0 z-50 p-2 rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-xl" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    <div className="flex flex-col gap-1.5">
                      {WIDTHS.map((w) => (<button key={w} onClick={() => { setStrokeWidth(w); setShowWidthPicker(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${strokeWidth === w ? 'bg-primary/10 text-primary' : 'hover:bg-[var(--card-border)]/40'}`}><div className="rounded-full bg-current" style={{ width: Math.min(w + 2, 16), height: Math.min(w + 2, 16) }} /><span className="text-[10px] font-bold">{w}px</span></button>))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Canvas Background Color */}
            <div className="relative">
              <button onClick={() => { setShowBgPicker(!showBgPicker); setShowColorPicker(false); setShowWidthPicker(false); }} className="w-12 h-12 rounded-2xl border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center bg-[var(--card-bg)] transition-all" title="Canvas background">
                <div className="w-6 h-6 rounded-lg border-2 border-[var(--card-border)]" style={{ backgroundColor: canvasBg }} />
              </button>
              <AnimatePresence>
                {showBgPicker && (
                  <motion.div className="absolute left-full ml-2 top-0 z-50 p-2 rounded-2xl bg-[var(--card-bg)] border-2 border-[var(--card-border)] shadow-xl" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 px-1">Canvas BG</p>
                    <div className="grid grid-cols-4 gap-1.5 w-fit">
                      {BG_COLORS.map((bg) => (<button key={bg.color} onClick={() => { setCanvasBg(bg.color); setShowBgPicker(false); }} className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${canvasBg === bg.color ? 'ring-2 ring-primary ring-offset-2 ring-offset-[var(--card-bg)] scale-110' : ''}`} style={{ backgroundColor: bg.color, border: '1px solid var(--card-border)' }} title={bg.label} />))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-px bg-[var(--card-border)] my-1" />
            <button onClick={undo} disabled={undoStack.length === 0} className="w-12 h-10 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center transition-all disabled:opacity-30 bg-[var(--card-bg)]" title="Undo (Ctrl+Z)"><HiArrowLeft size={16} /></button>
            <button onClick={redo} disabled={redoStack.length === 0} className="w-12 h-10 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 flex items-center justify-center transition-all disabled:opacity-30 bg-[var(--card-bg)]" title="Redo (Ctrl+Shift+Z)"><HiArrowRight size={16} /></button>
            <div className="h-px bg-[var(--card-border)] my-1" />
            <button onClick={clearCanvas} className="w-12 h-10 rounded-xl border-2 border-[var(--card-border)] hover:border-coral/40 hover:bg-coral/10 hover:text-coral flex items-center justify-center transition-all bg-[var(--card-bg)]" title="Clear canvas"><HiTrash size={16} /></button>
          </div>

          {/* Canvas Area */}
          <div ref={containerRef} className="flex-1 rounded-2xl border-2 border-[var(--card-border)] overflow-hidden relative transition-colors" style={{ minHeight: 400, backgroundColor: canvasBg }}>
            <canvas ref={canvasRef} className="absolute inset-0 touch-none" style={{ cursor: TOOL_CONFIG[tool].cursor }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp} />
            {/* Text overlay — click to place, drag to move */}
            {(tool === 'text' || tool === 'select') && (
              <div
                className="absolute inset-0"
                style={{ cursor: tool === 'text' ? 'text' : 'default', zIndex: 5 }}
                onClick={handleCanvasClick}
                onMouseMove={(e) => {
                  if (!draggingTextId) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  updateTextBox(draggingTextId, { x: e.clientX - rect.left - dragOffset.current.x, y: e.clientY - rect.top - dragOffset.current.y });
                }}
                onMouseUp={() => setDraggingTextId(null)}
                onMouseLeave={() => setDraggingTextId(null)}
              />
            )}
            {/* Render text boxes */}
            {textBoxes.map((tb) => (
              <div
                key={tb.id}
                className={`absolute group ${tool === 'select' ? 'cursor-move' : ''}`}
                style={{ left: tb.x, top: tb.y, zIndex: activeTextId === tb.id ? 15 : 10 }}
                onMouseDown={(e) => {
                  if (tool !== 'select') return;
                  e.stopPropagation();
                  setDraggingTextId(tb.id);
                  setActiveTextId(tb.id);
                  dragOffset.current = { x: e.clientX - e.currentTarget.getBoundingClientRect().left, y: e.clientY - e.currentTarget.getBoundingClientRect().top };
                }}
              >
                <div className="relative">
                  <div
                    contentEditable={tool === 'text' || activeTextId === tb.id}
                    suppressContentEditableWarning
                    className={`min-w-[60px] min-h-[24px] outline-none px-1 rounded ${activeTextId === tb.id ? 'ring-2 ring-teal/50 bg-white/10' : 'hover:ring-1 hover:ring-[var(--card-border)]'}`}
                    style={{ fontSize: tb.fontSize, color: tb.color, fontFamily: 'system-ui, sans-serif', whiteSpace: 'pre-wrap', lineHeight: 1.3 }}
                    onFocus={() => setActiveTextId(tb.id)}
                    onBlur={(e) => updateTextBox(tb.id, { text: (e.target as HTMLElement).innerText })}
                    onClick={(e) => e.stopPropagation()}
                    ref={(el) => {
                      // Set initial text only once when element mounts
                      if (el && !el.dataset.initialized && tb.text) {
                        el.innerText = tb.text;
                        el.dataset.initialized = 'true';
                      }
                    }}
                  />
                  {!tb.text && activeTextId !== tb.id && (
                    <span className="absolute left-1 top-0 pointer-events-none opacity-40" style={{ fontSize: tb.fontSize, lineHeight: 1.3 }}>Type here...</span>
                  )}
                </div>
                {(activeTextId === tb.id || tool === 'select') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTextBox(tb.id); }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-coral text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >×</button>
                )}
              </div>
            ))}
            {activeBoard.strokes.length === 0 && textBoxes.length === 0 && !isDrawingRef.current && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center opacity-30">
                  <p className="text-5xl mb-3">🖊️</p>
                  <p className="text-sm font-heading font-bold">Start drawing!</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">P/H/E keys · T for text · V to select</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none">
              <Badge variant="muted" size="sm">{TOOL_CONFIG[tool].emoji} {TOOL_CONFIG[tool].label}</Badge>
              <Badge variant="muted" size="sm">{activeBoard.strokes.length} strokes · {textBoxes.length} texts</Badge>
            </div>
          </div>
        </div>

        {/* Shortcuts hint */}
        <div className="flex items-center gap-4 text-[9px] text-[var(--muted-foreground)] font-bold uppercase tracking-wider flex-shrink-0 px-1 flex-wrap">
          <span>⌨️ Shortcuts:</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">P</kbd> Pen</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">H</kbd> Highlighter</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">E</kbd> Eraser</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">T</kbd> Text</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">V</kbd> Select/Move</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">Ctrl+Z</kbd> Undo</span>
          <span><kbd className="px-1 py-0.5 rounded bg-[var(--card-border)] text-[8px]">Del</kbd> Delete text</span>
        </div>
      </div>

      {/* Insert to Note Modal */}
      <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} title="Insert Drawing to Note">
        <div className="space-y-2">
          <p className="text-xs text-[var(--muted-foreground)] mb-3">Choose a note to insert this whiteboard drawing into:</p>
          {notes.length === 0 ? (
            <p className="text-sm text-center py-4 text-[var(--muted-foreground)]">No notes yet. Create one first!</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {notes.map((note) => (
                <button key={note.id} onClick={() => insertToNote(note.id)} className="w-full text-left px-4 py-3 rounded-xl border-2 border-[var(--card-border)] hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-heading font-bold truncate">{note.title || 'Untitled'}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{note.folder} · {new Date(note.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <HiPlus size={16} className="text-primary flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
          <Button variant="ghost" onClick={() => setShowNoteModal(false)} className="w-full mt-2">Cancel</Button>
        </div>
      </Modal>
    </PageTransition>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import {
  HiPlus,
  HiTrash,
  HiDownload,
  HiArrowRight,
  HiArrowDown,
  HiMoon,
  HiSun,
  HiTemplate,
} from 'react-icons/hi';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type DiagramType = 'table' | 'vs' | 'flowchart';
type FlowOrientation = 'horizontal' | 'vertical';
type FlowNodeType = 'start' | 'process' | 'decision' | 'database' | 'end';
type CanvasTheme = 'light' | 'dark' | 'transparent';

interface FlowNode {
  id: number;
  label: string;
  description?: string;
  type: FlowNodeType;
  connectorLabel?: string;
}

interface DiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (dataUrl: string) => void;
}

const FLOWCHART_PRESETS: { name: string; icon: string; nodes: FlowNode[] }[] = [
  {
    name: 'Algorithm Pipeline',
    icon: '⚡',
    nodes: [
      { id: 1, label: 'Input Data', description: 'Raw user or sensor payload', type: 'start' },
      { id: 2, label: 'Data Cleaning', description: 'Validate & sanitize schema', type: 'process', connectorLabel: 'Cleaned' },
      { id: 3, label: 'Save Records', description: 'Write to primary store', type: 'database', connectorLabel: 'Saved' },
      { id: 4, label: 'Response OK', description: 'Deliver computed output', type: 'end' },
    ],
  },
  {
    name: 'Decision Flow',
    icon: '🔀',
    nodes: [
      { id: 1, label: 'User Request', description: 'Incoming authentication call', type: 'start' },
      { id: 2, label: 'Valid Token?', description: 'Verify JWT and permissions', type: 'decision', connectorLabel: 'Valid' },
      { id: 3, label: 'Execute Action', description: 'Process privileged operation', type: 'process', connectorLabel: 'Success' },
      { id: 4, label: 'Session Ready', description: 'Return token & state', type: 'end' },
    ],
  },
  {
    name: 'System Architecture',
    icon: '🏗️',
    nodes: [
      { id: 1, label: 'Client App', description: 'Next.js Frontend UI', type: 'start' },
      { id: 2, label: 'API Gateway', description: 'Route & rate limit traffic', type: 'process', connectorLabel: 'Proxy' },
      { id: 3, label: 'Cloud Cache', description: 'Redis fast retrieval', type: 'database', connectorLabel: 'Miss' },
      { id: 4, label: 'Core Service', description: 'Business calculation engine', type: 'process', connectorLabel: 'Done' },
      { id: 5, label: 'Render View', description: 'Hydrate client components', type: 'end' },
    ],
  },
];

export default function DiagramModal({ isOpen, onClose, onInsert }: DiagramModalProps) {
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [flowOrientation, setFlowOrientation] = useState<FlowOrientation>('horizontal');
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>('light');
  const [isExporting, setIsExporting] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);

  // Table state
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [cells, setCells] = useState<string[][]>(() => Array.from({ length: 3 }, () => Array(3).fill('')));

  // VS Table state
  const [vsTitle1, setVsTitle1] = useState('Option A');
  const [vsTitle2, setVsTitle2] = useState('Option B');
  const [vsRows, setVsRows] = useState<[string, string][]>([['', '']]);

  // Flowchart state
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([
    { id: 1, label: 'Start Request', description: 'Entry trigger / API call', type: 'start' },
    { id: 2, label: 'Process Step', description: 'Execute business logic & compute', type: 'process' },
    { id: 3, label: 'Verify Result?', description: 'Check error or validation state', type: 'decision', connectorLabel: 'Valid' },
    { id: 4, label: 'Finished OK', description: 'Return completed response', type: 'end' },
  ]);

  // ---- Table helpers ----
  const updateCell = (r: number, c: number, val: string) => {
    const next = cells.map((row) => [...row]);
    next[r][c] = val;
    setCells(next);
  };

  const addRow = () => { setCells([...cells, Array(cols).fill('')]); setRows(rows + 1); };
  const addCol = () => { setCells(cells.map((r) => [...r, ''])); setCols(cols + 1); };
  const removeRow = () => { if (rows > 1) { setCells(cells.slice(0, -1)); setRows(rows - 1); } };
  const removeCol = () => { if (cols > 1) { setCells(cells.map((r) => r.slice(0, -1))); setCols(cols - 1); } };

  // ---- VS helpers ----
  const updateVs = (i: number, side: 0 | 1, val: string) => {
    const next = [...vsRows];
    next[i] = [...next[i]] as [string, string];
    next[i][side] = val;
    setVsRows(next);
  };
  const addVsRow = () => setVsRows([...vsRows, ['', '']]);
  const removeVsRow = () => { if (vsRows.length > 1) setVsRows(vsRows.slice(0, -1)); };

  // ---- Flowchart helpers ----
  const addFlowNode = (type: FlowNodeType) => {
    const id = Math.max(0, ...flowNodes.map((n) => n.id)) + 1;
    const defaultLabels: Record<FlowNodeType, { label: string; desc: string }> = {
      start: { label: 'Start', desc: 'Entry trigger' },
      process: { label: 'Process Step', desc: 'Compute / Transform' },
      decision: { label: 'Check Condition?', desc: 'Evaluate branch' },
      database: { label: 'Data Store', desc: 'Persist / Query data' },
      end: { label: 'Completed', desc: 'Exit status' },
    };

    const hasEnd = flowNodes.length > 0 && flowNodes[flowNodes.length - 1].type === 'end';
    const newNode: FlowNode = {
      id,
      label: defaultLabels[type].label,
      description: defaultLabels[type].desc,
      type,
    };

    if (hasEnd) {
      const before = flowNodes.slice(0, -1);
      const end = flowNodes[flowNodes.length - 1];
      setFlowNodes([...before, newNode, end]);
    } else {
      setFlowNodes([...flowNodes, newNode]);
    }
  };

  const updateFlowNode = (id: number, updates: Partial<FlowNode>) => {
    setFlowNodes(flowNodes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const removeFlowNode = (id: number) => {
    if (flowNodes.length <= 2) {
      toast.error('Flowchart needs at least 2 steps');
      return;
    }
    setFlowNodes(flowNodes.filter((n) => n.id !== id));
  };

  const moveFlowNode = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= flowNodes.length) return;
    const updated = [...flowNodes];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFlowNodes(updated);
  };

  const loadPreset = (presetNodes: FlowNode[]) => {
    setFlowNodes(presetNodes.map((n, i) => ({ ...n, id: i + 1 })));
    toast.success('Preset loaded! ⚡');
  };

  // ---- High-Res Anti-Clipping Export ----
  const handleInsert = async () => {
    const el = diagramRef.current;
    if (!el) return;

    // Blur active input to prevent blinking caret from being captured
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setIsExporting(true);
    const toastId = toast.loading('Rendering high-definition diagram...');

    try {
      // Sync all textareas with safety margin (+6px) to eliminate font descender clipping
      const textareas = el.querySelectorAll('textarea');
      textareas.forEach((ta) => {
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight + 6}px`;
      });

      // Allow DOM repaint
      await new Promise((r) => setTimeout(r, 120));

      // Calculate exact total scroll dimensions
      const totalWidth = Math.ceil(Math.max(el.scrollWidth, el.offsetWidth));
      const totalHeight = Math.ceil(Math.max(el.scrollHeight, el.offsetHeight));

      const bgColor =
        canvasTheme === 'dark' ? '#0f172a' : canvasTheme === 'transparent' ? undefined : '#ffffff';

      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 3, // 3x ultra-sharp resolution for crisp note viewing
        backgroundColor: bgColor,
        width: totalWidth,
        height: totalHeight,
        style: {
          transform: 'none',
          margin: '0',
          width: `${totalWidth}px`,
          height: `${totalHeight}px`,
        },
      });

      onInsert(dataUrl);
      toast.success('Diagram inserted into note! 📊', { id: toastId });
      onClose();
    } catch (err) {
      console.error('Failed to render diagram:', err);
      toast.error('Failed to render diagram. Please try again.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Node Type styling config
  const getNodeConfig = (type: FlowNodeType) => {
    switch (type) {
      case 'start':
        return {
          bg: '#10B981',
          border: '#059669',
          radius: 9999,
          textColor: '#ffffff',
        };
      case 'decision':
        return {
          bg: '#F59E0B',
          border: '#D97706',
          radius: 12,
          textColor: '#ffffff',
        };
      case 'database':
        return {
          bg: '#0EA5E9',
          border: '#0284C7',
          radius: 14,
          textColor: '#ffffff',
        };
      case 'end':
        return {
          bg: '#EF4444',
          border: '#DC2626',
          radius: 9999,
          textColor: '#ffffff',
        };
      case 'process':
      default:
        return {
          bg: '#6366F1',
          border: '#4F46E5',
          radius: 14,
          textColor: '#ffffff',
        };
    }
  };

  const arrowColor = canvasTheme === 'dark' ? '#64748b' : '#94a3b8';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Diagram" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Type & Theme Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[var(--card-border)]">
          {/* Main Type Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'flowchart' as DiagramType, label: '🔀 Flowchart' },
              { id: 'table' as DiagramType, label: '📊 Table' },
              { id: 'vs' as DiagramType, label: '⚔️ VS Table' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setDiagramType(t.id)}
                className={`px-3.5 py-2 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  diagramType === t.id
                    ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]'
                    : 'border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-primary/30'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-1">
            <button
              title="Light Background"
              onClick={() => setCanvasTheme('light')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                canvasTheme === 'light'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HiSun size={14} className="text-amber-500" />
              <span>Light</span>
            </button>
            <button
              title="Dark Background"
              onClick={() => setCanvasTheme('dark')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                canvasTheme === 'dark'
                  ? 'bg-slate-900 text-white shadow-sm border border-slate-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HiMoon size={14} className="text-indigo-400" />
              <span>Dark</span>
            </button>
            <button
              title="Transparent Background"
              onClick={() => setCanvasTheme('transparent')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                canvasTheme === 'transparent'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xs">⬚</span>
              <span>Clean</span>
            </button>
          </div>
        </div>

        {/* ====== FLOWCHART BUILDER ====== */}
        {diagramType === 'flowchart' && (
          <div className="space-y-3">
            {/* Top Toolbar: Orientation, Nodes & Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
              {/* Orientation Switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase mr-1">
                  Layout:
                </span>
                <button
                  onClick={() => setFlowOrientation('horizontal')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    flowOrientation === 'horizontal'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--card-border)]'
                  }`}
                >
                  <HiArrowRight size={13} />
                  <span>Horizontal (Left ➔ Right)</span>
                </button>
                <button
                  onClick={() => setFlowOrientation('vertical')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    flowOrientation === 'vertical'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--card-border)]'
                  }`}
                >
                  <HiArrowDown size={13} />
                  <span>Vertical (Top ⬇ Bottom)</span>
                </button>
              </div>

              {/* Add Node Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addFlowNode('process')}
                  icon={<HiPlus size={12} />}
                  className="text-indigo-600 dark:text-indigo-400"
                >
                  Step
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addFlowNode('decision')}
                  icon={<HiPlus size={12} />}
                  className="text-amber-600 dark:text-amber-400"
                >
                  Decision
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addFlowNode('database')}
                  icon={<HiPlus size={12} />}
                  className="text-sky-600 dark:text-sky-400"
                >
                  Storage
                </Button>
              </div>
            </div>

            {/* Presets Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-[var(--muted-foreground)] flex items-center gap-1 flex-shrink-0">
                <HiTemplate size={13} /> Presets:
              </span>
              {FLOWCHART_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => loadPreset(preset.nodes)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-primary/40 hover:text-primary transition-all flex-shrink-0"
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Scrollable Diagram Preview Area */}
            <div className="overflow-x-auto overflow-y-auto max-h-[480px] rounded-xl border-2 border-[var(--card-border)] bg-slate-900/10 p-2">
              <div
                ref={diagramType === 'flowchart' ? diagramRef : undefined}
                style={{
                  padding: '36px 32px',
                  background:
                    canvasTheme === 'dark'
                      ? '#0f172a'
                      : canvasTheme === 'transparent'
                      ? 'transparent'
                      : '#ffffff',
                  display: 'inline-flex',
                  flexDirection: flowOrientation === 'horizontal' ? 'row' : 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '100%',
                  width: 'max-content',
                  gap: 0,
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {flowNodes.map((node, i) => {
                  const cfg = getNodeConfig(node.type);

                  return (
                    <React.Fragment key={node.id}>
                      {/* Connector Arrow */}
                      {i > 0 && (
                        <>
                          {flowOrientation === 'horizontal' ? (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                margin: '0 10px',
                                flexShrink: 0,
                                position: 'relative',
                              }}
                            >
                              {/* Optional Arrow Branch Label */}
                              <input
                                value={flowNodes[i - 1].connectorLabel || ''}
                                onChange={(e) =>
                                  updateFlowNode(flowNodes[i - 1].id, { connectorLabel: e.target.value })
                                }
                                placeholder="label"
                                title="Branch condition (e.g. Yes, No, Next)"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  color: canvasTheme === 'dark' ? '#cbd5e1' : '#475569',
                                  background: canvasTheme === 'dark' ? '#1e293b' : '#f1f5f9',
                                  border: `1px solid ${canvasTheme === 'dark' ? '#334155' : '#cbd5e1'}`,
                                  borderRadius: 6,
                                  padding: '1px 6px',
                                  width: 60,
                                  marginBottom: 4,
                                  outline: 'none',
                                }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div
                                  style={{
                                    width: 36,
                                    height: 3,
                                    backgroundColor: arrowColor,
                                    borderRadius: 1,
                                  }}
                                />
                                <div
                                  style={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: `10px solid ${arrowColor}`,
                                    borderTop: '6px solid transparent',
                                    borderBottom: '6px solid transparent',
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                margin: '6px 0',
                                flexShrink: 0,
                                position: 'relative',
                              }}
                            >
                              {/* Optional Arrow Branch Label */}
                              <input
                                value={flowNodes[i - 1].connectorLabel || ''}
                                onChange={(e) =>
                                  updateFlowNode(flowNodes[i - 1].id, { connectorLabel: e.target.value })
                                }
                                placeholder="label"
                                title="Branch condition (e.g. Yes, No, Next)"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  color: canvasTheme === 'dark' ? '#cbd5e1' : '#475569',
                                  background: canvasTheme === 'dark' ? '#1e293b' : '#f1f5f9',
                                  border: `1px solid ${canvasTheme === 'dark' ? '#334155' : '#cbd5e1'}`,
                                  borderRadius: 6,
                                  padding: '1px 6px',
                                  width: 68,
                                  marginBottom: 4,
                                  outline: 'none',
                                }}
                              />
                              <div
                                style={{
                                  width: 3,
                                  height: 24,
                                  backgroundColor: arrowColor,
                                  borderRadius: 1,
                                }}
                              />
                              <div
                                style={{
                                  width: 0,
                                  height: 0,
                                  borderTop: `10px solid ${arrowColor}`,
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                }}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Node Card */}
                      <div
                        style={{
                          minWidth: flowOrientation === 'horizontal' ? 200 : 260,
                          maxWidth: flowOrientation === 'horizontal' ? 270 : 440,
                          width: 'auto',
                          flexShrink: 0,
                          padding: '14px 18px',
                          textAlign: 'center',
                          position: 'relative',
                          borderRadius: cfg.radius,
                          background: cfg.bg,
                          color: cfg.textColor,
                          border: `3px solid ${cfg.border}`,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Header Badge & Action Icons */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            marginBottom: 6,
                            gap: 4,
                          }}
                        >
                          {/* Reorder Buttons */}
                          <div style={{ display: 'flex', gap: 2 }}>
                            {i > 0 && (
                              <button
                                onClick={() => moveFlowNode(i, -1)}
                                title={flowOrientation === 'horizontal' ? 'Move Left' : 'Move Up'}
                                style={{
                                  background: 'rgba(0,0,0,0.2)',
                                  border: 'none',
                                  color: '#ffffff',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                  fontSize: 10,
                                }}
                              >
                                {flowOrientation === 'horizontal' ? '←' : '↑'}
                              </button>
                            )}
                            {i < flowNodes.length - 1 && (
                              <button
                                onClick={() => moveFlowNode(i, 1)}
                                title={flowOrientation === 'horizontal' ? 'Move Right' : 'Move Down'}
                                style={{
                                  background: 'rgba(0,0,0,0.2)',
                                  border: 'none',
                                  color: '#ffffff',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                  fontSize: 10,
                                }}
                              >
                                {flowOrientation === 'horizontal' ? '→' : '↓'}
                              </button>
                            )}
                          </div>

                          {/* Node Type Selector Badge */}
                          <select
                            value={node.type}
                            onChange={(e) =>
                              updateFlowNode(node.id, { type: e.target.value as FlowNodeType })
                            }
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              background: 'rgba(0,0,0,0.25)',
                              color: '#ffffff',
                              border: '1px solid rgba(255,255,255,0.3)',
                              borderRadius: 6,
                              padding: '2px 6px',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="start" style={{ background: '#10B981', color: '#fff' }}>
                              Start
                            </option>
                            <option value="process" style={{ background: '#6366F1', color: '#fff' }}>
                              Process
                            </option>
                            <option value="decision" style={{ background: '#F59E0B', color: '#fff' }}>
                              Decision
                            </option>
                            <option value="database" style={{ background: '#0EA5E9', color: '#fff' }}>
                              Database
                            </option>
                            <option value="end" style={{ background: '#EF4444', color: '#fff' }}>
                              End
                            </option>
                          </select>

                          {/* Delete Button */}
                          {flowNodes.length > 2 && (
                            <button
                              onClick={() => removeFlowNode(node.id)}
                              title="Delete Step"
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.35)',
                                color: '#ffffff',
                                border: '1px solid rgba(255,255,255,0.4)',
                                fontSize: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontWeight: 900,
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {/* Step Title (Auto-growing, Non-clipping Multi-line Textarea) */}
                        <textarea
                          value={node.label}
                          onChange={(e) => updateFlowNode(node.id, { label: e.target.value })}
                          placeholder="Step title..."
                          rows={1}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#ffffff',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: 14,
                            lineHeight: 1.45,
                            width: '100%',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            resize: 'none',
                            overflow: 'hidden',
                            display: 'block',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            boxSizing: 'border-box',
                            padding: '3px 4px',
                            margin: 0,
                          }}
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${el.scrollHeight + 6}px`;
                            }
                          }}
                          onInput={(e) => {
                            const el = e.currentTarget;
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight + 6}px`;
                          }}
                        />

                        {/* Optional Subtitle / Detail Description */}
                        <textarea
                          value={node.description || ''}
                          onChange={(e) => updateFlowNode(node.id, { description: e.target.value })}
                          placeholder="Optional step details..."
                          rows={1}
                          style={{
                            background: 'rgba(0,0,0,0.18)',
                            border: '1px solid rgba(255,255,255,0.22)',
                            borderRadius: 8,
                            outline: 'none',
                            color: '#f8fafc',
                            textAlign: 'center',
                            fontWeight: 400,
                            fontSize: 11,
                            lineHeight: 1.4,
                            width: '100%',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            resize: 'none',
                            overflow: 'hidden',
                            display: 'block',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            boxSizing: 'border-box',
                            padding: '4px 8px',
                            marginTop: 6,
                          }}
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${el.scrollHeight + 6}px`;
                            }
                          }}
                          onInput={(e) => {
                            const el = e.currentTarget;
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight + 6}px`;
                          }}
                        />
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ====== TABLE BUILDER ====== */}
        {diagramType === 'table' && (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <Button variant="ghost" size="sm" onClick={addRow} icon={<HiPlus size={12} />}>
                Row
              </Button>
              <Button variant="ghost" size="sm" onClick={addCol} icon={<HiPlus size={12} />}>
                Col
              </Button>
              <Button variant="ghost" size="sm" onClick={removeRow} icon={<HiTrash size={12} />}>
                Row
              </Button>
              <Button variant="ghost" size="sm" onClick={removeCol} icon={<HiTrash size={12} />}>
                Col
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border-2 border-[var(--card-border)]">
              <div
                ref={diagramType === 'table' ? diagramRef : undefined}
                style={{
                  padding: 20,
                  background:
                    canvasTheme === 'dark'
                      ? '#0f172a'
                      : canvasTheme === 'transparent'
                      ? 'transparent'
                      : '#ffffff',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 14,
                  }}
                >
                  <tbody>
                    {cells.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            style={{
                              border: `2px solid ${canvasTheme === 'dark' ? '#334155' : '#e5e7eb'}`,
                              padding: 0,
                              verticalAlign: 'top',
                            }}
                          >
                            <textarea
                              value={cell}
                              onChange={(e) => updateCell(ri, ci, e.target.value)}
                              placeholder={ri === 0 ? `Header ${ci + 1}` : ''}
                              rows={1}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: 'none',
                                outline: 'none',
                                fontSize: 14,
                                fontWeight: ri === 0 ? 700 : 400,
                                background:
                                  ri === 0
                                    ? '#7C3AED'
                                    : canvasTheme === 'dark'
                                    ? ri % 2 === 0
                                      ? '#1e293b'
                                      : '#0f172a'
                                    : ri % 2 === 0
                                    ? '#faf5ff'
                                    : '#fff',
                                color: ri === 0 ? '#fff' : canvasTheme === 'dark' ? '#f8fafc' : '#222',
                                fontFamily: 'Inter, system-ui, sans-serif',
                                resize: 'none',
                                overflow: 'hidden',
                                display: 'block',
                                minHeight: '40px',
                                lineHeight: 1.45,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                boxSizing: 'border-box',
                              }}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${el.scrollHeight + 6}px`;
                                }
                              }}
                              onInput={(e) => {
                                const el = e.currentTarget;
                                el.style.height = 'auto';
                                el.style.height = `${el.scrollHeight + 6}px`;
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====== VS TABLE ====== */}
        {diagramType === 'vs' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={addVsRow} icon={<HiPlus size={12} />}>
                Add Row
              </Button>
              <Button variant="ghost" size="sm" onClick={removeVsRow} icon={<HiTrash size={12} />}>
                Remove Row
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border-2 border-[var(--card-border)]">
              <div
                ref={diagramType === 'vs' ? diagramRef : undefined}
                style={{
                  padding: 24,
                  background:
                    canvasTheme === 'dark'
                      ? '#0f172a'
                      : canvasTheme === 'transparent'
                      ? 'transparent'
                      : '#ffffff',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {/* VS Header */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <input
                      value={vsTitle1}
                      onChange={(e) => setVsTitle1(e.target.value)}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#7C3AED',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 50,
                      fontSize: 22,
                      fontWeight: 900,
                      color: '#EC4899',
                    }}
                  >
                    VS
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <input
                      value={vsTitle2}
                      onChange={(e) => setVsTitle2(e.target.value)}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#10B981',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    />
                  </div>
                </div>
                {/* VS Rows */}
                {vsRows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <div
                      style={{
                        flex: 1,
                        background: canvasTheme === 'dark' ? '#1e1b4b' : '#f5f0ff',
                        borderRadius: 12,
                        border: `2px solid ${canvasTheme === 'dark' ? '#3730a3' : '#ede0ff'}`,
                        display: 'flex',
                      }}
                    >
                      <textarea
                        value={row[0]}
                        onChange={(e) => updateVs(i, 0, e.target.value)}
                        placeholder="Point..."
                        rows={1}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: 14,
                          fontFamily: 'Inter, system-ui, sans-serif',
                          color: canvasTheme === 'dark' ? '#f8fafc' : '#222',
                          resize: 'none',
                          minHeight: '40px',
                          height: 'auto',
                          display: 'block',
                          overflow: 'hidden',
                          lineHeight: 1.45,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          boxSizing: 'border-box',
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight + 6}px`;
                          }
                        }}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight + 6}px`;
                        }}
                      />
                    </div>
                    <div style={{ width: 50 }} />
                    <div
                      style={{
                        flex: 1,
                        background: canvasTheme === 'dark' ? '#064e3b' : '#f0fdf4',
                        borderRadius: 12,
                        border: `2px solid ${canvasTheme === 'dark' ? '#047857' : '#d1fae5'}`,
                        display: 'flex',
                      }}
                    >
                      <textarea
                        value={row[1]}
                        onChange={(e) => updateVs(i, 1, e.target.value)}
                        placeholder="Point..."
                        rows={1}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: 14,
                          fontFamily: 'Inter, system-ui, sans-serif',
                          color: canvasTheme === 'dark' ? '#f8fafc' : '#222',
                          resize: 'none',
                          minHeight: '40px',
                          height: 'auto',
                          display: 'block',
                          overflow: 'hidden',
                          lineHeight: 1.45,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          boxSizing: 'border-box',
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight + 6}px`;
                          }
                        }}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight + 6}px`;
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions Bottom Bar */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="px-5">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleInsert}
            disabled={isExporting}
            className="flex-1 max-w-xs"
            icon={<HiDownload size={14} />}
          >
            {isExporting ? 'Exporting...' : 'Insert into Note 🚀'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

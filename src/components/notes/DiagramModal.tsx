'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiPlus, HiTrash, HiDownload, HiSwitchHorizontal, HiTable, HiArrowRight } from 'react-icons/hi';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type DiagramType = 'table' | 'vs' | 'flowchart';

interface DiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (dataUrl: string) => void;
}

export default function DiagramModal({ isOpen, onClose, onInsert }: DiagramModalProps) {
  const [diagramType, setDiagramType] = useState<DiagramType>('table');
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
  const [flowNodes, setFlowNodes] = useState<{ id: number; label: string; type: 'process' | 'decision' | 'start' | 'end' }[]>([
    { id: 1, label: 'Start', type: 'start' },
    { id: 2, label: 'Process', type: 'process' },
    { id: 3, label: 'End', type: 'end' },
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
  const addFlowNode = (type: 'process' | 'decision') => {
    const id = Math.max(0, ...flowNodes.map((n) => n.id)) + 1;
    const before = flowNodes.slice(0, -1);
    const end = flowNodes[flowNodes.length - 1];
    setFlowNodes([...before, { id, label: type === 'decision' ? 'Decision?' : 'Step', type }, end]);
  };
  const updateFlowNode = (id: number, label: string) => {
    setFlowNodes(flowNodes.map((n) => n.id === id ? { ...n, label } : n));
  };
  const removeFlowNode = (id: number) => {
    if (flowNodes.length <= 2) return;
    setFlowNodes(flowNodes.filter((n) => n.id !== id));
  };

  // ---- Export as image and insert ----
  const handleInsert = async () => {
    if (!diagramRef.current) return;
    const toastId = toast.loading('Rendering diagram...');
    try {
      const dataUrl = await toPng(diagramRef.current, { quality: 1, pixelRatio: 3, backgroundColor: '#ffffff' });
      onInsert(dataUrl);
      toast.success('Diagram inserted into note! 📊', { id: toastId });
      onClose();
    } catch {
      toast.error('Failed to render diagram', { id: toastId });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Diagram" maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* Type Picker */}
        <div className="flex gap-2">
          {([
            { id: 'table' as DiagramType, label: '📊 Table', icon: HiTable },
            { id: 'vs' as DiagramType, label: '⚔️ VS Table', icon: HiSwitchHorizontal },
            { id: 'flowchart' as DiagramType, label: '🔀 Flowchart', icon: HiArrowRight },
          ]).map((t) => (
            <button key={t.id} onClick={() => setDiagramType(t.id)} className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all ${diagramType === t.id ? 'bg-primary text-white border-primary shadow-[0_3px_0_rgba(88,28,135,0.3)]' : 'border-[var(--card-border)] hover:border-primary/30'}`}>{t.label}</button>
          ))}
        </div>

        {/* ====== TABLE BUILDER ====== */}
        {diagramType === 'table' && (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <Button variant="ghost" size="sm" onClick={addRow} icon={<HiPlus size={12} />}>Row</Button>
              <Button variant="ghost" size="sm" onClick={addCol} icon={<HiPlus size={12} />}>Col</Button>
              <Button variant="ghost" size="sm" onClick={removeRow} icon={<HiTrash size={12} />}>Row</Button>
              <Button variant="ghost" size="sm" onClick={removeCol} icon={<HiTrash size={12} />}>Col</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border-2 border-[var(--card-border)]">
              <div ref={diagramRef} style={{ padding: 16, background: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 }}>
                  <tbody>
                    {cells.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ border: '2px solid #e5e7eb', padding: 0 }}>
                            <input
                              value={cell}
                              onChange={(e) => updateCell(ri, ci, e.target.value)}
                              placeholder={ri === 0 ? `Header ${ci + 1}` : ''}
                              style={{
                                width: '100%', padding: '10px 12px', border: 'none', outline: 'none', fontSize: 14,
                                fontWeight: ri === 0 ? 700 : 400,
                                background: ri === 0 ? '#7C3AED' : ri % 2 === 0 ? '#faf5ff' : '#fff',
                                color: ri === 0 ? '#fff' : '#222',
                                fontFamily: 'Inter, system-ui, sans-serif',
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
              <Button variant="ghost" size="sm" onClick={addVsRow} icon={<HiPlus size={12} />}>Add Row</Button>
              <Button variant="ghost" size="sm" onClick={removeVsRow} icon={<HiTrash size={12} />}>Remove Row</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border-2 border-[var(--card-border)]">
              <div ref={diagramType === 'vs' ? diagramRef : undefined} style={{ padding: 20, background: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
                {/* VS Header */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <input value={vsTitle1} onChange={(e) => setVsTitle1(e.target.value)} style={{ width: '100%', textAlign: 'center', fontSize: 18, fontWeight: 800, color: '#7C3AED', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Inter, system-ui, sans-serif' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 50, fontSize: 22, fontWeight: 900, color: '#EC4899' }}>VS</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <input value={vsTitle2} onChange={(e) => setVsTitle2(e.target.value)} style={{ width: '100%', textAlign: 'center', fontSize: 18, fontWeight: 800, color: '#10B981', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Inter, system-ui, sans-serif' }} />
                  </div>
                </div>
                {/* VS Rows */}
                {vsRows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <div style={{ flex: 1, background: '#f5f0ff', borderRadius: 12, border: '2px solid #ede0ff' }}>
                      <input value={row[0]} onChange={(e) => updateVs(i, 0, e.target.value)} placeholder="Point..." style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif' }} />
                    </div>
                    <div style={{ width: 50 }} />
                    <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 12, border: '2px solid #d1fae5' }}>
                      <input value={row[1]} onChange={(e) => updateVs(i, 1, e.target.value)} placeholder="Point..." style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ====== FLOWCHART ====== */}
        {diagramType === 'flowchart' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => addFlowNode('process')} icon={<HiPlus size={12} />}>Step</Button>
              <Button variant="ghost" size="sm" onClick={() => addFlowNode('decision')} icon={<HiPlus size={12} />}>Decision</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border-2 border-[var(--card-border)]">
              <div ref={diagramType === 'flowchart' ? diagramRef : undefined} style={{ padding: 24, background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {flowNodes.map((node, i) => (
                  <React.Fragment key={node.id}>
                    {/* Arrow */}
                    {i > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 2, height: 20, background: '#d1d5db' }} />
                        <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #d1d5db' }} />
                      </div>
                    )}
                    {/* Node */}
                    <div style={{
                      minWidth: 180, padding: '12px 20px', textAlign: 'center', position: 'relative',
                      borderRadius: node.type === 'start' || node.type === 'end' ? 24 : node.type === 'decision' ? 4 : 12,
                      background: node.type === 'start' ? '#10B981' : node.type === 'end' ? '#FF6B6B' : node.type === 'decision' ? '#F59E0B' : '#7C3AED',
                      color: '#fff', fontWeight: 700, fontSize: 14,
                      border: '3px solid',
                      borderColor: node.type === 'start' ? '#059669' : node.type === 'end' ? '#E05252' : node.type === 'decision' ? '#D97706' : '#581C87',
                      transform: node.type === 'decision' ? 'rotate(0deg)' : undefined,
                      boxShadow: '0 3px 0 rgba(0,0,0,0.1)',
                    }}>
                      {node.type === 'decision' && <span style={{ fontSize: 10, display: 'block', marginBottom: 2, opacity: 0.8 }}>◇ DECISION</span>}
                      <input
                        value={node.label}
                        onChange={(e) => updateFlowNode(node.id, e.target.value)}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: 14, width: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}
                      />
                      {node.type !== 'start' && node.type !== 'end' && (
                        <button onClick={() => removeFlowNode(node.id)} style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', background: '#FF6B6B', color: '#fff', border: '2px solid #fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 900 }}>×</button>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={handleInsert} className="flex-1" icon={<HiDownload size={14} />}>Insert into Note</Button>
        </div>
      </div>
    </Modal>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiEyeOff,
  HiDownload,
  HiTrash,
  HiBookOpen,
  HiSparkles,
  HiColorSwatch,
  HiRefresh,
  HiPencil,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StudioToolbar from '../shared/StudioToolbar';
import DropzoneZone from '../shared/DropzoneZone';
import { RedactionBox, WatermarkOptions } from '@/lib/docstudio/types';
import { createOffscreenCanvas, loadImage } from '@/lib/docstudio/imageEngine';

interface RedactWatermarkProps {
  onBack: () => void;
  onOpenInReader?: (file: { name: string; src: string; type: 'image' }) => void;
  onSendToNotes?: (blob: Blob, title: string) => void;
}

export default function RedactWatermark({ onBack, onOpenInReader, onSendToNotes }: RedactWatermarkProps) {
  const [sourceFile, setSourceFile] = useState<{ file: File; dataUrl: string } | null>(null);
  const [exportFileName, setExportFileName] = useState<string>('Protected_Document');
  const [mode, setMode] = useState<'redact' | 'watermark'>('redact');
  const [redactions, setRedactions] = useState<RedactionBox[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Watermark Options
  const [watermark, setWatermark] = useState<WatermarkOptions>({
    text: 'DRAFT',
    fontSize: 36,
    opacity: 0.35,
    angle: -30,
    color: '#ef4444',
    repeat: true,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle image upload
  const handleUpload = (files: File[]) => {
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setSourceFile({ file, dataUrl: e.target?.result as string });
      setExportFileName(`${file.name.replace(/\.[^/.]+$/, '')}_protected`);
      setRedactions([]);
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Render composite canvas with redactions and watermarks
  useEffect(() => {
    if (!sourceFile || !canvasRef.current) return;

    let isMounted = true;
    const render = async () => {
      try {
        const img = await loadImage(sourceFile.dataUrl);
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw original
        ctx.drawImage(img, 0, 0);

        // Draw blackout redactions
        ctx.fillStyle = '#000000';
        for (const box of redactions) {
          ctx.fillRect(box.x, box.y, box.width, box.height);
        }

        // Draw active drawing box
        if (currentBox) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
        }

        // Draw watermarks
        if (watermark.text.trim()) {
          ctx.save();
          ctx.font = `bold ${watermark.fontSize}px sans-serif`;
          ctx.fillStyle = watermark.color;
          ctx.globalAlpha = watermark.opacity;

          if (watermark.repeat) {
            const stepX = watermark.fontSize * 7;
            const stepY = watermark.fontSize * 4;
            for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
              for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate((watermark.angle * Math.PI) / 180);
                ctx.fillText(watermark.text, 0, 0);
                ctx.restore();
              }
            }
          } else {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((watermark.angle * Math.PI) / 180);
            ctx.textAlign = 'center';
            ctx.fillText(watermark.text, 0, 0);
          }
          ctx.restore();
        }
      } catch (err) {
        console.error('Render canvas error', err);
      }
    };

    render();
    return () => {
      isMounted = false;
    };
  }, [sourceFile, redactions, currentBox, watermark]);

  // Canvas Pointer Events with Pointer Capture for robust drawing even if dragged outside canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'redact' || !canvasRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);

    setCurrentBox({ x, y, width, height });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (isDrawing && currentBox && currentBox.width > 5 && currentBox.height > 5) {
      setRedactions((prev) => [
        ...prev,
        {
          id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...currentBox,
        },
      ]);
      toast.success('Redaction box added');
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentBox(null);
  };

  // Download flattened output
  const handleDownload = () => {
    if (!canvasRef.current || !sourceFile) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    const clean = (exportFileName.trim() || 'Protected_Document').replace(/\.png$/i, '');
    a.download = `${clean}.png`;
    a.click();
    toast.success('Document downloaded!');
  };

  const handleOpenReader = () => {
    if (!canvasRef.current || !sourceFile || !onOpenInReader) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const clean = (exportFileName.trim() || 'Protected_Document').replace(/\.png$/i, '');
    const name = `${clean}.png`;
    onOpenInReader({ name, src: dataUrl, type: 'image' });
    toast.success('Opened in Split Reader!');
  };

  const handleSendNotes = () => {
    if (!canvasRef.current || !sourceFile || !onSendToNotes) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const clean = (exportFileName.trim() || 'Protected_Document').replace(/\.png$/i, '');
        onSendToNotes(blob, `${clean}.png`);
        toast.success('Sent to StudyQuest Notes!');
      }
    }, 'image/png');
  };

  return (
    <div className="flex flex-col h-full">
      <StudioToolbar
        toolTitle="Privacy Redact & Watermark"
        toolDescription="Blackout student IDs & confidential info for peer review, or stamp custom security watermarks"
        badgeText="Security"
        icon={<HiEyeOff className="text-violet-500" />}
        onBack={onBack}
        onReset={sourceFile ? () => setSourceFile(null) : undefined}
        onDownload={sourceFile ? handleDownload : undefined}
        downloadLabel="Download Protected"
        onOpenInReader={sourceFile && onOpenInReader ? handleOpenReader : undefined}
        onSendToNotes={sourceFile && onSendToNotes ? handleSendNotes : undefined}
        fileName={sourceFile ? exportFileName : undefined}
        onFileNameChange={sourceFile ? setExportFileName : undefined}
        fileExtension="png"
      />

      {!sourceFile ? (
        <div className="max-w-2xl mx-auto w-full py-8">
          <DropzoneZone
            onFilesSelected={handleUpload}
            accept="image/*"
            title="Drop image to redact or watermark"
            description="Protect personal student credentials, grade keys, or stamp DRAFT/SUBMITTED labels"
            allowedFormatsText="PNG, JPG, WebP"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          {/* Main Visual Canvas */}
          <div className="lg:col-span-8 flex flex-col min-h-0 bg-surface/40 rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-xs">
                  <HiPencil className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <input
                    type="text"
                    value={exportFileName}
                    onChange={(e) => setExportFileName(e.target.value)}
                    placeholder="Document name"
                    className="bg-transparent font-semibold text-foreground focus:outline-hidden text-xs w-36 sm:w-48"
                    title="Rename protected document"
                  />
                  <span className="text-[10px] font-bold text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded font-mono">
                    .png
                  </span>
                </div>
                {redactions.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
                    {redactions.length} Blackouts
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {redactions.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setRedactions([])} className="text-rose-500">
                    <HiTrash className="w-3.5 h-3.5 mr-1" />
                    Clear Blackouts
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSourceFile(null)}>
                  Change Image
                </Button>
              </div>
            </div>

            {/* Canvas Container */}
            <div
              ref={containerRef}
              className="flex-1 min-h-[350px] relative flex items-center justify-center overflow-auto rounded-xl bg-black/5 dark:bg-black/40 border border-border/40 p-2"
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={`max-h-[62vh] max-w-full object-contain rounded shadow-sm touch-none ${
                  mode === 'redact' ? 'cursor-crosshair' : 'cursor-default'
                }`}
              />
            </div>

            {mode === 'redact' && (
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                Click and drag directly on the document preview above to draw solid blackout privacy boxes.
              </p>
            )}
          </div>

          {/* Controls Panel */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Mode Switcher */}
            <div className="flex gap-2 p-1.5 rounded-xl bg-surface border border-border">
              <button
                onClick={() => setMode('redact')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'redact'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⬛ Blackout Redact
              </button>
              <button
                onClick={() => setMode('watermark')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'watermark'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🛡️ Text Watermark
              </button>
            </div>

            {/* Redact Panel */}
            {mode === 'redact' && (
              <Card className="p-4 space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Blackout Redactions ({redactions.length})
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Permanently destroys underlying pixels under the blackout rectangles upon export. Ideal for anonymous
                  peer grading or hiding student IDs.
                </p>

                {redactions.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {redactions.map((box, i) => (
                      <div
                        key={box.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60 text-xs"
                      >
                        <span className="font-semibold text-foreground">Blackout #{i + 1}</span>
                        <button
                          onClick={() => setRedactions((prev) => prev.filter((b) => b.id !== box.id))}
                          className="text-rose-500 hover:text-rose-600 p-1"
                          title="Remove blackout"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                    No blackouts drawn yet. Drag your mouse over text to blackout.
                  </div>
                )}
              </Card>
            )}

            {/* Watermark Panel */}
            {mode === 'watermark' && (
              <Card className="p-4 space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Watermark Controls</h3>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Watermark Text</label>
                  <input
                    type="text"
                    value={watermark.text}
                    onChange={(e) => setWatermark((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder="e.g. DRAFT, CONFIDENTIAL, John Doe"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface border border-border text-foreground focus:outline-hidden focus:border-primary"
                  />
                </div>

                <div className="flex gap-1.5">
                  {['DRAFT', 'CONFIDENTIAL', 'SUBMITTED', 'SAMPLE'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setWatermark((prev) => ({ ...prev, text: preset }))}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Font Size</span>
                    <span className="font-bold text-foreground">{watermark.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="96"
                    value={watermark.fontSize}
                    onChange={(e) => setWatermark((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="w-full accent-primary h-1.5 rounded bg-muted cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Opacity</span>
                    <span className="font-bold text-foreground">{Math.round(watermark.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.9"
                    step="0.05"
                    value={watermark.opacity}
                    onChange={(e) => setWatermark((prev) => ({ ...prev, opacity: Number(e.target.value) }))}
                    className="w-full accent-primary h-1.5 rounded bg-muted cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">Repeat Diagonal Grid</span>
                  <input
                    type="checkbox"
                    checked={watermark.repeat}
                    onChange={(e) => setWatermark((prev) => ({ ...prev, repeat: e.target.checked }))}
                    className="accent-primary w-4 h-4 cursor-pointer"
                  />
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  HiPhotograph,
  HiDownload,
  HiBookOpen,
  HiScissors,
  HiRefresh,
  HiSparkles,
  HiCheck,
  HiInformationCircle,
  HiPencil,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StudioToolbar from '../shared/StudioToolbar';
import DropzoneZone from '../shared/DropzoneZone';
import { ImageCropAspect, ImageFormat, CompressionResult } from '@/lib/docstudio/types';
import {
  formatBytes,
  optimizeImage,
  compressToTargetLimit,
  flipCanvas,
  cropCanvas,
  getAspectDimensions,
} from '@/lib/docstudio/compressor';
import { createOffscreenCanvas, loadImage, rotateCanvas } from '@/lib/docstudio/imageEngine';

interface ImageOptimizerProps {
  onBack: () => void;
  onOpenInReader?: (file: { name: string; src: string; type: 'image' }) => void;
  onSendToNotes?: (imageBlob: Blob, title: string) => void;
}

export default function ImageOptimizer({ onBack, onOpenInReader, onSendToNotes }: ImageOptimizerProps) {
  const [sourceFile, setSourceFile] = useState<{ file: File; dataUrl: string } | null>(null);
  const [exportFileName, setExportFileName] = useState<string>('Optimized_Image');
  const [format, setFormat] = useState<ImageFormat>('image/jpeg');
  const [quality, setQuality] = useState<number>(0.82);
  const [aspect, setAspect] = useState<ImageCropAspect>('free');
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  const [result, setResult] = useState<CompressionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load uploaded image
  const handleUploadImage = (files: File[]) => {
    const file = files.find((f) => f.type.startsWith('image/'));
    if (!file) {
      toast.error('Please upload a valid image (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSourceFile({ file, dataUrl });
      setExportFileName(`${file.name.replace(/\.[^/.]+$/, '')}_optimized`);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setAspect('free');
    };
    reader.readAsDataURL(file);
    toast.success(`Loaded ${file.name}`);
  };

  // Re-run compression & transforms whenever inputs change
  useEffect(() => {
    if (!sourceFile) {
      setResult(null);
      return;
    }

    let isMounted = true;
    const runProcessing = async () => {
      try {
        setIsProcessing(true);
        const img = await loadImage(sourceFile.dataUrl);

        // 1. Initial Canvas
        let pair = createOffscreenCanvas(img.naturalWidth, img.naturalHeight);
        pair.ctx.drawImage(img, 0, 0);
        let canvas = pair.canvas;

        // 2. Flip
        if (flipH || flipV) {
          canvas = flipCanvas(canvas, flipH, flipV);
        }

        // 3. Rotate
        if (rotation % 360 !== 0) {
          canvas = rotateCanvas(canvas, rotation);
        }

        // 4. Crop Aspect
        if (aspect !== 'free') {
          const dims = getAspectDimensions(aspect, canvas.width, canvas.height);
          const startX = Math.max(0, Math.round((canvas.width - dims.width) / 2));
          const startY = Math.max(0, Math.round((canvas.height - dims.height) / 2));
          canvas = cropCanvas(canvas, startX, startY, dims.width, dims.height);
        }

        // 5. Optimize & Compress
        const compResult = await optimizeImage(canvas, sourceFile.file.size, format, quality);
        if (isMounted) {
          setResult(compResult);
        }
      } catch (err) {
        console.error('Image optimization failed', err);
      } finally {
        if (isMounted) setIsProcessing(false);
      }
    };

    const timer = setTimeout(runProcessing, 80);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [sourceFile, format, quality, aspect, rotation, flipH, flipV]);

  // LMS Target Size Auto-Solver (< 200KB, < 500KB, < 1MB, < 2MB)
  const handleLmsPreset = async (targetKB: number) => {
    if (!sourceFile) return;

    try {
      setIsProcessing(true);
      const img = await loadImage(sourceFile.dataUrl);
      const solved = await compressToTargetLimit(img, targetKB, format);
      setResult(solved);
      toast.success(`Optimized to fit under ${targetKB} KB!`);
    } catch (err) {
      console.error(err);
      toast.error('Could not solve for target size');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !sourceFile) return;
    const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
    const clean = (exportFileName.trim() || 'image').replace(/\.[^/.]+$/, '');
    const name = `${clean}.${ext}`;
    const a = document.createElement('a');
    a.href = result.dataUrl;
    a.download = name;
    a.click();
    toast.success('Optimized image downloaded!');
  };

  const handleOpenReader = () => {
    if (!result || !sourceFile || !onOpenInReader) return;
    const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
    const clean = (exportFileName.trim() || 'image').replace(/\.[^/.]+$/, '');
    const name = `${clean}.${ext}`;
    onOpenInReader({ name, src: result.dataUrl, type: 'image' });
    toast.success('Opened in Split Reader!');
  };

  const handleSendNotes = () => {
    if (!result || !sourceFile || !onSendToNotes) return;
    const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
    const clean = (exportFileName.trim() || 'image').replace(/\.[^/.]+$/, '');
    onSendToNotes(result.blob, `${clean}.${ext}`);
    toast.success('Sent to StudyQuest Notes!');
  };

  const currentExt = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';

  return (
    <div className="flex flex-col h-full">
      <StudioToolbar
        toolTitle="Image Studio & LMS Optimizer"
        toolDescription="Visual cropping, format conversion, and 1-click auto-compression to beat portal upload limits"
        badgeText="Zero Loss"
        icon={<HiPhotograph className="text-sky-500" />}
        onBack={onBack}
        onReset={sourceFile ? () => setSourceFile(null) : undefined}
        onDownload={result ? handleDownload : undefined}
        downloadLabel={result ? `Download (${formatBytes(result.compressedBytes)})` : 'Download'}
        isDownloadDisabled={!result || isProcessing}
        onOpenInReader={result && onOpenInReader ? handleOpenReader : undefined}
        onSendToNotes={result && onSendToNotes ? handleSendNotes : undefined}
        fileName={sourceFile ? exportFileName : undefined}
        onFileNameChange={sourceFile ? setExportFileName : undefined}
        fileExtension={currentExt}
      />

      {!sourceFile ? (
        <div className="max-w-2xl mx-auto w-full py-8">
          <DropzoneZone
            onFilesSelected={handleUploadImage}
            accept="image/jpeg,image/png,image/webp"
            title="Drop an image to crop, convert, or compress"
            description="Optimize homework diagrams, ID photos, or screenshots to fit submission upload size limits"
            allowedFormatsText="PNG, JPG, WebP"
          />

          {/* Quick LMS target hints */}
          <div className="mt-8 p-4 rounded-xl bg-surface/60 border border-border">
            <h4 className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <HiInformationCircle className="w-4 h-4 text-primary" />
              LMS Portal Upload Limits
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              University portals like Canvas, Blackboard, Moodle, and government scholarship forms frequently reject
              images over 500 KB or 2 MB. This tool calculates the exact mathematics to compress your image below any
              portal limit in 1 click without visible blur.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          {/* Main Visual Display */}
          <div className="lg:col-span-8 flex flex-col min-h-0 bg-surface/40 rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-border/60">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-xs">
                <HiPencil className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <input
                  type="text"
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  placeholder="Output filename"
                  className="bg-transparent font-semibold text-foreground focus:outline-hidden text-xs w-36 sm:w-48"
                  title="Rename image"
                />
                <span className="text-[10px] font-bold text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded font-mono uppercase">
                  .{currentExt}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
                  ↻ 90°
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setFlipH((h) => !h)}>
                  ⇄ Flip H
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setFlipV((v) => !v)}>
                  ⇅ Flip V
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSourceFile(null)}>
                  Change
                </Button>
              </div>
            </div>

            {/* Image Canvas Preview */}
            <div className="flex-1 min-h-[350px] relative flex items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-black/40 border border-border/40 p-2">
              {isProcessing && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}

              {result && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.dataUrl}
                  alt="Optimized preview"
                  className="max-h-[60vh] max-w-full object-contain rounded shadow-sm"
                />
              )}
            </div>

            {/* Live Size Delta Indicator */}
            {result && (
              <div className="mt-4 p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Original Size
                    </span>
                    <span className="text-xs font-bold text-foreground">{formatBytes(result.originalBytes)}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">→</span>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Optimized Size
                    </span>
                    <span className="text-xs font-bold text-primary">{formatBytes(result.compressedBytes)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    -{result.savingsPercent}% Saved
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* 1-Click LMS Target Presets Card */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                <HiSparkles className="w-4 h-4 text-primary" />
                Fit Under Portal Limit
              </h3>
              <p className="text-[11px] text-muted-foreground mb-3">
                Instantly scales & solves quality to fit strict submission caps.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLmsPreset(200)}
                  className="p-2 rounded-lg bg-surface border border-border hover:border-primary/60 hover:bg-primary/5 text-left transition-colors"
                >
                  <span className="text-xs font-bold text-foreground block">&lt; 200 KB</span>
                  <span className="text-[10px] text-muted-foreground">Strict Forms</span>
                </button>
                <button
                  onClick={() => handleLmsPreset(500)}
                  className="p-2 rounded-lg bg-surface border border-border hover:border-primary/60 hover:bg-primary/5 text-left transition-colors"
                >
                  <span className="text-xs font-bold text-foreground block">&lt; 500 KB</span>
                  <span className="text-[10px] text-muted-foreground">Assignments</span>
                </button>
                <button
                  onClick={() => handleLmsPreset(1000)}
                  className="p-2 rounded-lg bg-surface border border-border hover:border-primary/60 hover:bg-primary/5 text-left transition-colors"
                >
                  <span className="text-xs font-bold text-foreground block">&lt; 1 MB</span>
                  <span className="text-[10px] text-muted-foreground">Standard LMS</span>
                </button>
                <button
                  onClick={() => handleLmsPreset(2000)}
                  className="p-2 rounded-lg bg-surface border border-border hover:border-primary/60 hover:bg-primary/5 text-left transition-colors"
                >
                  <span className="text-xs font-bold text-foreground block">&lt; 2 MB</span>
                  <span className="text-[10px] text-muted-foreground">High-Res Cap</span>
                </button>
              </div>
            </Card>

            {/* Crop Aspect Ratio Presets */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                <HiScissors className="w-3.5 h-3.5 text-primary" />
                Aspect Ratio Crop
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {(['free', '1:1', '4:3', '16:9', 'a4'] as ImageCropAspect[]).map((asp) => (
                  <button
                    key={asp}
                    onClick={() => setAspect(asp)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold uppercase transition-all ${
                      aspect === asp
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {asp}
                  </button>
                ))}
              </div>
            </Card>

            {/* Format & Quality Card */}
            <Card className="p-4">
              <h3 className="text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Format & Quality</h3>

              <div className="flex gap-2 mb-4">
                {(['image/jpeg', 'image/png', 'image/webp'] as ImageFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all uppercase ${
                      format === fmt
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {fmt.replace('image/', '')}
                  </button>
                ))}
              </div>

              {format !== 'image/png' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Compression Quality</span>
                    <span className="font-bold text-foreground">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.98"
                    step="0.02"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 rounded bg-muted cursor-pointer"
                  />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

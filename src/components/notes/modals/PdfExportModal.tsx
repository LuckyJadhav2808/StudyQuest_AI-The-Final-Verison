'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { HiDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';

export type PdfTheme = 'modern' | 'editor' | 'parchment' | 'grimoire' | 'druid';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  noteContent: string;
  folder?: string;
}

export default function PdfExportModal({
  isOpen,
  onClose,
  noteTitle,
  noteContent,
  folder,
}: PdfExportModalProps) {
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [theme, setTheme] = useState<PdfTheme>('modern');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!noteContent) {
      toast.error('Nothing to export!');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generating PDF...');
    let container: HTMLDivElement | null = null;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = (await import('jspdf')) as any;

      // Theme styling configs
      const themeBg =
        theme === 'parchment' ? '#fdf6e2' :
        theme === 'grimoire' ? '#12111a' :
        theme === 'druid' ? '#f0fdf4' :
        theme === 'editor' ? '#0b0d17' :
        '#ffffff';

      const themeText =
        theme === 'parchment' ? '#3d2b1f' :
        theme === 'grimoire' ? '#e2e8f0' :
        theme === 'druid' ? '#14532d' :
        theme === 'editor' ? '#f8fafc' :
        '#0f172a';

      const themeFont =
        theme === 'parchment' ? 'Georgia, serif' :
        theme === 'grimoire' ? 'Cinzel, Georgia, serif' :
        theme === 'druid' ? 'Palatino, serif' :
        theme === 'editor' ? 'JetBrains Mono, monospace' :
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      container = document.createElement('div');
      container.style.cssText = `width:794px;padding:24px 40px;position:absolute;left:-9999px;font-family:${themeFont};font-size:14px;line-height:1.8;color:${themeText};background:${themeBg};word-wrap:break-word;`;

      const folderLabel = folder || 'General';
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      container.innerHTML = `
        <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid rgba(124,58,237,0.2);">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:0.6;margin-bottom:4px;">${folderLabel} • ${dateStr}</div>
          <h1 style="font-size:26px;font-weight:900;margin:0 0 8px 0;line-height:1.2;">${noteTitle}</h1>
        </div>
        <div class="note-pdf-body" style="line-height:1.8;">${noteContent}</div>
      `;

      document.body.appendChild(container);

      // Allow repaint
      await new Promise((r) => setTimeout(r, 100));

      const qualityScale = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2;
      const canvas = await html2canvas(container, {
        scale: qualityScale,
        useCORS: true,
        backgroundColor: themeBg,
      });

      const pdf = new jsPDF('p', 'mm', pageSize) as any;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - 20;

      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const totalPages = Math.ceil(imgHeight / usableHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const srcY = (page * usableHeight * canvas.width) / imgWidth;
        const srcH = Math.min((usableHeight * canvas.width) / imgWidth, canvas.height - srcY);

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        sliceCanvas.getContext('2d')?.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.85);
        const sliceHeight = (srcH * imgWidth) / canvas.width;
        pdf.addImage(sliceData, 'JPEG', margin, margin, imgWidth, sliceHeight);
      }

      const safeFilename = `${noteTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'note'}.pdf`;
      pdf.save(safeFilename);
      toast.success('PDF generated successfully! 📜', { id: toastId });
      onClose();
    } catch (err: any) {
      console.error('PDF export failed:', err);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    } finally {
      // Prevent offscreen element memory leaks
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export as PDF">
      <div className="space-y-5">
        {/* Page Size */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
            Page Size
          </label>
          <div className="flex gap-2">
            {([
              { id: 'a4' as const, label: 'A4', desc: '210 × 297 mm' },
              { id: 'letter' as const, label: 'Letter', desc: '8.5 × 11 in' },
              { id: 'legal' as const, label: 'Legal', desc: '8.5 × 14 in' },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPageSize(opt.id)}
                className={`flex-1 py-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  pageSize === opt.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'border-[var(--card-border)] hover:border-primary/30 text-[var(--foreground)]'
                }`}
              >
                <span className="text-xs font-bold block">{opt.label}</span>
                <span className={`text-[9px] block mt-0.5 ${pageSize === opt.id ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Image Quality */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
            Image Quality
          </label>
          <div className="flex gap-2">
            {([
              { id: 'low' as const, label: 'Compact', desc: 'Fast export', emoji: '📄' },
              { id: 'medium' as const, label: 'Balanced', desc: 'Recommended', emoji: '📋' },
              { id: 'high' as const, label: 'High-Res', desc: 'Crystal clear', emoji: '✨' },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setQuality(opt.id)}
                className={`flex-1 py-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  quality === opt.id
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'border-[var(--card-border)] hover:border-teal-500/30 text-[var(--foreground)]'
                }`}
              >
                <span className="text-sm block">{opt.emoji}</span>
                <span className="text-xs font-bold block">{opt.label}</span>
                <span className={`text-[9px] block mt-0.5 ${quality === opt.id ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Scroll Theme */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] block mb-2">
            Scroll Style / Theme
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'modern' as const, label: 'Modern Clean', desc: 'Clean, sans-serif layout', emoji: '📄' },
              { id: 'editor' as const, label: 'Active Dark', desc: 'Night mode styling', emoji: '💻' },
              { id: 'parchment' as const, label: 'Aether Parchment', desc: 'Vintage warm scroll', emoji: '📜' },
              { id: 'grimoire' as const, label: 'Void Grimoire', desc: 'Dark magical styling', emoji: '🔮' },
              { id: 'druid' as const, label: 'Forest Druid', desc: 'Serene botanical look', emoji: '🌿' },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                  theme === opt.id
                    ? 'bg-primary/10 text-primary border-primary shadow-sm'
                    : 'border-[var(--card-border)] hover:border-primary/20 bg-[var(--card-bg)] text-[var(--muted-foreground)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm">{opt.emoji}</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">{opt.label}</span>
                </div>
                <span className="text-[9px] block text-[var(--muted-foreground)] opacity-80 leading-snug">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={isExporting} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport} loading={isExporting} className="flex-1" icon={<HiDownload size={14} />}>
            Export PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}

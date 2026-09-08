/**
 * StudyQuest AI — Data Forge Cell Output Viewer
 * Renders rich outputs: Stdout/Stderr streams, Matplotlib PNG/SVG figures,
 * interactive sortable Pandas DataFrames, and error tracebacks with AI debugging.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { HiDownload, HiSearch, HiSparkles, HiZoomIn, HiCheck, HiClipboardCopy } from 'react-icons/hi';
import { NotebookOutput, TableOutput } from '@/types/notebook';
import toast from 'react-hot-toast';

interface CellOutputViewerProps {
  outputs: NotebookOutput[];
  onExplainError?: (traceback: string) => void;
  onAutoFixError?: (traceback: string) => void;
}

export default function CellOutputViewer({ outputs, onExplainError, onAutoFixError }: CellOutputViewerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!outputs || outputs.length === 0) return null;

  return (
    <div className="mt-2.5 border-t border-[var(--card-border)]/60 pt-2.5 space-y-3 font-mono text-xs">
      {outputs.map((out, idx) => {
        if (out.type === 'stream') {
          const isErr = out.name === 'stderr';
          return (
            <div
              key={idx}
              className={`p-3 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed ${
                isErr
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-slate-900/60 dark:bg-black/40 text-slate-200 border border-slate-800/80'
              }`}
            >
              {out.text}
            </div>
          );
        }

        if (out.type === 'display_data' || out.type === 'execute_result') {
          const imgBase64 = out.data?.['image/png'];
          const rawPlain = out.data?.['text/plain'];
          const textPlain = Array.isArray(rawPlain) ? rawPlain.join('') : typeof rawPlain === 'string' ? rawPlain : '';

          return (
            <div key={idx} className="space-y-2">
              {/* Image / Matplotlib Figure */}
              {imgBase64 && (
                <div className="relative group inline-block bg-white p-3 rounded-xl border border-[var(--card-border)] shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${imgBase64}`}
                    alt="Matplotlib Plot"
                    className="max-w-full h-auto rounded cursor-pointer transition-transform hover:scale-[1.01]"
                    onClick={() => setSelectedImage(`data:image/png;base64,${imgBase64}`)}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-black/70 backdrop-blur rounded-lg p-1">
                    <button
                      onClick={() => setSelectedImage(`data:image/png;base64,${imgBase64}`)}
                      title="Enlarge plot"
                      className="p-1.5 text-white hover:text-primary transition-colors"
                    >
                      <HiZoomIn size={14} />
                    </button>
                    <a
                      href={`data:image/png;base64,${imgBase64}`}
                      download={`plot_${Date.now()}.png`}
                      title="Download PNG"
                      className="p-1.5 text-white hover:text-emerald-400 transition-colors"
                    >
                      <HiDownload size={14} />
                    </a>
                  </div>
                </div>
              )}

              {/* Plain Text Representation */}
              {textPlain && textPlain !== 'None' && !imgBase64 && (
                <div className="p-3 rounded-xl bg-slate-900/60 dark:bg-black/40 text-indigo-300 font-mono whitespace-pre-wrap border border-indigo-500/20">
                  {textPlain}
                </div>
              )}
            </div>
          );
        }

        if (out.type === 'table') {
          return <InteractiveDataFrame key={idx} table={out} />;
        }

        if (out.type === 'error') {
          const tracebackText = out.traceback.join('\n');
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/20 pb-2">
                <span className="font-bold text-rose-400">
                  ⚠️ {out.ename}: {out.evalue}
                </span>
                <div className="flex items-center gap-1.5">
                  {onAutoFixError && (
                    <button
                      onClick={() => onAutoFixError(tracebackText)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 font-sans font-semibold text-xs transition-all shadow-sm"
                      title="Generate and apply one-click AI code repair"
                    >
                      <HiSparkles size={13} className="text-emerald-400" />
                      <span>✨ Auto-Fix</span>
                    </button>
                  )}
                  {onExplainError && (
                    <button
                      onClick={() => onExplainError(tracebackText)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 font-sans font-semibold text-xs transition-all"
                    >
                      <span>Explain</span>
                    </button>
                  )}
                </div>
              </div>
              <pre className="text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed text-rose-200/90 font-mono">
                {tracebackText}
              </pre>
            </div>
          );
        }

        return null;
      })}

      {/* Zoom Modal for Matplotlib Plots */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-white p-4 rounded-2xl shadow-2xl overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt="Expanded Plot" className="w-full h-auto rounded-lg" />
            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-sans font-medium">Matplotlib High-Res Figure</span>
              <div className="flex gap-2 font-sans">
                <a
                  href={selectedImage}
                  download="plot_full.png"
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-1"
                >
                  <HiDownload size={13} />
                  <span>Download Image</span>
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Interactive DataFrame Component with sorting, search, pagination, and CSV copy
function InteractiveDataFrame({ table }: { table: TableOutput }) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Filter & Sort
  const processedRows = useMemo(() => {
    let list = [...table.rows];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((row) =>
        row.some((cell) => String(cell ?? '').toLowerCase().includes(q))
      );
    }

    if (sortCol !== null) {
      list.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA ?? '').localeCompare(String(valB ?? ''))
          : String(valB ?? '').localeCompare(String(valA ?? ''));
      });
    }

    return list;
  }, [table.rows, search, sortCol, sortAsc]);

  const totalPages = Math.ceil(processedRows.length / pageSize);
  const displayedRows = processedRows.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
  };

  const handleCopyCsv = () => {
    const csvHeader = table.columns.join(',');
    const csvBody = table.rows.map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    navigator.clipboard.writeText(`${csvHeader}\n${csvBody}`);
    setCopied(true);
    toast.success('DataFrame copied as CSV! 📋');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]/80 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-b border-[var(--card-border)] bg-slate-900/10 font-sans">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-primary flex items-center gap-1">
            <span>📊 Pandas DataFrame</span>
            <span className="text-[10px] text-[var(--muted-foreground)] font-normal">
              ({table.totalRows} rows × {table.totalCols} columns)
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <HiSearch className="absolute left-2 text-slate-400" size={12} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search table..."
              className="pl-6 pr-2 py-1 rounded-lg text-xs bg-white dark:bg-slate-900 border border-[var(--card-border)] outline-none focus:border-primary w-32 focus:w-44 transition-all"
            />
          </div>

          <button
            onClick={handleCopyCsv}
            title="Copy as CSV"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-primary/40 text-xs text-[var(--foreground)] transition-colors"
          >
            {copied ? <HiCheck size={13} className="text-emerald-500" /> : <HiClipboardCopy size={13} />}
            <span>{copied ? 'Copied' : 'CSV'}</span>
          </button>
        </div>
      </div>

      {/* Table grid */}
      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/60 border-b border-[var(--card-border)]">
              <th className="p-2 text-[10px] font-bold text-slate-400 w-10 text-center">#</th>
              {table.columns.map((col, cIdx) => (
                <th
                  key={cIdx}
                  onClick={() => handleSort(cIdx)}
                  className="p-2 font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-primary/10 select-none whitespace-nowrap transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{col}</span>
                    <span className="text-[10px] text-primary">
                      {sortCol === cIdx ? (sortAsc ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row, rIdx) => {
              const actualRowIndex = page * pageSize + rIdx;
              return (
                <tr
                  key={rIdx}
                  className="border-b border-[var(--card-border)]/40 hover:bg-primary/5 transition-colors"
                >
                  <td className="p-2 text-[10px] text-slate-400 text-center font-bold">
                    {actualRowIndex}
                  </td>
                  {row.map((val, cIdx) => (
                    <td key={cIdx} className="p-2 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {val === null || val === undefined ? (
                        <span className="text-slate-400 italic text-[10px]">NaN</span>
                      ) : typeof val === 'boolean' ? (
                        <span className={val ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                          {String(val)}
                        </span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {displayedRows.length === 0 && (
              <tr>
                <td colSpan={table.columns.length + 1} className="p-4 text-center text-slate-400 font-sans">
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--card-border)] text-xs text-[var(--muted-foreground)] font-sans">
          <span>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, processedRows.length)} of {processedRows.length} rows
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="px-2 py-0.5 rounded border border-[var(--card-border)] disabled:opacity-40 hover:bg-primary/10"
            >
              Prev
            </button>
            <span className="px-2 py-0.5 font-bold text-primary">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="px-2 py-0.5 rounded border border-[var(--card-border)] disabled:opacity-40 hover:bg-primary/10"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

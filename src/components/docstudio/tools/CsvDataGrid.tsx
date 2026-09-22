'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  HiTable,
  HiDownload,
  HiPlus,
  HiTrash,
  HiSearch,
  HiDocumentReport,
  HiBookOpen,
  HiCalculator,
  HiPencil,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StudioToolbar from '../shared/StudioToolbar';
import DropzoneZone from '../shared/DropzoneZone';
import {
  parseCsv,
  serializeCsv,
  serializeJson,
  computeColumnStats,
  generateTablePdf,
} from '@/lib/docstudio/csvEngine';
import { NumericColumnStats } from '@/lib/docstudio/types';

interface CsvDataGridProps {
  onBack: () => void;
  onOpenInReader?: (file: { name: string; src: string; type: 'text' }) => void;
  onSendToNotes?: (content: string, title: string) => void;
}

export default function CsvDataGrid({ onBack, onOpenInReader, onSendToNotes }: CsvDataGridProps) {
  const [fileName, setFileName] = useState<string>('Lab_Dataset');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ colIndex: number; direction: 'asc' | 'desc' } | null>(null);
  const [pasteText, setPasteText] = useState<string>('');
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);

  // Load CSV file
  const handleUploadCsv = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setFileName(file.name.replace(/\.[^/.]+$/, ''));
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setSelectedColIndex(0);
      toast.success(`Loaded ${file.name} (${parsed.rows.length} rows)`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse CSV file');
    }
  };

  // Handle manual raw paste
  const handleParsePasted = () => {
    if (!pasteText.trim()) return;
    const parsed = parseCsv(pasteText);
    setFileName('Pasted_Data');
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setSelectedColIndex(0);
    setShowPasteModal(false);
    toast.success(`Parsed ${parsed.rows.length} rows`);
  };

  // Update cell content
  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    setRows((prev) => {
      const copy = prev.map((r) => [...r]);
      copy[rowIndex][colIndex] = val;
      return copy;
    });
  };

  // Update header title
  const handleHeaderChange = (colIndex: number, val: string) => {
    setHeaders((prev) => {
      const copy = [...prev];
      copy[colIndex] = val;
      return copy;
    });
  };

  // Add row / column
  const addRow = () => {
    setRows((prev) => [...prev, new Array(headers.length).fill('')]);
    toast.success('Row added');
  };

  const addColumn = () => {
    setHeaders((prev) => [...prev, `Col ${prev.length + 1}`]);
    setRows((prev) => prev.map((r) => [...r, '']));
    toast.success('Column added');
  };

  const deleteRow = (idx: number) => {
    if (rows.length <= 1) {
      toast.error('Cannot delete the only row');
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const deleteColumn = (colIdx: number) => {
    if (headers.length <= 1) {
      toast.error('Cannot delete the only column');
      return;
    }
    setHeaders((prev) => prev.filter((_, i) => i !== colIdx));
    setRows((prev) => prev.map((r) => r.filter((_, i) => i !== colIdx)));
    if (selectedColIndex === colIdx) setSelectedColIndex(0);
  };

  // Sort by column
  const handleSort = (colIndex: number) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.colIndex === colIndex && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const sortedRows = [...rows].sort((a, b) => {
      const valA = a[colIndex] || '';
      const valB = b[colIndex] || '';
      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    setRows(sortedRows);
    setSortConfig({ colIndex, direction });
  };

  // Filtered rows with preserved original index for accurate mutations
  const filteredRowsWithIndex = useMemo(() => {
    if (!searchQuery.trim()) {
      return rows.map((row, originalIndex) => ({ row, originalIndex }));
    }
    const q = searchQuery.toLowerCase();
    return rows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => row.some((cell) => cell.toLowerCase().includes(q)));
  }, [rows, searchQuery]);

  // Compute stats for currently selected column
  const columnStats: NumericColumnStats | null = useMemo(() => {
    if (selectedColIndex === null || selectedColIndex >= headers.length) return null;
    return computeColumnStats(rows, selectedColIndex);
  }, [rows, selectedColIndex, headers.length]);

  // Exports
  const exportCsv = () => {
    const csvContent = serializeCsv(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const clean = (fileName.trim() || 'Dataset').replace(/\.csv$/i, '');
    a.download = `${clean}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success('CSV downloaded!');
  };

  const exportJson = () => {
    const jsonContent = serializeJson(headers, rows);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const clean = (fileName.trim() || 'Dataset').replace(/\.csv$/i, '');
    a.download = `${clean}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success('JSON downloaded!');
  };

  const exportPdfTable = () => {
    const clean = (fileName.trim() || 'Dataset').replace(/\.csv$/i, '');
    const pdfBlob = generateTablePdf(headers, rows, clean);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clean}_Report.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success('Formatted PDF Table downloaded!');
  };

  const handleOpenReader = () => {
    if (!onOpenInReader) return;
    const csvContent = serializeCsv(headers, rows);
    const clean = (fileName.trim() || 'Dataset').replace(/\.csv$/i, '');
    onOpenInReader({ name: `${clean}.csv`, src: csvContent, type: 'text' });
    toast.success('Opened in Split Reader!');
  };

  const handleSendNotes = () => {
    if (!onSendToNotes) return;
    const csvContent = serializeCsv(headers, rows);
    const clean = (fileName.trim() || 'Dataset').replace(/\.csv$/i, '');
    onSendToNotes(csvContent, `${clean}.csv`);
    toast.success('Sent to StudyQuest Notes!');
  };

  return (
    <div className="flex flex-col h-full">
      <StudioToolbar
        toolTitle="CSV & Data Table Studio"
        toolDescription="Edit tabular research & lab datasets, run instant column stats, and export clean CSV, JSON, or PDF tables"
        badgeText="Spreadsheet"
        icon={<HiTable className="text-emerald-500" />}
        onBack={onBack}
        onReset={headers.length > 0 ? () => setHeaders([]) : undefined}
        onDownload={headers.length > 0 ? exportCsv : undefined}
        downloadLabel="Download CSV"
        onOpenInReader={headers.length > 0 && onOpenInReader ? handleOpenReader : undefined}
        onSendToNotes={headers.length > 0 && onSendToNotes ? handleSendNotes : undefined}
        fileName={headers.length > 0 ? fileName.replace(/\.csv$/i, '') : undefined}
        onFileNameChange={headers.length > 0 ? (val) => setFileName(val.replace(/\.csv$/i, '')) : undefined}
        fileExtension="csv"
      />

      {headers.length === 0 ? (
        <div className="max-w-2xl mx-auto w-full py-8">
          <DropzoneZone
            onFilesSelected={handleUploadCsv}
            accept=".csv,.tsv,.txt"
            title="Drop CSV or TSV dataset file here"
            description="Inspect, edit rows/columns, sort, and calculate descriptive statistics client-side"
            allowedFormatsText="CSV, TSV, TXT"
          />

          <div className="text-center mt-5">
            <span className="text-xs text-muted-foreground mr-2">Or paste raw text directly:</span>
            <Button variant="outline" size="sm" onClick={() => setShowPasteModal(true)}>
              Paste Raw Table Data
            </Button>
          </div>

          {/* Paste Modal */}
          {showPasteModal && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <Card className="max-w-lg w-full p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground">Paste Tabular Text (CSV / TSV)</h3>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste comma or tab-delimited text from Excel, Google Sheets, or Python here..."
                  rows={8}
                  className="w-full p-3 text-xs font-mono rounded-xl bg-surface border border-border text-foreground"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowPasteModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleParsePasted}>
                    Parse Table
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search table rows..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-xs">
                <HiPencil className="w-3 h-3 text-emerald-500 shrink-0" />
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Dataset name"
                  className="bg-transparent font-medium text-foreground focus:outline-hidden text-xs w-28 sm:w-36"
                  title="Rename CSV dataset"
                />
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                  .csv
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addRow}>
                <HiPlus className="w-3.5 h-3.5 mr-1" />
                Row
              </Button>
              <Button variant="outline" size="sm" onClick={addColumn}>
                <HiPlus className="w-3.5 h-3.5 mr-1" />
                Col
              </Button>
              <Button variant="ghost" size="sm" onClick={exportJson} title="Export JSON records">
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={exportPdfTable} title="Export formatted PDF table">
                <HiDocumentReport className="w-3.5 h-3.5 mr-1 text-primary" />
                PDF Table
              </Button>
            </div>
          </div>

          {/* Interactive Editable Table Grid */}
          <div className="flex-1 min-h-[350px] overflow-auto rounded-2xl border border-border bg-surface/50">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                <tr>
                  <th className="p-2 w-10 text-center font-bold text-muted-foreground border-b border-r border-border">
                    #
                  </th>
                  {headers.map((head, colIdx) => (
                    <th
                      key={colIdx}
                      className={`p-2 text-left font-bold border-b border-r border-border transition-colors group ${
                        selectedColIndex === colIdx ? 'bg-primary/10 text-primary' : 'text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={head}
                          onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                          className="bg-transparent font-bold text-xs focus:outline-hidden focus:bg-background/80 px-1 rounded w-full"
                        />
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setSelectedColIndex(colIdx);
                              handleSort(colIdx);
                            }}
                            className="p-1 rounded hover:bg-muted text-[10px]"
                            title="Sort column"
                          >
                            ↕
                          </button>
                          <button
                            onClick={() => deleteColumn(colIdx)}
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-500 text-[10px]"
                            title="Delete column"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="p-2 w-12 border-b border-border text-center text-muted-foreground">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRowsWithIndex.map(({ row, originalIndex }, displayIdx) => (
                  <tr key={originalIndex} className="hover:bg-muted/40 transition-colors border-b border-border/60">
                    <td className="p-2 text-center text-[10px] text-muted-foreground font-mono border-r border-border/60 bg-muted/20">
                      {originalIndex + 1}
                    </td>

                    {row.map((cell, colIdx) => (
                      <td
                        key={colIdx}
                        onClick={() => setSelectedColIndex(colIdx)}
                        className={`p-1 border-r border-border/60 ${
                          selectedColIndex === colIdx ? 'bg-primary/5' : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => handleCellChange(originalIndex, colIdx, e.target.value)}
                          className="w-full px-2 py-1 bg-transparent text-foreground text-xs focus:outline-hidden focus:bg-background focus:ring-1 focus:ring-primary rounded"
                        />
                      </td>
                    ))}

                    <td className="p-1 text-center">
                      <button
                        onClick={() => deleteRow(originalIndex)}
                        className="p-1 rounded hover:bg-rose-500/10 text-rose-500 opacity-40 hover:opacity-100 transition-opacity"
                        title="Delete row"
                      >
                        <HiTrash className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Statistics Bar for selected column */}
          {selectedColIndex !== null && (
            <div className="p-3 rounded-xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HiCalculator className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Column &ldquo;{headers[selectedColIndex]}&rdquo; Telemetry
                </span>
              </div>

              {columnStats ? (
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px] mr-1">Count:</span>
                    <span className="font-bold text-foreground">{columnStats.count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] mr-1">Sum:</span>
                    <span className="font-bold text-primary">{columnStats.sum}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] mr-1">Mean:</span>
                    <span className="font-bold text-foreground">{columnStats.mean}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] mr-1">Min:</span>
                    <span className="font-bold text-foreground">{columnStats.min}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] mr-1">Max:</span>
                    <span className="font-bold text-foreground">{columnStats.max}</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Select a numeric column to view instant stats.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

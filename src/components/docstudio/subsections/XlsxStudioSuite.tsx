'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiTable,
  HiFolderOpen,
  HiDownload,
  HiPrinter,
  HiPlus,
  HiTrash,
  HiSearch,
  HiCalculator,
  HiSortAscending,
  HiSortDescending,
  HiArrowUp,
  HiArrowDown,
  HiChevronLeft,
  HiChevronRight,
  HiChevronUp,
  HiChevronDown,
  HiCheck,
  HiX,
  HiZoomIn,
  HiZoomOut,
  HiRefresh,
  HiLightningBolt,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { readExcelWorkbook, exportExcelWorkbook } from '@/lib/docstudio/officeEngine';
import { generateTablePdf } from '@/lib/docstudio/csvEngine';
import { evaluateFormula, columnIndexToLetter, columnLetterToIndex, SheetGridData } from '@/lib/docstudio/formulaEngine';
import { ExcelWorkbookData, ExcelSheetData } from '@/lib/docstudio/types';
import { formatBytes, formatToastFileName } from '@/lib/docstudio/compressor';

interface XlsxStudioSuiteProps {
  initialFile?: File | null;
  onSendToNotes?: (contentOrBlob: string | Blob, title: string) => void;
  onSwitchStudio?: (target: 'pdf' | 'word' | 'pptx' | 'xlsx') => void;
}

// Built-in Academic Gradebook Sample
const DEFAULT_SAMPLE_WORKBOOK: ExcelWorkbookData = {
  fileName: 'CS301_Lab_Gradebook_and_Telemetry.xlsx',
  sheetNames: ['Gradebook_Roster', 'Semester_Budget'],
  activeSheetName: 'Gradebook_Roster',
  sheets: {
    Gradebook_Roster: {
      name: 'Gradebook_Roster',
      headers: ['Student ID', 'Student Name', 'Lab 1 (25)', 'Lab 2 (25)', 'Midterm (50)', 'Final Exam (100)', 'Total Score', 'Letter Grade'],
      rows: [
        ['CS-101', 'Alan Turing', '25', '24', '49', '98', '=SUM(C2:F2)', '=IF(G2>=180, "A", "B")'],
        ['CS-102', 'Ada Lovelace', '24', '25', '48', '99', '=SUM(C3:F3)', '=IF(G3>=180, "A", "B")'],
        ['CS-103', 'Claude Shannon', '25', '23', '47', '95', '=SUM(C4:F4)', '=IF(G4>=180, "A", "B")'],
        ['CS-104', 'Grace Hopper', '23', '24', '46', '94', '=SUM(C5:F5)', '=IF(G5>=180, "A", "B")'],
        ['CS-105', 'John von Neumann', '25', '25', '50', '100', '=SUM(C6:F6)', '=IF(G6>=180, "A", "B")'],
        ['CS-106', 'Margaret Hamilton', '24', '24', '48', '96', '=SUM(C7:F7)', '=IF(G7>=180, "A", "B")'],
        ['CS-107', 'Donald Knuth', '25', '24', '49', '97', '=SUM(C8:F8)', '=IF(G8>=180, "A", "B")'],
        ['CS-108', 'Barbara Liskov', '24', '25', '47', '95', '=SUM(C9:F9)', '=IF(G9>=180, "A", "B")'],
      ],
    },
    Semester_Budget: {
      name: 'Semester_Budget',
      headers: ['Budget Item', 'Category', 'Allocated ($)', 'Actual Spent ($)', 'Variance ($)'],
      rows: [
        ['Cloud GPU Cluster (AWS)', 'Infrastructure', '1200', '1140', '=C2-D2'],
        ['Textbooks & ACM Digital Lib', 'Curriculum', '450', '420', '=C3-D3'],
        ['Hardware Development Kits', 'Lab Equipment', '850', '890', '=C4-D4'],
        ['Student Fellowship Stipend', 'Research', '3500', '3500', '=C5-D5'],
        ['Conference Travel Grant', 'Travel', '1500', '1320', '=C6-D6'],
      ],
    },
  },
};

export default function XlsxStudioSuite({
  initialFile,
  onSendToNotes,
  onSwitchStudio,
}: XlsxStudioSuiteProps) {
  // Master Workbook State
  const [workbook, setWorkbook] = useState<ExcelWorkbookData>(DEFAULT_SAMPLE_WORKBOOK);
  const [activeSheetName, setActiveSheetName] = useState<string>('Gradebook_Roster');
  const [selectedCell, setSelectedCell] = useState<{ rIdx: number; cIdx: number }>({ rIdx: 0, cIdx: 0 });
  const [isEditingCell, setIsEditingCell] = useState<boolean>(false);
  const [cellEditValue, setCellEditValue] = useState<string>('');
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [zoom, setZoom] = useState<number>(100);
  const [gridSearch, setGridSearch] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showFxMenu, setShowFxMenu] = useState<boolean>(false);
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState<boolean>(false);

  // Range selection for live telemetry
  const [selectedRange, setSelectedRange] = useState<{ startR: number; startC: number; endR: number; endC: number } | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  // Active sheet data
  const currentSheet = workbook.sheets[activeSheetName] || workbook.sheets[workbook.sheetNames[0]];

  // Load initial file if provided
  useEffect(() => {
    if (initialFile) {
      handleOpenXlsx(initialFile);
    }
  }, [initialFile]);

  // Open & Parse XLSX or CSV
  const handleOpenXlsx = async (file: File) => {
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await readExcelWorkbook(buffer, file.name);
      setWorkbook(parsed);
      setActiveSheetName(parsed.sheetNames[0]);
      setSelectedCell({ rIdx: 0, cIdx: 0 });
      toast.success(`Loaded "${formatToastFileName(file.name)}" (${parsed.sheetNames.length} sheet${parsed.sheetNames.length > 1 ? 's' : ''})`);
    } catch (err) {
      console.error(err);
      toast.error('Failed reading spreadsheet file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert raw grid to SheetGridData representation for formula evaluations
  const sheetGridForFormulas = useMemo<SheetGridData>(() => {
    return {
      headers: currentSheet.headers,
      rows: currentSheet.rows,
    };
  }, [currentSheet]);

  // Evaluated Grid Values (caches evaluated formulas in real time)
  const evaluatedRows = useMemo(() => {
    return currentSheet.rows.map((row) => {
      return row.map((cellVal) => {
        if (cellVal && cellVal.startsWith('=')) {
          return evaluateFormula(cellVal, sheetGridForFormulas);
        }
        return cellVal;
      });
    });
  }, [currentSheet.rows, sheetGridForFormulas]);

  // Sync formula bar when active selected cell changes
  useEffect(() => {
    if (selectedCell.rIdx === -1) {
      // Header row selected
      const headerVal = currentSheet.headers[selectedCell.cIdx] ?? '';
      setFormulaBarValue(headerVal);
    } else {
      const rawVal = currentSheet.rows[selectedCell.rIdx]?.[selectedCell.cIdx] ?? '';
      setFormulaBarValue(rawVal);
    }
    setIsEditingCell(false);
  }, [selectedCell, currentSheet]);

  // Active Coordinate Label: e.g. "A1", "C4"
  const activeCoordinateLabel = useMemo(() => {
    const colLetter = columnIndexToLetter(selectedCell.cIdx);
    const rowNum = selectedCell.rIdx === -1 ? 1 : selectedCell.rIdx + 2;
    return `${colLetter}${rowNum}`;
  }, [selectedCell]);

  // Update cell value in state
  const handleUpdateCellValue = useCallback(
    (newVal: string, rIdx = selectedCell.rIdx, cIdx = selectedCell.cIdx) => {
      setWorkbook((prevWb) => {
        const sheet = prevWb.sheets[activeSheetName];
        if (!sheet) return prevWb;

        if (rIdx === -1) {
          // Updating header
          const newHeaders = [...sheet.headers];
          newHeaders[cIdx] = newVal;
          return {
            ...prevWb,
            sheets: {
              ...prevWb.sheets,
              [activeSheetName]: { ...sheet, headers: newHeaders },
            },
          };
        }

        // Updating data row
        const newRows = sheet.rows.map((r, i) => {
          if (i !== rIdx) return r;
          const copy = [...r];
          copy[cIdx] = newVal;
          return copy;
        });

        return {
          ...prevWb,
          sheets: {
            ...prevWb.sheets,
            [activeSheetName]: { ...sheet, rows: newRows },
          },
        };
      });
    },
    [activeSheetName, selectedCell]
  );

  // Commit Formula Bar Edit
  const handleCommitFormulaBar = () => {
    handleUpdateCellValue(formulaBarValue);
    setIsEditingCell(false);
  };

  // Quick Function Insert Wizard
  const handleInsertFunction = (fnSnippet: string) => {
    setFormulaBarValue(fnSnippet);
    handleUpdateCellValue(fnSnippet);
    setShowFxMenu(false);
    toast.success(`Inserted ${fnSnippet}`);
  };

  // Keyboard navigation across grid
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (isEditingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUpdateCellValue(cellEditValue);
        setIsEditingCell(false);
        // Move to row below
        setSelectedCell((prev) => ({
          ...prev,
          rIdx: Math.min(currentSheet.rows.length - 1, prev.rIdx + 1),
        }));
      } else if (e.key === 'Escape') {
        setIsEditingCell(false);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCell((prev) => ({ ...prev, rIdx: Math.max(-1, prev.rIdx - 1) }));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCell((prev) => ({
        ...prev,
        rIdx: Math.min(currentSheet.rows.length - 1, prev.rIdx + 1),
      }));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedCell((prev) => ({ ...prev, cIdx: Math.max(0, prev.cIdx - 1) }));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSelectedCell((prev) => ({
        ...prev,
        cIdx: Math.min(currentSheet.headers.length - 1, prev.cIdx + 1),
      }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const rawVal =
        selectedCell.rIdx === -1
          ? currentSheet.headers[selectedCell.cIdx] ?? ''
          : currentSheet.rows[selectedCell.rIdx]?.[selectedCell.cIdx] ?? '';
      setCellEditValue(rawVal);
      setIsEditingCell(true);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleUpdateCellValue('');
      setFormulaBarValue('');
    }
  };

  // Add new row to current sheet
  const handleAddRow = () => {
    setWorkbook((prev) => {
      const sheet = prev.sheets[activeSheetName];
      if (!sheet) return prev;
      const blankRow = new Array(sheet.headers.length).fill('');
      return {
        ...prev,
        sheets: {
          ...prev.sheets,
          [activeSheetName]: { ...sheet, rows: [...sheet.rows, blankRow] },
        },
      };
    });
    toast.success('Added new row');
  };

  // Add new column to current sheet
  const handleAddColumn = () => {
    setWorkbook((prev) => {
      const sheet = prev.sheets[activeSheetName];
      if (!sheet) return prev;
      const nextLetter = columnIndexToLetter(sheet.headers.length);
      const newHeaders = [...sheet.headers, `Column ${nextLetter}`];
      const newRows = sheet.rows.map((r) => [...r, '']);
      return {
        ...prev,
        sheets: {
          ...prev.sheets,
          [activeSheetName]: { ...sheet, headers: newHeaders, rows: newRows },
        },
      };
    });
    toast.success('Added new column');
  };

  // Delete active row
  const handleDeleteRow = () => {
    if (selectedCell.rIdx < 0) {
      toast.error('Cannot delete the header row');
      return;
    }
    if (currentSheet.rows.length <= 1) {
      toast.error('Sheet must have at least one data row');
      return;
    }

    setWorkbook((prev) => {
      const sheet = prev.sheets[activeSheetName];
      if (!sheet) return prev;
      const newRows = sheet.rows.filter((_, i) => i !== selectedCell.rIdx);
      return {
        ...prev,
        sheets: {
          ...prev.sheets,
          [activeSheetName]: { ...sheet, rows: newRows },
        },
      };
    });
    setSelectedCell((prev) => ({
      ...prev,
      rIdx: Math.max(0, prev.rIdx - 1),
    }));
    toast.success('Deleted row');
  };

  // Sort Active Column Ascending / Descending
  const handleSortColumn = (ascending: boolean) => {
    const colIdx = selectedCell.cIdx;
    setWorkbook((prev) => {
      const sheet = prev.sheets[activeSheetName];
      if (!sheet) return prev;
      const sorted = [...sheet.rows].sort((a, b) => {
        const valA = a[colIdx] ?? '';
        const valB = b[colIdx] ?? '';
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return ascending ? numA - numB : numB - numA;
        }
        return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
      return {
        ...prev,
        sheets: {
          ...prev.sheets,
          [activeSheetName]: { ...sheet, rows: sorted },
        },
      };
    });
    toast.success(`Sorted Column ${columnIndexToLetter(colIdx)} ${ascending ? 'A to Z' : 'Z to A'}`);
  };

  // Format Number Presets: Currency, Percentage, Comma
  const handleApplyNumberFormat = (formatType: 'currency' | 'percent' | 'comma') => {
    if (selectedCell.rIdx < 0) return;
    const rawVal = currentSheet.rows[selectedCell.rIdx]?.[selectedCell.cIdx] ?? '';
    const cleanNum = parseFloat(String(rawVal).replace(/[$€£%,]/g, ''));
    if (isNaN(cleanNum)) {
      toast.error('Select a numeric cell to format');
      return;
    }

    let formatted = '';
    if (formatType === 'currency') {
      formatted = `$${cleanNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (formatType === 'percent') {
      formatted = `${(cleanNum * (cleanNum < 1 ? 100 : 1)).toFixed(1)}%`;
    } else if (formatType === 'comma') {
      formatted = cleanNum.toLocaleString('en-US');
    }

    handleUpdateCellValue(formatted);
    toast.success(`Applied ${formatType} format`);
  };

  // Add new sheet tab
  const handleAddSheet = () => {
    const nextNum = workbook.sheetNames.length + 1;
    const newSheetName = `Sheet${nextNum}`;
    const newSheet: ExcelSheetData = {
      name: newSheetName,
      headers: ['A', 'B', 'C', 'D'],
      rows: [
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
      ],
    };

    setWorkbook((prev) => ({
      ...prev,
      sheetNames: [...prev.sheetNames, newSheetName],
      sheets: { ...prev.sheets, [newSheetName]: newSheet },
      activeSheetName: newSheetName,
    }));
    setActiveSheetName(newSheetName);
    toast.success(`Added ${newSheetName}`);
  };

  // Export to Native Binary XLSX
  const handleExportXlsx = () => {
    setIsProcessing(true);
    try {
      const u8 = exportExcelWorkbook(workbook);
      const blob = new Blob([u8 as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = workbook.fileName.endsWith('.xlsx') ? workbook.fileName : `${workbook.fileName}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded Microsoft Excel (.xlsx) workbook!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export XLSX');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const csvContent = [currentSheet.headers.join(','), ...currentSheet.rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSheetName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${activeSheetName}.csv!`);
  };

  // Export to Formatted Table PDF
  const handleExportPdf = () => {
    try {
      const pdfBlob = generateTablePdf(currentSheet.headers, evaluatedRows, `${workbook.fileName} - ${activeSheetName}`);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeSheetName}_Report.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Generated PDF Table Report!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  // Live Telemetry across column or selected cell
  const selectionTelemetry = useMemo(() => {
    // If range is active or column is highlighted, compute numbers
    const colIdx = selectedCell.cIdx;
    const colValues = evaluatedRows.map((r) => r[colIdx]);
    const numbers: number[] = [];

    colValues.forEach((val) => {
      const clean = String(val).replace(/[$€£%,]/g, '').trim();
      const num = parseFloat(clean);
      if (!isNaN(num)) numbers.push(num);
    });

    if (numbers.length === 0) {
      return { count: colValues.length, sum: null, avg: null, min: null, max: null };
    }

    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = sum / numbers.length;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);

    return {
      count: colValues.length,
      numCount: numbers.length,
      sum: Math.round(sum * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      min,
      max,
    };
  }, [evaluatedRows, selectedCell]);

  return (
    <div
      onKeyDown={handleGridKeyDown}
      tabIndex={0}
      className="flex flex-col h-full w-full bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans select-none outline-none"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleOpenXlsx(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* -------------------------------------------------------------
          1. EXCEL GREEN TITLE BAR
      -------------------------------------------------------------- */}
      <div className="flex-shrink-0 bg-emerald-700 dark:bg-emerald-900 text-white px-3 py-1.5 flex items-center justify-between text-xs border-b border-emerald-800 z-30 shadow-xs">
        {/* Left: App Logo & Filename */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Quick Suite Switcher (Failsafe) */}
          {onSwitchStudio && (
            <div className="flex items-center bg-emerald-900/80 p-0.5 rounded border border-emerald-600/50 mr-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onSwitchStudio('pdf')}
                className="px-1 py-0.5 rounded text-[10px] hover:bg-emerald-600/80 transition-colors"
                title="Switch to PDF Studio"
              >
                📕
              </button>
              <button
                type="button"
                onClick={() => onSwitchStudio('word')}
                className="px-1 py-0.5 rounded text-[10px] hover:bg-emerald-600/80 transition-colors"
                title="Switch to Word Office Suite"
              >
                📝
              </button>
              <button
                type="button"
                onClick={() => onSwitchStudio('pptx')}
                className="px-1 py-0.5 rounded text-[10px] hover:bg-emerald-600/80 transition-colors"
                title="Switch to PowerPoint Presentation Suite"
              >
                📊
              </button>
              <button
                type="button"
                onClick={() => onSwitchStudio('xlsx')}
                className="px-1 py-0.5 rounded text-[10px] bg-emerald-600 font-bold shadow-2xs"
                title="Excel Grid Studio (Active)"
              >
                📈
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-800/80 font-bold">
            <span className="text-base">📈</span>
            <span className="font-heading tracking-wider hidden sm:inline">EXCEL</span>
          </div>

          <button
            onClick={handleExportXlsx}
            className="p-1 rounded hover:bg-emerald-600/80 text-white/90 hover:text-white transition-colors"
            title="Save Workbook (.xlsx)"
          >
            <HiDownload size={14} />
          </button>
          <button
            onClick={handleExportPdf}
            className="p-1 rounded hover:bg-emerald-600/80 text-white/90 hover:text-white transition-colors"
            title="Export Table PDF"
          >
            <HiPrinter size={14} />
          </button>

          <div className="h-3 w-[1px] bg-emerald-500/50 mx-1" />

          <input
            type="text"
            value={workbook.fileName}
            onChange={(e) => setWorkbook({ ...workbook, fileName: e.target.value })}
            className="bg-transparent hover:bg-emerald-800/60 focus:bg-emerald-800 px-2 py-0.5 rounded font-bold text-white text-xs outline-none border border-transparent focus:border-emerald-400 transition-colors truncate max-w-[180px] sm:max-w-[280px]"
            title="Click to rename workbook"
          />

          <span className="text-[10px] text-emerald-200/80 font-medium hidden md:inline">
            • {workbook.sheetNames.length} sheet{workbook.sheetNames.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Right: Open & Export */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
          >
            <HiFolderOpen size={13} />
            <span className="hidden sm:inline">Open .xlsx</span>
          </button>

          <button
            onClick={handleExportXlsx}
            className="px-3 py-1 rounded bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <HiDownload size={13} />
            <span>Export XLSX</span>
          </button>

          <div className="h-3 w-[1px] bg-emerald-500/50 mx-0.5" />

          {/* Toggle Ribbon Tools Button */}
          <button
            onClick={() => setIsRibbonCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-emerald-600/80 text-white/90 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            title={isRibbonCollapsed ? "Show Action Ribbon" : "Hide Action Ribbon (Maximize Sheet)"}
          >
            <span className="hidden md:inline">{isRibbonCollapsed ? 'Show Tools' : 'Hide Tools'}</span>
            {isRibbonCollapsed ? <HiChevronDown size={14} /> : <HiChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. EXCEL ACTION RIBBON
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
                {/* Row / Col Insertion */}
                <button
                  onClick={handleAddRow}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
                  title="Insert new row"
                >
                  <HiPlus size={13} />
                  <span>Row</span>
                </button>

                <button
                  onClick={handleAddColumn}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)]/40 font-semibold flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0"
                  title="Insert new column"
                >
                  <HiPlus size={13} className="text-emerald-500" />
                  <span>Column</span>
                </button>

                <button
                  onClick={handleDeleteRow}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-red-500/10 hover:text-red-500 font-semibold flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0"
                  title="Delete active row"
                >
                  <HiTrash size={13} />
                  <span className="hidden sm:inline">Delete Row</span>
                </button>

                <div className="h-4 w-[1px] bg-[var(--card-border)] mx-1 flex-shrink-0" />

                {/* Number Formats: Currency, Percentage, Comma */}
                <button
                  onClick={() => handleApplyNumberFormat('currency')}
                  className="px-2.5 py-1 rounded-md border border-[var(--card-border)] hover:border-emerald-500 font-mono font-bold text-xs flex-shrink-0"
                  title="Format as Currency ($)"
                >
                  $
                </button>

                <button
                  onClick={() => handleApplyNumberFormat('percent')}
                  className="px-2.5 py-1 rounded-md border border-[var(--card-border)] hover:border-emerald-500 font-mono font-bold text-xs flex-shrink-0"
                  title="Format as Percentage (%)"
                >
                  %
                </button>

                <button
                  onClick={() => handleApplyNumberFormat('comma')}
                  className="px-2.5 py-1 rounded-md border border-[var(--card-border)] hover:border-emerald-500 font-mono font-bold text-xs flex-shrink-0"
                  title="Comma Separator (,)"
                >
                  ,
                </button>

                <div className="h-4 w-[1px] bg-[var(--card-border)] mx-1 flex-shrink-0" />

                {/* Sorting */}
                <button
                  onClick={() => handleSortColumn(true)}
                  className="p-1.5 rounded-lg hover:bg-[var(--card-border)]/40 flex-shrink-0"
                  title="Sort Column Ascending (A-Z)"
                >
                  <HiSortAscending size={14} className="text-emerald-500" />
                </button>

                <button
                  onClick={() => handleSortColumn(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--card-border)]/40 flex-shrink-0"
                  title="Sort Column Descending (Z-A)"
                >
                  <HiSortDescending size={14} className="text-emerald-500" />
                </button>
              </div>

              {/* Right: CSV & PDF Export */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleExportCsv}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:bg-[var(--card-border)]/40 font-semibold text-xs whitespace-nowrap"
                  title="Export Active Sheet as CSV"
                >
                  CSV
                </button>

                <button
                  onClick={handleExportPdf}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1 whitespace-nowrap"
                  title="Generate Formatted Table PDF"
                >
                  <HiPrinter size={14} />
                  <span className="hidden sm:inline">PDF Report</span>
                  <span className="sm:hidden">PDF</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          3. AUTHENTIC EXCEL FORMULA BAR (Address Box, fx, Input)
      -------------------------------------------------------------- */}
      <div className="flex-shrink-0 bg-slate-50 dark:bg-slate-900 border-b border-[var(--card-border)] px-3 py-1.5 flex items-center gap-2 z-20 shadow-xs">
        {/* Name / Coordinate Address Box (e.g. A1, C4) */}
        <div className="w-16 px-2 py-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-md font-mono font-bold text-center text-xs text-emerald-600 dark:text-emerald-400 shadow-2xs">
          {activeCoordinateLabel}
        </div>

        {/* fx Function Wizard Popover */}
        <div className="relative">
          <button
            onClick={() => setShowFxMenu((m) => !m)}
            className={`px-2 py-1 rounded-md text-xs font-serif font-black italic transition-colors ${
              showFxMenu ? 'bg-emerald-600 text-white' : 'hover:bg-[var(--card-border)]/50 text-slate-500'
            }`}
            title="Insert Excel Formula (=SUM, =AVERAGE, etc.)"
          >
            fx
          </button>

          {showFxMenu && (
            <div className="absolute top-8 left-0 z-50 w-64 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-xl shadow-2xl p-2 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] px-2 block">
                Quick Formula Presets
              </span>
              <button
                onClick={() => handleInsertFunction('=SUM(C2:C9)')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 font-mono text-xs flex items-center justify-between"
              >
                <span>=SUM(range)</span>
                <span className="text-[10px] text-slate-400">Sum values</span>
              </button>
              <button
                onClick={() => handleInsertFunction('=AVERAGE(C2:C9)')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 font-mono text-xs flex items-center justify-between"
              >
                <span>=AVERAGE(range)</span>
                <span className="text-[10px] text-slate-400">Arithmetic mean</span>
              </button>
              <button
                onClick={() => handleInsertFunction('=COUNT(C2:C9)')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 font-mono text-xs flex items-center justify-between"
              >
                <span>=COUNT(range)</span>
                <span className="text-[10px] text-slate-400">Count numbers</span>
              </button>
              <button
                onClick={() => handleInsertFunction('=IF(C2>=90, "PASS", "FAIL")')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 font-mono text-xs flex items-center justify-between"
              >
                <span>=IF(cond, "A", "B")</span>
                <span className="text-[10px] text-slate-400">Condition test</span>
              </button>
              <button
                onClick={() => handleInsertFunction('=MAX(C2:C9)')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 font-mono text-xs flex items-center justify-between"
              >
                <span>=MAX(range)</span>
                <span className="text-[10px] text-slate-400">Largest value</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-[var(--card-border)]" />

        {/* Formula Input Field */}
        <input
          ref={formulaInputRef}
          type="text"
          value={formulaBarValue}
          onChange={(e) => setFormulaBarValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCommitFormulaBar();
            }
          }}
          placeholder="Type formula (e.g. =SUM(C2:F2)) or enter cell value..."
          className="flex-1 px-3 py-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-md font-mono text-xs outline-none focus:border-emerald-500 text-[var(--foreground)]"
        />

        <button
          onClick={handleCommitFormulaBar}
          className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10"
          title="Commit Formula (Enter)"
        >
          <HiCheck size={16} />
        </button>
      </div>

      {/* -------------------------------------------------------------
          4. VIRTUALIZED TABULAR GRID (Column Letters & Row Numbers)
      -------------------------------------------------------------- */}
      <div className="flex-1 overflow-auto bg-slate-100/50 dark:bg-slate-950 p-2 md:p-4 relative">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
          }}
          className="inline-block min-w-full bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-md overflow-hidden"
        >
          <table className="border-collapse w-full text-left font-sans text-xs">
            {/* Header: Column Letters (A, B, C, D...) */}
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900 border-b border-[var(--card-border)] text-slate-500">
                {/* Top-Left Corner Box */}
                <th className="w-12 p-2 border-r border-[var(--card-border)] text-center text-[10px] font-mono text-slate-400 bg-slate-200/50 dark:bg-slate-800/50">
                  ◢
                </th>

                {currentSheet.headers.map((header, colIdx) => {
                  const colLetter = columnIndexToLetter(colIdx);
                  const isColSelected = selectedCell.cIdx === colIdx;
                  return (
                    <th
                      key={`col-header-${colIdx}`}
                      onClick={() => setSelectedCell({ rIdx: -1, cIdx: colIdx })}
                      className={`p-2 border-r border-[var(--card-border)] cursor-pointer text-center font-mono text-[11px] font-bold transition-colors ${
                        isColSelected
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400">{colLetter}</span>
                        <span className="font-sans font-bold text-xs truncate max-w-[140px]">{header}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody>
              {currentSheet.rows.map((row, rowIdx) => {
                const rowNum = rowIdx + 2; // Row 1 is headers
                const isRowSelected = selectedCell.rIdx === rowIdx;

                return (
                  <tr
                    key={`grid-row-${rowIdx}`}
                    className={`border-b border-[var(--card-border)] transition-colors ${
                      isRowSelected ? 'bg-emerald-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    {/* Row Number Header (1, 2, 3...) */}
                    <td
                      onClick={() => setSelectedCell({ rIdx: rowIdx, cIdx: 0 })}
                      className={`p-2 border-r border-[var(--card-border)] text-center font-mono text-[11px] font-bold text-slate-400 cursor-pointer ${
                        isRowSelected
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100/50 dark:bg-slate-900/50'
                      }`}
                    >
                      {rowNum}
                    </td>

                    {/* Data Cells */}
                    {row.map((rawVal, colIdx) => {
                      const isCellActive = selectedCell.rIdx === rowIdx && selectedCell.cIdx === colIdx;
                      const isEditingThis = isCellActive && isEditingCell;
                      const displayVal = evaluatedRows[rowIdx]?.[colIdx] ?? rawVal;
                      const isFormula = rawVal.startsWith('=');

                      return (
                        <td
                          key={`cell-${rowIdx}-${colIdx}`}
                          onClick={() => {
                            setSelectedCell({ rIdx: rowIdx, cIdx: colIdx });
                            setIsEditingCell(false);
                          }}
                          onDoubleClick={() => {
                            setSelectedCell({ rIdx: rowIdx, cIdx: colIdx });
                            setCellEditValue(rawVal);
                            setIsEditingCell(true);
                          }}
                          className={`p-2 border-r border-[var(--card-border)] relative cursor-cell min-w-[120px] max-w-[240px] truncate font-medium ${
                            isCellActive
                              ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-500/10 font-bold z-10'
                              : ''
                          }`}
                        >
                          {isEditingThis ? (
                            <input
                              ref={cellInputRef}
                              autoFocus
                              type="text"
                              value={cellEditValue}
                              onChange={(e) => setCellEditValue(e.target.value)}
                              onBlur={() => {
                                handleUpdateCellValue(cellEditValue, rowIdx, colIdx);
                                setIsEditingCell(false);
                              }}
                              className="w-full px-1 py-0.5 font-mono text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded shadow-sm border border-emerald-500"
                            />
                          ) : (
                            <div className="flex items-center justify-between">
                              <span
                                className={`truncate ${
                                  isFormula ? 'font-mono text-emerald-600 dark:text-emerald-400' : ''
                                }`}
                              >
                                {displayVal || <span className="opacity-0">.</span>}
                              </span>
                              {isFormula && (
                                <span className="text-[9px] text-slate-400 font-mono ml-1 opacity-60">
                                  fx
                                </span>
                              )}
                            </div>
                          )}

                          {/* Authentic Excel Cell Corner Handle */}
                          {isCellActive && !isEditingThis && (
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-600 cursor-crosshair" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------
          5. MULTI-SHEET TABS BAR (Sheet1, Sheet2, + Add)
      -------------------------------------------------------------- */}
      <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-900 border-t border-[var(--card-border)] px-3 py-1 flex items-center justify-between text-xs z-20 min-w-0">
        <div className="flex items-center gap-1 overflow-x-auto min-w-0 py-0.5">
          {workbook.sheetNames.map((sheetName) => {
            const isActive = activeSheetName === sheetName;
            return (
              <button
                key={sheetName}
                onClick={() => {
                  setActiveSheetName(sheetName);
                  setSelectedCell({ rIdx: 0, cIdx: 0 });
                }}
                className={`px-3 py-1 rounded-t-lg font-bold text-xs transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-[var(--card-bg)] text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-2xs'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-transparent'
                }`}
              >
                <span>📋</span>
                <span>{sheetName}</span>
              </button>
            );
          })}

          <button
            onClick={handleAddSheet}
            className="p-1 rounded-lg hover:bg-[var(--card-border)]/50 text-emerald-600 dark:text-emerald-400 font-bold ml-1 flex-shrink-0"
            title="Add New Sheet"
          >
            <HiPlus size={15} />
          </button>
        </div>

        <div className="text-[11px] text-[var(--muted-foreground)] font-mono hidden md:inline whitespace-nowrap flex-shrink-0 ml-2">
          {currentSheet.rows.length} rows × {currentSheet.headers.length} columns
        </div>
      </div>

      {/* -------------------------------------------------------------
          6. EXCEL TELEMETRY STATUS BAR (Docked at Bottom)
      -------------------------------------------------------------- */}
      <footer className="flex-shrink-0 bg-emerald-700 dark:bg-emerald-900 text-white px-3 sm:px-4 py-1.5 pr-28 sm:pr-32 md:pr-36 flex items-center justify-between text-[11px] border-t border-emerald-800 z-30 select-none min-w-0">
        {/* Left: Auto-Calculate Telemetry (Average, Count, Sum, Min, Max) */}
        <div className="flex items-center gap-2 sm:gap-3 font-mono truncate min-w-0">
          <span className="font-bold whitespace-nowrap">Ready</span>
          <span className="h-3 w-[1px] bg-emerald-500/50 flex-shrink-0" />
          <span className="whitespace-nowrap">Count: {selectionTelemetry.count}</span>

          {selectionTelemetry.sum !== null && (
            <>
              <span className="h-3 w-[1px] bg-emerald-500/50 flex-shrink-0" />
              <span className="whitespace-nowrap">Sum: {selectionTelemetry.sum.toLocaleString()}</span>
              <span className="h-3 w-[1px] bg-emerald-500/50 hidden sm:inline flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Avg: {selectionTelemetry.avg}</span>
              <span className="h-3 w-[1px] bg-emerald-500/50 hidden md:inline flex-shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Min: {selectionTelemetry.min}</span>
              <span className="h-3 w-[1px] bg-emerald-500/50 hidden md:inline flex-shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Max: {selectionTelemetry.max}</span>
            </>
          )}
        </div>

        {/* Right: Zoom Slider */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(70, z - 10))}
            className="p-0.5 hover:bg-emerald-600 rounded"
            title="Zoom Out"
          >
            <HiZoomOut size={13} />
          </button>

          <input
            type="range"
            min={70}
            max={150}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            className="w-14 sm:w-20 md:w-24 accent-white cursor-pointer h-1"
          />

          <button
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="p-0.5 hover:bg-emerald-600 rounded"
            title="Zoom In"
          >
            <HiZoomIn size={13} />
          </button>

          <span className="font-mono text-[10px] font-bold w-9 text-right">{zoom}%</span>
        </div>
      </footer>
    </div>
  );
}

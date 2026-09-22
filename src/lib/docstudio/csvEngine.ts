import jsPDF from 'jspdf';
import { NumericColumnStats } from './types';

/**
 * Robust CSV/TSV parser supporting quoted fields and embedded commas
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', '']] };
  }

  // Detect delimiter (tab or comma)
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const parsedRows = lines.map(parseLine);
  const headers = parsedRows[0];
  const rows = parsedRows.slice(1);

  // Normalize row length ensuring no extra columns are truncated
  const maxCols = Math.max(headers.length, ...rows.map((r) => r.length));
  while (headers.length < maxCols) {
    headers.push(`Column ${headers.length + 1}`);
  }

  const normalizedRows = rows.map((r) => {
    while (r.length < maxCols) r.push('');
    return r.slice(0, maxCols);
  });

  return { headers, rows: normalizedRows.length > 0 ? normalizedRows : [new Array(maxCols).fill('')] };
}

/**
 * Serializes headers and rows back into standard RFC-4180 CSV
 */
export function serializeCsv(headers: string[], rows: string[][]): string {
  const escapeCell = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Converts tabular grid into a JSON array of objects
 */
export function serializeJson(headers: string[], rows: string[][]): string {
  const records = rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h || `col_${idx + 1}`] = row[idx] || '';
    });
    return obj;
  });
  return JSON.stringify(records, null, 2);
}

/**
 * Computes descriptive statistics for a numeric column
 */
export function computeColumnStats(rows: string[][], colIndex: number): NumericColumnStats | null {
  const values: number[] = [];

  for (const row of rows) {
    const raw = row[colIndex];
    if (raw !== undefined && raw.trim() !== '') {
      const num = Number(raw.replace(/,/g, ''));
      if (!isNaN(num)) {
        values.push(num);
      }
    }
  }

  if (values.length === 0) return null;

  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    count,
    sum: parseFloat(sum.toFixed(4)),
    mean: parseFloat(mean.toFixed(4)),
    min: parseFloat(min.toFixed(4)),
    max: parseFloat(max.toFixed(4)),
  };
}

/**
 * Generates a clean, printable PDF table from tabular data using jsPDF
 */
export function generateTablePdf(headers: string[], rows: string[][], title: string = 'Data Report'): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;

  // Title & Header
  doc.setFontSize(16);
  doc.setTextColor(33, 37, 41);
  doc.text(title, margin, margin + 4);

  doc.setFontSize(9);
  doc.setTextColor(108, 117, 125);
  doc.text(`Generated with StudyQuest DocStudio • ${new Date().toLocaleDateString()}`, margin, margin + 10);

  // Table calculations
  const startY = margin + 16;
  const colCount = Math.max(1, headers.length);
  const colWidth = (pageWidth - margin * 2) / colCount;
  const rowHeight = 7;

  let currentY = startY;

  // Draw Header Row
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);

  headers.forEach((h, i) => {
    const cellX = margin + i * colWidth + 2;
    doc.text(h.substring(0, 20), cellX, currentY + 5);
  });

  currentY += rowHeight;

  // Draw Data Rows
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(8);

  rows.forEach((row, rowIndex) => {
    if (currentY + rowHeight > pageHeight - margin) {
      doc.addPage('a4', 'landscape');
      currentY = margin + 10;
    }

    if (rowIndex % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
    }

    row.forEach((cell, colIndex) => {
      const cellX = margin + colIndex * colWidth + 2;
      doc.text((cell || '').substring(0, 24), cellX, currentY + 5);
    });

    currentY += rowHeight;
  });

  return doc.output('blob');
}

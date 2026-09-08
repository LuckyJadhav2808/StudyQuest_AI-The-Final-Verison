/**
 * StudyQuest AI — Data Forge Academic Lab Report Generator
 * Formats Jupyter/Pyodide notebooks into clean, university-grade academic reports
 * ready for 1-click "Save as PDF" via window.print() or standalone HTML download.
 */

import { Notebook, NotebookCell } from '@/types/notebook';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSimpleMarkdown(markdown: string): string {
  // Convert basic Markdown elements for the report
  let html = escapeHtml(markdown);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="report-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="report-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="report-h1">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="report-p">');
  html = html.replace(/\n/g, '<br/>');

  return `<p class="report-p">${html}</p>`;
}

export function generateLabReportHtml(notebook: Notebook, authorName: string = 'Student'): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let figureCounter = 1;

  const cellsHtml = notebook.cells
    .map((cell: NotebookCell, index: number) => {
      if (cell.cell_type === 'markdown') {
        return `
          <div class="report-cell report-markdown-cell">
            <div class="cell-content">
              ${renderSimpleMarkdown(cell.source)}
            </div>
          </div>
        `;
      }

      // Code Cell
      const outputsHtml = cell.outputs
        .map((out) => {
          if (out.type === 'stream') {
            return `<pre class="report-stream ${out.name === 'stderr' ? 'report-stderr' : 'report-stdout'}">${escapeHtml(out.text)}</pre>`;
          }

          if (out.type === 'display_data' || out.type === 'execute_result') {
            const items: string[] = [];

            // Images / Matplotlib Figures
            if (out.data['image/png']) {
              const figNum = figureCounter++;
              items.push(`
                <div class="report-figure-container">
                  <img src="${out.data['image/png']}" alt="Plot Figure ${figNum}" class="report-figure" />
                  <div class="report-figure-caption">Figure ${figNum}: Output Visualization</div>
                </div>
              `);
            }

            // HTML Tables (Pandas DataFrame)
            if (out.data['text/html']) {
              items.push(`
                <div class="report-table-container">
                  ${out.data['text/html']}
                </div>
              `);
            } else if (out.data['text/plain']) {
              items.push(`<pre class="report-plain-output">${escapeHtml(out.data['text/plain'])}</pre>`);
            }

            return items.join('');
          }

          if (out.type === 'table') {
            const headers = out.columns.map((c) => `<th>${escapeHtml(String(c))}</th>`).join('');
            const rows = out.rows
              .slice(0, 50)
              .map(
                (row) =>
                  `<tr>${row.map((val) => `<td>${escapeHtml(String(val ?? ''))}</td>`).join('')}</tr>`
              )
              .join('');

            return `
              <div class="report-table-container">
                <table>
                  <thead><tr>${headers}</tr></thead>
                  <tbody>${rows}</tbody>
                </table>
                <div class="report-figure-caption">Showing ${Math.min(50, out.totalRows)} of ${out.totalRows} rows × ${out.totalCols} columns</div>
              </div>
            `;
          }

          if (out.type === 'error') {
            return `
              <div class="report-error">
                <strong>${escapeHtml(out.ename)}:</strong> ${escapeHtml(out.evalue)}
              </div>
            `;
          }

          return '';
        })
        .join('');

      return `
        <div class="report-cell report-code-cell">
          <div class="report-cell-header">
            <span class="cell-prompt">In [${cell.execution_count ?? index + 1}]:</span>
          </div>
          <pre class="report-code-block"><code>${escapeHtml(cell.source)}</code></pre>
          ${
            outputsHtml
              ? `
            <div class="report-outputs">
              <div class="report-cell-header">
                <span class="cell-prompt out-prompt">Out [${cell.execution_count ?? index + 1}]:</span>
              </div>
              ${outputsHtml}
            </div>
          `
              : ''
          }
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(notebook.title)} — Academic Lab Report</title>
  <style>
    :root {
      --primary: #4338ca;
      --text: #1e293b;
      --text-muted: #64748b;
      --bg-code: #f8fafc;
      --border: #e2e8f0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: #ffffff;
      padding: 40px 20px;
    }

    .report-container {
      max-width: 850px;
      margin: 0 auto;
    }

    /* Header Banner */
    .report-header {
      border-bottom: 2px solid var(--primary);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .report-badge {
      display: inline-block;
      background: #eef2ff;
      color: var(--primary);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      border: 1px solid #c7d2fe;
    }

    .report-title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 16px;
    }

    .report-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .report-meta-item strong {
      color: #334155;
    }

    /* Cells */
    .report-cell {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }

    .report-h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 20px 0 10px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 6px;
    }

    .report-h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin: 16px 0 8px;
    }

    .report-h3 {
      font-size: 15px;
      font-weight: 600;
      color: #334155;
      margin: 12px 0 6px;
    }

    .report-p {
      font-size: 14px;
      margin-bottom: 12px;
      line-height: 1.7;
    }

    .inline-code {
      background: var(--bg-code);
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 12px;
      color: #b91c1c;
    }

    .report-cell-header {
      margin-bottom: 4px;
    }

    .cell-prompt {
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
    }

    .out-prompt {
      color: #dc2626;
    }

    .report-code-block {
      background: var(--bg-code);
      border: 1px solid var(--border);
      border-left: 3px solid var(--primary);
      border-radius: 6px;
      padding: 12px 14px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 12px;
      line-height: 1.5;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .report-outputs {
      margin-top: 10px;
    }

    .report-stream {
      font-family: monospace;
      font-size: 12px;
      padding: 8px 12px;
      background: #f1f5f9;
      border-radius: 6px;
      margin-bottom: 8px;
      white-space: pre-wrap;
    }

    .report-stderr {
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .report-plain-output {
      font-family: monospace;
      font-size: 12px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
      margin-bottom: 8px;
      white-space: pre-wrap;
    }

    /* Figures */
    .report-figure-container {
      text-align: center;
      margin: 16px 0;
      page-break-inside: avoid;
    }

    .report-figure {
      max-width: 100%;
      height: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .report-figure-caption {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 6px;
    }

    /* Tables */
    .report-table-container {
      overflow-x: auto;
      margin: 12px 0;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin: 8px 0;
    }

    th, td {
      border: 1px solid var(--border);
      padding: 6px 10px;
      text-align: left;
    }

    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Error */
    .report-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-family: monospace;
      margin: 8px 0;
    }

    /* Footer */
    .report-footer {
      border-top: 1px solid var(--border);
      padding-top: 16px;
      margin-top: 48px;
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Print Controls */
    .no-print {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 24px;
    }

    .btn-print {
      background: var(--primary);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .btn-print:hover {
      background: #3730a3;
    }

    /* Print Styles */
    @media print {
      body {
        padding: 0;
        background: transparent;
      }

      .no-print {
        display: none !important;
      }

      .report-container {
        max-width: 100%;
      }

      @page {
        margin: 1.5cm;
        size: auto;
      }

      .report-cell {
        page-break-inside: avoid;
      }

      .report-code-block {
        border-left: 2px solid #000;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Non-printable top action bar -->
    <div class="no-print">
      <button class="btn-print" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
    </div>

    <!-- Header Section -->
    <header class="report-header">
      <div class="report-badge">StudyQuest AI — Academic Lab Report</div>
      <h1 class="report-title">${escapeHtml(notebook.title)}</h1>
      <div class="report-meta-grid">
        <div class="report-meta-item">
          <strong>Author:</strong> ${escapeHtml(authorName)}
        </div>
        <div class="report-meta-item">
          <strong>Date Generated:</strong> ${dateStr} at ${timeStr}
        </div>
        <div class="report-meta-item">
          <strong>Environment:</strong> Python 3.12 (Pyodide WASM)
        </div>
        <div class="report-meta-item">
          <strong>Total Cells:</strong> ${notebook.cells.length}
        </div>
      </div>
    </header>

    <!-- Main Notebook Cells Body -->
    <main class="report-cells">
      ${cellsHtml}
    </main>

    <!-- Academic Footer -->
    <footer class="report-footer">
      Generated automatically by StudyQuest AI Data Forge. Academic & Scientific Lab Submission Report.
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Trigger immediate print preview in a clean popup window
 */
export function exportLabReportPrint(notebook: Notebook, authorName: string = 'Student'): void {
  const html = generateLabReportHtml(notebook, authorName);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    // Wait for styles & base64 images to settle, then trigger print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  }
}

/**
 * Trigger standalone HTML file download
 */
export function exportLabReportHtmlFile(notebook: Notebook, authorName: string = 'Student'): void {
  const html = generateLabReportHtml(notebook, authorName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = notebook.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  a.download = `${safeTitle}_lab_report.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

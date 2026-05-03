'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiPlay, HiEye, HiTerminal, HiRefresh } from 'react-icons/hi';
import { CodeFile } from '@/types';
import { isWebProject, buildWebPreview, createPreviewBlobUrl, getLanguageFromExtension } from '@/lib/webPreview';
import { executeCode } from '@/lib/codeRunner';
import Button from '@/components/ui/Button';

interface PreviewPanelProps {
  files: CodeFile[];
  activeFile: CodeFile | null;
}

type PanelMode = 'preview' | 'console';

export default function PreviewPanel({ files, activeFile }: PreviewPanelProps) {
  const [mode, setMode] = useState<PanelMode>('preview');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prevUrlRef = useRef<string | null>(null);

  const hasWebFiles = isWebProject(files);

  // Auto-detect mode based on project type
  useEffect(() => {
    if (hasWebFiles) setMode('preview');
    else setMode('console');
  }, [hasWebFiles]);

  // Build preview for web projects
  const refreshPreview = useCallback(() => {
    if (!hasWebFiles) return;
    // Revoke previous blob URL
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);

    const html = buildWebPreview(files);
    const url = createPreviewBlobUrl(html);
    setPreviewUrl(url);
    prevUrlRef.current = url;
  }, [files, hasWebFiles]);

  // Auto-refresh preview when files change
  useEffect(() => {
    if (hasWebFiles && mode === 'preview') {
      refreshPreview();
    }
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, [files, mode, hasWebFiles, refreshPreview]);

  // Run code for non-web files
  const runCode = async () => {
    if (!activeFile) {
      setOutput('❌ No file selected to run.');
      return;
    }
    const lang = getLanguageFromExtension(activeFile.name);
    if (lang === 'html' || lang === 'css') {
      setOutput('ℹ️ Switch to Preview mode to see HTML/CSS output.');
      return;
    }

    setRunning(true);
    setOutput('⏳ Running...');
    setMode('console');

    try {
      const result = await executeCode(activeFile.content, lang);
      const out = (result.stdout || '') + (result.stderr ? '\n' + result.stderr : '');
      setOutput(out.trim() || '(no output)');
    } catch {
      setOutput('❌ Failed to execute. Check your network.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-[var(--card-border)]">
        <div className="flex items-center gap-1">
          {hasWebFiles && (
            <button
              onClick={() => setMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                mode === 'preview'
                  ? 'bg-primary text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40'
              }`}
            >
              <HiEye size={12} /> Preview
            </button>
          )}
          <button
            onClick={() => setMode('console')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              mode === 'console'
                ? 'bg-teal text-[#0B0D17]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40'
            }`}
          >
            <HiTerminal size={12} /> Console
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {mode === 'preview' && hasWebFiles && (
            <button
              onClick={refreshPreview}
              className="p-1.5 rounded-lg hover:bg-[var(--card-border)]/40 text-[var(--muted-foreground)] transition-colors"
              title="Refresh Preview"
            >
              <HiRefresh size={14} />
            </button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={<HiPlay size={13} />}
            onClick={runCode}
            loading={running}
          >
            {running ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        {mode === 'preview' && hasWebFiles ? (
          /* Web Preview */
          previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-modals"
              title="Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--muted-foreground)] text-sm">
              No preview available
            </div>
          )
        ) : (
          /* Console Output */
          <div className="p-3 text-sm h-full overflow-auto" style={{ fontFamily: 'var(--font-mono)' }}>
            {!output ? (
              <span className="text-[var(--muted-foreground)]">
                Click &quot;Run&quot; or press Ctrl+Enter to execute...
              </span>
            ) : (
              <pre className="whitespace-pre-wrap">
                {output.split('\n').map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="select-none text-[var(--muted-foreground)] opacity-40 w-5 text-right flex-shrink-0 text-xs">
                      {i + 1}
                    </span>
                    <span className={line.startsWith('❌') ? 'text-coral' : line.startsWith('⏳') ? 'text-amber' : ''}>
                      {line}
                    </span>
                  </div>
                ))}
              </pre>
            )}

            {running && (
              <motion.div
                className="mt-2 flex items-center gap-2 text-xs text-amber"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-amber"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                Executing...
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

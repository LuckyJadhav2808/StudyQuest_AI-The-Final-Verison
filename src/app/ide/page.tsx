'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCode, HiMenu, HiX, HiEye, HiPlay, HiTerminal } from 'react-icons/hi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PageTransition from '@/components/layout/PageTransition';
import CodeEditor from '@/components/ui/CodeEditor';
import ProjectSidebar, { PROJECT_TEMPLATES } from '@/components/code/ProjectSidebar';
import EditorTabs from '@/components/code/EditorTabs';
import PreviewPanel from '@/components/code/PreviewPanel';
import CodeAIPanel from '@/components/code/CodeAIPanel';
import { useCodeProjects } from '@/hooks/useCodeProjects';
import { CodeFile } from '@/types';
import { isWebProject, getLanguageFromExtension } from '@/lib/webPreview';
import { executeCode } from '@/lib/codeRunner';

type IDEView = 'editor' | 'preview';

export default function IDEPage() {
  const {
    projects, loading,
    addProject, updateProject, deleteProject,
    addFile, updateFile, deleteFile,
    subscribeToFiles,
  } = useCodeProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<CodeFile[]>([]);
  const [openFiles, setOpenFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [ideView, setIdeView] = useState<IDEView>('editor');
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  // Subscribe to files when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectFiles([]);
      return;
    }

    const unsub = subscribeToFiles(selectedProjectId, (files) => {
      setProjectFiles(files);

      // Update open files with latest content
      setOpenFiles((prev) =>
        prev.map((of) => {
          const updated = files.find((f) => f.id === of.id);
          return updated || of;
        }).filter((of) => files.some((f) => f.id === of.id))
      );
    });

    return () => unsub();
  }, [selectedProjectId, subscribeToFiles]);

  // Auto-select first project
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const activeFile = openFiles.find((f) => f.id === activeFileId) || null;
  const hasWebFiles = isWebProject(projectFiles);

  const handleSelectFile = useCallback((file: CodeFile) => {
    setOpenFiles((prev) => {
      if (!prev.find((f) => f.id === file.id)) {
        return [...prev, file];
      }
      return prev;
    });
    setActiveFileId(file.id);
    setIdeView('editor'); // switch back to editor when selecting a file
  }, []);

  const handleCloseTab = useCallback((fileId: string) => {
    setOpenFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== fileId);
      if (activeFileId === fileId) {
        setActiveFileId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  }, [activeFileId]);

  const handleCodeChange = useCallback((value: string) => {
    if (!activeFileId || !selectedProjectId) return;

    setOpenFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f))
    );

    setProjectFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f))
    );
  }, [activeFileId, selectedProjectId]);

  // Debounced save to Firestore
  const saveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!activeFile || !selectedProjectId) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateFile(selectedProjectId, activeFile.id, { content: activeFile.content });
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [activeFile?.content, activeFile?.id, selectedProjectId, updateFile, activeFile]);

  const handleAddProject = useCallback(async (name: string, language: string) => {
    const template = PROJECT_TEMPLATES.find((t) => t.language === language);
    const projectId = await addProject(name, language);
    if (projectId && template) {
      for (const file of template.files) {
        await addFile(projectId, file.name, file.content);
      }
      setSelectedProjectId(projectId);
      toast.success('Project created! 🎉');
    }
  }, [addProject, addFile]);

  const handleAddFile = useCallback(async (projectId: string, name: string) => {
    await addFile(projectId, name, '');
    toast.success(`${name} created`);
  }, [addFile]);

  const handleRenameFile = useCallback(async (projectId: string, fileId: string, name: string) => {
    await updateFile(projectId, fileId, { name });
    setOpenFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, name } : f)));
  }, [updateFile]);

  const handleDeleteFile = useCallback(async (projectId: string, fileId: string) => {
    await deleteFile(projectId, fileId);
    handleCloseTab(fileId);
    toast.success('File deleted');
  }, [deleteFile, handleCloseTab]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    await deleteProject(projectId);
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
      setOpenFiles([]);
      setActiveFileId(null);
      setProjectFiles([]);
    }
    toast.success('Project deleted');
  }, [deleteProject, selectedProjectId]);

  // Run code for non-web files
  const runCode = async () => {
    if (!activeFile) {
      setOutput('❌ No file selected to run.');
      setIdeView('preview');
      return;
    }
    const lang = getLanguageFromExtension(activeFile.name);
    if (lang === 'html' || lang === 'css') {
      setIdeView('preview'); // switch to preview for web files
      return;
    }

    setRunning(true);
    setOutput('⏳ Running...');
    setIdeView('preview');

    try {
      const result = await executeCode(activeFile.content, lang, stdin);
      const out = (result.stdout || '') + (result.stderr ? '\n' + result.stderr : '');
      setOutput(out.trim() || '(no output)');
      if (result.stderr) toast.error('Execution had errors');
      else toast.success('Code executed! ⚡');
    } catch {
      setOutput('❌ Failed to execute. Check your network.');
      toast.error('Execution failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div
            className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </PageTransition>
    );
  }

  // Detect if current file is non-web (needs console output, not preview)
  const currentLang = activeFile ? getLanguageFromExtension(activeFile.name) : '';
  const isNonWebFile = currentLang && currentLang !== 'html' && currentLang !== 'css';

  return (
    <PageTransition>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setMobileSidebar(!mobileSidebar)}
              className="lg:hidden p-2 rounded-xl border-2 border-[var(--card-border)] hover:bg-[var(--card-border)]/40 transition-colors"
            >
              <HiMenu size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-heading font-black">Code Arena IDE</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Build projects, write code, and preview — all in one place.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-xl border-2 border-[var(--card-border)] overflow-hidden">
              <button
                onClick={() => setIdeView('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  ideView === 'editor'
                    ? 'bg-primary text-white'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40'
                }`}
              >
                <HiCode size={13} /> Editor
              </button>
              <button
                onClick={() => setIdeView('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  ideView === 'preview'
                    ? 'bg-teal text-[#0B0D17]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40'
                }`}
              >
                {hasWebFiles ? <HiEye size={13} /> : <HiTerminal size={13} />}
                {hasWebFiles ? 'Preview' : 'Output'}
              </button>
            </div>
            {/* Run button */}
            <button
              onClick={runCode}
              disabled={running}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-secondary text-white shadow-[0_3px_0_rgba(88,28,135,0.3)] hover:shadow-[0_4px_0_rgba(88,28,135,0.4)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_rgba(88,28,135,0.3)] transition-all disabled:opacity-60"
            >
              <HiPlay size={14} />
              {running ? 'Running...' : 'Run ▶'}
            </button>
            <Link
              href="/code"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border-2 border-[var(--card-border)] hover:border-primary/30 transition-all text-[var(--muted-foreground)] hover:text-primary"
            >
              <HiCode size={14} />
              Quick Runner
            </Link>
          </div>
        </div>

        {/* Main IDE layout */}
        <div className="flex gap-3 relative" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Desktop sidebar */}
          <div
            className={`hidden lg:block flex-shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-[240px]' : 'w-0 overflow-hidden'}`}
          >
            <div className="h-full bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl overflow-hidden flex flex-col">
              <ProjectSidebar
                projects={projects}
                files={projectFiles}
                selectedProjectId={selectedProjectId}
                selectedFileId={activeFileId}
                onSelectProject={setSelectedProjectId}
                onSelectFile={handleSelectFile}
                onAddProject={handleAddProject}
                onRenameProject={(id, name) => updateProject(id, { name })}
                onDeleteProject={handleDeleteProject}
                onAddFile={handleAddFile}
                onRenameFile={handleRenameFile}
                onDeleteFile={handleDeleteFile}
              />
            </div>
          </div>

          {/* Mobile sidebar overlay */}
          <AnimatePresence>
            {mobileSidebar && (
              <motion.div
                className="lg:hidden fixed inset-0 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebar(false)} />
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-[280px] bg-[var(--card-bg)] border-r-2 border-[var(--card-border)] shadow-2xl flex flex-col"
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--card-border)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Projects</span>
                    <button onClick={() => setMobileSidebar(false)} className="p-1 rounded-lg hover:bg-[var(--muted)]/20">
                      <HiX size={16} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ProjectSidebar
                      projects={projects}
                      files={projectFiles}
                      selectedProjectId={selectedProjectId}
                      selectedFileId={activeFileId}
                      onSelectProject={(id) => { setSelectedProjectId(id); }}
                      onSelectFile={(f) => { handleSelectFile(f); setMobileSidebar(false); }}
                      onAddProject={handleAddProject}
                      onRenameProject={(id, name) => updateProject(id, { name })}
                      onDeleteProject={handleDeleteProject}
                      onAddFile={handleAddFile}
                      onRenameFile={handleRenameFile}
                      onDeleteFile={handleDeleteFile}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main content area — full width, toggles between editor and preview */}
          <div className="flex-1 min-w-0 bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl overflow-hidden flex flex-col">
            {/* Toggle sidebar button (desktop) */}
            <div className="hidden lg:flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="px-2 py-1 text-[10px] font-semibold text-[var(--muted-foreground)] hover:text-primary transition-colors"
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                {sidebarOpen ? '◀' : '▶'}
              </button>
            </div>

            {ideView === 'editor' ? (
              /* ===== EDITOR VIEW ===== */
              <>
                {/* Tabs + AI Toolbar */}
                <div className="flex items-center justify-between border-b border-[var(--card-border)]">
                  <div className="flex-1 min-w-0">
                    <EditorTabs
                      openFiles={openFiles}
                      activeFileId={activeFileId}
                      onSelectTab={handleSelectFile}
                      onCloseTab={handleCloseTab}
                    />
                  </div>
                  {activeFile && (
                    <div className="flex-shrink-0 px-2">
                      <CodeAIPanel
                        code={activeFile.content}
                        fileName={activeFile.name}
                      />
                    </div>
                  )}
                </div>

                {/* Code Editor — full width */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {activeFile ? (
                    <CodeEditor
                      value={activeFile.content}
                      onChange={handleCodeChange}
                      onRun={runCode}
                      minHeight="100%"
                      placeholder="Start coding..."
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)] gap-3 p-8">
                      <HiCode size={48} className="text-[var(--muted)] opacity-40" />
                      <p className="text-sm font-semibold">
                        {projects.length === 0
                          ? 'Create a project to get started'
                          : 'Select a file from the sidebar to start editing'}
                      </p>
                      <p className="text-xs text-center max-w-[300px]">
                        Build HTML/CSS/JS projects with live preview, or code in Python, Java, C++ and more!
                      </p>
                    </div>
                  )}
                </div>

                {/* Stdin input for non-web languages */}
                {isNonWebFile && (
                  <div className="border-t-2 border-[var(--card-border)]">
                    <button
                      onClick={() => setShowStdin(!showStdin)}
                      className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span>📥 Input (stdin){stdin.trim() ? ` — ${stdin.split('\n').length} line(s)` : ''}</span>
                      <span>{showStdin ? '▲' : '▼'}</span>
                    </button>
                    {showStdin && (
                      <textarea
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                        placeholder={'Enter input here (one value per line)\nUsed by: Scanner (Java), input() (Python), cin (C++), etc.'}
                        className="w-full h-24 px-4 py-2 bg-[var(--background)] text-sm border-t border-[var(--card-border)] resize-none focus:outline-none"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    )}
                  </div>
                )}
              </>
            ) : (
              /* ===== PREVIEW / OUTPUT VIEW ===== */
              <div className="flex-1 min-h-0">
                {hasWebFiles ? (
                  /* Web preview — use PreviewPanel's iframe rendering */
                  <PreviewPanel files={projectFiles} activeFile={activeFile} />
                ) : (
                  /* Console output for non-web languages */
                  <div className="flex flex-col h-full">
                    <div className="px-4 py-2 border-b-2 border-[var(--card-border)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HiTerminal className="text-teal" size={14} />
                        <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Console Output</span>
                        {running && (
                          <motion.div className="w-2 h-2 rounded-full bg-amber" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                        )}
                      </div>
                      <button
                        onClick={() => setIdeView('editor')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:bg-[var(--card-border)]/40 transition-all"
                      >
                        <HiCode size={12} /> Back to Editor
                      </button>
                    </div>
                    <div className="flex-1 p-4 overflow-auto text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                      {!output ? (
                        <span className="text-[var(--muted-foreground)]">
                          Click &quot;Run&quot; or press Ctrl+Enter to execute...
                        </span>
                      ) : (
                        <pre className="whitespace-pre-wrap">
                          {output.split('\n').map((line, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="select-none text-[var(--muted-foreground)] opacity-40 w-6 text-right flex-shrink-0 text-xs">
                                {i + 1}
                              </span>
                              <span className={line.startsWith('❌') ? 'text-coral' : line.startsWith('⏳') ? 'text-amber' : ''}>
                                {line}
                              </span>
                            </div>
                          ))}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}


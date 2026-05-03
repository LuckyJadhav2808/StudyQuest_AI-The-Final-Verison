'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCode, HiMenu, HiX } from 'react-icons/hi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PageTransition from '@/components/layout/PageTransition';
import CodeEditor from '@/components/ui/CodeEditor';
import ProjectSidebar, { PROJECT_TEMPLATES } from '@/components/code/ProjectSidebar';
import EditorTabs from '@/components/code/EditorTabs';
import PreviewPanel from '@/components/code/PreviewPanel';
import { useCodeProjects } from '@/hooks/useCodeProjects';
import { CodeFile } from '@/types';

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

  const handleSelectFile = useCallback((file: CodeFile) => {
    setOpenFiles((prev) => {
      if (!prev.find((f) => f.id === file.id)) {
        return [...prev, file];
      }
      return prev;
    });
    setActiveFileId(file.id);
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

    // Update in open files locally for instant feedback
    setOpenFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f))
    );

    // Update in projectFiles locally
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
          <Link
            href="/code"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border-2 border-[var(--card-border)] hover:border-primary/30 transition-all text-[var(--muted-foreground)] hover:text-primary"
          >
            <HiCode size={14} />
            Quick Runner
          </Link>
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

          {/* Editor + Preview area */}
          <div className="flex-1 flex flex-col lg:flex-row gap-3 min-w-0">
            {/* Editor panel */}
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

              {/* Tabs */}
              <EditorTabs
                openFiles={openFiles}
                activeFileId={activeFileId}
                onSelectTab={handleSelectFile}
                onCloseTab={handleCloseTab}
              />

              {/* Code Editor */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeFile ? (
                  <CodeEditor
                    value={activeFile.content}
                    onChange={handleCodeChange}
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
            </div>

            {/* Preview/Output panel */}
            <div className="flex-1 min-w-0 min-h-[250px] lg:min-h-0">
              <PreviewPanel files={projectFiles} activeFile={activeFile} />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

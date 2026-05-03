'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiPencil, HiTrash, HiFolder, HiFolderOpen,
  HiChevronRight, HiChevronDown, HiDocumentAdd,
} from 'react-icons/hi';
import { CodeProject, CodeFile } from '@/types';
import { getFileIcon } from '@/lib/webPreview';

interface ProjectSidebarProps {
  projects: CodeProject[];
  files: CodeFile[];
  selectedProjectId: string | null;
  selectedFileId: string | null;
  onSelectProject: (id: string) => void;
  onSelectFile: (file: CodeFile) => void;
  onAddProject: (name: string, language: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onAddFile: (projectId: string, name: string) => void;
  onRenameFile: (projectId: string, fileId: string, name: string) => void;
  onDeleteFile: (projectId: string, fileId: string) => void;
}

const PROJECT_TEMPLATES: { label: string; language: string; files: { name: string; content: string }[] }[] = [
  {
    label: '🌐 Web Project (HTML/CSS/JS)',
    language: 'web',
    files: [
      { name: 'index.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n</head>\n<body>\n  <h1>Hello, StudyQuest! 🦉</h1>\n  <p>Start building here...</p>\n</body>\n</html>' },
      { name: 'style.css', content: '/* Styles */\nbody {\n  font-family: system-ui, sans-serif;\n  max-width: 800px;\n  margin: 0 auto;\n  padding: 2rem;\n  background: #f8f9fa;\n}\n\nh1 {\n  color: #7C3AED;\n}' },
      { name: 'script.js', content: '// JavaScript\nconsole.log("Hello from StudyQuest! 🦉");' },
    ],
  },
  { label: '🐍 Python', language: 'python', files: [{ name: 'main.py', content: '# Python Project\n\ndef main():\n    print("Hello, StudyQuest! 🦉")\n\nif __name__ == "__main__":\n    main()' }] },
  { label: '⚡ JavaScript', language: 'javascript', files: [{ name: 'index.js', content: '// JavaScript Project\n\nfunction greet(name) {\n  return `Hello, ${name}! Welcome to StudyQuest 🦉`;\n}\n\nconsole.log(greet("Adventurer"));' }] },
  { label: '☕ Java', language: 'java', files: [{ name: 'Main.java', content: '// Java Project\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, StudyQuest! 🦉");\n    }\n}' }] },
  { label: '⚙️ C++', language: 'cpp', files: [{ name: 'main.cpp', content: '// C++ Project\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, StudyQuest! 🦉" << endl;\n    return 0;\n}' }] },
  { label: '⚙️ C', language: 'c', files: [{ name: 'main.c', content: '// C Project\n#include <stdio.h>\n\nint main() {\n    printf("Hello, StudyQuest! 🦉\\n");\n    return 0;\n}' }] },
  { label: '📄 Empty Project', language: 'text', files: [] },
];

export default function ProjectSidebar({
  projects,
  files,
  selectedProjectId,
  selectedFileId,
  onSelectProject,
  onSelectFile,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  onAddFile,
  onRenameFile,
  onDeleteFile,
}: ProjectSidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showNewFile, setShowNewFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const toggleExpand = (id: string) => {
    const next = new Set(expandedProjects);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedProjects(next);
  };

  // Auto-expand when selecting a project
  const handleSelectProject = (id: string) => {
    onSelectProject(id);
    setExpandedProjects((prev) => new Set(prev).add(id));
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const template = PROJECT_TEMPLATES[selectedTemplate];
    onAddProject(newProjectName.trim(), template.language);
    setNewProjectName('');
    setShowCreate(false);
  };

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-[var(--card-border)]">
        <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">
          Projects
        </span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="p-1 rounded-md hover:bg-primary/10 text-primary transition-colors"
          title="New Project"
        >
          <HiPlus size={15} />
        </button>
      </div>

      {/* Create project form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="px-3 py-3 border-b border-[var(--card-border)] space-y-2 bg-[var(--background)]/50"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs focus:border-primary outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              autoFocus
            />
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs focus:border-primary outline-none appearance-none"
            >
              {PROJECT_TEMPLATES.map((t, i) => (
                <option key={i} value={i}>{t.label}</option>
              ))}
            </select>
            <button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              className="w-full py-1.5 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider hover:bg-primary-dark transition-colors disabled:opacity-40"
            >
              Create Project
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {projects.map((project) => {
          const isExpanded = expandedProjects.has(project.id);
          const isSelected = selectedProjectId === project.id;
          const projectFiles = files.filter((f) => f.projectId === project.id);

          return (
            <div key={project.id}>
              {/* Project header */}
              <div className="group relative">
                {editingProject === project.id ? (
                  <div className="flex items-center gap-1 px-2 py-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-1.5 py-0.5 rounded text-xs bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-primary"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editName.trim()) { onRenameProject(project.id, editName.trim()); setEditingProject(null); }
                        if (e.key === 'Escape') setEditingProject(null);
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { handleSelectProject(project.id); toggleExpand(project.id); }}
                    className={`w-full flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold transition-all ${
                      isSelected ? 'bg-primary/10 text-primary' : 'text-[var(--foreground)] hover:bg-[var(--card-border)]/40'
                    }`}
                  >
                    {isExpanded ? <HiChevronDown size={12} /> : <HiChevronRight size={12} />}
                    {isExpanded ? <HiFolderOpen size={14} className="text-amber" /> : <HiFolder size={14} className="text-amber" />}
                    <span className="truncate flex-1 text-left">{project.name}</span>
                  </button>
                )}

                {/* Project actions */}
                {editingProject !== project.id && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowNewFile(project.id); setNewFileName(''); setExpandedProjects((p) => new Set(p).add(project.id)); }}
                      className="p-0.5 rounded hover:bg-primary/10 text-[var(--muted-foreground)]"
                      title="New File"
                    >
                      <HiDocumentAdd size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProject(project.id); setEditName(project.name); }}
                      className="p-0.5 rounded hover:bg-primary/10 text-[var(--muted-foreground)]"
                      title="Rename"
                    >
                      <HiPencil size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete project and all files?')) onDeleteProject(project.id); }}
                      className="p-0.5 rounded hover:bg-coral/10 text-coral"
                      title="Delete"
                    >
                      <HiTrash size={11} />
                    </button>
                  </div>
                )}
              </div>

              {/* Files list */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {projectFiles.map((file) => (
                      <div key={file.id} className="group/file relative">
                        {editingFile === file.id ? (
                          <div className="flex items-center gap-1 pl-8 pr-2 py-0.5">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-1.5 py-0.5 rounded text-[11px] bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-primary"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editName.trim()) { onRenameFile(project.id, file.id, editName.trim()); setEditingFile(null); }
                                if (e.key === 'Escape') setEditingFile(null);
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => onSelectFile(file)}
                            className={`w-full flex items-center gap-1.5 pl-8 pr-2 py-1.5 text-[11px] transition-all ${
                              selectedFileId === file.id
                                ? 'bg-primary/15 text-primary font-semibold'
                                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)]/30'
                            }`}
                          >
                            <span className="text-xs">{getFileIcon(file.name)}</span>
                            <span className="truncate">{file.name}</span>
                          </button>
                        )}

                        {/* File actions */}
                        {editingFile !== file.id && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/file:flex gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingFile(file.id); setEditName(file.name); }}
                              className="p-0.5 rounded hover:bg-primary/10 text-[var(--muted-foreground)]"
                            >
                              <HiPencil size={10} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${file.name}?`)) onDeleteFile(project.id, file.id); }}
                              className="p-0.5 rounded hover:bg-coral/10 text-coral"
                            >
                              <HiTrash size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* New file input */}
                    {showNewFile === project.id && (
                      <div className="flex items-center gap-1 pl-8 pr-2 py-1">
                        <input
                          type="text"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          placeholder="filename.ext"
                          className="flex-1 px-1.5 py-0.5 rounded text-[11px] bg-[var(--background)] border border-[var(--card-border)] outline-none focus:border-primary"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newFileName.trim()) {
                              onAddFile(project.id, newFileName.trim());
                              setNewFileName('');
                              setShowNewFile(null);
                            }
                            if (e.key === 'Escape') setShowNewFile(null);
                          }}
                          autoFocus
                        />
                      </div>
                    )}

                    {projectFiles.length === 0 && showNewFile !== project.id && (
                      <div className="pl-8 py-2 text-[10px] text-[var(--muted-foreground)]">
                        No files yet.{' '}
                        <button
                          onClick={() => { setShowNewFile(project.id); setNewFileName(''); }}
                          className="text-primary hover:underline"
                        >
                          Add one
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {projects.length === 0 && !showCreate && (
          <div className="px-3 py-8 text-center">
            <HiFolder className="mx-auto text-[var(--muted)] mb-2" size={28} />
            <p className="text-[11px] text-[var(--muted-foreground)]">No projects yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-1.5 text-[11px] text-primary font-semibold hover:underline"
            >
              Create your first project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { PROJECT_TEMPLATES };

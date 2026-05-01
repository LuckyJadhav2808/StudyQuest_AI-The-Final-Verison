'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TaskPriority, TaskStatus } from '@/types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string | null;
    tags: string[];
  }) => void;
  initialData?: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string | null;
    tags?: string[];
  };
  mode?: 'create' | 'edit';
}

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: TaskModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || 'medium');
  const [status, setStatus] = useState<TaskStatus>(initialData?.status || 'todo');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      dueDate: dueDate || null,
      tags,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus('todo');
    setDueDate('');
    setTags([]);
    onClose();
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const priorities: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'bg-teal/20 text-teal border-teal/30' },
    { value: 'medium', label: 'Medium', color: 'bg-amber/20 text-amber border-amber/30' },
    { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { value: 'urgent', label: 'Urgent', color: 'bg-coral/20 text-coral border-coral/30' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-lg card-glass rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)]">
              <h2 className="text-lg font-heading font-bold">
                {mode === 'create' ? '✨ New Task' : '📝 Edit Task'}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <Input
                label="Task Title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold opacity-80">Description</label>
                <textarea
                  className="w-full rounded-lg border bg-[var(--card-bg)] border-[var(--card-border)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 min-h-[80px] resize-none"
                  placeholder="Add details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold opacity-80">Priority</label>
                <div className="flex gap-2">
                  {priorities.map((p) => (
                    <motion.button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        priority === p.value
                          ? p.color
                          : 'bg-transparent border-[var(--card-border)] text-[var(--muted-foreground)]'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {p.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Status (for edit mode) */}
              {mode === 'edit' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold opacity-80">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-lg border bg-[var(--card-bg)] border-[var(--card-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              )}

              {/* Due Date */}
              <Input
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold opacity-80">Tags</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border bg-[var(--card-bg)] border-[var(--card-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={addTag}>Add</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary-light border border-primary/20"
                      >
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-coral">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="pt-2">
                <Button type="submit" variant="primary" size="lg" fullWidth>
                  {mode === 'create' ? '🚀 Create Task' : '💾 Save Changes'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiX, HiPlus, HiPhotograph, HiDocumentText, HiSearch, HiZoomIn, HiZoomOut } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import './MultitaskPanels.css';

// ════════════════════════════════════════════
// 1. YouTube Panel
// ════════════════════════════════════════════
interface YouTubePanelProps {
  onClose: () => void;
  onInsertTimestamp: (timestamp: string) => void;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export function YouTubePanel({ onClose, onInsertTimestamp }: YouTubePanelProps) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const loadVideo = () => {
    const id = extractVideoId(url.trim());
    if (id) {
      setVideoId(id);
    } else {
      toast.error('Invalid YouTube URL');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') loadVideo();
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const insertTimestamp = () => {
    // We can't reliably get current time from YouTube iframe API without loading the full API
    // Instead, users can manually note the timestamp displayed in the video
    const ts = prompt('Enter the timestamp from the video (e.g., 14:32):');
    if (ts) {
      onInsertTimestamp(ts);
      toast.success(`Timestamp [${ts}] inserted! ⏱️`);
    }
  };

  return (
    <div className="multitask-panel">
      <div className="multitask-header">
        <div className="multitask-header-title">
          <span>📺</span> YouTube Lecture
        </div>
        <button className="multitask-close" onClick={onClose}><HiX size={16} /></button>
      </div>

      {!videoId ? (
        <div className="youtube-url-input">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste YouTube URL here..."
          />
          <Button variant="coral" size="sm" onClick={loadVideo}>Load</Button>
        </div>
      ) : (
        <>
          <div className="youtube-embed">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${videoId}?rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube Lecture"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '1px solid var(--card-border)' }}>
            <button className="youtube-timestamp-btn" onClick={insertTimestamp}>
              ⏱️ Insert Timestamp
            </button>
            <button
              className="youtube-timestamp-btn"
              style={{ background: 'rgba(124, 58, 237, 0.08)', color: 'var(--color-primary)', borderColor: 'rgba(124, 58, 237, 0.2)' }}
              onClick={() => { setVideoId(null); setUrl(''); }}
            >
              🔄 Change Video
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// 2. AI Tutor Panel
// ════════════════════════════════════════════
interface TutorMessage {
  role: 'user' | 'ai';
  content: string;
}

interface AITutorPanelProps {
  onClose: () => void;
  onInsertText: (text: string) => void;
  noteContent: string;
  apiKey?: string;
}

export function AITutorPanel({ onClose, onInsertText, noteContent, apiKey }: AITutorPanelProps) {
  const [messages, setMessages] = useState<TutorMessage[]>([
    { role: 'ai', content: "Hi! I'm your study tutor 🧠 Ask me anything about your notes and I'll help explain it. You can also insert my answers directly into your notes!" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!apiKey) { toast.error('Add your OpenRouter API key in Settings'); return; }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    scrollToBottom();
    setLoading(true);

    try {
      const strippedNotes = noteContent.replace(/<[^>]*>/g, '').slice(0, 2000);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: `You are a friendly study tutor helping a student understand their notes. Be concise and clear. Use simple language. Here are their current notes for context:\n\n${strippedNotes}` },
            ...messages.filter(m => m.role === 'user').slice(-5).map(m => ({ role: 'user' as const, content: m.content })),
            { role: 'user', content: userMsg },
          ],
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
      setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      scrollToBottom();
    } catch {
      toast.error('Failed to get response');
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, something went wrong. Try again!' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="multitask-panel">
      <div className="multitask-header">
        <div className="multitask-header-title">
          <span>🤖</span> AI Tutor
        </div>
        <button className="multitask-close" onClick={onClose}><HiX size={16} /></button>
      </div>

      <div className="tutor-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`tutor-msg ${msg.role}`}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            {msg.role === 'ai' && i > 0 && (
              <button className="insert-btn" onClick={() => { onInsertText(msg.content); toast.success('Inserted into notes! 📝'); }}>
                <HiPlus size={10} /> Insert into notes
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="tutor-msg ai">
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}>
              Thinking...
            </motion.span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="tutor-input-bar">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your notes..."
          disabled={loading}
        />
        <Button variant="primary" size="sm" onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// 3. Reference Viewer (PDF / Image / URL)
// ════════════════════════════════════════════
type RefType = 'image' | 'pdf' | 'url';

interface ReferenceViewerPanelProps {
  onClose: () => void;
}

export function ReferenceViewerPanel({ onClose }: ReferenceViewerPanelProps) {
  const [activeTab, setActiveTab] = useState<RefType>('image');
  const [refSrc, setRefSrc] = useState<string | null>(null);
  const [refName, setRefName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [zoom, setZoom] = useState(100);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      setActiveTab('image');
      const reader = new FileReader();
      reader.onload = (e) => { setRefSrc(e.target?.result as string); setRefName(file.name); };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setActiveTab('pdf');
      const url = URL.createObjectURL(file);
      setRefSrc(url);
      setRefName(file.name);
    } else {
      toast.error('Only images and PDFs are supported');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const loadUrl = () => {
    if (!urlInput.trim()) return;
    setActiveTab('url');
    setRefSrc(urlInput.trim());
    setRefName(urlInput.trim());
  };

  const clearRef = () => {
    if (refSrc && activeTab === 'pdf') URL.revokeObjectURL(refSrc);
    setRefSrc(null);
    setRefName('');
    setZoom(100);
  };

  return (
    <div className="multitask-panel">
      <div className="multitask-header">
        <div className="multitask-header-title">
          <span>📄</span> Reference Viewer
          {refName && <span style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600 }}>— {refName.length > 30 ? refName.slice(0, 30) + '...' : refName}</span>}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {refSrc && <button className="multitask-close" onClick={clearRef} title="Clear"><HiX size={14} /></button>}
          <button className="multitask-close" onClick={onClose}><HiX size={16} /></button>
        </div>
      </div>

      {!refSrc ? (
        <>
          {/* Tabs */}
          <div className="ref-tabs">
            <button className={`ref-tab ${activeTab === 'image' ? 'active' : ''}`} onClick={() => setActiveTab('image')}>📷 Photo</button>
            <button className={`ref-tab ${activeTab === 'pdf' ? 'active' : ''}`} onClick={() => setActiveTab('pdf')}>📄 PDF</button>
            <button className={`ref-tab ${activeTab === 'url' ? 'active' : ''}`} onClick={() => setActiveTab('url')}>🌐 Web URL</button>
          </div>

          {activeTab === 'url' ? (
            <div className="youtube-url-input">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUrl()}
                placeholder="Enter a webpage URL..."
              />
              <Button variant="primary" size="sm" onClick={loadUrl}>Load</Button>
            </div>
          ) : (
            <div
              className={`ref-drop-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {activeTab === 'image' ? (
                <HiPhotograph size={40} style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
              ) : (
                <HiDocumentText size={40} style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
              )}
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)' }}>
                Drop {activeTab === 'image' ? 'an image' : 'a PDF'} here
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted-foreground)', opacity: 0.6 }}>
                or click below to browse
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose {activeTab === 'image' ? 'Image' : 'PDF'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={activeTab === 'image' ? 'image/*' : 'application/pdf'}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="ref-viewer-content">
          {activeTab === 'image' && (
            <img
              src={refSrc}
              alt="Reference"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}
            />
          )}
          {activeTab === 'pdf' && (
            <iframe src={refSrc} title="PDF Viewer" />
          )}
          {activeTab === 'url' && (
            <iframe src={refSrc} title="Web Viewer" sandbox="allow-scripts allow-same-origin" />
          )}

          {/* Zoom controls for images */}
          {activeTab === 'image' && (
            <div className="ref-zoom-controls">
              <button className="ref-zoom-btn" onClick={() => setZoom(z => Math.max(25, z - 25))}>−</button>
              <button className="ref-zoom-btn" style={{ fontSize: 10, width: 'auto', padding: '0 6px' }}>{zoom}%</button>
              <button className="ref-zoom-btn" onClick={() => setZoom(z => Math.min(300, z + 25))}>+</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// 4. Resizable Split Layout Wrapper
// ════════════════════════════════════════════
interface ResizableSplitLayoutProps {
  editor: React.ReactNode;
  panel: React.ReactNode;
  defaultSplit?: number; // 0-100 percent for editor width
}

export function ResizableSplitLayout({ editor, panel, defaultSplit = 55 }: ResizableSplitLayoutProps) {
  const [splitPercent, setSplitPercent] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef(defaultSplit);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);

    // Disable pointer events on ALL iframes to prevent them stealing mouse
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(f => (f.style.pointerEvents = 'none'));

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!containerRef.current || !editorRef.current || !panelRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const pct = Math.max(25, Math.min(75, ((clientX - rect.left) / rect.width) * 100));
      // Direct DOM update — no React re-render
      editorRef.current.style.width = `${pct}%`;
      panelRef.current.style.width = `${100 - pct}%`;
      splitRef.current = pct;
    };

    const onUp = () => {
      setIsDragging(false);
      // Restore pointer events on iframes
      iframes.forEach(f => (f.style.pointerEvents = ''));
      // Commit final value to React state (single re-render)
      setSplitPercent(splitRef.current);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  return (
    <div className="notes-split-layout" ref={containerRef}>
      <div ref={editorRef} className="split-pane split-pane-editor" style={{ width: `${splitPercent}%` }}>
        {editor}
      </div>
      <div
        className={`split-resize-handle ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      />
      <div ref={panelRef} className="split-pane split-pane-panel" style={{ width: `${100 - splitPercent}%` }}>
        {panel}
      </div>
    </div>
  );
}


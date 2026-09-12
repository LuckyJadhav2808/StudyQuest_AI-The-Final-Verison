'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiX, HiPlus, HiPhotograph, HiDocumentText, HiSearch, HiZoomIn, HiZoomOut } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { callAiCompletion, resolveOpenRouterKey } from '@/lib/ai';
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
  const [savedTimestamps, setSavedTimestamps] = useState<string[]>([]);
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
      setSavedTimestamps(prev => prev.includes(ts) ? prev : [...prev, ts]);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '1px solid var(--card-border)', flexShrink: 0 }}>
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

          {/* Scrollable Lecture Timestamps & Quick Bookmarks */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 text-left bg-slate-900/30 dark:bg-[#0c0d1e]/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>⏱️</span> Lecture Timestamps
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {savedTimestamps.length} saved
              </span>
            </div>
            {savedTimestamps.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-slate-500">
                <span className="text-2xl mb-1">⏱️</span>
                <p className="text-[11px] font-medium text-[var(--muted-foreground)]">No timestamps bookmarked yet</p>
                <p className="text-[10px] text-slate-500">Click &quot;Insert Timestamp&quot; to bookmark key lecture moments</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {savedTimestamps.map((ts, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-primary/40 transition-colors"
                  >
                    <button
                      onClick={() => onInsertTimestamp(ts)}
                      className="flex items-center gap-2 text-xs font-mono font-bold text-red-400 hover:text-red-300"
                      title="Insert timestamp into note"
                    >
                      <span>▶ {ts}</span>
                    </button>
                    <button
                      onClick={() => setSavedTimestamps(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-400 text-xs transition-colors"
                      title="Remove timestamp"
                    >
                      <HiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
  selectedText?: string;
  apiKey?: string;
}

export function AITutorPanel({ onClose, onInsertText, noteContent, selectedText, apiKey }: AITutorPanelProps) {
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

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    scrollToBottom();
    setLoading(true);

    try {
      const strippedNotes = noteContent.replace(/<[^>]*>/g, '').slice(0, 2000);
      const systemPrompt = selectedText?.trim()
        ? `You are a friendly study tutor helping a student understand their notes. Focus your explanations and help specifically on this highlighted selection from their notes: "${selectedText.slice(0, 1500)}". Be concise and clear. Use simple language. Here is the full note content for additional context:\n\n${strippedNotes}`
        : `You are a friendly study tutor helping a student understand their notes. Be concise and clear. Use simple language. Here are their current notes for context:\n\n${strippedNotes}`;

      const historyMessages = messages
        .filter(m => m.role === 'user' || m.role === 'ai')
        .slice(-5)
        .map(m => ({ role: (m.role === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user', content: m.content }));

      const result = await callAiCompletion({
        apiKey,
        title: 'StudyQuest Homework Tutor',
        feature: 'notes',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: userMsg },
        ],
      });

      if (result.success && result.content) {
        setMessages(prev => [...prev, { role: 'ai', content: result.content }]);
        scrollToBottom();
      } else {
        toast.error(result.error || 'Failed to get response');
        setMessages(prev => [...prev, { role: 'ai', content: `Sorry, ${result.error || 'something went wrong. Try again!'}` }]);
      }
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
        {selectedText?.trim() && (
          <div className="p-2 mb-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[10px] text-purple-300 leading-relaxed text-left flex flex-col gap-1">
            <span className="font-bold">📖 Focused Selection Active:</span>
            <span className="italic line-clamp-2">"{selectedText}"</span>
          </div>
        )}
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
  onInsertText?: (text: string) => void;
  apiKey?: string;
}

export function ReferenceViewerPanel({ onClose, onInsertText, apiKey }: ReferenceViewerPanelProps) {
  const [activeTab, setActiveTab] = useState<RefType>('image');
  const [refSrc, setRefSrc] = useState<string | null>(null);
  const [refName, setRefName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [zoom, setZoom] = useState(100);
  const [dragging, setDragging] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      setActiveTab('image');
      const reader = new FileReader();
      reader.onload = (e) => { setRefSrc(e.target?.result as string); setRefName(file.name); setOcrResult(null); };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setActiveTab('pdf');
      const url = URL.createObjectURL(file);
      setRefSrc(url);
      setRefName(file.name);
      setOcrResult(null);
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
    setOcrResult(null);
  };

  const clearRef = () => {
    if (refSrc && activeTab === 'pdf') URL.revokeObjectURL(refSrc);
    setRefSrc(null);
    setRefName('');
    setZoom(100);
    setOcrResult(null);
  };

  const handleOCR = async () => {
    if (!refSrc || activeTab !== 'image') return;

    setOcrLoading(true);
    const toastId = toast.loading('Vision AI is reading the image...');

    try {
      const result = await callAiCompletion({
        apiKey,
        title: 'StudyQuest Vision OCR',
        feature: 'ocr',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe all handwritten and printed text from this study slide or textbook image. Format the output cleanly. Return ONLY the transcribed text, with absolutely no introductions, no explanations, no wrappers, and no code blocks.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: refSrc
                }
              }
            ]
          }
        ]
      });

      if (result.success && result.content) {
        setOcrResult(result.content.trim());
        toast.success('Text extracted! 🔍', { id: toastId });
      } else {
        toast.error(result.error || 'Could not extract readable text.', { id: toastId });
      }
    } catch (err: any) {
      console.error('OCR request failed:', err);
      toast.error(`Vision OCR failed: ${err.message || err}`, { id: toastId });
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="multitask-panel">
      <div className="multitask-header">
        <div className="multitask-header-title">
          <span>📄</span> Reference Viewer
          {refName && <span style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600 }}>— {refName.length > 20 ? refName.slice(0, 20) + '...' : refName}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {refSrc && activeTab === 'image' && !ocrResult && (
            <button
              onClick={handleOCR}
              disabled={ocrLoading}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-teal/10 hover:bg-teal/20 text-teal border border-teal/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {ocrLoading ? '⏳ Reading...' : '🔍 Grab Text'}
            </button>
          )}
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
          {ocrResult !== null ? (
            <div className="w-full h-full p-4 flex flex-col gap-3 overflow-hidden bg-slate-900/40 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">🔍 Extracted Text Preview</span>
                <span className="text-[9px] text-slate-500">Edit before inserting</span>
              </div>
              <textarea
                value={ocrResult}
                onChange={(e) => setOcrResult(e.target.value)}
                className="flex-1 w-full p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono leading-relaxed resize-none focus:outline-none focus:border-primary/50"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    if (onInsertText) onInsertText(ocrResult);
                    setOcrResult(null);
                    toast.success('Inserted text into notes! 📝');
                  }}
                >
                  📝 Insert into Notes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(ocrResult);
                    toast.success('Copied to clipboard!');
                  }}
                >
                  📋 Copy
                </Button>
                <button
                  onClick={() => setOcrResult(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// 4. Whiteboard Split Panel (In-Note Sketchpad)
// ════════════════════════════════════════════
interface WhiteboardSplitPanelProps {
  onClose: () => void;
  onInsertDrawing: (dataUrl: string) => void;
}

type WbTool = 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'line' | 'arrow';

interface WbPoint {
  x: number;
  y: number;
}

interface WbStroke {
  points: WbPoint[];
  color: string;
  width: number;
  tool: WbTool;
}

const WB_COLORS = [
  '#0f172a', // Slate 900
  '#7C3AED', // Violet
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#64748B', // Slate 500
];

export function WhiteboardSplitPanel({ onClose, onInsertDrawing }: WhiteboardSplitPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<WbTool>('pen');
  const [color, setColor] = useState('#7C3AED');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokes, setStrokes] = useState<WbStroke[]>([]);
  const [undoStack, setUndoStack] = useState<WbStroke[][]>([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<WbStroke | null>(null);

  // Redraw canvas with HiDPI support
  const redrawAll = useCallback((strokeList: WbStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const s of strokeList) {
      if (s.points.length === 0) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (s.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = s.width * 4;
      } else if (s.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = s.color + '55';
        ctx.lineWidth = s.width * 3;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
      }

      const p0 = s.points[0];
      const p1 = s.points[s.points.length - 1];

      if (s.tool === 'rect') {
        ctx.beginPath();
        ctx.rect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
        ctx.stroke();
      } else if (s.tool === 'circle') {
        const rx = Math.abs(p1.x - p0.x) / 2;
        const ry = Math.abs(p1.y - p0.y) / 2;
        const cx = (p0.x + p1.x) / 2;
        const cy = (p0.y + p1.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      } else if (s.tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        const headLen = s.width * 4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x - headLen * Math.cos(angle - Math.PI / 6), p1.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x - headLen * Math.cos(angle + Math.PI / 6), p1.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else {
        // Freehand
        if (s.points.length === 1) {
          ctx.beginPath();
          ctx.arc(p0.x, p0.y, s.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < s.points.length; i++) {
            const prev = s.points[i - 1];
            const curr = s.points[i];
            const mx = (prev.x + curr.x) / 2;
            const my = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }, []);

  // Initialize and handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawAll(strokes);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [redrawAll, strokes]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): WbPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCanvasCoords(e);
    currentStrokeRef.current = {
      points: [pt],
      color,
      width: strokeWidth,
      tool,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const pt = getCanvasCoords(e);
    currentStrokeRef.current.points.push(pt);

    // Live preview
    redrawAll([...strokes, currentStrokeRef.current]);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    setUndoStack((prev) => [...prev, strokes]);
    setStrokes((prev) => [...prev, finishedStroke]);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes([]);
  };

  const handleExportAndInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) {
      toast.error('Draw something on the canvas first! 🎨');
      return;
    }

    // Create export canvas with clean white background so sketch is easily readable
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return;

    // Fill white background for notes
    expCtx.fillStyle = '#ffffff';
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Render strokes on top of white background
    const origCtx = canvas.getContext('2d');
    if (origCtx) {
      expCtx.drawImage(canvas, 0, 0);
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    onInsertDrawing(dataUrl);
    toast.success('Sketch inserted into notes! 📝✨');
  };

  return (
    <div className="whiteboard-split-panel">
      {/* Header */}
      <div className="multitask-header">
        <div className="multitask-header-title">
          <span>🎨</span> Whiteboard Sketchpad
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => window.open('/whiteboard', '_blank')}
            className="text-[10px] font-bold px-2 py-1 rounded-md border border-[var(--card-border)] hover:border-primary/40 text-[var(--muted-foreground)] hover:text-primary transition-colors"
            title="Open Fullscreen Whiteboard in new tab"
          >
            ↗ Fullscreen
          </button>
          <button className="multitask-close" onClick={onClose} title="Close Whiteboard">
            <HiX size={16} />
          </button>
        </div>
      </div>

      {/* Quick Tool Strip */}
      <div className="whiteboard-split-toolbar">
        {/* Tool Selectors */}
        <div className="flex items-center gap-1">
          {[
            { id: 'pen', label: 'Pen', icon: '✏️' },
            { id: 'highlighter', label: 'Highlighter', icon: '🖍️' },
            { id: 'eraser', label: 'Eraser', icon: '🧹' },
            { id: 'arrow', label: 'Arrow', icon: '➡️' },
            { id: 'rect', label: 'Box', icon: '⬜' },
            { id: 'circle', label: 'Circle', icon: '⭕' },
            { id: 'line', label: 'Line', icon: '📏' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as WbTool)}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                tool === t.id
                  ? 'bg-primary text-white shadow-sm scale-105'
                  : 'bg-[var(--card-border)]/20 hover:bg-[var(--card-border)]/40 text-[var(--foreground)]'
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Color Palette Chips */}
        <div className="flex items-center gap-1">
          {WB_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                if (tool === 'eraser') setTool('pen');
              }}
              style={{ backgroundColor: c }}
              className={`w-4 h-4 rounded-full transition-transform border border-white/20 ${
                color === c && tool !== 'eraser' ? 'scale-125 ring-2 ring-primary ring-offset-1 ring-offset-[var(--card-bg)]' : 'hover:scale-110'
              }`}
            />
          ))}
        </div>

        {/* Stroke Widths */}
        <div className="flex items-center gap-1 bg-[var(--card-border)]/20 p-0.5 rounded-lg">
          {[
            { w: 2, label: 'S' },
            { w: 4, label: 'M' },
            { w: 8, label: 'L' },
          ].map(({ w, label }) => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                strokeWidth === w ? 'bg-primary text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Undo & Clear */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-lg border border-[var(--card-border)] hover:border-primary/40 text-xs disabled:opacity-30 transition-colors"
            title="Undo"
          >
            ↩️
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-lg border border-[var(--card-border)] hover:border-red-400/40 text-xs disabled:opacity-30 transition-colors"
            title="Clear canvas"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Interactive Drawing Canvas */}
      <div ref={containerRef} className="whiteboard-split-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {/* Footer CTA */}
      <div className="whiteboard-split-footer">
        <span className="text-[11px] text-[var(--muted-foreground)]">
          {strokes.length} {strokes.length === 1 ? 'stroke' : 'strokes'} drawn
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={handleExportAndInsert}
          disabled={strokes.length === 0}
          className="shadow-md"
        >
          📝 Insert into Note
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// 5. Resizable Split Layout Wrapper
// ════════════════════════════════════════════
interface ResizableSplitLayoutProps {
  editor: React.ReactNode;
  panel: React.ReactNode;
  defaultSplit?: number; // 0-100 percent for editor width
  onToggleZen?: () => void;
  isZenMode?: boolean;
}

export function ResizableSplitLayout({
  editor,
  panel,
  defaultSplit = 55,
  onToggleZen,
  isZenMode = false,
}: ResizableSplitLayoutProps) {
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
    iframes.forEach((f) => (f.style.pointerEvents = 'none'));

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!containerRef.current || !editorRef.current || !panelRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const pct = Math.max(30, Math.min(70, ((clientX - rect.left) / rect.width) * 100));
      // Direct DOM update — no React re-render
      editorRef.current.style.width = `${pct}%`;
      panelRef.current.style.width = `${100 - pct}%`;
      splitRef.current = pct;
    };

    const onUp = () => {
      setIsDragging(false);
      // Restore pointer events on iframes
      iframes.forEach((f) => (f.style.pointerEvents = ''));
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

  const snapSplit = (pct: number) => {
    setSplitPercent(pct);
    splitRef.current = pct;
    if (editorRef.current && panelRef.current) {
      editorRef.current.style.width = `${pct}%`;
      panelRef.current.style.width = `${100 - pct}%`;
    }
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-1.5 overflow-hidden">
      {/* Split Control Strip */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900/40 border border-[var(--card-border)]/60 text-[11px] text-[var(--muted-foreground)] shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[10px] uppercase tracking-wider">Split View:</span>
          <span className="font-mono text-primary font-bold">{Math.round(splitPercent)}% Notes</span>
          <span>•</span>
          <span className="font-mono">{Math.round(100 - splitPercent)}% Reference</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => snapSplit(50)}
            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold transition-all border ${
              Math.round(splitPercent) === 50
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'border-[var(--card-border)] hover:border-primary/40 text-[var(--foreground)]'
            }`}
            title="Snap to 50/50 equal split"
          >
            50:50
          </button>
          <button
            onClick={() => snapSplit(60)}
            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold transition-all border ${
              Math.round(splitPercent) === 60
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'border-[var(--card-border)] hover:border-primary/40 text-[var(--foreground)]'
            }`}
            title="Snap to 60/40 focus on notes"
          >
            60:40
          </button>
          <button
            onClick={() => snapSplit(70)}
            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold transition-all border ${
              Math.round(splitPercent) === 70
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'border-[var(--card-border)] hover:border-primary/40 text-[var(--foreground)]'
            }`}
            title="Snap to 70/30 wide notes view"
          >
            70:30
          </button>
          <button
            onClick={() => snapSplit(40)}
            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold transition-all border ${
              Math.round(splitPercent) === 40
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'border-[var(--card-border)] hover:border-primary/40 text-[var(--foreground)]'
            }`}
            title="Snap to 40/60 focus on reference"
          >
            40:60
          </button>
          {onToggleZen && (
            <button
              onClick={onToggleZen}
              className={`ml-1 px-2.5 py-0.5 rounded-md font-bold text-[10px] border transition-all flex items-center gap-1 cursor-pointer ${
                isZenMode
                  ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                  : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border-indigo-500/30'
              }`}
              title={isZenMode ? 'Exit full-width focus (Esc)' : 'Expand to full-width focus'}
            >
              <span>{isZenMode ? '🗗 Exit Zen' : '🗖 Zen View'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Resizable Split Container */}
      <div className="notes-split-layout force-horizontal flex-1 min-h-0 h-full overflow-hidden" ref={containerRef}>
        <div
          ref={editorRef}
          className={`split-pane split-pane-editor ${isZenMode ? 'zen-full' : ''}`}
          style={{ width: isZenMode ? '100%' : `${splitPercent}%` }}
        >
          {editor}
        </div>
        {!isZenMode && (
          <>
            <div
              className={`split-resize-handle ${isDragging ? 'dragging' : ''}`}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              title="Drag left/right to resize split panes"
            />
            <div ref={panelRef} className="split-pane split-pane-panel" style={{ width: `${100 - splitPercent}%` }}>
              {panel}
            </div>
          </>
        )}
      </div>
    </div>
  );
}



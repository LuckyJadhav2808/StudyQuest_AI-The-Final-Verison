'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiTrash, HiDownload, HiUpload, HiPlay, HiDatabase, HiPencil } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageTransition from '@/components/layout/PageTransition';

interface DBEntry { name: string; data: number[] | null; }
interface QueryResult { columns: string[]; values: (string | number | null)[][]; }

let initSqlJs: (() => Promise<{ Database: new (data?: ArrayLike<number>) => SqlJsDatabase }>) | null = null;

interface SqlJsDatabase {
  run: (sql: string) => void;
  exec: (sql: string) => QueryResult[];
  export: () => Uint8Array;
  close: () => void;
}

export default function SqlPage() {
  const [databases, setDatabases] = useState<DBEntry[]>([{ name: 'StudentDB', data: null }]);
  const [activeDb, setActiveDb] = useState('StudentDB');
  const [db, setDb] = useState<SqlJsDatabase | null>(null);
  const [query, setQuery] = useState('-- Welcome to SQL Lab!\n-- Try: CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, grade REAL);\n-- Then: INSERT INTO students VALUES (1, \'Alice\', 3.9);\n-- Then: SELECT * FROM students;\n\nSELECT "Hello, SQL Lab!" AS message;');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [showNewDb, setShowNewDb] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [sqlReady, setSqlReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load sql.js
  useEffect(() => {
    (async () => {
      try {
        const SQL = await import('sql.js');
        initSqlJs = () => SQL.default({ locateFile: () => '/sql-wasm.wasm' });
        const sqlPromise = await initSqlJs!();
        const entry = databases.find((d) => d.name === activeDb);
        const newDb = entry?.data ? new sqlPromise.Database(new Uint8Array(entry.data)) : new sqlPromise.Database();
        setDb(newDb);
        setSqlReady(true);
      } catch (err) {
        console.error('sql.js load error', err);
        toast.error('Failed to load SQL engine');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch database
  const switchDb = useCallback(async (name: string) => {
    if (!initSqlJs || name === activeDb) return;
    // Save current DB first
    if (db) {
      const exported = db.export();
      setDatabases((prev) => prev.map((d) => d.name === activeDb ? { ...d, data: Array.from(exported) } : d));
      db.close();
    }
    const entry = databases.find((d) => d.name === name);
    const sqlPromise = await initSqlJs!();
    const newDb = entry?.data ? new sqlPromise.Database(new Uint8Array(entry.data)) : new sqlPromise.Database();
    setDb(newDb);
    setActiveDb(name);
    setResults([]);
    setError('');
    toast.success(`Switched to ${name}`);
  }, [activeDb, db, databases]);

  const runQuery = () => {
    if (!db || !query.trim()) return;
    setError('');
    try {
      const res = db.exec(query);
      setResults(res);
      setHistory((prev) => [query.trim(), ...prev.slice(0, 19)]);
      if (res.length === 0) toast.success('Query executed (no results returned)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(msg);
    }
  };

  const createDb = () => {
    if (!newDbName.trim()) return;
    if (databases.find((d) => d.name === newDbName.trim())) {
      toast.error('Database name already exists');
      return;
    }
    setDatabases((prev) => [...prev, { name: newDbName.trim(), data: null }]);
    toast.success(`Database "${newDbName.trim()}" created!`);
    setNewDbName('');
    setShowNewDb(false);
    switchDb(newDbName.trim());
  };

  const renameDb = () => {
    if (!newDbName.trim()) return;
    setDatabases((prev) => prev.map((d) => d.name === activeDb ? { ...d, name: newDbName.trim() } : d));
    setActiveDb(newDbName.trim());
    toast.success('Database renamed');
    setNewDbName('');
    setShowRename(false);
  };

  const deleteDb = () => {
    if (databases.length <= 1) { toast.error("Can't delete the last database"); return; }
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Delete &quot;{activeDb}&quot;?</span>
        <button onClick={() => {
          const remaining = databases.filter((d) => d.name !== activeDb);
          setDatabases(remaining);
          if (db) db.close();
          setDb(null);
          switchDb(remaining[0].name);
          toast.dismiss(t.id);
          toast.success('Database deleted');
        }} className="px-3 py-1 bg-[#FF6B6B] text-white rounded-lg text-xs font-bold">Yes</button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">No</button>
      </div>
    ), { duration: 5000 });
  };

  const exportSql = () => {
    if (!db) return;
    const exported = db.export();
    const blob = new Blob([exported.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDb}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Database exported!');
  };

  const importSql = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initSqlJs) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const sqlPromise = await initSqlJs!();
        if (db) db.close();
        const newDb = new sqlPromise.Database(data);
        setDb(newDb);
        toast.success(`Imported "${file.name}"!`);
      } catch {
        toast.error('Invalid SQL file');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Get schema info
  const getSchema = (): string => {
    if (!db) return 'Loading...';
    try {
      const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      if (tables.length === 0 || tables[0].values.length === 0) return 'No tables yet.\nRun CREATE TABLE to get started.';
      return tables[0].values.map((row) => {
        const tableName = row[0] as string;
        const cols = db.exec(`PRAGMA table_info('${tableName}');`);
        const colInfo = cols[0]?.values.map((c) => `  ${c[1]} ${c[2]}`).join('\n') || '';
        return `📋 ${tableName}\n${colInfo}`;
      }).join('\n\n');
    } catch { return 'Error reading schema'; }
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              <HiDatabase className="text-primary" /> SQL Lab
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">Create databases, run queries, and export your work — all in the browser.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* DB Switcher */}
            <select
              value={activeDb}
              onChange={(e) => switchDb(e.target.value)}
              className="px-3 py-2 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-heading font-bold focus:border-primary focus:outline-none"
            >
              {databases.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <Button variant="teal" size="sm" icon={<HiPlus />} onClick={() => { setNewDbName(''); setShowNewDb(true); }}>New DB</Button>
            <Button variant="primary" size="sm" icon={<HiDownload />} onClick={exportSql}>Export .sql</Button>
            <Button variant="amber" size="sm" icon={<HiUpload />} onClick={() => fileRef.current?.click()}>Import .sql</Button>
            <Button variant="ghost" size="sm" icon={<HiPencil />} onClick={() => { setNewDbName(activeDb); setShowRename(true); }}>Rename</Button>
            <Button variant="coral" size="sm" icon={<HiTrash />} onClick={deleteDb}>Delete</Button>
            <input ref={fileRef} type="file" accept=".sql,.db,.sqlite" className="hidden" onChange={importSql} />
          </div>
        </div>

        {!sqlReady ? (
          <Card padding="lg" hover={false}><div className="text-center py-8"><motion.div className="text-4xl mb-3" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>⚙️</motion.div><p className="text-sm font-semibold">Loading SQL engine...</p></div></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Editor + Results */}
            <div className="lg:col-span-2 space-y-3">
              <Card padding="none" hover={false}>
                <div className="flex items-center justify-between px-4 py-2 border-b-2 border-[var(--card-border)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Query Editor</span>
                    <Badge variant="teal" size="sm">{activeDb}</Badge>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setQuery('')} icon={<HiTrash size={14} />}>Clear</Button>
                    <Button variant="primary" size="sm" onClick={runQuery} icon={<HiPlay size={14} />}>Run (Ctrl+Enter)</Button>
                  </div>
                </div>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full min-h-[200px] p-4 bg-transparent resize-none outline-none text-sm leading-relaxed"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  placeholder="Write your SQL query..."
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); runQuery(); } }}
                />
              </Card>

              {/* Results */}
              <Card padding="none" hover={false}>
                <div className="px-4 py-2 border-b-2 border-[var(--card-border)]">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted-foreground)]">Results</span>
                </div>
                <div className="p-4 overflow-x-auto min-h-[120px]">
                  {error ? (
                    <p className="text-sm text-coral font-semibold">❌ {error}</p>
                  ) : results.length === 0 ? (
                    <p className="text-xs text-[var(--muted-foreground)]" style={{ fontFamily: 'var(--font-mono)' }}>Run a query to see results...</p>
                  ) : (
                    results.map((r, ri) => (
                      <div key={ri} className="mb-4">
                        <table className="w-full text-xs border-collapse" style={{ fontFamily: 'var(--font-mono)' }}>
                          <thead>
                            <tr>
                              {r.columns.map((col, ci) => (
                                <th key={ci} className="text-left px-3 py-2 bg-primary/10 border-2 border-[var(--card-border)] font-heading font-bold text-primary text-[10px] uppercase tracking-wider">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {r.values.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-primary/5 transition-colors">
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="px-3 py-1.5 border border-[var(--card-border)]/50 text-sm">{cell === null ? <span className="text-[var(--muted-foreground)] italic">NULL</span> : String(cell)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-1 font-semibold">{r.values.length} row{r.values.length !== 1 ? 's' : ''} returned</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-3">
              <Card padding="md" hover={false}>
                <h3 className="text-xs font-heading font-bold mb-2 flex items-center gap-1.5"><HiDatabase className="text-primary" size={14} /> Schema</h3>
                <pre className="text-[10px] text-[var(--muted-foreground)] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'var(--font-mono)' }}>{getSchema()}</pre>
              </Card>

              <Card padding="md" hover={false}>
                <h3 className="text-xs font-heading font-bold mb-2">History</h3>
                {history.length === 0 ? (
                  <p className="text-[10px] text-[var(--muted-foreground)]">No queries yet.</p>
                ) : (
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {history.map((q, i) => (
                      <button key={i} onClick={() => setQuery(q)} className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-mono truncate hover:bg-primary/10 transition-colors">{q}</button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Modals */}
        <Modal isOpen={showNewDb} onClose={() => setShowNewDb(false)} title="Create New Database">
          <div className="space-y-4">
            <Input label="Database Name" placeholder="e.g. MyProject" value={newDbName} onChange={(e) => setNewDbName(e.target.value)} />
            <div className="flex gap-2"><Button variant="ghost" onClick={() => setShowNewDb(false)} className="flex-1">Cancel</Button><Button variant="primary" onClick={createDb} className="flex-1">Create</Button></div>
          </div>
        </Modal>
        <Modal isOpen={showRename} onClose={() => setShowRename(false)} title="Rename Database">
          <div className="space-y-4">
            <Input label="New Name" value={newDbName} onChange={(e) => setNewDbName(e.target.value)} />
            <div className="flex gap-2"><Button variant="ghost" onClick={() => setShowRename(false)} className="flex-1">Cancel</Button><Button variant="primary" onClick={renameDb} className="flex-1">Rename</Button></div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  HiSparkles, HiLightningBolt, HiKey, HiRefresh, HiCheckCircle,
  HiExclamationCircle, HiTrendingUp, HiEye, HiOutlineChartBar,
} from 'react-icons/hi';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SystemAiUsageDoc } from '@/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

const GEMINI_DAILY_LIMIT = 1500;

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminAiUsage() {
  const [loading, setLoading] = useState(true);
  const [todayDoc, setTodayDoc] = useState<SystemAiUsageDoc | null>(null);
  const [history, setHistory] = useState<SystemAiUsageDoc[]>([]);

  const fetchAiUsage = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = getTodayString();
      const todayRef = doc(db, 'systemAiUsage', todayStr);
      const todaySnap = await getDoc(todayRef);

      if (todaySnap.exists()) {
        setTodayDoc(todaySnap.data() as SystemAiUsageDoc);
      } else {
        setTodayDoc({
          date: todayStr,
          totalRequests: 0,
          systemTierRequests: 0,
          customTierRequests: 0,
          features: { chat: 0, dsa: 0, notes: 0, quiz: 0, code: 0, ocr: 0, other: 0 },
          providers: { gemini: 0, openrouter: 0, groq: 0 },
          updatedAt: Date.now(),
        });
      }

      // Fetch last 14 days history
      const historyQuery = query(
        collection(db, 'systemAiUsage'),
        orderBy('date', 'desc'),
        limit(14)
      );
      const historySnap = await getDocs(historyQuery);
      const logs: SystemAiUsageDoc[] = [];
      historySnap.forEach((d) => {
        logs.push(d.data() as SystemAiUsageDoc);
      });
      setHistory(logs);
    } catch (err) {
      console.error('[Admin AI Usage] Fetch error:', err);
      toast.error('Failed to load AI usage metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAiUsage();
  }, [fetchAiUsage]);

  const totalToday = todayDoc?.totalRequests || 0;
  const systemToday = todayDoc?.systemTierRequests || 0;
  const customToday = todayDoc?.customTierRequests || 0;
  const remainingGemini = Math.max(0, GEMINI_DAILY_LIMIT - systemToday);
  const geminiUsagePercent = Math.min(100, Math.round((systemToday / GEMINI_DAILY_LIMIT) * 100));

  const features = todayDoc?.features || { chat: 0, dsa: 0, notes: 0, quiz: 0, code: 0, ocr: 0, other: 0 };
  const providers = todayDoc?.providers || { gemini: 0, openrouter: 0, groq: 0 };

  const featureList = [
    { label: 'Questie Chat', count: features.chat, icon: '🦉', color: 'bg-indigo-500' },
    { label: 'DSA Assistant & Hints', count: features.dsa, icon: '⚔️', color: 'bg-emerald-500' },
    { label: 'Notes Brew & Summarizer', count: features.notes, icon: '📜', color: 'bg-amber-500' },
    { label: 'Quiz & Trivia Generator', count: features.quiz, icon: '🎯', color: 'bg-purple-500' },
    { label: 'Code IDE Assistant', count: features.code, icon: '💻', color: 'bg-cyan-500' },
    { label: 'Vision OCR (Math/Slides)', count: features.ocr, icon: '👁️', color: 'bg-pink-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-heading font-bold text-[var(--foreground)] flex items-center gap-2">
              <HiSparkles className="text-primary" /> StudyQuest AI Live Telemetry & Quotas
            </h2>
            <Badge variant="teal" size="sm">Zero Setup Active</Badge>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Real-time monitoring of system AI calls, student personal keys, and Google Gemini daily quota consumption.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAiUsage}
          loading={loading}
          icon={<HiRefresh />}
        >
          Refresh Telemetry
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gemini Free Quota Card */}
        <Card hover className="relative overflow-hidden border-2 border-teal/30 bg-teal/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-teal font-semibold uppercase tracking-wider">Gemini Daily Quota</p>
              <p className="text-2xl font-heading font-bold text-[var(--foreground)] mt-1">
                {systemToday} <span className="text-xs font-normal text-[var(--muted-foreground)]">/ {GEMINI_DAILY_LIMIT}</span>
              </p>
              <p className="text-[11px] text-teal font-medium mt-1">
                {remainingGemini.toLocaleString()} free calls remaining
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal/20 text-teal flex items-center justify-center text-xl">
              ⚡
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                geminiUsagePercent > 85 ? 'bg-red-500' : geminiUsagePercent > 60 ? 'bg-amber-400' : 'bg-teal'
              }`}
              style={{ width: `${geminiUsagePercent}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--muted-foreground)] mt-1 block">
            {geminiUsagePercent}% of Google AI Studio free tier used today
          </span>
        </Card>

        {/* Total Today Requests */}
        <Card hover className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Total Calls Today</p>
              <p className="text-2xl font-heading font-bold text-[var(--foreground)] mt-1">
                {loading ? '…' : totalToday}
              </p>
              <p className="text-[11px] text-primary font-medium mt-1 flex items-center gap-1">
                <HiTrendingUp /> Active across all features
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xl">
              📊
            </div>
          </div>
        </Card>

        {/* System vs Custom Split */}
        <Card hover className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Tier Distribution</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-heading font-bold text-teal">{systemToday}</span>
                <span className="text-xs text-[var(--muted-foreground)]">System</span>
                <span className="text-xs text-[var(--muted-foreground)]">•</span>
                <span className="text-xl font-heading font-bold text-purple-400">{customToday}</span>
                <span className="text-xs text-[var(--muted-foreground)]">Custom</span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                {totalToday > 0 ? Math.round((systemToday / totalToday) * 100) : 100}% served via platform key
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center text-xl">
              🔑
            </div>
          </div>
        </Card>

        {/* Provider Health Status */}
        <Card hover className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Provider Health</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-heading font-bold text-emerald-400">Operational</span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                Primary: Gemini 2.0 Flash ({providers.gemini})<br />
                Failover: OpenRouter ({providers.openrouter}) • Groq ({providers.groq})
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xl">
              🛡️
            </div>
          </div>
        </Card>
      </div>

      {/* Feature Breakdown & Provider Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage Breakdown */}
        <Card padding="lg" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-bold flex items-center gap-2">
              <HiOutlineChartBar className="text-primary" /> Feature Volume Breakdown Today
            </h3>
            <span className="text-xs text-[var(--muted-foreground)] font-mono">{totalToday} total</span>
          </div>

          <div className="space-y-3">
            {featureList.map((item) => {
              const pct = totalToday > 0 ? Math.round((item.count / totalToday) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span>{item.icon}</span> {item.label}
                    </span>
                    <span className="font-mono font-bold text-[var(--foreground)]">
                      {item.count} <span className="text-[10px] font-normal text-[var(--muted-foreground)]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--card-border)] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, item.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Server Waterfall & Provider Health */}
        <Card padding="lg" hover={false}>
          <h3 className="text-sm font-heading font-bold flex items-center gap-2 mb-4">
            <HiLightningBolt className="text-teal" /> Multi-Tier Waterfall Architecture
          </h3>

          <div className="space-y-3">
            {/* Primary Tier */}
            <div className="p-3 rounded-xl border border-teal/30 bg-teal/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal/20 text-teal flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--foreground)]">Google Gemini 2.0 Flash</span>
                    <Badge variant="teal" size="sm">Primary</Badge>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Native Multimodal Vision & Text • 1,500 reqs/day free limit • 15 RPM
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-teal">{providers.gemini} served</span>
            </div>

            {/* Secondary Tier */}
            <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--foreground)]">OpenRouter Free Waterfall</span>
                    <Badge variant="primary" size="sm">Fallback</Badge>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Gemini Flash Lite • Llama 3.3 70B Free • Automated Failover
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-purple-400">{providers.openrouter} served</span>
            </div>

            {/* Tertiary Tier */}
            <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--foreground)]">Groq Cloud (Llama 3.3 70B)</span>
                    <Badge variant="teal" size="sm">Tertiary</Badge>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Ultra-fast inference for text queries and Socratic explanations
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-sky-400">{providers.groq} served</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Historical Logs Table */}
      <Card padding="none" hover={false} className="overflow-hidden">
        <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-heading font-bold">14-Day Daily AI Request History</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Chronological aggregate log of student AI activity</p>
          </div>
          <span className="text-xs text-[var(--muted-foreground)] font-mono">{history.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--card-bg)] text-[var(--muted-foreground)] uppercase tracking-wider text-[10px] border-b border-[var(--card-border)]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total Requests</th>
                <th className="px-4 py-3">System Tier (Free)</th>
                <th className="px-4 py-3">Custom Keys</th>
                <th className="px-4 py-3">Top Features</th>
                <th className="px-4 py-3">Quota Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                    No historical logs recorded yet. Logs will automatically populate as students interact with AI.
                  </td>
                </tr>
              ) : (
                history.map((log) => {
                  const systemCount = log.systemTierRequests || 0;
                  const pct = Math.round((systemCount / GEMINI_DAILY_LIMIT) * 100);
                  const isSafe = pct < 75;

                  return (
                    <tr key={log.date} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--foreground)]">
                        {log.date}
                        {log.date === getTodayString() && (
                          <Badge variant="teal" size="sm" className="ml-2">Today</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-heading font-bold text-primary">
                        {log.totalRequests || 0}
                      </td>
                      <td className="px-4 py-3 font-mono text-teal">
                        {systemCount}
                      </td>
                      <td className="px-4 py-3 font-mono text-purple-400">
                        {log.customTierRequests || 0}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        Chat: {log.features?.chat || 0} • DSA: {log.features?.dsa || 0} • Notes: {log.features?.notes || 0} • Quiz: {log.features?.quiz || 0}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isSafe ? 'teal' : 'coral'} size="sm">
                          {systemCount} / {GEMINI_DAILY_LIMIT} ({pct}%)
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

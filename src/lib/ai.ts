/**
 * StudyQuest AI — Unified AI Engine & Proxy Client
 * Provides zero-friction, multi-tier AI completions for all features:
 * (Questie Chat, DSA Tutor, Quiz Generator, Vision OCR, Code Assistant, Notes Brew, etc.)
 *
 * Defaults to Free System Tier (Gemini 2.0 Flash / OpenRouter free / Groq)
 * Supports optional Custom API Key for power users.
 */

import { auth } from './firebase';

export const AI_MODELS = {
  PRIMARY: 'google/gemini-2.0-flash-001',
  FAST: 'google/gemini-2.0-flash-lite-001',
  STANDARD: 'google/gemini-flash-1.5',
  FREE_FALLBACK: 'meta-llama/llama-3.3-70b-instruct:free',
} as const;

export type AiFeatureType = 'chat' | 'dsa' | 'notes' | 'quiz' | 'code' | 'ocr' | 'other';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export interface AiCompletionOptions {
  messages: AiChatMessage[];
  apiKey?: string | null;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
  title?: string;
  feature?: AiFeatureType;
  uid?: string | null;
  onToken?: (token: string, full: string) => void;
}

export interface AiCompletionResult {
  success: boolean;
  content: string;
  modelUsed?: string;
  provider?: string;
  quota?: { used: number; limit: number };
  quotaExceeded?: boolean;
  error?: string;
}

/**
 * Returns current AI operating mode ('system' by default, or 'custom')
 */
export function getAiMode(): 'system' | 'custom' {
  if (typeof window !== 'undefined') {
    const mode = localStorage.getItem('studyquest_ai_mode');
    if (mode === 'custom') return 'custom';
  }
  return 'system';
}

/**
 * Resolves the active AI key.
 * In System Mode: returns 'system' (truthy) so AI is available immediately.
 * In Custom Mode: returns the student's personal OpenRouter key.
 */
export function resolveOpenRouterKey(userKey?: string | null): string | null {
  const mode = getAiMode();
  if (mode === 'custom') {
    if (userKey && typeof userKey === 'string' && userKey.trim().length > 5) {
      return userKey.trim();
    }
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('studyquest_openrouter_key');
      if (local && local.trim().length > 5) return local.trim();
    }
    return null;
  }
  // System mode: Platform provides free AI tier
  return 'system';
}

/**
 * Resolves any custom key the user may have saved (even if currently in system mode)
 */
export function getCustomApiKey(userKey?: string | null): string | null {
  if (userKey && typeof userKey === 'string' && userKey.trim().length > 5) {
    return userKey.trim();
  }
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('studyquest_openrouter_key');
    if (local && local.trim().length > 5) return local.trim();
  }
  return null;
}

/**
 * Executes an AI completion request.
 * Automatically delegates to the secure `/api/ai/completion` server proxy,
 * tracking daily quota (40 calls/day for system tier) and providing multi-tier fallbacks.
 */
export async function callAiCompletion(options: AiCompletionOptions): Promise<AiCompletionResult> {
  const mode = getAiMode();
  const customKey = getCustomApiKey(options.apiKey);
  const activeUid = options.uid || auth.currentUser?.uid || null;

  // Determine if using custom key or system tier
  const isUsingCustom = mode === 'custom' && Boolean(customKey);

  // If in custom mode but no key entered, notify user
  if (mode === 'custom' && !customKey) {
    return {
      success: false,
      content: '',
      error: 'Custom API Key mode is active, but no OpenRouter key was found. Please add your key in Settings (⚙️) or switch back to the Free StudyQuest AI tier.',
    };
  }

  try {
    const res = await fetch('/api/ai/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: options.messages,
        model: options.model,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        response_format: options.response_format,
        title: options.title,
        feature: options.feature || 'other',
        userApiKey: isUsingCustom ? customKey : null,
        uid: activeUid,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // If 429 daily quota exceeded
      if (res.status === 429) {
        return {
          success: false,
          content: '',
          quotaExceeded: true,
          error: data.error || 'Daily free AI limit reached (40/40 requests). Resets at midnight!',
        };
      }

      // Fallback: If custom key was used and server route failed, try direct client OpenRouter call
      if (isUsingCustom && customKey) {
        return callDirectOpenRouter(customKey, options);
      }

      return {
        success: false,
        content: '',
        error: data.error || `AI completion failed (HTTP ${res.status}).`,
      };
    }

    if (data.success && typeof data.content === 'string') {
      return {
        success: true,
        content: data.content,
        modelUsed: data.modelUsed,
        provider: data.provider,
        quota: data.quota,
      };
    }

    return {
      success: false,
      content: '',
      error: data.error || 'Empty response received from AI engine.',
    };
  } catch (err: any) {
    console.warn('[AI Client] Route fetch error, attempting direct client fallback if custom key available:', err);

    // If client network fails to reach local route and user has custom key, fall back to direct OpenRouter
    if (isUsingCustom && customKey) {
      return callDirectOpenRouter(customKey, options);
    }

    return {
      success: false,
      content: '',
      error: err?.message || 'Network error connecting to StudyQuest AI.',
    };
  }
}

/**
 * Direct client-side OpenRouter fallback (used only when user configured a custom key)
 */
async function callDirectOpenRouter(apiKey: string, options: AiCompletionOptions): Promise<AiCompletionResult> {
  const requestedModel = options.model || AI_MODELS.PRIMARY;
  const modelsToTry = [
    requestedModel,
    AI_MODELS.PRIMARY,
    AI_MODELS.STANDARD,
    AI_MODELS.FAST,
    AI_MODELS.FREE_FALLBACK,
  ];

  let lastError = 'Failed to generate AI response.';

  for (const model of modelsToTry) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://studyquest.ai',
          'X-Title': options.title || 'StudyQuest AI',
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 1500,
          response_format: options.response_format,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
        lastError = errMsg;
        if (res.status === 401) {
          return {
            success: false,
            content: '',
            error: 'Invalid OpenRouter API Key. Please verify your key in Settings.',
          };
        }
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === 'string') {
        return {
          success: true,
          content: content.trim(),
          modelUsed: model,
          provider: 'openrouter_direct',
        };
      }
    } catch (err: any) {
      lastError = err?.message || 'Network error connecting to OpenRouter.';
    }
  }

  return {
    success: false,
    content: '',
    error: lastError,
  };
}

/**
 * Parses JSON safely from an AI response, stripping any surrounding ```json codeblocks.
 */
export function parseAiJsonResponse<T = any>(rawText: string): T | null {
  if (!rawText) return null;
  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to locate JSON object or array in the text
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

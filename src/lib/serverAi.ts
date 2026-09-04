/**
 * StudyQuest AI — Server-Side AI Execution Engine
 * Handles multi-provider waterfall execution, quota checks, and telemetry logging.
 * Used by /api/ai/completion and internal server routes like /api/dsa/generate-approaches.
 */

import { db } from './firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

export const DAILY_SYSTEM_QUOTA = 40;

export interface ServerAiPayload {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
  title?: string;
  feature?: 'chat' | 'dsa' | 'notes' | 'quiz' | 'code' | 'ocr' | 'other';
  userApiKey?: string | null;
  uid?: string | null;
}

export interface ServerAiResult {
  success: boolean;
  content?: string;
  modelUsed?: string;
  provider?: string;
  quota?: { used: number; limit: number };
  quotaExceeded?: boolean;
  unconfigured?: boolean;
  error?: string;
  status?: number;
}

function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hasMultimodalContent(messages: ServerAiPayload['messages']): boolean {
  return messages.some((m) => {
    if (Array.isArray(m.content)) {
      return m.content.some((item) => item.type === 'image_url' || !!item.image_url);
    }
    return false;
  });
}

function cleanAiOutput(text: string): string {
  if (!text) return '';
  // Strip <think>...</think> reasoning blocks if present (from models like Qwen or DeepSeek)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return cleaned;
}

export async function executeServerAiCompletion(payload: ServerAiPayload): Promise<ServerAiResult> {
  const {
    messages,
    temperature = 0.7,
    max_tokens = 2048,
    response_format,
    title = 'StudyQuest AI',
    feature = 'other',
    userApiKey,
    uid,
  } = payload;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { success: false, error: 'Messages array is required.', status: 400 };
  }

  const isCustomKey = Boolean(userApiKey && typeof userApiKey === 'string' && userApiKey.trim().length > 5);
  const today = getTodayKey();
  let currentUsageCount = 0;

  // 1. Quota Check for System Key users (with 1.5s fast timeout to prevent network latency from blocking AI)
  if (!isCustomKey && uid && typeof uid === 'string') {
    try {
      const quotaPromise = (async () => {
        const usageRef = doc(db, 'users', uid, 'aiUsage', today);
        return await getDoc(usageRef);
      })();

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
      const usageSnap = await Promise.race([quotaPromise, timeoutPromise]);

      if (usageSnap && usageSnap.exists()) {
        currentUsageCount = usageSnap.data().count || 0;
        if (currentUsageCount >= DAILY_SYSTEM_QUOTA) {
          return {
            success: false,
            error: `Daily free AI limit reached (${DAILY_SYSTEM_QUOTA}/${DAILY_SYSTEM_QUOTA} requests used today). Resets at midnight. You can switch to a custom API key in Settings (⚙️) for unlimited requests.`,
            quotaExceeded: true,
            quota: { used: currentUsageCount, limit: DAILY_SYSTEM_QUOTA },
            status: 429,
          };
        }
      }
    } catch (quotaErr) {
      console.warn('[Server AI] Quota check warning (proceeding):', quotaErr);
    }
  }

  // 2. Custom User Key execution (via OpenRouter)
  if (isCustomKey) {
    const customKey = userApiKey!.trim();
    const openRouterRes = await callOpenRouter({
      apiKey: customKey,
      messages,
      model: payload.model || 'google/gemini-2.5-flash',
      temperature,
      max_tokens,
      response_format,
      title,
    });

    if (openRouterRes.success && openRouterRes.content) {
      logTelemetry({ isCustom: true, feature, provider: 'openrouter', today, uid }).catch(console.warn);
      return {
        success: true,
        content: cleanAiOutput(openRouterRes.content),
        modelUsed: openRouterRes.modelUsed,
        provider: 'custom_openrouter',
      };
    }

    return {
      success: false,
      error: openRouterRes.error || 'Failed with custom API key.',
      status: 502,
    };
  }

  // 3. System Multi-Provider Waterfall Execution
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY?.trim();

  const isMultimodal = hasMultimodalContent(messages);
  let finalContent = '';
  let usedModel = '';
  let usedProvider = '';
  let lastError = '';

  // Step A: Primary — Google Gemini Native REST (Multimodal + Text, Gemini 3.6 Flash / Flash Latest)
  if (geminiKey) {
    const geminiModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.5-flash-lite'];

    for (const m of geminiModels) {
      const geminiRes = await callGeminiNative({
        apiKey: geminiKey,
        messages,
        model: m,
        temperature,
        max_tokens,
        response_format,
      });

      if (geminiRes.success && geminiRes.content) {
        finalContent = cleanAiOutput(geminiRes.content);
        usedModel = m;
        usedProvider = 'gemini';
        break;
      } else {
        lastError = geminiRes.error || `Gemini ${m} failed`;
      }
    }
  }

  // Step B: Secondary — Groq Cloud (Ultra-fast, Llama 3.3 / GPT-OSS 120B / Qwen 3.6 27B) — text only
  if (!finalContent && groqKey && !isMultimodal) {
    const groqModels = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b'];

    for (const m of groqModels) {
      const groqRes = await callGroq({
        apiKey: groqKey,
        messages,
        model: m,
        temperature,
        max_tokens,
        response_format,
      });

      if (groqRes.success && groqRes.content) {
        finalContent = cleanAiOutput(groqRes.content);
        usedModel = m;
        usedProvider = 'groq';
        break;
      } else {
        lastError = groqRes.error || `Groq ${m} failed`;
      }
    }
  }

  // Step C: Tertiary — OpenRouter Free Models
  if (!finalContent && openRouterKey) {
    const openRouterModels = [
      'nvidia/nemotron-3.5-lightning:free',
      'inclusionai/ling-3.0-flash-fin:free',
      'liquid/lfm-2.5-2.6b:free',
    ];

    for (const m of openRouterModels) {
      const orRes = await callOpenRouter({
        apiKey: openRouterKey,
        messages,
        model: m,
        temperature,
        max_tokens,
        response_format,
        title,
      });

      if (orRes.success && orRes.content) {
        finalContent = cleanAiOutput(orRes.content);
        usedModel = m;
        usedProvider = 'openrouter';
        break;
      } else {
        lastError = orRes.error || `OpenRouter ${m} failed`;
      }
    }
  }

  // If no provider succeeded or no system keys configured
  if (!finalContent) {
    if (!geminiKey && !openRouterKey && !groqKey) {
      return {
        success: false,
        error: 'StudyQuest AI System key is not configured. Please add GEMINI_API_KEY or OPENROUTER_API_KEY to your server environment, or add your personal API key in Settings (⚙️).',
        unconfigured: true,
        status: 503,
      };
    }

    return {
      success: false,
      error: lastError || 'All AI providers are currently busy. Please retry in a few seconds.',
      status: 502,
    };
  }

  // 4. Update Quotas & Analytics Telemetry
  if (uid && typeof uid === 'string') {
    recordUserQuota(uid, today).catch(console.warn);
  }
  logTelemetry({ isCustom: false, feature, provider: usedProvider, today, uid }).catch(console.warn);

  return {
    success: true,
    content: finalContent,
    modelUsed: usedModel,
    provider: usedProvider,
    quota: {
      used: currentUsageCount + 1,
      limit: DAILY_SYSTEM_QUOTA,
    },
  };
}

// ──────────────── Provider Helper Functions ────────────────

/**
 * Google Gemini Native REST generateContent Endpoint
 * Supports Multimodal Vision (base64 image URLs mapped to inlineData),
 * system instruction, and responseMimeType.
 */
async function callGeminiNative(params: {
  apiKey: string;
  messages: ServerAiPayload['messages'];
  model: string;
  temperature: number;
  max_tokens: number;
  response_format?: { type: 'json_object' };
}) {
  try {
    const systemMessage = params.messages.find((m) => m.role === 'system');
    const nonSystemMessages = params.messages.filter((m) => m.role !== 'system');

    const contents = nonSystemMessages.map((m) => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      if (typeof m.content === 'string') {
        return { role, parts: [{ text: m.content }] };
      }
      // Multimodal array parts (text + base64 image_url)
      const parts = m.content.map((part) => {
        if (part.type === 'image_url' && part.image_url?.url) {
          const url = part.image_url.url;
          const match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            return { inlineData: { mimeType: match[1], data: match[2] } };
          }
        }
        return { text: part.text || '' };
      });
      return { role, parts };
    });

    const generationConfig: Record<string, any> = {
      temperature: params.temperature,
      maxOutputTokens: params.max_tokens,
    };

    if (params.response_format?.type === 'json_object') {
      generationConfig.responseMimeType = 'application/json';
    }

    const reqBody: Record<string, any> = {
      contents,
      generationConfig,
    };

    if (systemMessage && typeof systemMessage.content === 'string') {
      reqBody.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Gemini HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find((p: any) => p.text)?.text;

    if (typeof textPart === 'string' && textPart.trim()) {
      return { success: true, content: textPart.trim() };
    }
    return { success: false, error: 'Empty text returned from Gemini' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error with Gemini' };
  }
}

/**
 * Groq Cloud Completion Client
 */
async function callGroq(params: {
  apiKey: string;
  messages: ServerAiPayload['messages'];
  model: string;
  temperature: number;
  max_tokens: number;
  response_format?: { type: 'json_object' };
}) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        response_format: params.response_format,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Groq HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return { success: true, content: content.trim() };
    }
    return { success: false, error: 'Empty content from Groq' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Groq connection error' };
  }
}

/**
 * OpenRouter Completion Client
 */
async function callOpenRouter(params: {
  apiKey: string;
  messages: ServerAiPayload['messages'];
  model: string;
  temperature: number;
  max_tokens: number;
  response_format?: { type: 'json_object' };
  title: string;
}) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
        'HTTP-Referer': 'https://studyquest.ai',
        'X-Title': params.title,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        response_format: params.response_format,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson?.error?.message || `HTTP ${res.status}`;
      return { success: false, error: msg };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return { success: true, content: content.trim(), modelUsed: params.model };
    }
    return { success: false, error: 'Empty response from OpenRouter' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'OpenRouter connection error' };
  }
}

async function recordUserQuota(uid: string, today: string) {
  try {
    const userUsageRef = doc(db, 'users', uid, 'aiUsage', today);
    await setDoc(
      userUsageRef,
      {
        count: increment(1),
        lastUsedAt: Date.now(),
        date: today,
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[Server AI] Failed to increment user quota:', e);
  }
}

async function logTelemetry(opts: {
  isCustom: boolean;
  feature: ServerAiPayload['feature'];
  provider: string;
  today: string;
  uid?: string | null;
}) {
  try {
    const systemUsageRef = doc(db, 'systemAiUsage', opts.today);
    const featureKey = opts.feature || 'other';
    const providerKey = opts.provider || 'gemini';

    await setDoc(
      systemUsageRef,
      {
        date: opts.today,
        totalRequests: increment(1),
        systemTierRequests: opts.isCustom ? increment(0) : increment(1),
        customTierRequests: opts.isCustom ? increment(1) : increment(0),
        [`features.${featureKey}`]: increment(1),
        [`providers.${providerKey}`]: increment(1),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[Server AI] Failed to update telemetry:', e);
  }
}

/**
 * StudyQuest AI — Chrome Built-in AI (Gemini Nano) Client Service
 * Interacts with Chrome's on-device Web WICG Prompt API (window.ai.languageModel)
 * Provides 0ms latency, 100% offline privacy, and $0 cloud cost.
 */

export type GeminiNanoAvailability = 'readily' | 'after-download' | 'no' | 'unsupported';

export interface GeminiNanoCapabilities {
  available: GeminiNanoAvailability;
  defaultTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

export const PREFER_NANO_KEY = 'studyquest_prefer_gemini_nano';

/**
 * Check if the user's browser has Chrome Built-in AI (Gemini Nano) enabled
 */
export async function getGeminiNanoCapabilities(): Promise<GeminiNanoCapabilities> {
  if (typeof window === 'undefined') {
    return { available: 'unsupported' };
  }

  const ai = (window as any).ai;
  if (!ai || !ai.languageModel) {
    return { available: 'no' };
  }

  try {
    const caps = await ai.languageModel.capabilities();
    return {
      available: caps.available as GeminiNanoAvailability,
      defaultTemperature: caps.defaultTemperature,
      defaultTopK: caps.defaultTopK,
      maxTopK: caps.maxTopK,
    };
  } catch (err) {
    console.warn('[Gemini Nano] Error checking capabilities:', err);
    return { available: 'no' };
  }
}

/**
 * Returns true if the user has enabled the toggle in Settings
 * (Default is true if Gemini Nano is available on the device)
 */
export function isGeminiNanoPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(PREFER_NANO_KEY);
  if (saved === null) return false; // Default to disabled (Cloud AI primary)
  return saved === 'true';
}

export function setGeminiNanoPreferred(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFER_NANO_KEY, enabled ? 'true' : 'false');
}

/**
 * Run a prompt through Chrome's on-device Gemini Nano session
 */
export async function promptGeminiNano(
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    topK?: number;
    onStream?: (chunk: string) => void;
  }
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Gemini Nano is only available in the browser.');
  }

  const ai = (window as any).ai;
  if (!ai || !ai.languageModel) {
    throw new Error('Chrome Built-in AI is not available in this browser.');
  }

  let session: any = null;
  try {
    const sessionConfig: any = {};
    if (options?.systemPrompt) sessionConfig.systemPrompt = options.systemPrompt;
    if (options?.temperature) sessionConfig.temperature = options.temperature;
    if (options?.topK) sessionConfig.topK = options.topK;

    session = await ai.languageModel.create(sessionConfig);

    if (options?.onStream) {
      const stream = session.promptStreaming(prompt);
      let fullText = '';
      for await (const chunk of stream) {
        fullText = chunk;
        options.onStream(chunk);
      }
      return fullText;
    } else {
      return await session.prompt(prompt);
    }
  } finally {
    if (session && typeof session.destroy === 'function') {
      try {
        session.destroy();
      } catch {
        // Ignored
      }
    }
  }
}

/**
 * Smart Hybrid AI Dispatcher:
 * Tries on-device Gemini Nano first (if preferred & available),
 * and automatically falls back to cloud API if not supported or on failure.
 */
export async function askSmartAI(
  prompt: string,
  systemPrompt?: string,
  onStream?: (token: string) => void
): Promise<{ content: string; engine: 'nano' | 'cloud' }> {
  // Check if Gemini Nano is enabled and ready
  if (isGeminiNanoPreferred()) {
    try {
      const caps = await getGeminiNanoCapabilities();
      if (caps.available === 'readily') {
        const text = await promptGeminiNano(prompt, { systemPrompt, onStream });
        return { content: text, engine: 'nano' };
      }
    } catch (nanoErr) {
      console.warn('[Smart AI] Gemini Nano attempt failed, falling back to Cloud API:', nanoErr);
    }
  }

  // Fallback to Server Gemini Cloud API
  const res = await fetch('/api/ai/completion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      feature: 'assistant',
      title: 'Smart AI Query',
    }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Cloud AI request failed.');
  }

  return { content: data.content || '', engine: 'cloud' };
}

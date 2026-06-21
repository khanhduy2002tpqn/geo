import type { AiConfig } from '@/lib/config';
import type { GradeLevel, ObjectInfo } from '@/types/geogebra';
import { logger } from '@/lib/logger';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt';

/**
 * OpenRouter chat-completions client (OpenAI-compatible schema).
 *
 * Dormant in Phase 1: invoked only when OPENROUTER_API_KEY is set AND the
 * object's category needs a teaching-style explanation. Default model is
 * configurable via OPENROUTER_MODEL (google/gemini-2.0-flash).
 */

const MAX_TOKENS = 160;
const TEMPERATURE = 0.3;
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Polyfill for AbortSignal.any() which is available in Node ≥20 / modern
 * browsers but absent in Node 18 and older Safari. Combines multiple signals
 * so that the first one to abort triggers the composed signal.
 */
function combineSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}

interface ChatChoice {
  message?: { content?: string };
}
interface ChatCompletion {
  choices?: ChatChoice[];
}

interface ExplainWithAiOptions {
  info: ObjectInfo;
  level: GradeLevel | undefined;
  config: AiConfig;
  signal?: AbortSignal;
  constructionContext?: string;
  localText?: string;
}

/** Generate a Vietnamese explanation via OpenRouter. Throws on failure. */
export async function explainWithAi({
  info,
  level,
  config,
  signal,
  constructionContext,
  localText,
}: ExplainWithAiOptions): Promise<string> {
  if (!config.apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const composedSignal = signal ? combineSignals([signal, timeout]) : timeout;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(info, level, constructionContext, localText) },
      ],
    }),
    signal: composedSignal,
  });

  if (!response.ok) {
    // Log the upstream body server-side only — never include it in the thrown
    // message because that message may propagate through error chains to logs
    // that are less access-controlled (or eventually to client responses).
    const detail = await response.text().catch(() => '');
    logger.warn(`OpenRouter upstream error ${response.status}`, detail.slice(0, 200));
    throw new Error(`OpenRouter request failed with status ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletion;
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenRouter returned no content');
  }
  return text;
}

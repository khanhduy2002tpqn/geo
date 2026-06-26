/** Build an OpenAI-compatible chat completions endpoint from a provider base URL. */
export function chatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  if (!normalized) throw new Error('AI base URL is empty')
  if (normalized.endsWith('/chat/completions')) return normalized
  return `${normalized}/chat/completions`
}

import { describe, expect, it } from 'vitest'
import { chatCompletionsUrl } from './chatCompletionsUrl'

describe('chatCompletionsUrl', () => {
  it('builds an OpenRouter endpoint', () => {
    expect(chatCompletionsUrl('https://openrouter.ai/api/v1')).toBe(
      'https://openrouter.ai/api/v1/chat/completions',
    )
  })

  it('builds a DeepSeek endpoint and removes trailing slashes', () => {
    expect(chatCompletionsUrl('https://api.deepseek.com/')).toBe(
      'https://api.deepseek.com/chat/completions',
    )
  })

  it('does not duplicate an endpoint supplied directly', () => {
    expect(chatCompletionsUrl('https://example.com/v1/chat/completions')).toBe(
      'https://example.com/v1/chat/completions',
    )
  })
})

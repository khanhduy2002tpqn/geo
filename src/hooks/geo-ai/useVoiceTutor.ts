'use client'

import { useState, useCallback, useRef } from 'react'
import { AudioManager } from '@/components/audio/AudioManager'

const audioManager = typeof window !== 'undefined' ? new AudioManager() : null

const DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

// Normalize math/geometry text for Vietnamese TTS
function normalizeTextForTTS(text: string): string {
  return text
    // All prime/apostrophe variants: U+0027 U+2019 U+2032 U+02B9 → phẩy
    .replace(/([A-Za-z])[‘’′ʹ']/g, "$1 phẩy ")
    // Geometry label digits: A1→A một, C1→C một (before letter-spacing so AC stays together for one pass)
    .replace(/([A-Za-z])([1-9])/g, (_, letter, digit) => `${letter} ${DIGIT_WORDS[parseInt(digit)] ?? digit} `)
    // Unicode subscripts: A₁→A một, A₂→A hai, A₃→A ba
    .replace(/([A-Za-z])₁/g, '$1 một').replace(/([A-Za-z])₂/g, '$1 hai').replace(/([A-Za-z])₃/g, '$1 ba')
    // Space out consecutive uppercase letters (geometry labels): AC→A C, SAB→S A B, ACC1A1 already split above
    .replace(/[A-Z]{2,}/g, s => s.split('').join(' '))
    // Common math symbols
    .replace(/°/g, ' độ')
    .replace(/≈/g, ' xấp xỉ ')
    .replace(/×/g, ' nhân ')
    .replace(/÷/g, ' chia ')
    .replace(/√/g, ' căn bậc hai ')
    .replace(/π/g, ' pi ')
    // Remove chars TTS would mispronounce
    .replace(/[_^{}\\]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    // Remove space before punctuation
    .replace(/\s([.,!?;:])/g, '$1')
    .trim()
}

export function useVoiceTutor() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentText, setCurrentText] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return

    const normalized = normalizeTextForTTS(text)
    console.log({normalized})
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    audioManager?.stop()
    setCurrentText(text)
    setIsSpeaking(true)
    try {
      const res = await fetch('/api/geo-ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: normalized }),
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (!res.ok) { setIsSpeaking(false); return }
      const { audioContent } = await res.json() as { audioContent: string }
      if (controller.signal.aborted) return
      if (audioContent) {
        audioManager?.unlockWithGesture()
        await audioManager?.play(audioContent, () => setIsSpeaking(false))
      } else {
        setIsSpeaking(false)
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setIsSpeaking(false)
    }
  }, [])

  const stop = useCallback(() => {
    controllerRef.current?.abort()
    audioManager?.stop()
    setIsSpeaking(false)
    setCurrentText(null)
  }, [])

  return { isSpeaking, currentText, speak, stop }
}

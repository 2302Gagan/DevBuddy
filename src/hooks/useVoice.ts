'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { VoiceState } from '@/lib/types'
import { VOICE_COMMANDS } from '@/lib/prompts'

interface UseVoiceOptions {
  onTranscript: (text: string) => void
  onCommand?: (command: string) => void
  onError?: (error: string) => void
  language?: string
  speechRate?: number
}

interface UseVoiceReturn {
  voiceState: VoiceState
  isSupported: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  speak: (text: string) => void
  cancelSpeech: () => void
}

export function useVoice({
  onTranscript,
  onCommand,
  onError,
  language = 'en-US',
  speechRate = 0.9,
}: UseVoiceOptions): UseVoiceReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const normalizeHeardText = useCallback((value: string) => {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  // Check browser support
  useEffect(() => {
    const webWindow = window as any
    const SpeechRecognition =
      webWindow.SpeechRecognition || webWindow.webkitSpeechRecognition
    const supported = !!SpeechRecognition && !!window.speechSynthesis
    setIsSupported(supported)

    if (supported) {
      synthRef.current = window.speechSynthesis
    }
  }, [])

  const startListening = useCallback(() => {
    const webWindow = window as any
    const SpeechRecognition =
      webWindow.SpeechRecognition || webWindow.webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = language
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setVoiceState('listening')
      setTranscript('')
    }

    recognition.onresult = (event: any) => {
      const current = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('')
      setTranscript(current)

      // Submit only when we have a final result from the speech engine.
      const latest = event.results[event.results.length - 1]
      if (latest?.isFinal) {
        const finalText = String(current || '').trim()
        if (!finalText) return

        const lower = normalizeHeardText(finalText)

        let isCommand = false
        for (const [, phrases] of Object.entries(VOICE_COMMANDS)) {
          if ((phrases as readonly string[]).some(p => lower.includes(p))) {
            onCommand?.(lower)
            isCommand = true
            break
          }
        }
        if (!isCommand) {
          onTranscript(finalText)
        }
      }
    }

    recognition.onend = () => {
      setVoiceState('idle')
    }

    recognition.onerror = (event: any) => {
      const errorType = String(event?.error || 'unknown')
      setVoiceState('idle')

      // These are expected in normal interaction and should not be surfaced as failures.
      if (errorType === 'no-speech' || errorType === 'aborted') {
        return
      }

      console.error('Speech recognition error:', errorType)
      onError?.(errorType)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [language, onTranscript, onCommand, onError, normalizeHeardText])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setVoiceState('idle')
  }, [])

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = speechRate
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setVoiceState('speaking')
    utterance.onend = () => setVoiceState('idle')
    utterance.onerror = () => setVoiceState('idle')

    setVoiceState('speaking')
    synthRef.current.speak(utterance)
  }, [language, speechRate])

  const cancelSpeech = useCallback(() => {
    synthRef.current?.cancel()
    setVoiceState('idle')
  }, [])

  return {
    voiceState,
    isSupported,
    transcript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
  }
}

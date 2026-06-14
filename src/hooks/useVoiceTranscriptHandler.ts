'use client'

import { useCallback } from 'react'

type TaskSource = 'voice' | 'typed'

interface UseVoiceTranscriptHandlerOptions {
  manualListenOnce: boolean
  setManualListenOnce: (value: boolean) => void
  setHardStopListening: (value: boolean) => void
  stopListening: () => void
  speak: (text: string) => void
  pushVoiceHistory: (command: string) => void
  setIntent: (value: string) => void
  trackVoiceAction: () => void
  handleSubmit: (inputIntent: string, isVoiceCommand?: boolean, source?: TaskSource) => Promise<void>
}

export function useVoiceTranscriptHandler({
  manualListenOnce,
  setManualListenOnce,
  setHardStopListening,
  stopListening,
  speak,
  pushVoiceHistory,
  setIntent,
  trackVoiceAction,
  handleSubmit,
}: UseVoiceTranscriptHandlerOptions) {
  return useCallback((text: string) => {
    const normalized = text.trim()
    if (!normalized) return

    pushVoiceHistory(normalized)
    const lower = normalized
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const stopListenRegex = /\b(?:stop\s+(?:listening|recording|mic|microphone)|stop\s+voice|stop\s+now)\b/i

    if (stopListenRegex.test(lower)) {
      setHardStopListening(true)
      setManualListenOnce(false)
      stopListening()
      speak('Stopped listening.')
      return
    }

    if (!manualListenOnce) {
      return
    }
    setManualListenOnce(false)

    setIntent(normalized)
    trackVoiceAction()
    handleSubmit(normalized, true, 'voice')
  }, [
    pushVoiceHistory,
    manualListenOnce,
    setHardStopListening,
    setManualListenOnce,
    stopListening,
    speak,
    setIntent,
    trackVoiceAction,
    handleSubmit,
  ])
}

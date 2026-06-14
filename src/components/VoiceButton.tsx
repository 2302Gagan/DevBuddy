'use client'

import { Mic, MicOff, Square, Volume2 } from 'lucide-react'
import type { VoiceState } from '@/lib/types'

interface VoiceButtonProps {
  voiceState: VoiceState
  isSupported: boolean
  transcript: string
  onStart: () => void
  onStop: () => void
  onCancelSpeech: () => void
}

export function VoiceButton({
  voiceState,
  isSupported,
  transcript,
  onStart,
  onStop,
  onCancelSpeech,
}: VoiceButtonProps) {

  const isListening = voiceState === 'listening'
  const isSpeaking  = voiceState === 'speaking'
  const isProcessing = voiceState === 'processing'

  if (!isSupported) {
    return (
      <div
        className="flex flex-col items-center gap-2"
        role="status"
        aria-live="polite"
      >
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center opacity-50">
          <MicOff size={24} className="text-gray-500" aria-hidden="true" />
        </div>
        <p className="text-xs text-gray-500 dark:text-[var(--text-muted)] text-center max-w-[160px]">
          Voice not supported in this browser. Use Chrome for voice input.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main mic button */}
      <div className="relative">
        {/* Pulse ring when listening */}
        {isListening && (
          <span
            className="absolute inset-0 rounded-full bg-yellow-400/30 animate-ping"
            aria-hidden="true"
          />
        )}

        <button
          onClick={isListening ? onStop : isSpeaking ? onCancelSpeech : onStart}
          disabled={isProcessing}
          aria-label={
            isListening   ? 'Stop listening' :
            isSpeaking    ? 'Stop speaking' :
            isProcessing  ? 'Processing your request' :
            'Start voice input'
          }
          aria-pressed={isListening}
          aria-busy={isProcessing}
          className={`btn-voice relative z-10 ${isProcessing ? 'opacity-50' : ''}`}
        >
          {isListening   && <Square size={24} aria-hidden="true" />}
          {isSpeaking    && <Volume2 size={24} aria-hidden="true" />}
          {isProcessing  && (
            <span className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          )}
          {voiceState === 'idle' && <Mic size={24} aria-hidden="true" />}
        </button>
      </div>

      {/* State label */}
      <p
        className="text-xs font-medium text-center"
        aria-live="polite"
        aria-atomic="true"
      >
        {isListening   && <span className="text-yellow-600 dark:text-yellow-400">Listening… tap to stop</span>}
        {isSpeaking    && <span className="text-teal-600 dark:text-teal-400">Speaking… tap to stop</span>}
        {isProcessing  && <span className="text-gray-500 dark:text-[var(--text-muted)]">Processing…</span>}
        {voiceState === 'idle' && <span className="text-gray-400 dark:text-[var(--text-muted)]">Tap to speak</span>}
      </p>

      {/* Live transcript */}
      {isListening && transcript && (
        <p
          className="text-sm text-gray-700 dark:text-[var(--text-secondary)] italic text-center max-w-[280px]"
          aria-live="polite"
          aria-label="Live transcript"
        >
          "{transcript}"
        </p>
      )}
    </div>
  )
}

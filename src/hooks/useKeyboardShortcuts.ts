'use client'

import { useEffect } from 'react'

interface UseKeyboardShortcutsOptions {
  hasLatestCode: boolean
  onToggleMic: () => void
  onStopVoice: () => void
  onSubmit: () => void
  onCopyCode: () => void
  onExportCode: () => void
  onUndoReplay: () => void
  onRedoReplay: () => void
  onSpeakWhereAmI: () => void
  onSpeakDiff: () => void
}

export function useKeyboardShortcuts({
  hasLatestCode,
  onToggleMic,
  onStopVoice,
  onSubmit,
  onCopyCode,
  onExportCode,
  onUndoReplay,
  onRedoReplay,
  onSpeakWhereAmI,
  onSpeakDiff,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeEl = document.activeElement as HTMLElement | null
        const tagName = activeEl?.tagName
        const isEditingField =
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT' ||
          !!activeEl?.isContentEditable

        if (!isEditingField) {
          e.preventDefault()
          onToggleMic()
        }
      }

      if (e.code === 'Escape') {
        onStopVoice()
      }

      if (e.ctrlKey && e.key === 'Enter') {
        onSubmit()
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c' && hasLatestCode) {
        e.preventDefault()
        onCopyCode()
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e' && hasLatestCode) {
        e.preventDefault()
        onExportCode()
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        onUndoReplay()
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        onRedoReplay()
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        onSpeakWhereAmI()
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        onSpeakDiff()
      }
    }

    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [
    hasLatestCode,
    onToggleMic,
    onStopVoice,
    onSubmit,
    onCopyCode,
    onExportCode,
    onUndoReplay,
    onRedoReplay,
    onSpeakWhereAmI,
    onSpeakDiff,
  ])
}

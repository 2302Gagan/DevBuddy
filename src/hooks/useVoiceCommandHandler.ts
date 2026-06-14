'use client'

import { useCallback } from 'react'

export type PendingVoiceAction =
  | { type: 'clear' }
  | { type: 'copy' }
  | { type: 'export-file' }
  | { type: 'export-gist' }
  | { type: 'run' }
  | { type: 'commit' }

interface PendingDisambiguation {
  rawCommand: string
  candidates: PendingVoiceAction[]
}

type ConfirmationTier = 'standard' | 'strict'
type VerbosityProfile = 'compact' | 'standard' | 'detailed'

interface UseVoiceCommandHandlerOptions {
  pendingDisambiguation: PendingDisambiguation | null
  pendingAction: PendingVoiceAction | null
  requireConfirm: boolean
  confirmationTier: ConfirmationTier
  isDestructiveAction: (action: PendingVoiceAction) => boolean
  strictConfirmPhrase: (action: PendingVoiceAction) => string
  executePendingAction: (action: PendingVoiceAction) => Promise<void>
  pushVoiceHistory: (command: string) => void
  handleSubmit: (inputIntent: string, isVoiceCommand?: boolean, source?: 'voice' | 'typed') => Promise<void>
  replayVoiceHistory: (direction: 'undo' | 'redo') => void
  speakWhereAmI: () => void
  speakDiffSinceLast: () => void
  trackVoiceAction: () => void
  setError: (message: string | null) => void
  setPendingAction: (action: PendingVoiceAction | null) => void
  setPendingDisambiguation: (value: PendingDisambiguation | null) => void
  setVerbosityProfile: (profile: VerbosityProfile) => void
  speak: (text: string) => void
}

export function useVoiceCommandHandler({
  pendingDisambiguation,
  pendingAction,
  requireConfirm,
  confirmationTier,
  isDestructiveAction,
  strictConfirmPhrase,
  executePendingAction,
  pushVoiceHistory,
  handleSubmit,
  replayVoiceHistory,
  speakWhereAmI,
  speakDiffSinceLast,
  trackVoiceAction,
  setError,
  setPendingAction,
  setPendingDisambiguation,
  setVerbosityProfile,
  speak,
}: UseVoiceCommandHandlerOptions) {
  return useCallback((command: string) => {
    trackVoiceAction()

    if (command.includes('where am i') || command.includes('current context')) {
      speakWhereAmI()
      return
    }

    if (command.includes('diff mode') || command.includes('what changed') || command.includes('read diff')) {
      speakDiffSinceLast()
      return
    }

    if (command.includes('verbosity compact')) {
      setVerbosityProfile('compact')
      speak('Verbosity changed to compact.')
      return
    }

    if (command.includes('verbosity standard')) {
      setVerbosityProfile('standard')
      speak('Verbosity changed to standard.')
      return
    }

    if (command.includes('verbosity detailed')) {
      setVerbosityProfile('detailed')
      speak('Verbosity changed to detailed.')
      return
    }

    if (pendingDisambiguation) {
      if (command.includes('file')) {
        setPendingDisambiguation(null)
        const action: PendingVoiceAction = { type: 'export-file' }
        if (requireConfirm && (confirmationTier === 'strict' || isDestructiveAction(action))) {
          setPendingAction(action)
          const phrase = strictConfirmPhrase(action)
          speak(confirmationTier === 'strict'
            ? `Please say ${phrase} to proceed, or cancel.`
            : 'Please say confirm to continue, or cancel to abort.')
          return
        }
        executePendingAction(action).catch(() => {})
        return
      }
      if (command.includes('gist')) {
        setPendingDisambiguation(null)
        const action: PendingVoiceAction = { type: 'export-gist' }
        if (requireConfirm && (confirmationTier === 'strict' || isDestructiveAction(action))) {
          setPendingAction(action)
          const phrase = strictConfirmPhrase(action)
          speak(confirmationTier === 'strict'
            ? `Please say ${phrase} to proceed, or cancel.`
            : 'Please say confirm to continue, or cancel to abort.')
          return
        }
        executePendingAction(action).catch(() => {})
        return
      }
      speak('Please say export file, export gist, or cancel.')
      return
    }

    if (command.includes('undo voice') || command.includes('undo command')) {
      replayVoiceHistory('undo')
      return
    }

    if (command.includes('redo voice') || command.includes('redo command')) {
      replayVoiceHistory('redo')
      return
    }

    if (command.includes('help')) {
      speak('You can say create, explain this, refactor, add accessibility, run, commit, copy, export file, export gist, clear, confirm, cancel, undo voice, redo voice, where am I, diff mode, verbosity compact, verbosity standard, or verbosity detailed.')
      return
    }

    if (command.includes('cancel')) {
      setPendingAction(null)
      setPendingDisambiguation(null)
      speak('Cancelled.')
      return
    }

    if (command.includes('confirm')) {
      if (!pendingAction) {
        speak('There is no pending action to confirm.')
        return
      }

      if (confirmationTier === 'strict') {
        const phrase = strictConfirmPhrase(pendingAction)
        if (!command.includes(phrase)) {
          speak(`Strict confirmation is enabled. Please say: ${phrase}`)
          return
        }
      }

      const actionToRun = pendingAction
      setPendingAction(null)
      executePendingAction(actionToRun).catch((err: any) => {
        setError(err.message || 'Action failed')
        speak('Sorry, that action failed.')
      })
      return
    }

    let action: PendingVoiceAction | null = null
    if (command.includes('clear')) action = { type: 'clear' }
    else if (command.includes('copy')) action = { type: 'copy' }
    else if (command.includes('export') && !command.includes('file') && !command.includes('gist')) {
      setPendingDisambiguation({
        rawCommand: command,
        candidates: [{ type: 'export-file' }, { type: 'export-gist' }],
      })
      speak('Do you want export file or export gist?')
      return
    }
    else if (command.includes('save')) {
      setPendingDisambiguation({
        rawCommand: command,
        candidates: [{ type: 'export-file' }, { type: 'export-gist' }],
      })
      speak('Save can mean file download or gist export. Say export file or export gist.')
      return
    }
    else if (command.includes('export file') || command.includes('download')) action = { type: 'export-file' }
    else if (command.includes('export gist') || command.includes('gist')) action = { type: 'export-gist' }
    else if (command.includes('run')) action = { type: 'run' }
    else if (command.includes('commit')) action = { type: 'commit' }

    if (action) {
      pushVoiceHistory(command)

      if (requireConfirm && (confirmationTier === 'strict' || isDestructiveAction(action))) {
        setPendingAction(action)
        const phrase = strictConfirmPhrase(action)
        speak(confirmationTier === 'strict'
          ? `Please say ${phrase} to proceed, or cancel.`
          : 'Please say confirm to continue, or cancel to abort.')
        return
      }
      executePendingAction(action).catch((err: any) => {
        setError(err.message || 'Action failed')
        speak('Sorry, that action failed.')
      })
      return
    }

    pushVoiceHistory(command)
    handleSubmit(command, true, 'voice')
  }, [
    trackVoiceAction,
    speakWhereAmI,
    speakDiffSinceLast,
    setVerbosityProfile,
    speak,
    pendingDisambiguation,
    setPendingDisambiguation,
    requireConfirm,
    confirmationTier,
    isDestructiveAction,
    setPendingAction,
    strictConfirmPhrase,
    executePendingAction,
    replayVoiceHistory,
    pendingAction,
    setError,
    pushVoiceHistory,
    handleSubmit,
  ])
}

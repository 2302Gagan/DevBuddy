'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

const COMMANDS = [
  { phrase: '"create a [description]"', action: 'Generate new code' },
  { phrase: '"explain this"', action: 'Read out a plain English explanation' },
  { phrase: '"refactor"', action: 'Improve and clean up the current code' },
  { phrase: '"add accessibility"', action: 'Add ARIA labels and keyboard handling' },
  { phrase: '"run"', action: 'Generate commands to run and test the current code' },
  { phrase: '"commit"', action: 'Generate a safe commit message and git commands' },
  { phrase: '"export file"', action: 'Download the generated code as a file' },
  { phrase: '"export gist"', action: 'Export generated code to a private GitHub Gist' },
  { phrase: '"copy"', action: 'Copy code to clipboard' },
  { phrase: '"clear"', action: 'Clear the editor and start fresh' },
  { phrase: '"confirm" / "cancel"', action: 'Confirm or cancel pending protected actions' },
  { phrase: '"undo voice" / "redo voice"', action: 'Replay previous or next voice intent from history' },
  { phrase: '"where am i"', action: 'Speak current interaction context and app state' },
  { phrase: '"diff mode"', action: 'Read what changed since the last generated code' },
  { phrase: '"verbosity compact|standard|detailed"', action: 'Change screen-reader narration detail level' },
  { phrase: '"save"', action: 'Triggers disambiguation: choose export file or export gist' },
  { phrase: '"help"', action: 'Show this commands panel' },
]

const KEYBOARD = [
  { key: 'Space', action: 'Start / stop voice input (when not in a text field)' },
  { key: 'Escape', action: 'Stop voice input or cancel speech' },
  { key: 'Tab', action: 'Navigate all controls (keyboard-only mode)' },
  { key: 'Ctrl + C', action: 'Copy generated code' },
  { key: 'Ctrl + Shift + C', action: 'Copy latest generated code (global shortcut)' },
  { key: 'Ctrl + Shift + E', action: 'Export latest generated code to file' },
  { key: 'Ctrl + Shift + Z', action: 'Undo and replay previous voice intent' },
  { key: 'Ctrl + Shift + Y', action: 'Redo and replay next voice intent' },
  { key: 'Ctrl + Shift + W', action: 'Speak current app context (where-am-I)' },
  { key: 'Ctrl + Shift + D', action: 'Speak diff since previous generated code' },
  { key: 'Ctrl + Enter', action: 'Submit typed input' },
]

export function VoiceCommandsPanel() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Show voice commands and keyboard shortcuts"
        aria-expanded={open}
        className="btn-secondary !px-3 !py-2 !text-xs"
      >
        <HelpCircle size={14} aria-hidden="true" />
        <span>Commands</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[70]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="commands-title"
            className="fixed right-4 top-16 z-[80] w-[min(92vw,24rem)] max-h-[calc(100vh-5rem)] overflow-y-auto card shadow-xl animate-slide-up"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="commands-title"
                className="font-bold text-sm text-gray-900 dark:text-[var(--text-primary)]"
              >
                Voice Commands & Shortcuts
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close commands panel"
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                autoFocus
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <section aria-labelledby="voice-cmds-heading">
              <h3
                id="voice-cmds-heading"
                className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2"
              >
                🎤 Voice
              </h3>
              <ul className="space-y-1.5 mb-4">
                {COMMANDS.map(c => (
                  <li key={c.phrase} className="text-xs">
                    <span className="font-mono text-yellow-700 dark:text-yellow-400">{c.phrase}</span>
                    <span className="text-gray-500 dark:text-[var(--text-muted)]"> → {c.action}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="keyboard-cmds-heading">
              <h3
                id="keyboard-cmds-heading"
                className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2"
              >
                ⌨️ Keyboard
              </h3>
              <ul className="space-y-1.5">
                {KEYBOARD.map(k => (
                  <li key={k.key} className="text-xs flex gap-2">
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[var(--bg-panel)]
                                    border border-gray-300 dark:border-[var(--border)]
                                    font-mono text-gray-700 dark:text-[var(--text-primary)] shrink-0">
                      {k.key}
                    </kbd>
                    <span className="text-gray-500 dark:text-[var(--text-muted)]">{k.action}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  )
}

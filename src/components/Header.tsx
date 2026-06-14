'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Sun, Moon, SlidersHorizontal } from 'lucide-react'
import type { InteractionMode, VoiceState } from '@/lib/types'

interface HeaderProps {
  mode: InteractionMode
  onModeChange: (mode: InteractionMode) => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  voiceState: VoiceState
  alwaysVoice?: boolean
}

export function Header({
  mode,
  onModeChange,
  fontSize,
  onFontSizeChange,
  voiceState,
  alwaysVoice = false,
}: HeaderProps) {
  const { theme, toggle } = useTheme()
  const [mobileA11yOpen, setMobileA11yOpen] = useState(false)
  const mobilePopoverRef = useRef<HTMLDivElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!mobileA11yOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (mobilePopoverRef.current?.contains(target)) return
      if (mobileTriggerRef.current?.contains(target)) return
      setMobileA11yOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileA11yOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileA11yOpen])

  return (
    <header
      className="sticky top-0 z-50
                 border-b border-teal-100/60 dark:border-[var(--border)]
                 bg-white/80 dark:bg-[#050c11]/90
                 backdrop-blur-md
                 shadow-[0_1px_24px_rgba(11,163,180,0.07)]
                 dark:shadow-[0_1px_30px_rgba(25,200,212,0.09)]"
      role="banner"
    >
      <div className="w-full px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Sonar icon mark */}
          <div className="relative flex items-center justify-center" aria-hidden="true">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600
                            dark:from-teal-300 dark:to-teal-500
                            flex items-center justify-center
                            shadow-[0_0_14px_rgba(11,163,180,0.5)] dark:shadow-[0_0_18px_rgba(25,200,212,0.55)]">
              <span className="text-white dark:text-gray-900 font-black text-sm tracking-tight select-none">DB</span>
            </div>
          </div>
          {/* Wordmark */}
          <div className="flex flex-col leading-none">
            <span className="font-black text-lg tracking-tight">
              <span className="text-teal-400 dark:text-teal-300">Dev</span><span className="text-amber-400 dark:text-amber-300">Buddy</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-teal-500/70 dark:text-teal-400/60 hidden sm:block">
              Voice-first coding
            </span>
          </div>
          <span className="badge-teal hidden sm:inline-flex">Beta</span>
        </div>

        {/* Controls */}
        <div className="relative flex items-center gap-2" role="toolbar" aria-label="Interface controls">

          {/* Interaction mode */}
          {!alwaysVoice && (
            <div
              className="flex rounded-xl border border-gray-200 dark:border-[var(--border)] overflow-hidden"
              role="group"
              aria-label="Interaction mode"
            >
              {(['voice', 'keyboard', 'hybrid'] as InteractionMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onModeChange(m)}
                  aria-pressed={mode === m}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-150
                    ${mode === m
                      ? 'bg-teal-500 text-white dark:bg-teal-300 dark:text-[#040b0e] shadow-inner'
                      : 'text-gray-600 dark:text-[var(--text-secondary)] hover:bg-teal-50 dark:hover:bg-[var(--bg-panel)]'
                    }`}
                >
                  {m === 'voice' && <span aria-hidden="true">🎤 </span>}
                  {m === 'keyboard' && <span aria-hidden="true">⌨️ </span>}
                  {m === 'hybrid' && <span aria-hidden="true">🔀 </span>}
                  {m}
                </button>
              ))}
            </div>
          )}

          {alwaysVoice && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                            border border-teal-300/80 dark:border-teal-700/80
                            bg-teal-50/80 dark:bg-teal-950/60
                            text-xs font-bold text-teal-700 dark:text-teal-200
                            shadow-[0_0_12px_rgba(11,163,180,0.15)] dark:shadow-[0_0_14px_rgba(25,200,212,0.2)]">
              <span aria-hidden="true" className="text-sm">🎤</span>
              <span className="hidden sm:inline">Voice-first</span>
            </div>
          )}

          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border border-teal-200/80 dark:border-teal-800/80"
            aria-label="Voice activity"
            title={`Voice state: ${voiceState}`}
          >
            {[0, 1, 2, 3].map((bar) => (
              <span
                key={bar}
                className={`w-1 rounded-full transition-all duration-200 ${
                  voiceState === 'listening' || voiceState === 'speaking'
                    ? 'h-4 bg-teal-500 dark:bg-teal-300 animate-pulse'
                    : voiceState === 'processing'
                      ? 'h-3 bg-yellow-500 dark:bg-yellow-300 animate-pulse'
                      : 'h-2 bg-gray-300 dark:bg-gray-600'
                }`}
                style={{ animationDelay: `${bar * 120}ms` }}
              />
            ))}
          </div>

          {/* Font size */}
          <div className="hidden sm:flex items-center gap-1" role="group" aria-label="Font size">
            <button
              onClick={() => onFontSizeChange(Math.max(12, fontSize - 2))}
              aria-label="Decrease font size"
              className="btn-secondary !px-2 !py-1 !text-xs !rounded-lg"
              disabled={fontSize <= 12}
            >
              A−
            </button>
            <span className="sr-only" aria-live="polite">Font size {fontSize}px</span>
            <button
              onClick={() => onFontSizeChange(Math.min(24, fontSize + 2))}
              aria-label="Increase font size"
              className="btn-secondary !px-2 !py-1 !text-xs !rounded-lg"
              disabled={fontSize >= 24}
            >
              A+
            </button>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-xs
                        transition-all duration-200
                        ${theme === 'dark'
                          ? 'border-2 border-yellow-400/80 text-yellow-200 bg-yellow-400/10 hover:bg-yellow-400/20 shadow-[0_0_12px_rgba(245,230,66,0.2)]'
                          : 'border-2 border-teal-500 text-teal-700 hover:bg-teal-50'
                        }`}
            title={`Current theme: ${theme}`}
          >
            {theme === 'dark'
              ? <Sun size={15} aria-hidden="true" />
              : <Moon size={15} aria-hidden="true" />
            }
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* Mobile accessibility popover */}
          <button
            type="button"
            ref={mobileTriggerRef}
            onClick={() => setMobileA11yOpen((v) => !v)}
            aria-label="Open accessibility controls"
            aria-expanded={mobileA11yOpen}
            className="sm:hidden inline-flex items-center justify-center rounded-xl border-2 border-teal-500 text-teal-700 dark:text-teal-200 dark:border-teal-400 p-2"
            title="Accessibility controls"
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
          </button>

          {mobileA11yOpen && (
            <div
              ref={mobilePopoverRef}
              className="sm:hidden absolute right-0 top-full mt-2 w-48 rounded-xl border border-teal-200 dark:border-teal-800 bg-white/95 dark:bg-[var(--bg-panel)]/95 backdrop-blur-md p-3 shadow-lg"
              role="dialog"
              aria-label="Accessibility controls"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-300 mb-2">
                Accessibility
              </p>
              <div className="flex items-center justify-between mb-2" role="group" aria-label="Font size mobile controls">
                <button
                  onClick={() => onFontSizeChange(Math.max(12, fontSize - 2))}
                  aria-label="Decrease font size"
                  className="btn-secondary !px-2 !py-1 !text-xs !rounded-lg"
                  disabled={fontSize <= 12}
                >
                  A−
                </button>
                <span className="text-xs font-mono text-gray-500 dark:text-[var(--text-muted)] w-10 text-center tabular-nums">
                  {fontSize}px
                </span>
                <button
                  onClick={() => onFontSizeChange(Math.min(24, fontSize + 2))}
                  aria-label="Increase font size"
                  className="btn-secondary !px-2 !py-1 !text-xs !rounded-lg"
                  disabled={fontSize >= 24}
                >
                  A+
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

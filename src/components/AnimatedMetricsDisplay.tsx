'use client'

import { useEffect, useState } from 'react'
import { Zap, Mouse, Mic } from 'lucide-react'

interface AnimatedMetricsDisplayProps {
  keystrokes: number
  mouseActions: number
  voiceActions: number
}

function AnimatedCounter({ value, duration = 300 }: { value: number; duration?: number }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (value === displayed) return

    const startTime = Date.now()
    const startValue = displayed
    const diff = value - startValue

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setDisplayed(Math.floor(startValue + diff * progress))

      if (progress >= 1) {
        clearInterval(interval)
        setDisplayed(value)
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [value, displayed, duration])

  return <span className="font-bold text-lg text-teal-600 dark:text-teal-400">{displayed}</span>
}

export function AnimatedMetricsDisplay({ keystrokes, mouseActions, voiceActions }: AnimatedMetricsDisplayProps) {
  const estimatedMainstreamSeconds = Math.round((keystrokes / 5 / 38) * 60 + (mouseActions * 0.7))

  return (
    <div className="space-y-4" role="region" aria-live="polite" aria-label="Assistive impact metrics">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Keystrokes */}
        <div className="card p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-purple-600 dark:text-purple-400" aria-hidden="true" />
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
              Keystrokes
            </p>
          </div>
          <p className="flex items-baseline gap-2">
            <AnimatedCounter value={keystrokes} />
            <span className="text-xs text-purple-600 dark:text-purple-400">avoided</span>
          </p>
        </div>

        {/* Mouse Actions */}
        <div className="card p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Mouse size={14} className="text-orange-600 dark:text-orange-400" aria-hidden="true" />
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
              Mouse
            </p>
          </div>
          <p className="flex items-baseline gap-2">
            <AnimatedCounter value={mouseActions} />
            <span className="text-xs text-orange-600 dark:text-orange-400">avoided</span>
          </p>
        </div>

        {/* Voice Actions */}
        <div className="card p-3 bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200 dark:border-teal-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Mic size={14} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide">
              Voice Actions
            </p>
          </div>
          <p className="flex items-baseline gap-2">
            <AnimatedCounter value={voiceActions} />
            <span className="text-xs text-teal-600 dark:text-teal-400">used</span>
          </p>
        </div>
      </div>

      {/* Impact comparison */}
      <div className="card p-4 border-teal-200 dark:border-teal-700 bg-teal-50/40 dark:bg-teal-900/10 space-y-2">
        <p className="text-sm font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
          📊 Productivity Impact
        </p>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-gray-700 dark:text-[var(--text-secondary)]">
            Estimated mainstream workflow:
          </span>
          <span className="font-black text-lg text-teal-600 dark:text-teal-300">
            ~{estimatedMainstreamSeconds}s
          </span>
          <span className="text-gray-600 dark:text-[var(--text-muted)]">
            (keyboard/mouse heavy)
          </span>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-white dark:bg-[var(--bg-panel)] border border-teal-200 dark:border-teal-800/60 shadow-sm">
          <p className="text-sm text-teal-800 dark:text-teal-100 leading-relaxed">
            💡 <strong>By using voice:</strong> You've eliminated repetitive typing and mouse movements, 
            which is especially valuable if you have RSI, motor disabilities, or visual impairments.
          </p>
        </div>
      </div>
    </div>
  )
}

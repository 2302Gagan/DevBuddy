'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronRight, X } from 'lucide-react'

export interface OnboardingTooltipProps {
  step: 0 | 1 | 2 | 3
  onNext: () => void
  onComplete: () => void
  onSkip: () => void
}

const TOOLTIP_STEPS = [
  {
    target: '[data-onboard="mic-button"]',
    position: 'bottom' as const,
    title: '🎤 Voice-First Interface',
    description: 'Tap here or press Space to start listening. DevBuddy is powered by your voice.',
  },
  {
    target: '[data-onboard="intent-input"]',
    position: 'bottom' as const,
    title: '📝 Describe Your Intent',
    description: 'Tell DevBuddy what you want to build. You can speak it or type it here.',
  },
  {
    target: '[data-onboard="mission-cards"]',
    position: 'top' as const,
    title: '⚡ Quick Missions',
    description: 'Or choose a quick mission card to get started instantly with pre-written prompts.',
  },
]

export function OnboardingTooltip({ step, onNext, onComplete, onSkip }: OnboardingTooltipProps) {
  const [tooltipStyle, setTooltipStyle] = useState<{ top: number; left: number; position: 'top' | 'bottom' } | null>(null)
  const [highlightStyle, setHighlightStyle] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step === 0 || step === 3) {
      setTooltipStyle(null)
      setHighlightStyle(null)
      return
    }

    const currentStep = TOOLTIP_STEPS[step - 1]
    const targetEl = document.querySelector(currentStep.target)

    if (!targetEl) {
      console.warn(`Onboarding target not found: ${currentStep.target}`)
      return
    }

    const rect = targetEl.getBoundingClientRect()
    const scrollY = window.scrollY
    const scrollX = window.scrollX

    // Set highlight around target element
    setHighlightStyle({
      top: rect.top + scrollY - 8,
      left: rect.left + scrollX - 8,
      width: rect.width + 16,
      height: rect.height + 16,
    })

    // Position tooltip
    const tooltipHeight = 180
    const tooltipWidth = 280
    const gap = 12

    let top = rect.top + scrollY
    let left = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2

    if (currentStep.position === 'bottom') {
      top = rect.bottom + scrollY + gap
    } else {
      top = rect.top + scrollY - tooltipHeight - gap
    }

    // Keep tooltip in viewport
    if (left < 16) left = 16
    if (left + tooltipWidth > window.innerWidth - 16) left = window.innerWidth - tooltipWidth - 16

    setTooltipStyle({
      top,
      left,
      position: currentStep.position,
    })
  }, [step])

  if (step === 0 || step === 3) return null

  const currentStep = TOOLTIP_STEPS[step - 1]
  const progress = step / TOOLTIP_STEPS.length

  return (
    <>
      {/* Overlay with highlight */}
      <div
        className="fixed inset-0 pointer-events-none z-40"
        style={{
          backgroundImage: highlightStyle
            ? `
              radial-gradient(
                circle at center,
                transparent 0%,
                rgba(0, 0, 0, 0.7) 100%
              ),
              linear-gradient(
                0deg,
                rgba(0, 0, 0, 0.7),
                rgba(0, 0, 0, 0.7)
              )
            `
            : 'none',
        }}
        aria-hidden="true"
      >
        {/* Spotlight effect */}
        {highlightStyle && (
          <div
            className="absolute border-2 border-teal-300 rounded-lg shadow-lg animate-pulse"
            style={{
              top: `${highlightStyle.top}px`,
              left: `${highlightStyle.left}px`,
              width: `${highlightStyle.width}px`,
              height: `${highlightStyle.height}px`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
              zIndex: 40,
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Tooltip */}
      {tooltipStyle && (
        <div
          ref={tooltipRef}
          className="fixed z-50 card p-4 max-w-sm shadow-2xl border-teal-300 dark:border-teal-600 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{
            top: `${tooltipStyle.top}px`,
            left: `${tooltipStyle.left}px`,
          }}
          role="region"
          aria-label={`Onboarding step ${step} of ${TOOLTIP_STEPS.length}`}
        >
          {/* Close button */}
          <button
            onClick={onSkip}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Skip onboarding"
            title="Skip"
          >
            <X size={16} />
          </button>

          {/* Content */}
          <div className="pr-6">
            <h3 className="text-sm font-bold text-teal-700 dark:text-teal-300 mb-1">
              {currentStep.title}
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              {currentStep.description}
            </p>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-[var(--bg-panel)] overflow-hidden mb-3">
              <div
                className="h-full bg-teal-500 transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onSkip}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {step}/{TOOLTIP_STEPS.length}
                </span>
                <button
                  onClick={step === TOOLTIP_STEPS.length ? onComplete : onNext}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors text-xs font-semibold"
                  aria-label={step === TOOLTIP_STEPS.length ? 'Complete onboarding' : 'Next step'}
                >
                  {step === TOOLTIP_STEPS.length ? 'Done' : 'Next'}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Arrow pointing to element */}
          <div
            className="absolute w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent"
            style={{
              borderTopColor: 'var(--bg-primary)',
              bottom: tooltipStyle.position === 'top' ? '-10px' : 'auto',
              top: tooltipStyle.position === 'bottom' ? '-10px' : 'auto',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            aria-hidden="true"
          />
        </div>
      )}
    </>
  )
}

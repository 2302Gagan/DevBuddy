'use client'

import { CheckCircle, Circle } from 'lucide-react'

export interface ReasoningStep {
  step: 'analyse' | 'plan' | 'generate'
  status: 'active' | 'done' | 'pending'
}

interface ReasoningStepsFeedbackProps {
  steps: ReasoningStep[]
  intent?: string
}

const STEP_INFO = {
  analyse: {
    emoji: '🔍',
    title: 'Analyse',
    baseDescription: 'Understanding your request and context',
  },
  plan: {
    emoji: '📋',
    title: 'Plan',
    baseDescription: 'Planning accessible code structure',
  },
  generate: {
    emoji: '✨',
    title: 'Generate',
    baseDescription: 'Generating accessible code output',
  },
}

function generateDynamicDescription(step: 'analyse' | 'plan' | 'generate', intent?: string): string {
  const baseDescriptions: Record<'analyse' | 'plan' | 'generate', string> = {
    analyse: 'Understanding your request and context',
    plan: 'Planning accessible code structure',
    generate: 'Generating accessible code output',
  }

  if (!intent || intent.trim().length < 3) {
    return baseDescriptions[step]
  }

  const lowerIntent = intent.toLowerCase()
  // Normalize intent: replace dots, dashes, spaces with consistent spacing for detection
  const normalizedIntent = lowerIntent.replace(/[-./\s]+/g, ' ')
  
  // Extract key terms and framework names
  const frameworks = ['flutter', 'react', 'vue', 'angular', 'svelte', 'nextjs', 'swift', 'kotlin', 'python', 'typescript', 'javascript', 'dart', 'java', 'go', 'rust']
  const components = ['button', 'form', 'input', 'modal', 'dropdown', 'carousel', 'table', 'list', 'card', 'header', 'footer', 'navigation', 'menu', 'dialog', 'textfield', 'slider', 'checkbox', 'radio']
  const patterns = ['login', 'signup', 'authentication', 'payment', 'search', 'filter', 'sort', 'pagination', 'infinite scroll', 'accordion', 'tabs', 'breadcrumb']
  
  const detectedFramework = frameworks.find(fw => normalizedIntent.includes(fw))
  const detectedComponent = components.find(comp => normalizedIntent.includes(comp))
  const detectedPattern = patterns.find(pat => normalizedIntent.includes(pat))

  if (step === 'analyse') {
    if (detectedFramework && detectedComponent) {
      return `Identifying ${detectedFramework} ${detectedComponent} requirements and accessibility needs`
    }
    if (detectedFramework) {
      return `Understanding ${detectedFramework} structure and ${detectedPattern || 'feature'} requirements`
    }
    if (detectedPattern) {
      return `Analyzing ${detectedPattern} pattern requirements and user flow`
    }
    return 'Extracting key requirements, frameworks, and accessibility criteria from your request'
  }

  if (step === 'plan') {
    if (detectedComponent) {
      return `Structuring ${detectedComponent} with semantic labels, focus order, and error states`
    }
    if (detectedPattern) {
      return `Planning ${detectedPattern} flow with keyboard navigation and screen reader support`
    }
    if (detectedFramework) {
      return `Designing accessible components and state management for ${detectedFramework}`
    }
    return 'Planning component hierarchy, keyboard navigation, and ARIA landmarks'
  }

  if (step === 'generate') {
    if (detectedFramework && detectedComponent) {
      return `Writing ${detectedFramework} ${detectedComponent} code with full accessibility support`
    }
    if (detectedFramework) {
      return `Generating accessible code in ${detectedFramework} with WCAG compliance`
    }
    if (detectedComponent) {
      return `Creating accessible ${detectedComponent} with proper semantics and ARIA`
    }
    return 'Generating accessible code with semantic HTML and proper ARIA labels'
  }

  return baseDescriptions[step]
}

export function ReasoningStepsFeedback({ steps, intent }: ReasoningStepsFeedbackProps) {
  const stepOrder: Array<'analyse' | 'plan' | 'generate'> = ['analyse', 'plan', 'generate']
  const completedCount = steps.filter(s => s.status === 'done').length
  
  // Generate screen reader announcements for step completions
  const getAriaLabel = () => {
    const activeStep = steps.find(s => s.status === 'active')
    const completedSteps = steps.filter(s => s.status === 'done')
    if (completedSteps.length === 0) return 'Starting reasoning pipeline'
    if (completedSteps.length === 1) return `${STEP_INFO.analyse.title} complete. Planning phase in progress.`
    if (completedSteps.length === 2) return `${STEP_INFO.plan.title} complete. Generating phase in progress.`
    if (completedSteps.length === 3) return 'All reasoning steps complete.'
    return `${completedSteps.length} steps completed. ${activeStep ? STEP_INFO[activeStep.step].title + ' in progress.' : ''}`
  }
  
  return (
    <div className="card border-teal-300 dark:border-teal-700 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300" role="status" aria-live="polite" aria-atomic="true">
      <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
        🧠 Reasoning Pipeline
      </p>
      <p className="sr-only">{getAriaLabel()}</p>

      {/* Steps container */}
      <div className="space-y-2">
        {stepOrder.map((stepName) => {
          const step = steps.find(s => s.step === stepName)
          const status = step?.status || 'pending'

          return (
            <div key={stepName} className="flex items-start gap-3">
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-1">
                {status === 'done' ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 animate-in fade-in">
                    <CheckCircle size={18} className="text-green-600 dark:text-green-400" aria-hidden="true" />
                  </div>
                ) : status === 'active' ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40 animate-pulse">
                    <Circle size={18} className="text-teal-600 dark:text-teal-400 fill-teal-600 dark:fill-teal-400" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <Circle size={18} className="text-gray-400 dark:text-gray-500" aria-hidden="true" />
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg" aria-hidden="true">{STEP_INFO[stepName].emoji}</span>
                  <p className={`text-sm font-semibold ${
                    status === 'done'
                      ? 'text-green-700 dark:text-green-300'
                      : status === 'active'
                        ? 'text-teal-700 dark:text-teal-300'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {STEP_INFO[stepName].title}
                  </p>
                  {status === 'done' && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ✓ Complete
                    </span>
                  )}
                  {status === 'active' && (
                    <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold animate-pulse">
                      ⏳ In progress...
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${
                  status === 'done'
                    ? 'text-green-700/80 dark:text-green-300/80'
                    : status === 'active'
                      ? 'text-teal-700/80 dark:text-teal-300/80'
                      : 'text-gray-500/70 dark:text-gray-400/70'
                }`}>
                  {generateDynamicDescription(stepName, intent)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Timeline visual */}
      <div className="mt-3 p-2 rounded-lg bg-teal-50/60 dark:bg-teal-900/10 flex items-center gap-1">
        <div className="flex gap-1 flex-1">
          {stepOrder.map((stepName) => {
            const step = steps.find(s => s.step === stepName)
            const status = step?.status || 'pending'
            return (
              <div
                key={stepName}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  status === 'done'
                    ? 'bg-green-500'
                    : status === 'active'
                      ? 'bg-teal-500 animate-pulse'
                      : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-hidden="true"
              />
            )
          })}
        </div>
        <span className="text-xs text-teal-700 dark:text-teal-400 ml-2 font-semibold" aria-label="completed steps out of three">
          {completedCount}/3
        </span>
      </div>
    </div>
  )
}

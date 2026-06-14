'use client'

import { Check, AlertCircle } from 'lucide-react'
import type { A11yViolation } from '@/lib/types'

interface RequirementsChecklistProps {
  violations: A11yViolation[]
  code: string
}

export function RequirementsChecklist({ violations, code }: RequirementsChecklistProps) {
  // Derive checklist status from violations - violations indicate failures
  const checklistItems = [
    {
      id: 'aria-labels',
      title: 'ARIA labels & roles',
      description: 'Buttons, inputs, and interactive elements have accessible names',
      passed: !violations.some(v => v.id?.includes('button-name') || v.id?.includes('form-field-has-name') || v.id?.includes('aria')),
    },
    {
      id: 'keyboard-navigation',
      title: 'Keyboard operability',
      description: 'All functionality available via keyboard (Tab, Enter, Escape)',
      passed: !violations.some(v => v.id?.includes('keyboard') || v.id?.includes('focusable')),
    },
    {
      id: 'focus-management',
      title: 'Focus indicators visible',
      description: 'Focus outlines or indicators are clearly visible',
      passed: !violations.some(v => v.id?.includes('focus')),
    },
    {
      id: 'color-contrast',
      title: 'Color contrast (WCAG AA)',
      description: 'Text has at least 4.5:1 contrast ratio, UI 3:1',
      passed: !violations.some(v => v.id?.includes('color-contrast')),
    },
    {
      id: 'semantic-html',
      title: 'Semantic HTML elements',
      description: 'Uses proper heading, button, link, form elements',
      passed: !violations.some(v => v.id?.includes('semantic') || v.id?.includes('heading') || v.id?.includes('list')),
    },
    {
      id: 'screen-reader',
      title: 'Screen reader support',
      description: 'Content is properly marked up for assistive technology',
      passed: !violations.some(v => v.id?.includes('image-alt') || v.id?.includes('landmark')),
    },
  ]

  const passedCount = checklistItems.filter(item => item.passed).length
  const totalCount = checklistItems.length
  const passPercentage = Math.round((passedCount / totalCount) * 100)

  return (
    <div className="card border-teal-300 dark:border-teal-700 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Header with progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
            ✅ Accessibility Compliance
          </p>
          <span className={`badge text-xs font-bold ${
            passPercentage === 100
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : passPercentage >= 75
                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                : passPercentage >= 50
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
          }`}>
            {passPercentage}% pass
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-[var(--bg-panel)] overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              passPercentage === 100
                ? 'bg-green-500'
                : passPercentage >= 75
                  ? 'bg-teal-500'
                  : passPercentage >= 50
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
            }`}
            style={{ width: `${passPercentage}%` }}
            aria-hidden="true"
          />
        </div>
        <p className="text-xs text-gray-600 dark:text-[var(--text-muted)] mt-1">
          {passedCount} of {totalCount} checks passed
        </p>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-lg border transition-all ${
              item.passed
                ? 'bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-700/50'
                : 'bg-orange-50 dark:bg-orange-900/15 border-orange-200 dark:border-orange-700/50'
            }`}
          >
            <div className="flex items-start gap-2">
              {item.passed ? (
                <Check size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertCircle size={16} className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-semibold ${
                  item.passed
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-orange-700 dark:text-orange-300'
                }`}>
                  {item.title}
                </p>
                <p className={`text-xs mt-0.5 ${
                  item.passed
                    ? 'text-green-700/80 dark:text-green-300/80'
                    : 'text-orange-700/80 dark:text-orange-300/80'
                }`}>
                  {item.description}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                item.passed
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
              }`}>
                {item.passed ? '✓' : '⚠️'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary message */}
      <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/15 border border-teal-200 dark:border-teal-700/50">
        {passPercentage === 100 ? (
          <p className="text-sm text-teal-700 dark:text-teal-300">
            🎉 <strong>Excellent!</strong> This code passes all accessibility checks. You're building inclusively for all users.
          </p>
        ) : passPercentage >= 75 ? (
          <p className="text-sm text-teal-700 dark:text-teal-300">
            ✨ <strong>Great start!</strong> Address the remaining items to improve accessibility for users with disabilities.
          </p>
        ) : (
          <p className="text-sm text-teal-700 dark:text-teal-300">
            🔧 <strong>Review needed.</strong> Address the highlighted items to ensure your code is accessible to everyone.
          </p>
        )}
      </div>

      {/* Code snippet indicator */}
      {code && (
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-[var(--bg-panel)] border border-gray-200 dark:border-[var(--border)] text-xs text-gray-600 dark:text-[var(--text-muted)]">
          <p>
            {code.length > 0 && (
              <>
                Analyzed <strong>{code.split('\n').length} lines</strong> of {code.split('\n')[0].length > 50 ? 'code' : 'markup'}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, type ReactNode } from 'react'
import { Copy, Check, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Download, Share2 } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { A11yViolation, Language } from '@/lib/types'
import { getImpactColor, getImpactBg, explainViolationPlainLanguage, getFixSuggestions } from '@/lib/a11y'

interface CodeOutputProps {
  code: string
  language: Language
  summary: string
  a11yViolations: A11yViolation[]
  a11yLintSkipped?: boolean
  fontSize: number
  isDark: boolean
  onSpeak: (text: string) => void
  onExportFile: () => void
  onExportGist: () => Promise<void>
}

type SummaryBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }

function parseSummaryBlocks(input: string): SummaryBlock[] {
  const lines = input
    .split('\n')
    .map(line => line.trimEnd())

  const blocks: SummaryBlock[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()

    if (!line) {
      i += 1
      continue
    }

    const heading = line.match(/^#{1,6}\s+(.+)$/)
    if (heading) {
      blocks.push({ type: 'heading', text: heading[1] })
      i += 1
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i += 1
      }
      blocks.push({ type: 'unordered-list', items })
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i += 1
      }
      blocks.push({ type: 'ordered-list', items })
      continue
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') })
      continue
    }

    const paragraphLines: string[] = [line]
    i += 1
    while (i < lines.length) {
      const next = lines[i].trim()
      if (!next || /^#{1,6}\s+/.test(next) || /^[-*]\s+/.test(next) || /^\d+\.\s+/.test(next)) break
      paragraphLines.push(next)
      i += 1
    }

    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
  }

  return blocks
}

function renderInlineSummary(text: string): ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|`[^`]+`|\*\*[^*]+\*\*)/g)
  return parts
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .map((part, idx) => {
      const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={`inline-link-${idx}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-teal-700 dark:text-teal-300 underline underline-offset-2 decoration-teal-400 hover:text-teal-900 dark:hover:text-teal-200"
        >
          {linkMatch[1]}
        </a>
      )
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`inline-code-${idx}`}
          className="px-1 py-0.5 rounded bg-gray-100 dark:bg-[var(--bg-panel)] border border-gray-200 dark:border-[var(--border)] font-mono text-[0.92em]"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`inline-strong-${idx}`}>{part.slice(2, -2)}</strong>
    }
    return <span key={`inline-text-${idx}`}>{part}</span>
    })
}

export function CodeOutput({
  code,
  language,
  summary,
  a11yViolations,
  a11yLintSkipped,
  fontSize,
  isDark,
  onSpeak,
  onExportFile,
  onExportGist,
}: CodeOutputProps) {
  const [copied, setCopied] = useState(false)
  const [exportingGist, setExportingGist] = useState(false)
  const [showViolations, setShowViolations] = useState(true)
  const [activeReadSection, setActiveReadSection] = useState<'summary' | 'code' | 'issues' | null>(null)
  const [narrationIndex, setNarrationIndex] = useState(-1)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportGist = async () => {
    setExportingGist(true)
    try {
      await onExportGist()
    } finally {
      setExportingGist(false)
    }
  }

  const hasViolations = a11yViolations.length > 0
  const criticalCount = a11yViolations.filter(v => v.impact === 'critical').length
  const summaryBlocks = parseSummaryBlocks(summary)
  const summarySentences = summary
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)

  const startNarrationTrail = () => {
    if (summarySentences.length === 0) return
    setNarrationIndex(0)
    summarySentences.forEach((_, idx) => {
      setTimeout(() => setNarrationIndex(idx), idx * 1200)
    })
    setTimeout(() => setNarrationIndex(-1), summarySentences.length * 1200 + 200)
  }

  const speakSection = (section: 'summary' | 'code' | 'issues') => {
    setActiveReadSection(section)
    setTimeout(() => setActiveReadSection(null), 1800)

    if (section === 'summary') {
      startNarrationTrail()
      onSpeak(summary)
      return
    }

    if (section === 'code') {
      const codePreview = code.split('\n').slice(0, 24).join('\n')
      onSpeak(`Reading first part of generated code. ${codePreview}`)
      return
    }

    if (!hasViolations) {
      onSpeak('No accessibility issues were found.')
      return
    }

    const issueSummary = a11yViolations
      .slice(0, 4)
      .map((v) => `${v.impact} issue: ${v.help}`)
      .join('. ')
    onSpeak(`Accessibility findings: ${issueSummary}`)
  }

  return (
    <div className="flex flex-col gap-4 animate-slide-up">

      {/* Summary card */}
      <div
        className={`card focus-spotlight border-l-4 border-l-teal-500 dark:border-l-teal-400 ${
          activeReadSection === 'summary' ? 'ring-2 ring-teal-400 dark:ring-yellow-300' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className="text-sm font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-2 bg-teal-100/60 dark:bg-teal-950/50 px-2 py-1 rounded"
              id="summary-label"
            >
              What this code does
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mb-2" role="group" aria-label="Guided reading">
              <button
                onClick={() => speakSection('summary')}
                className="btn-secondary !px-2 !py-1 !text-[11px]"
                aria-label="Read summary section"
              >
                Read Summary
              </button>
              <button
                onClick={() => speakSection('code')}
                className="btn-secondary !px-2 !py-1 !text-[11px]"
                aria-label="Read code section"
              >
                Read Code
              </button>
              <button
                onClick={() => speakSection('issues')}
                className="btn-secondary !px-2 !py-1 !text-[11px]"
                aria-label="Read accessibility issues section"
              >
                Read Issues
              </button>
            </div>
            <div
              className="text-sm text-gray-700 dark:text-[var(--text-secondary)] leading-relaxed space-y-2"
              aria-labelledby="summary-label"
              aria-live="polite"
            >
              {summaryBlocks.length === 0 && (
                <p>
                  {summarySentences.map((sentence, index) => (
                    <span
                      key={`summary-sentence-${index}`}
                      className={narrationIndex === index ? 'bg-teal-100 dark:bg-teal-900/40 rounded px-0.5' : ''}
                    >
                      {sentence}{' '}
                    </span>
                  ))}
                </p>
              )}

              {summaryBlocks.map((block, idx) => {
                if (block.type === 'heading') {
                  return (
                    <p key={`summary-heading-${idx}`} className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300 pt-1">
                      {renderInlineSummary(block.text)}
                    </p>
                  )
                }

                if (block.type === 'unordered-list') {
                  return (
                    <ul key={`summary-ul-${idx}`} className="list-disc pl-5 space-y-1 marker:text-teal-500">
                      {block.items.map((item, itemIdx) => (
                        <li key={`summary-ul-item-${idx}-${itemIdx}`}>
                          {renderInlineSummary(item)}
                        </li>
                      ))}
                    </ul>
                  )
                }

                if (block.type === 'ordered-list') {
                  return (
                    <ol key={`summary-ol-${idx}`} className="list-decimal pl-5 space-y-1 marker:text-teal-500">
                      {block.items.map((item, itemIdx) => (
                        <li key={`summary-ol-item-${idx}-${itemIdx}`}>
                          {renderInlineSummary(item)}
                        </li>
                      ))}
                    </ol>
                  )
                }

                if (block.type === 'blockquote') {
                  return (
                    <blockquote
                      key={`summary-quote-${idx}`}
                      className="border-l-4 border-teal-300 dark:border-teal-700 bg-teal-50/60 dark:bg-teal-900/20 rounded-r-md px-3 py-2 text-gray-700 dark:text-[var(--text-secondary)]"
                    >
                      {renderInlineSummary(block.text)}
                    </blockquote>
                  )
                }

                return (
                  <p key={`summary-p-${idx}`}>
                    {renderInlineSummary(block.text)}
                  </p>
                )
              })}
            </div>
          </div>
          <button
            onClick={() => {
              startNarrationTrail()
              onSpeak(summary)
            }}
            aria-label="Read summary aloud"
            className="btn-secondary !px-2.5 !py-1.5 shrink-0"
            title="Read aloud"
          >
            <span aria-hidden="true">🔊</span>
          </button>
        </div>
      </div>

      {/* Code block */}
      <div
        className={`card focus-spotlight !p-0 overflow-hidden ${
          activeReadSection === 'code' ? 'ring-2 ring-teal-400 dark:ring-yellow-300' : ''
        }`}
      >
        {/* Code header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-[var(--border)]
                        bg-gray-50 dark:bg-[var(--bg-panel)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="badge-teal capitalize">{language}</span>
            {!hasViolations && (
              <span className="flex items-center gap-1 text-xs font-semibold
                              text-teal-700 dark:text-teal-300
                              bg-teal-50 dark:bg-teal-900/30
                              border border-teal-200 dark:border-teal-700
                              px-2 py-0.5 rounded-full">
                <CheckCircle size={11} aria-hidden="true" />
                A11Y OK
              </span>
            )}
            {hasViolations && (
              <span className="flex items-center gap-1 text-xs font-semibold
                              text-yellow-800 dark:text-yellow-200
                              bg-yellow-50 dark:bg-yellow-900/30
                              border border-yellow-300 dark:border-yellow-700
                              px-2 py-0.5 rounded-full">
                <AlertTriangle size={11} aria-hidden="true" />
                {a11yViolations.length} issue{a11yViolations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Code copied!' : 'Copy code to clipboard'}
              className="btn-secondary !px-3 !py-1.5 !text-xs"
            >
              {copied
                ? <><Check size={13} aria-hidden="true" /> Copied!</>
                : <><Copy size={13} aria-hidden="true" /> Copy</>
              }
            </button>
            <button
              onClick={onExportFile}
              aria-label="Download code as file"
              className="btn-secondary !px-3 !py-1.5 !text-xs"
            >
              <Download size={13} aria-hidden="true" /> File
            </button>
            <button
              onClick={handleExportGist}
              aria-label="Export code to GitHub Gist"
              className="btn-secondary !px-3 !py-1.5 !text-xs"
              disabled={exportingGist}
            >
              <Share2 size={13} aria-hidden="true" />
              {exportingGist ? 'Exporting…' : 'Gist'}
            </button>
          </div>
        </div>

        {/* Syntax highlighted code */}
        <div
          style={{ fontSize: `${fontSize}px` }}
          className="overflow-y-auto overflow-x-hidden max-h-[60vh]"
          role="region"
          aria-label="Generated code"
          tabIndex={0}
        >
          <SyntaxHighlighter
            language={language === 'dart' ? 'dart' : language}
            style={isDark ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: 'inherit',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              color: isDark ? '#e0e7ff' : '#1e293b',
            }}
            codeTagProps={{
              style: {
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              },
            }}
            showLineNumbers
            wrapLines
            wrapLongLines
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>

      {/* Linting-skipped notice for non-HTML/JS/TS languages */}
      {a11yLintSkipped && (
        <div
          role="note"
          className="card !p-3 flex items-center gap-2 text-xs text-gray-500 dark:text-[var(--text-muted)] border border-gray-200 dark:border-[var(--border)]"
        >
          <CheckCircle size={13} className="shrink-0 text-gray-400" aria-hidden="true" />
          WCAG lint not applicable for {language} — axe-core runs on HTML/JS/TS only.
        </div>
      )}

      {/* Accessibility violations */}
      {hasViolations && (
        <div
          className={`card focus-spotlight !p-0 overflow-hidden ${
            activeReadSection === 'issues' ? 'ring-2 ring-teal-400 dark:ring-yellow-300' : ''
          }`}
          role="region"
          aria-label="Accessibility issues"
        >
          <button
            onClick={() => setShowViolations(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3
                       bg-yellow-50 dark:bg-yellow-900/15
                       border-b border-yellow-200 dark:border-yellow-800/60
                       text-sm font-bold text-yellow-900 dark:text-yellow-200
                       hover:bg-yellow-100 dark:hover:bg-yellow-900/25 transition-colors"
            aria-expanded={showViolations}
            aria-controls="violations-list"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={15} aria-hidden="true" />
              {criticalCount > 0
                ? `${criticalCount} critical accessibility issue${criticalCount !== 1 ? 's' : ''} — fix before shipping`
                : `${a11yViolations.length} accessibility issue${a11yViolations.length !== 1 ? 's' : ''} found`
              }
            </span>
            {showViolations
              ? <ChevronUp size={15} aria-hidden="true" />
              : <ChevronDown size={15} aria-hidden="true" />
            }
          </button>

          {showViolations && (
            <ul id="violations-list" className="divide-y divide-gray-100 dark:divide-[var(--border)]">
              {a11yViolations.map((v) => (
                <li
                  key={v.id}
                  className={`p-4 border-l-4 ${getImpactBg(v.impact)}`}
                  style={{ borderLeftColor: undefined }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-xs font-bold uppercase ${getImpactColor(v.impact)}`}>
                        {v.impact} — {v.id}
                      </p>
                      <p className="text-sm text-gray-800 dark:text-[var(--text-primary)] mt-0.5 font-medium">
                        {v.help}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-[var(--text-muted)] mt-1">
                        {v.description} · Affects {v.nodes} element{v.nodes !== 1 ? 's' : ''}
                      </p>

                      <p className="text-xs text-gray-700 dark:text-[var(--text-secondary)] mt-2">
                        <span className="font-semibold">Plain language:</span> {explainViolationPlainLanguage(v)}
                      </p>

                      <div className="mt-2 space-y-1">
                        {getFixSuggestions(v).map((s) => (
                          <p key={s.title} className="text-xs text-gray-700 dark:text-[var(--text-secondary)]">
                            <span className="font-semibold">Fix:</span> {s.title} — {s.details}
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[var(--bg-panel)] text-[10px] uppercase tracking-wider">
                              {s.confidence} confidence
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Copy, ExternalLink, Check } from 'lucide-react'

interface GistExportSuccessProps {
  url: string
  language: string
  onClose?: () => void
}

export function GistExportSuccess({ url, language, onClose }: GistExportSuccessProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Auto-copy to clipboard on mount
    navigator.clipboard.writeText(url).catch(() => {
      // Silently fail if copy not available
    })
  }, [url])

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleOpenGist = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="card border-green-300 dark:border-green-700 bg-green-50/60 dark:bg-green-900/20 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <Check size={18} className="text-green-600 dark:text-green-400" aria-hidden="true" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">
            ✨ Gist Export Successful
          </p>
          <p className="text-xs text-green-700/90 dark:text-green-200/90 mb-3">
            Your {language} code has been exported to GitHub Gist. URL copied to clipboard.
          </p>

          {/* URL Display */}
          <div className="mb-3 p-2.5 rounded-lg bg-white dark:bg-[var(--bg-panel)] border border-green-200 dark:border-green-800/50 group hover:bg-green-50 dark:hover:bg-[var(--bg-panel)]/80 transition-colors">
            <p className="text-xs font-mono text-green-800 dark:text-green-300 break-all leading-snug">
              {url}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors text-xs font-medium group"
              aria-label="Copy Gist URL to clipboard"
            >
              {copied ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" />
                  <span>Copy URL</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenGist}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium"
              aria-label="Open Gist in GitHub"
            >
              <ExternalLink size={14} aria-hidden="true" />
              <span>Open on GitHub</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100/70 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-xs font-medium"
                aria-label="Dismiss success message"
              >
                <span>Dismiss</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

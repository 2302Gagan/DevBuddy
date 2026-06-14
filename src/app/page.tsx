'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { translate } from '@/lib/i18n'
import { Header } from '@/components/Header'
import { VoiceButton } from '@/components/VoiceButton'
import { CodeOutput } from '@/components/CodeOutput'
import { VoiceCommandsPanel } from '@/components/VoiceCommandsPanel'
import { GistExportSuccess } from '@/components/GistExportSuccess'
import { AnimatedMetricsDisplay } from '@/components/AnimatedMetricsDisplay'
import { ReasoningStepsFeedback, type ReasoningStep } from '@/components/ReasoningStepsFeedback'
import { OnboardingTooltip } from '@/components/OnboardingTooltip'
import { useVoice } from '@/hooks/useVoice'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useVoicePermission } from '@/hooks/useVoicePermission'
import { useVoiceCommandHandler, type PendingVoiceAction } from '@/hooks/useVoiceCommandHandler'
import { useVoiceTranscriptHandler } from '@/hooks/useVoiceTranscriptHandler'
import { lintAccessibility } from '@/lib/a11y'
import { LANGUAGES, MISSION_CARDS, VOICE_LOCALES } from '@/lib/page-config'
import type {
  InteractionMode, Language, CopilotResponse, Message,
  UiLanguage, VerbosityProfile, ContrastMode, PerceptionProfile,
  ThemePack, ConfirmationTier, TaskSource,
} from '@/lib/types'
import { Send, Trash2, ChevronDown, ArrowUpCircle, X } from 'lucide-react'
import { parseCopilotContent as parseCopilotContentFn, extractJsonStringField } from '@/lib/copilot-parser'
import { buildDiffSpeech } from '@/lib/code-diff'


interface PendingDisambiguation {
  rawCommand: string
  candidates: PendingVoiceAction[]
}

export default function HomePage() {
  // ── Persisted state via Zustand + localStorage persist middleware ─────────────
  const {
    language, setLanguage,
    uiLanguage, setUiLanguage,
    fontSize, setFontSize,
    context,
    messages,
    setMessages: storeSetMessages,
    speechRate, setSpeechRate,
    voiceLocale, setVoiceLocale,
    perceptionProfile, setPerceptionProfile,
    themePack, setThemePack,
    ambientEnabled, setAmbientEnabled,
    verbosityProfile, setVerbosityProfile,
    contrastMode, setContrastMode,
    requireConfirm, setRequireConfirm,
    confirmationTier, setConfirmationTier,
    voiceHistory,
    pushVoiceHistory,
    voiceHistoryIndex,
    setVoiceHistoryIndex,
    removeVoiceHistoryItem,
    clearVoiceHistory,
    hasCompletedOnboarding, setHasCompletedOnboarding,
    metrics,
    trackKeystroke: storeTrackKeystroke,
    trackMouseAction: storeTrackMouseAction,
    trackVoiceAction: storeTrackVoiceAction,
    addTaskRun,
  } = useAppStore()

  // setMessages adapter: preserves functional-updater call sites throughout the component
  const setMessages = useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      storeSetMessages(typeof updater === 'function' ? updater(messages) : updater)
    },
    [storeSetMessages, messages]
  )

  // ── Transient local UI state (not persisted) ──────────────────────────────────
  const [mode, setMode]               = useState<InteractionMode>('voice')
  const [intent, setIntent]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [isDark, setIsDark]           = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [manualListenOnce, setManualListenOnce] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingVoiceAction | null>(null)
  const [pendingDisambiguation, setPendingDisambiguation] = useState<PendingDisambiguation | null>(null)
  const [streamPreview, setStreamPreview] = useState('')
  const [streamSummaryPreview, setStreamSummaryPreview] = useState('')
  const [streamCodePreview, setStreamCodePreview] = useState('')
  const [latestGistUrl, setLatestGistUrl] = useState<string | null>(null)
  const [liveMessage, setLiveMessage] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [hasSpokenOnboarding, setHasSpokenOnboarding] = useState(false)
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([])
  const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2 | 3>(0)
  const textareaRef                   = useRef<HTMLTextAreaElement>(null)
  const outputRef                     = useRef<HTMLDivElement>(null)
  const speakRef                      = useRef<(text: string) => void>(() => {})
  const submitRef                     = useRef<(inputIntent: string, isVoiceCommand?: boolean, source?: TaskSource) => Promise<void>>(
    async () => {}
  )
  const summaryAnnouncedRef           = useRef(false)
  const codeAnnouncedRef              = useRef(false)
  const announceTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeTaskRef                 = useRef<{ source: TaskSource; mode: InteractionMode; startedAt: number; intent: string } | null>(null)
  const previousCodeRef               = useRef('')
  const ambientContextRef             = useRef<AudioContext | null>(null)
  const ambientOscillatorsRef         = useRef<OscillatorNode[]>([])
  const ambientGainRef                = useRef<GainNode | null>(null)
  const hardStopListeningRef          = useRef(false)

  const {
    voicePermission,
    showVoiceDisclaimer,
    setShowVoiceDisclaimer,
    requestVoicePermission: requestVoicePermissionRaw,
    continueWithoutVoice: continueWithoutVoiceRaw,
    forceDeniedPermission,
  } = useVoicePermission()

  // Sync dark mode state for SyntaxHighlighter
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])


  useEffect(() => {
    hardStopListeningRef.current = voicePermission !== 'granted'
  }, [voicePermission])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 480)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  useEffect(() => {
    if (perceptionProfile === 'default') return
    if (perceptionProfile === 'low-vision') {
      setContrastMode('max')
      setFontSize(18)
      setVerbosityProfile('standard')
      setThemePack('mono-pop')
      return
    }
    if (perceptionProfile === 'color-safe') {
      setContrastMode('high')
      setFontSize(16)
      setVerbosityProfile('compact')
      setThemePack('sunrise')
      return
    }
    if (perceptionProfile === 'screen-reader-first') {
      setContrastMode('high')
      setFontSize(17)
      setSpeechRate(0.85)
      setVerbosityProfile('detailed')
      setThemePack('bioluminescence')
    }
  }, [perceptionProfile])

  useEffect(() => {
    document.documentElement.setAttribute('data-contrast', contrastMode)
  }, [contrastMode])

  useEffect(() => {
    document.documentElement.lang = uiLanguage
  }, [uiLanguage])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-pack', themePack)
  }, [themePack])

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  const stopAmbientSound = useCallback(() => {
    ambientOscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop()
      } catch {
        // Ignore stop race conditions.
      }
    })
    ambientOscillatorsRef.current = []
    ambientGainRef.current?.disconnect()
    ambientGainRef.current = null
    if (ambientContextRef.current) {
      void ambientContextRef.current.close()
      ambientContextRef.current = null
    }
  }, [])

  const startAmbientSound = useCallback(async () => {
    if (ambientContextRef.current) return
    const Ctx = (globalThis.AudioContext || (globalThis as any).webkitAudioContext) as typeof AudioContext | undefined
    if (!Ctx) return
    const context = new Ctx()
    const gain = context.createGain()
    gain.gain.value = prefersReducedMotion ? 0.007 : 0.015
    gain.connect(context.destination)

    const base = context.createOscillator()
    base.type = 'sine'
    base.frequency.value = 142
    base.connect(gain)

    const shimmer = context.createOscillator()
    shimmer.type = 'triangle'
    shimmer.frequency.value = 214
    shimmer.connect(gain)

    const lfo = context.createOscillator()
    const lfoGain = context.createGain()
    lfo.type = 'sine'
    lfo.frequency.value = 0.2
    lfoGain.gain.value = prefersReducedMotion ? 0.0015 : 0.003
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)

    base.start()
    shimmer.start()
    lfo.start()

    ambientContextRef.current = context
    ambientGainRef.current = gain
    ambientOscillatorsRef.current = [base, shimmer, lfo]
  }, [prefersReducedMotion])

  useEffect(() => {
    if (ambientEnabled) {
      void startAmbientSound()
    } else {
      stopAmbientSound()
    }
    return () => {
      if (!ambientEnabled) return
      stopAmbientSound()
    }
  }, [ambientEnabled, startAmbientSound, stopAmbientSound])

  // Clean up AudioContext on component unmount to release browser audio resources
  useEffect(() => () => stopAmbientSound(), [])  // eslint-disable-line react-hooks/exhaustive-deps

  const t = useCallback((key: string) => translate(uiLanguage, key as any) || key, [uiLanguage])

  const requestVoicePermission = useCallback(async () => {
    const result = await requestVoicePermissionRaw()
    if (result.granted) {
      hardStopListeningRef.current = false
      setError(null)
      speakRef.current('Voice access enabled. You can now use microphone features.')
      return
    }

    hardStopListeningRef.current = true
    const blocked = result.errorName === 'NotAllowedError' || result.errorName === 'SecurityError'
    setError(blocked
      ? 'Microphone access is blocked. Please allow microphone permission in browser/site settings, then tap Allow Voice + Mic again.'
      : 'Microphone permission was denied. You can still use keyboard mode.')
  }, [requestVoicePermissionRaw])

  const continueWithoutVoice = useCallback(() => {
    continueWithoutVoiceRaw()
    hardStopListeningRef.current = true
    setManualListenOnce(false)
    setError(null)
  }, [continueWithoutVoiceRaw])

  const latestCode = messages.findLast(m => m.code)?.code
  const latestOutput = messages.findLast(m => m.role === 'assistant')
  const personaChecklist = [
    { label: t('voiceModeEnabled'), done: mode === 'voice' || mode === 'hybrid' },
    { label: t('intentCapturedVoice'), done: voiceHistory.length > 0 || metrics.voiceActions > 0 },
    { label: t('streamingSummaryAnnounced'), done: Boolean(latestOutput?.summary?.trim()) },
    { label: t('wcagAnalyzed'), done: Boolean(latestOutput?.code) && Array.isArray(latestOutput?.a11yViolations) },
    { label: t('historyAvailable'), done: voiceHistory.length > 0 },
    { label: t('exportReady'), done: Boolean(latestOutput?.code || latestGistUrl) },
  ]
  const personaCompletedCount = personaChecklist.filter(item => item.done).length
  const personaAllDone = personaCompletedCount === personaChecklist.length

  const trackMouseAction = useCallback(() => storeTrackMouseAction(), [storeTrackMouseAction])
  const trackVoiceAction = useCallback(() => storeTrackVoiceAction(), [storeTrackVoiceAction])
  const trackKeystroke = useCallback((key: string) => storeTrackKeystroke(key), [storeTrackKeystroke])

  const replayVoiceHistory = useCallback((direction: 'undo' | 'redo') => {
    if (voiceHistory.length === 0) {
      speakRef.current('No voice history yet.')
      return
    }

    if (direction === 'undo') {
      const target = Math.max(0, voiceHistoryIndex - 1)
      const item = voiceHistory[target]
      if (!item) return
      setVoiceHistoryIndex(target)
      setIntent(item.command)
      trackVoiceAction()
      setLiveMessage('Voice history undo replayed')
      speakRef.current(`Replaying: ${item.command}`)
      submitRef.current(item.command, true, 'voice')
      return
    }

    const target = Math.min(voiceHistory.length - 1, voiceHistoryIndex + 1)
    const item = voiceHistory[target]
    if (!item) return
    setVoiceHistoryIndex(target)
    setIntent(item.command)
    trackVoiceAction()
    setLiveMessage('Voice history redo replayed')
    speakRef.current(`Replaying: ${item.command}`)
    submitRef.current(item.command, true, 'voice')
  }, [voiceHistory, voiceHistoryIndex, trackVoiceAction])

  const replaySpecificVoiceCommand = useCallback((command: string) => {
    const index = voiceHistory.findLastIndex((entry) => entry.command === command)
    if (index >= 0) {
      setVoiceHistoryIndex(index)
    }
    setIntent(command)
    trackVoiceAction()
    setLiveMessage('Replaying saved voice command')
    speakRef.current(`Replaying: ${command}`)
    submitRef.current(command, true, 'voice')
  }, [voiceHistory, trackVoiceAction])


  const toSpokenSummary = useCallback((text: string) => {
    if (!text.trim()) return ''
    if (verbosityProfile === 'compact') {
      return text.split(/[.!?]/).map(s => s.trim()).filter(Boolean).slice(0, 1).join('. ') + '.'
    }
    if (verbosityProfile === 'detailed') {
      return text
    }
    return text.split(/[.!?]/).map(s => s.trim()).filter(Boolean).slice(0, 2).join('. ') + '.'
  }, [verbosityProfile])

  const speakWhereAmI = useCallback(() => {
    const outputState = latestOutput?.code ? 'Generated code is available.' : 'No generated code yet.'
    const pendingState = pendingAction ? `Pending action is ${pendingAction.type}.` : 'No pending protected action.'
    const base = `You are in DevBuddy. Interaction mode is ${mode}. Language is ${language}. ${outputState} ${pendingState}`

    if (verbosityProfile === 'compact') {
      speakRef.current(`Mode ${mode}. Language ${language}. ${latestOutput?.code ? 'Output ready.' : 'No output.'}`)
      return
    }

    if (verbosityProfile === 'detailed') {
      speakRef.current(`${base} Voice history has ${voiceHistory.length} commands. Confirmation tier is ${confirmationTier}.`)
      return
    }

    speakRef.current(base)
  }, [mode, language, latestOutput?.code, pendingAction, verbosityProfile, voiceHistory.length, confirmationTier])

  const speakDiffSinceLast = useCallback(() => {
    const current = latestOutput?.code || ''
    const previous = previousCodeRef.current
    if (!current) {
      speakRef.current('There is no generated code to diff yet.')
      return
    }
    if (!previous) {
      speakRef.current('This is the first generated code in the session, so there is no prior version to compare.')
      return
    }
    speakRef.current(buildDiffSpeech(current, previous, language, verbosityProfile))
  }, [latestOutput?.code, verbosityProfile, language])

  const isDestructiveAction = useCallback((action: PendingVoiceAction) => {
    return action.type === 'clear' || action.type === 'commit' || action.type === 'export-gist'
  }, [])

  const strictConfirmPhrase = useCallback((action: PendingVoiceAction) => {
    switch (action.type) {
      case 'clear': return 'confirm clear'
      case 'commit': return 'confirm commit'
      case 'export-gist': return 'confirm export gist'
      case 'export-file': return 'confirm export file'
      case 'run': return 'confirm run'
      case 'copy': return 'confirm copy'
    }
  }, [])

  const announce = useCallback((message: string) => {
    if (announceTimerRef.current) {
      clearTimeout(announceTimerRef.current)
    }
    announceTimerRef.current = setTimeout(() => {
      setLiveMessage(message)
      announceTimerRef.current = null
    }, 180)
  }, [])

  const parseCopilotContent = useCallback(
    (rawContent: string): CopilotResponse => parseCopilotContentFn(rawContent, language),
    [language],
  )

  const downloadLatestCode = useCallback(() => {
    const code = latestCode
    if (!code) return
    const extMap: Record<Language, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      dart: 'dart',
      swift: 'swift',
      kotlin: 'kt',
      java: 'java',
      css: 'css',
      html: 'html',
    }
    const extension = extMap[language] || 'txt'
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `devbuddy-output.${extension}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [latestCode, language])

  const exportLatestAsGist = useCallback(async () => {
    const code = latestCode
    if (!code) return null

    const response = await fetch('/api/gist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        language,
        description: `DevBuddy export (${language})`,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Failed to export gist' }))
      throw new Error(payload.error || 'Failed to export gist')
    }

    const payload = await response.json()
    return payload.url as string
  }, [latestCode, language])

  const handleSubmit = useCallback(async (inputIntent: string, isVoiceCommand = false, source?: TaskSource) => {
    if (!inputIntent.trim() || loading) return
    setError(null)
    setLatestGistUrl(null)
    setLoading(true)
    setStreamPreview('')
    setStreamSummaryPreview('')
    setStreamCodePreview('')
    setReasoningSteps([])
    summaryAnnouncedRef.current = false
    codeAnnouncedRef.current = false
    announce('Generating code')

    // Initialize reasoning pipeline
    const analyseStep: ReasoningStep = { step: 'analyse', status: 'active' }
    setReasoningSteps([analyseStep])

    // Transition to "Plan" step after 800ms
    const planTimeout = setTimeout(() => {
      setReasoningSteps(prev => [
        { ...prev[0]!, status: 'done' },
        { step: 'plan', status: 'active' },
      ])
    }, 800)

    activeTaskRef.current = {
      source: source || (isVoiceCommand ? 'voice' : 'typed'),
      mode,
      startedAt: Date.now(),
      intent: inputIntent,
    }

    const lastCode = messages.findLast(m => m.code)?.code

    try {
      const aiEndpoint = process.env.NEXT_PUBLIC_AI_BACKEND === 'azure' ? '/api/azure' : '/api/copilot'
      const res = await fetch(aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: inputIntent,
          language,
          projectContext: context || undefined,
          previousCode: lastCode,
          isVoiceCommand,
          stream: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Request failed')
      }

      let data: CopilotResponse
      let codeGenerationStarted = false

      if (res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let streamed = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue

            const payload = trimmed.slice(5).trim()
            if (!payload || payload === '[DONE]') continue

            try {
              const parsed = JSON.parse(payload)
              const delta = parsed.choices?.[0]?.delta?.content
                || parsed.choices?.[0]?.message?.content
                || ''
              if (delta) {
                streamed += delta
                setStreamPreview(streamed)

                const summaryPartial = extractJsonStringField(streamed, 'summary')
                const codePartial = extractJsonStringField(streamed, 'code')
                if (summaryPartial) {
                  setStreamSummaryPreview(summaryPartial)
                  if (!summaryAnnouncedRef.current) {
                    announce('Summary preview ready')
                    summaryAnnouncedRef.current = true
                  }
                }
                if (codePartial && !codeGenerationStarted) {
                  setStreamCodePreview(codePartial)
                  codeGenerationStarted = true
                  if (!codeAnnouncedRef.current) {
                    announce('Code stream started')
                    codeAnnouncedRef.current = true
                    // Transition to "Generate" step
                    clearTimeout(planTimeout)
                    setReasoningSteps(prev => {
                      const analyseStep = prev.find(s => s.step === 'analyse')
                      const planStep = prev.find(s => s.step === 'plan')
                      const newSteps: ReasoningStep[] = []
                      
                      if (analyseStep) {
                        newSteps.push({ step: 'analyse' as const, status: 'done' as const })
                      }
                      if (planStep) {
                        newSteps.push({ step: 'plan' as const, status: 'done' as const })
                      }
                      newSteps.push({ step: 'generate' as const, status: 'active' as const })
                      
                      return newSteps
                    })
                  }
                } else if (codePartial) {
                  setStreamCodePreview(codePartial)
                }
              }
            } catch {
              // Ignore malformed stream events.
            }
          }
        }

        data = parseCopilotContent(streamed)
      } else {
        data = await res.json()
      }

      // Run axe linter on the generated code
      const lintResult = await lintAccessibility(data.code, data.language || language)

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: inputIntent,
        timestamp: new Date(),
      }
      const newMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: toSpokenSummary(data.summary),
        code: data.code,
        language: data.language || language,
        summary: data.summary,
        a11yViolations: lintResult.violations,
        a11yLintSkipped: lintResult.skipped,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, userMessage, newMessage])

      // Mark all reasoning steps as done
      setReasoningSteps(prev => prev.map(s => ({ 
        step: s.step, 
        status: 'done' as const
      })))

      if (activeTaskRef.current) {
        const finishedAt = Date.now()
        const task = activeTaskRef.current
        addTaskRun({
          source: task.source,
          mode: task.mode,
          intent: task.intent,
          startedAt: task.startedAt,
          finishedAt,
          durationSeconds: Math.max(1, Math.round((finishedAt - task.startedAt) / 1000)),
        })
      }
      setIntent('')
      setStreamPreview('')
      setStreamSummaryPreview('')
      setStreamCodePreview('')
      announce('Code generated')

      // Scroll to output
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)

      // Auto-speak summary in voice/hybrid mode
      if (mode !== 'keyboard') {
        speakRef.current(toSpokenSummary(data.summary))
      }

      previousCodeRef.current = lastCode || ''

    } catch (err: any) {
      clearTimeout(planTimeout)
      setReasoningSteps([])
      setStreamPreview('')
      setStreamSummaryPreview('')
      setStreamCodePreview('')
      const message = err.message || 'Something went wrong. Check your API key.'
      setError(message)
      announce('Generation failed')
      if (mode !== 'keyboard') speakRef.current(`Error: ${message}`)
    } finally {
      activeTaskRef.current = null
      setLoading(false)
    }
  }, [loading, language, context, messages, mode, parseCopilotContent, announce, toSpokenSummary])

  useEffect(() => {
    submitRef.current = handleSubmit
  }, [handleSubmit])

  const executePendingAction = useCallback(async (action: PendingVoiceAction) => {
    if (action.type === 'clear') {
      setMessages([])
      setIntent('')
      setLatestGistUrl(null)
      announce('Session cleared')
      speakRef.current('Cleared. Ready for a new request.')
      return
    }

    if (!latestCode) {
      speakRef.current('No code to work with yet. Try asking me to create something first.')
      return
    }

    if (action.type === 'copy') {
      await navigator.clipboard.writeText(latestCode)
      announce('Code copied to clipboard')
      speakRef.current('Code copied to clipboard.')
      return
    }

    if (action.type === 'export-file') {
      downloadLatestCode()
      announce('Downloaded code file')
      speakRef.current('Downloaded the generated code as a local file.')
      return
    }

    if (action.type === 'export-gist') {
      const url = await exportLatestAsGist()
      if (url) {
        await navigator.clipboard.writeText(url)
        setLatestGistUrl(url)
        announce('Gist exported and copied')
        speakRef.current('Exported to GitHub Gist. The URL is copied to your clipboard.')
      }
      return
    }

    if (action.type === 'run') {
      handleSubmit(
        `Provide exact commands to run and test this ${language} code in a typical project setup. Keep it short and practical.`,
        true,
        'voice'
      )
      return
    }

    if (action.type === 'commit') {
      handleSubmit(
        `Generate a conventional commit message and minimal git commands to commit this ${language} code safely.`,
        true,
        'voice'
      )
    }
  }, [latestCode, language, downloadLatestCode, exportLatestAsGist, handleSubmit, announce])

  const handleExportGistFromUI = useCallback(async () => {
    try {
      const url = await exportLatestAsGist()
      if (!url) return
      await navigator.clipboard.writeText(url)
      setLatestGistUrl(url)
      if (mode !== 'keyboard') {
        speakRef.current('Exported to GitHub Gist. The URL is copied to your clipboard.')
      }
      announce('Gist exported and copied')
    } catch (err: any) {
      setError(err.message || 'Failed to export gist')
      if (mode !== 'keyboard') {
        speakRef.current('Sorry, gist export failed.')
      }
      throw err
    }
  }, [exportLatestAsGist, mode, announce])

  const handleVoiceCommand = useVoiceCommandHandler({
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
    speak: (text: string) => speakRef.current(text),
  })

  const handleVoiceTranscript = useVoiceTranscriptHandler({
    manualListenOnce,
    setManualListenOnce,
    setHardStopListening: (value: boolean) => {
      hardStopListeningRef.current = value
    },
    stopListening: () => voice.stopListening(),
    speak: (text: string) => speakRef.current(text),
    pushVoiceHistory,
    setIntent,
    trackVoiceAction,
    handleSubmit,
  })

  const voice = useVoice({
    onTranscript: handleVoiceTranscript,
    onCommand: handleVoiceCommand,
    onError: (errorType) => {
      if (errorType !== 'not-allowed') return
      hardStopListeningRef.current = true
      setManualListenOnce(false)
      forceDeniedPermission(true)
      setError('Microphone access is blocked. Please allow mic permission to use voice.')
    },
    language: voiceLocale,
    speechRate,
  })

  useEffect(() => {
    speakRef.current = voice.speak
  }, [voice.speak])

  useEffect(() => {
    if (hasSpokenOnboarding || !voice.isSupported) return
    const t = setTimeout(() => {
      speakRef.current(
        'DevBuddy is ready in voice-first mode. Say help to hear commands. Say where am I for context, or start by describing what to build.'
      )
      setHasSpokenOnboarding(true)
    }, 700)
    return () => clearTimeout(t)
  }, [hasSpokenOnboarding, voice.isSupported])

  // Initialize onboarding for first-time users
  useEffect(() => {
    if (hasCompletedOnboarding) return
    // Delay onboarding to let page settle
    const t = setTimeout(() => {
      setOnboardingStep(1)
    }, 1500)
    return () => clearTimeout(t)
  }, [hasCompletedOnboarding])

  const startManualListening = useCallback(() => {
    if (voicePermission !== 'granted') {
      setShowVoiceDisclaimer(true)
      return
    }
    hardStopListeningRef.current = false
    setManualListenOnce(true)
    voice.startListening()
  }, [voicePermission, setShowVoiceDisclaimer, voice])

  const stopManualListening = useCallback(() => {
    hardStopListeningRef.current = true
    setManualListenOnce(false)
    voice.stopListening()
  }, [voice])

  useKeyboardShortcuts({
    hasLatestCode: Boolean(latestCode),
    onToggleMic: () => {
      if (voice.voiceState === 'listening') {
        stopManualListening()
      } else {
        startManualListening()
      }
    },
    onStopVoice: () => {
      stopManualListening()
      voice.cancelSpeech()
    },
    onSubmit: () => { handleSubmit(intent) },
    onCopyCode: () => { executePendingAction({ type: 'copy' }).catch(() => {}) },
    onExportCode: () => { executePendingAction({ type: 'export-file' }).catch(() => {}) },
    onUndoReplay: () => replayVoiceHistory('undo'),
    onRedoReplay: () => replayVoiceHistory('redo'),
    onSpeakWhereAmI: speakWhereAmI,
    onSpeakDiff: speakDiffSinceLast,
  })

  const assistantMood =
    voice.voiceState === 'listening' ? { emoji: '👂', label: 'Listening' }
      : voice.voiceState === 'speaking' ? { emoji: '🗣️', label: 'Speaking' }
        : loading ? { emoji: '⚙️', label: 'Thinking' }
          : error ? { emoji: '😵', label: 'Needs help' }
            : { emoji: '😊', label: 'Ready' }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {showVoiceDisclaimer && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg card !p-6 border-teal-300 dark:border-teal-700" role="dialog" aria-modal="true" aria-labelledby="voice-disclaimer-title">
            <p id="voice-disclaimer-title" className="text-sm font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
              {t('permissionTitle')}
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-[var(--text-secondary)] leading-relaxed">
              {t('permissionBody')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={requestVoicePermission}
                className="btn-primary !py-2 !px-3"
                aria-label={t('allowMicAria')}
              >
                {t('enableVoice')}
              </button>
              <button
                onClick={continueWithoutVoice}
                className="btn-secondary !py-2 !px-3"
                aria-label={t('continueWithoutMicAria')}
              >
                {t('continueWithoutVoice')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding tooltip flow */}
      <OnboardingTooltip
        step={onboardingStep}
        onNext={() => setOnboardingStep((s) => Math.min(3, s + 1) as any)}
        onComplete={() => {
          setOnboardingStep(0)
          setHasCompletedOnboarding(true)
        }}
        onSkip={() => {
          setOnboardingStep(0)
          setHasCompletedOnboarding(true)
        }}
      />

      <Header
        mode={mode}
        onModeChange={() => setMode('voice')}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        voiceState={voice.voiceState}
        alwaysVoice
      />

      {/* Skip nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-16 focus:left-4
                   focus:z-50 focus:px-4 focus:py-2 focus:bg-yellow-400 focus:text-gray-900
                   focus:rounded-lg focus:font-semibold focus:text-sm"
      >
        {t('skipToMain')}
      </a>

      <main
        id="main-content"
        className="flex-1 w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_250px] xl:grid-cols-[320px_minmax(0,1fr)_290px] gap-6 relative"
      >
        {/* Full website sonar rings background */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: -1 }} aria-hidden="true">
          <div className="absolute w-96 h-96 rounded-full border border-teal-300/10 dark:border-teal-500/8 sonar-ring" style={{ animationDelay: '0s' }} />
          <div className="absolute w-96 h-96 rounded-full border border-teal-300/8 dark:border-teal-500/6 sonar-ring" style={{ animationDelay: '1.2s' }} />
          <div className="absolute w-96 h-96 rounded-full border border-teal-300/6 dark:border-teal-500/4 sonar-ring" style={{ animationDelay: '2.4s' }} />
        </div>

        {/* ── Left panel ─────────────────────────────────────────────────────── */}
        <aside
          className="flex flex-col gap-4"
          aria-label={t('inputControlsAria')}
        >
          <div className="card flex flex-col items-center gap-4 py-8 relative overflow-hidden">
            {/* Decorative sonar rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <div className="w-24 h-24 rounded-full border border-teal-300/20 dark:border-teal-500/15 sonar-ring" style={{ animationDelay: '0s' }} />
              <div className="absolute w-24 h-24 rounded-full border border-teal-300/15 dark:border-teal-500/10 sonar-ring" style={{ animationDelay: '0.9s' }} />
            </div>
            <p className="text-sm font-black text-gray-800 dark:text-[var(--text-primary)] uppercase tracking-widest">{t('voiceInput')}</p>
            <div data-onboard="mic-button">
              <VoiceButton
                voiceState={voice.voiceState}
                isSupported={voice.isSupported}
                transcript={voice.transcript}
                onStart={() => {
                  trackMouseAction()
                  startManualListening()
                }}
                onStop={() => {
                  trackMouseAction()
                  stopManualListening()
                }}
                onCancelSpeech={() => { trackMouseAction(); voice.cancelSpeech() }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-[var(--text-muted)] text-center">
              Tap the mic button or press Space to start listening.
            </p>
            <div className="mt-1 flex items-center gap-2 rounded-full border border-teal-300 dark:border-teal-700 px-3 py-1 bg-teal-50 dark:bg-teal-900/50">
              <span className="text-lg" aria-hidden="true">{assistantMood.emoji}</span>
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">{assistantMood.label}</span>
            </div>
          </div>

          {/* Voice settings */}
          <div className="card">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-[var(--text-muted)] uppercase tracking-widest mb-3">
              {t('voiceSettings')}
            </p>
            <label htmlFor="voice-locale" className="block text-xs text-gray-600 dark:text-[var(--text-muted)] mb-1">
              {t('voiceInputLanguage')}
            </label>
            <select
              id="voice-locale"
              value={voiceLocale}
              onChange={(e) => { trackMouseAction(); setVoiceLocale(e.target.value) }}
              className="input-field !py-2 text-xs"
            >
              {VOICE_LOCALES.map((loc) => (
                <option key={loc.value} value={loc.value}>{loc.label}</option>
              ))}
            </select>

            <label htmlFor="ui-language" className="block text-xs text-gray-600 dark:text-[var(--text-muted)] mt-3 mb-1">
              {t('interfaceLanguage')}
            </label>
            <select
              id="ui-language"
              value={uiLanguage}
              onChange={(e) => { trackMouseAction(); setUiLanguage(e.target.value as UiLanguage) }}
              className="input-field !py-2 text-xs"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>

            <div className="mt-3 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-900/20 p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Mic behavior</p>
              <p className="text-xs text-teal-700/90 dark:text-teal-200 mt-1">Listening starts only when you tap the mic button and stops after one utterance or when you tap stop.</p>
            </div>

            <label htmlFor="speech-rate" className="block text-xs text-gray-600 dark:text-[var(--text-muted)] mt-3 mb-1">
              {t('speechRate')}: <span className="font-bold text-teal-600 dark:text-teal-400">{speechRate.toFixed(1)}x</span>
            </label>
            <input
              id="speech-rate"
              type="range"
              min={0.6}
              max={1.4}
              step={0.1}
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              onPointerUp={trackMouseAction}
              className="w-full accent-teal-500"
              aria-label={t('speechRateAria')}
              aria-valuemin={0.6}
              aria-valuemax={1.4}
              aria-valuenow={speechRate}
              aria-valuetext={`${(speechRate * 100).toFixed(0)}% speech rate`}
            />
            <div className="flex justify-between text-[10px] text-gray-400 dark:text-[var(--text-muted)] mt-0.5 px-0.5">
              <span>Slow</span>
              <span>Fast</span>
            </div>

            <label htmlFor="verbosity-profile" className="block text-xs text-gray-600 dark:text-[var(--text-muted)] mt-3 mb-1">
              {t('screenReaderVerbosity')}
            </label>
            <select
              id="verbosity-profile"
              value={verbosityProfile}
              onChange={(e) => { trackMouseAction(); setVerbosityProfile(e.target.value as VerbosityProfile) }}
              className="input-field !py-2 text-xs"
            >
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
            </select>

            <div className="flex flex-col gap-1.5 mt-3">
              <button
                onClick={() => { trackMouseAction(); speakWhereAmI() }}
                className="btn-secondary !px-3 !py-2 !text-xs w-full text-left"
                aria-label={t('whereAmIAria')}
                title={t('whereAmIAria')}
              >
                <span className="font-semibold">{t('whereAmI')}</span>
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">Reads your current location &amp; app state aloud</span>
              </button>
              <button
                onClick={() => { trackMouseAction(); speakDiffSinceLast() }}
                className="btn-secondary !px-3 !py-2 !text-xs w-full text-left"
                aria-label={t('readDiffAria')}
                title={t('readDiffAria')}
              >
                <span className="font-semibold">{t('readDiff')}</span>
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">Speaks what changed since the last generated code</span>
              </button>
            </div>
            <label className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={requireConfirm}
                onChange={(e) => setRequireConfirm(e.target.checked)}
                onClick={trackMouseAction}
                className="mt-0.5"
                aria-label={t('requireConfirmAria')}
              />
              <span>{t('requireConfirmHelp')}</span>
            </label>

            <label htmlFor="confirm-tier" className="block text-xs text-gray-600 dark:text-[var(--text-muted)] mt-3 mb-1">
              {t('confirmationTier')}
            </label>
            <select
              id="confirm-tier"
              value={confirmationTier}
              onChange={(e) => { trackMouseAction(); setConfirmationTier(e.target.value as ConfirmationTier) }}
              className="input-field !py-2 text-xs"
            >
              <option value="standard">{t('confirmStandard')}</option>
              <option value="strict">{t('confirmStrict')}</option>
            </select>
          </div>

          {/* Language selector */}
          <div className="card">
            <label
              htmlFor="language-select"
              className="block text-xs font-semibold text-gray-600 dark:text-[var(--text-muted)] uppercase tracking-wider mb-2"
            >
              {t('languageLabel')}
            </label>
            <div className="relative">
              <select
                id="language-select"
                value={language}
                onChange={e => { trackMouseAction(); setLanguage(e.target.value as Language) }}
                className="input-field appearance-none pr-8"
              >
                {LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>


          {/* Persona journey checklist */}
          <div className={`card border-2 ${personaAllDone ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-teal-200 dark:border-teal-800'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-gray-800 dark:text-[var(--text-primary)] uppercase tracking-wider">
                {t('personaJourney')}
              </p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${personaAllDone ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200' : 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200'}`}>
                {personaCompletedCount}/{personaChecklist.length}
              </span>
            </div>

            <ul className="mt-3 space-y-2.5" aria-label={t('personaJourney')}>
              {personaChecklist.map((item) => (
                <li
                  key={item.label}
                  className={`flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition-all ${item.done ? 'border-emerald-300 bg-emerald-100/80 dark:border-emerald-700 dark:bg-emerald-900/35' : 'border-gray-200 bg-white dark:border-[var(--border)] dark:bg-[var(--bg-panel)]'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-black ${item.done ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.45)] animate-[pulse_1.6s_ease-in-out_1]' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}
                  >
                    {item.done ? '✓' : '○'}
                  </span>
                  <span className={`text-xs leading-snug ${item.done ? 'font-bold text-emerald-900 dark:text-emerald-200' : 'font-medium text-gray-600 dark:text-[var(--text-secondary)]'}`}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            <p className={`mt-3 text-[11px] font-semibold ${personaAllDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-teal-700 dark:text-teal-300'}`}>
              {personaAllDone ? 'Journey complete. Demo-ready accessibility flow achieved.' : 'Progress updates live as you generate, validate, and export.'}
            </p>
          </div>

          {pendingDisambiguation && (
            <div className="card border-orange-300 dark:border-orange-700">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider mb-1">
                {t('clarificationNeeded')}
              </p>
              <p className="text-xs text-orange-800 dark:text-orange-200">
                {t('ambiguousCommandBody')}
              </p>
            </div>
          )}

          {/* Commands */}
          <div className="flex justify-start">
            <VoiceCommandsPanel />
          </div>
        </aside>

        {/* ── Right panel ────────────────────────────────────────────────────── */}
        <section
          aria-label={t('codeGenerationAria')}
          className="flex flex-col gap-4"
        >
          <div className={`card !py-3.5 transition-all duration-300 ${
            loading ? 'border-l-4 border-l-yellow-400 dark:border-l-yellow-500 shadow-lg shadow-yellow-500/20' :
            error ? 'border-l-4 border-l-red-400 dark:border-l-red-500 shadow-lg shadow-red-500/20' :
            latestOutput?.code ? 'border-l-4 border-l-teal-400 dark:border-l-teal-500 shadow-lg shadow-teal-500/20' : ''
          }`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-[var(--text-muted)]">
                {t('responseStatus')}
              </p>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
                loading
                  ? 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200'
                  : error
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                    : latestOutput?.code
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  loading ? 'bg-yellow-500 animate-pulse' :
                  error ? 'bg-red-500' :
                  latestOutput?.code ? 'bg-teal-500' : 'bg-gray-400'
                }`} aria-hidden="true" />
                {loading
                  ? t('statusGenerating')
                  : error
                    ? t('statusError')
                    : latestOutput?.code
                      ? t('statusReady')
                      : t('statusIdle')}
              </span>
            </div>
          </div>

          {/* Intent input */}
          <div className="card" data-onboard="intent-input">
            <label
              htmlFor="intent-input"
              className="block text-xs font-semibold text-gray-600 dark:text-[var(--text-muted)] uppercase tracking-wider mb-2"
            >
              {t('whatToBuild')}
            </label>
            <div className="flex gap-2">
              <textarea
                id="intent-input"
                ref={textareaRef}
                value={intent}
                onChange={e => setIntent(e.target.value)}
                onKeyDown={e => {
                  trackKeystroke(e.key)
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault()
                    handleSubmit(intent)
                  }
                }}
                placeholder={t('intentPlaceholder')}
                rows={3}
                className="input-field resize-none flex-1"
                style={{ fontSize: `${fontSize}px` }}
                aria-describedby="intent-hint"
                disabled={loading}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { trackMouseAction(); handleSubmit(intent) }}
                  disabled={!intent.trim() || loading}
                  aria-label={t('generateCodeAria')}
                  className="btn-primary !px-3 h-full"
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    : <Send size={16} aria-hidden="true" />
                  }
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={() => { trackMouseAction(); setMessages([]) }}
                    aria-label={t('clearMessagesAria')}
                    className="btn-secondary !px-3 !py-2"
                    title={t('clearTitle')}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <p
              id="intent-hint"
              className="text-xs text-gray-400 dark:text-[var(--text-muted)] mt-1.5"
            >
              {t('submitPrefix')} <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-[var(--bg-panel)]
                           border border-gray-200 dark:border-[var(--border)] font-mono text-xs">Ctrl+Enter</kbd> {t('submitSuffix')}
            </p>
          </div>

          {/* Error */}
          {/* Error aria-live announcement */}
          {error && (
            <div role="alert" aria-live="assertive" className="sr-only">
              Error: {error}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                         text-sm text-red-700 dark:text-red-400"
            >
              <strong>{t('errorLabel')}:</strong> {error}
            </div>
          )}

          {latestGistUrl && (
            <GistExportSuccess 
              url={latestGistUrl} 
              language={language} 
              onClose={() => setLatestGistUrl(null)}
            />
          )}

          {/* Reasoning pipeline feedback */}
          {(loading || reasoningSteps.length > 0) && (
            <ReasoningStepsFeedback steps={reasoningSteps} intent={intent} />
          )}

          {/* Loading skeleton */}
          {loading && (
            <div
              aria-live="polite"
              aria-label={t('generatingAccessible')}
              className="card space-y-3 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-[var(--bg-panel)] rounded w-1/3" />
              <div className="h-4 bg-gray-200 dark:bg-[var(--bg-panel)] rounded w-2/3" />
              <div className="h-32 bg-gray-100 dark:bg-[var(--bg-panel)] rounded" />
              <p className="text-xs text-gray-400 dark:text-[var(--text-muted)] text-center">
                {t('generatingAccessible')} {language}…
              </p>

              {(streamSummaryPreview || streamCodePreview) && (
                <div className="space-y-2">
                  {streamSummaryPreview && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        {t('summaryStreaming')}
                      </p>
                      <p className="text-xs text-gray-700 dark:text-[var(--text-secondary)] whitespace-pre-wrap max-h-16 overflow-y-auto">
                        {streamSummaryPreview.slice(-280)}
                      </p>
                    </div>
                  )}
                  {streamCodePreview && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        {t('codeStreaming')}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-[var(--text-secondary)] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {streamCodePreview.slice(-520)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!streamSummaryPreview && !streamCodePreview && streamPreview && (
                <p className="text-xs text-gray-500 dark:text-[var(--text-muted)] italic">
                  Receiving response, formatting preview...
                </p>
              )}
            </div>
          )}

          {/* Assistive impact + evidence panel — only shown after first interaction */}
          {(metrics.voiceActions > 0 || metrics.keystrokes > 0 || metrics.mouseActions > 0) && (
            <AnimatedMetricsDisplay 
              keystrokes={Math.max(0, metrics.voiceActions * 28 - metrics.keystrokes)}
              mouseActions={Math.max(0, metrics.voiceActions * 3 - metrics.mouseActions)}
              voiceActions={metrics.voiceActions}
            />
          )}

          {/* Output */}
          {latestOutput?.code && !loading && (
            <div ref={outputRef} className="space-y-4">
              <CodeOutput
                code={latestOutput.code}
                language={latestOutput.language!}
                summary={latestOutput.summary!}
                a11yViolations={latestOutput.a11yViolations ?? []}
                a11yLintSkipped={latestOutput.a11yLintSkipped}
                fontSize={fontSize}
                isDark={isDark}
                onSpeak={voice.speak}
                onExportFile={() => { trackMouseAction(); downloadLatestCode() }}
                onExportGist={async () => { trackMouseAction(); await handleExportGistFromUI() }}
              />
              

            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div
              className="flex-1 flex flex-col items-center justify-center py-16 text-center"
              aria-live="polite"
            >
              <div
                className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/30
                           flex items-center justify-center text-3xl mb-4
                           shadow-[0_0_28px_rgba(11,163,180,0.18)] dark:shadow-[0_0_32px_rgba(25,200,212,0.22)]
                           animate-[pulse_3s_ease-in-out_infinite]"
                aria-hidden="true"
              >
                🤖
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-[var(--text-primary)] mb-1">
                {t('readyWhenYouAre')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-[var(--text-muted)] max-w-sm">
                {t('emptyDescription')}
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-2 font-medium">
                {voice.isSupported ? `🎤 ${t('voiceReady')}` : `🎤 ${t('voiceUnsupported')}`}
              </p>
              {/* Animated example prompts */}
              <div className="mt-8 w-full max-w-md">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[var(--text-muted)] mb-3">Try asking...</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { icon: '🦋', text: 'Create a Flutter login form with ARIA labels' },
                    { icon: '🐍', text: 'Write a Python CSV parser with error handling' },
                    { icon: '⚛️', text: 'Build an accessible React modal dialog' },
                    { icon: '🍎', text: 'Swift UITableView with VoiceOver support' },
                  ].map((example, i) => (
                    <button
                      key={example.text}
                      type="button"
                      onClick={() => { setIntent(example.text); textareaRef.current?.focus() }}
                      style={{ animationDelay: `${i * 120}ms` }}
                      className="flex items-center gap-3 rounded-xl border border-teal-100 dark:border-teal-900/60
                                 bg-teal-50/60 dark:bg-teal-950/30 px-3 py-2.5 text-left
                                 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/60
                                 transition-all animate-[fadeIn_0.4s_ease-out_both]"
                    >
                      <span className="text-lg shrink-0" aria-hidden="true">{example.icon}</span>
                      <span className="text-xs text-gray-600 dark:text-[var(--text-secondary)] text-left">{example.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Appearance panel ─────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4" aria-label="Appearance settings">
          <div className="card">
            <div className="flex items-center gap-2 mb-3.5 pb-3 border-b border-gray-100 dark:border-[var(--border)]">
              <span className="text-base" aria-hidden="true">🎨</span>
              <p className="text-xs font-bold text-gray-700 dark:text-[var(--text-secondary)] uppercase tracking-wider">
                Appearance
              </p>
            </div>

            <label htmlFor="contrast-mode-right" className="block text-xs text-gray-600 dark:text-[var(--text-muted)] mb-1">
              Contrast mode
            </label>
            <select
              id="contrast-mode-right"
              value={contrastMode}
              onChange={(e) => { trackMouseAction(); setContrastMode(e.target.value as ContrastMode) }}
              className="input-field !py-2 text-xs"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="max">Maximum</option>
            </select>

            <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Quick contrast presets">
              {([
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
                { value: 'max', label: 'Max' },
              ] as const).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => { trackMouseAction(); setContrastMode(item.value) }}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    contrastMode === item.value
                      ? 'border-teal-500 bg-teal-100 text-teal-800 dark:border-teal-400 dark:bg-teal-900/40 dark:text-teal-200'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-[var(--border)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-panel)]'
                  }`}
                  aria-pressed={contrastMode === item.value}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label htmlFor="perception-profile-right" className="block text-xs text-gray-600 dark:text-[var(--text-muted)] mt-3 mb-1">
              {t('perceptionProfile')}
            </label>
            <select
              id="perception-profile-right"
              value={perceptionProfile}
              onChange={(e) => { trackMouseAction(); setPerceptionProfile(e.target.value as PerceptionProfile) }}
              className="input-field !py-2 text-xs"
            >
              <option value="default">Default</option>
              <option value="low-vision">Low Vision</option>
              <option value="color-safe">Color Vision Deficiency</option>
              <option value="screen-reader-first">Screen Reader First</option>
            </select>

            <label htmlFor="theme-pack-right" className="block text-xs text-gray-600 dark:text-[var(--text-muted)] mt-3 mb-1">
              {t('themePack')}
            </label>
            <select
              id="theme-pack-right"
              value={themePack}
              onChange={(e) => { trackMouseAction(); setThemePack(e.target.value as ThemePack) }}
              className="input-field !py-2 text-xs"
            >
              <option value="bioluminescence">Bioluminescence</option>
              <option value="sunrise">Sunrise Contrast</option>
              <option value="mono-pop">Mono Pop</option>
            </select>

            <label className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={ambientEnabled}
                onChange={(e) => setAmbientEnabled(e.target.checked)}
                onClick={trackMouseAction}
                className="mt-0.5"
                aria-label={t('ambientAria')}
              />
              <span>
                {t('ambientSoundscape')}
                {prefersReducedMotion ? ' (reduced intensity due to motion preference)' : ''}
              </span>
            </label>
          </div>

          {/* Voice history replay */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3.5 pb-3 border-b border-gray-100 dark:border-[var(--border)]">
              <span className="text-base" aria-hidden="true">🔁</span>
              <p className="text-xs font-bold text-gray-700 dark:text-[var(--text-secondary)] uppercase tracking-wider">
                {t('voiceReplay')}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-[var(--text-muted)] mb-3">
              {t('replayHint')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { trackMouseAction(); replayVoiceHistory('undo') }}
                className="btn-secondary !px-3 !py-2 !text-xs"
                aria-label={t('undoReplayAria')}
              >
                {t('undoReplay')}
              </button>
              <button
                onClick={() => { trackMouseAction(); replayVoiceHistory('redo') }}
                className="btn-secondary !px-3 !py-2 !text-xs"
                aria-label={t('redoReplayAria')}
              >
                {t('redoReplay')}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500 dark:text-[var(--text-muted)]">
                {t('historySize')}: {voiceHistory.length}
              </p>
              {voiceHistory.length > 0 && (
                <button
                  onClick={() => { trackMouseAction(); clearVoiceHistory() }}
                  className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                  aria-label="Clear all voice history"
                >
                  <Trash2 size={10} aria-hidden="true" />
                  Clear all
                </button>
              )}
            </div>
            {voiceHistory.length > 0 && (
              <div className="mt-4 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-900/15 p-2.5">
                <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                    {t('voiceConstellation')}
                  </p>
                  <p className="text-[9px] text-teal-600/70 dark:text-teal-300/70 mt-1">
                    Visual timeline of your last 10 voice commands
                  </p>
                </div>
                <svg viewBox="0 0 220 100" className="w-full h-24" aria-hidden="true">
                  {[...voiceHistory].reverse().slice(0, 10).map((item, idx, arr) => {
                    const x = 16 + idx * 21
                    const y = 50 + Math.sin(idx * 1.35) * 24
                    const nextX = idx < arr.length - 1 ? 16 + (idx + 1) * 21 : null
                    const nextY = idx < arr.length - 1 ? 50 + Math.sin((idx + 1) * 1.35) * 24 : null
                    return (
                      <g key={item.id}>
                        {nextX !== null && nextY !== null && (
                          <line x1={x} y1={y} x2={nextX} y2={nextY} stroke="currentColor" className="text-teal-300/60 dark:text-teal-700/60" strokeWidth="1" />
                        )}
                        <circle cx={x} cy={y} r="3.5" className="fill-teal-500 dark:fill-teal-300" />
                      </g>
                    )
                  })}
                </svg>
              </div>
            )}
            {voiceHistory.length > 0 && (
              <ul className="mt-3 max-h-40 overflow-y-auto space-y-1.5" aria-label={t('replayHistoryAria')}>
                {[...voiceHistory].reverse().slice(0, 10).map((item) => (
                  <li key={item.id} className="flex gap-1.5">
                    <button
                      onClick={() => {
                        trackMouseAction()
                        replaySpecificVoiceCommand(item.command)
                      }}
                      aria-label={`Replay voice command from ${new Date(item.timestamp).toLocaleTimeString()}: ${item.command}`}
                      className="flex-1 text-left rounded-lg border border-gray-200 dark:border-[var(--border)] px-2.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-[var(--bg-panel)]"
                    >
                      <span className="font-mono text-teal-700 dark:text-teal-300" aria-hidden="true">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <span className="block mt-0.5 text-gray-700 dark:text-[var(--text-secondary)] line-clamp-2" aria-hidden="true">{item.command}</span>
                    </button>
                    <button
                      onClick={() => {
                        trackMouseAction()
                        removeVoiceHistoryItem(item.id)
                      }}
                      className="shrink-0 rounded-lg border border-gray-200 dark:border-[var(--border)] px-2 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:hover:border-red-800 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                      aria-label={`Delete voice command from ${new Date(item.timestamp).toLocaleTimeString()}: ${item.command}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Mission launchers */}
          <div className="card mt-8" data-onboard="mission-cards">
            <div className="flex items-center gap-2 mb-3.5 pb-3 border-b border-gray-100 dark:border-[var(--border)]">
              <span className="text-lg" aria-hidden="true">⚡</span>
              <p className="text-xs font-bold text-gray-700 dark:text-[var(--text-secondary)] uppercase tracking-wider">
                {t('missionLaunchers')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {MISSION_CARDS.map((card) => (
                <button
                  key={card.title}
                  onClick={() => { trackMouseAction(); setIntent(card.prompt); handleSubmit(card.prompt) }}
                  className="rounded-xl border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/40 dark:to-[var(--bg-panel)] p-3 text-left hover:shadow-[0_0_14px_rgba(11,163,180,0.18)] transition-all"
                >
                  <p className="text-lg" aria-hidden="true">{card.emoji}</p>
                  <p className="text-xs font-bold text-teal-700 dark:text-teal-300 mt-1">{card.title}</p>
                  <p className="text-[11px] text-gray-600 dark:text-[var(--text-muted)] mt-1 line-clamp-2">{card.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-5 right-5 z-50 rounded-full p-2.5 bg-teal-500 text-white shadow-lg hover:bg-teal-600 focus-visible:ring-2 focus-visible:ring-yellow-400"
          aria-label={t('backToTop')}
          title={t('backToTop')}
        >
          <ArrowUpCircle size={22} aria-hidden="true" />
        </button>
      )}

      {/* Live region for screen readers */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only" id="live-announcer">{liveMessage}</div>
    </div>
  )
}

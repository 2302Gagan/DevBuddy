import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Language, UiLanguage, VerbosityProfile, ContrastMode, PerceptionProfile,
  ThemePack, ConfirmationTier, TaskSource, InteractionMode,
  Message, VoiceHistoryEntry, AssistiveMetrics, TaskRun,
} from '@/lib/types'

// ── Storage with size guard ───────────────────────────────────────────────────
// localStorage has a 5 MB limit per origin. We cap at 4 MB to leave headroom.
// When the serialized payload exceeds the cap we trim the oldest messages first.

const MAX_BYTES = 4 * 1024 * 1024

function safeSetItem(key: string, value: string): void {
  try {
    if (value.length > MAX_BYTES) {
      // Parse → trim messages → re-serialize and try again.
      try {
        const parsed = JSON.parse(value) as { state?: { messages?: Message[] } }
        const messages = parsed?.state?.messages ?? []
        const trimmed = messages.slice(Math.ceil(messages.length / 2))
        parsed.state = { ...parsed.state, messages: trimmed }
        const smaller = JSON.stringify(parsed)
        localStorage.setItem(key, smaller)
        return
      } catch {
        // If trimming fails just skip persisting this cycle.
        console.warn('[DevBuddy] Session too large to save, skipping.')
        return
      }
    }
    localStorage.setItem(key, value)
  } catch (err) {
    // Quota exceeded or storage blocked — degrade gracefully.
    console.warn('[DevBuddy] localStorage write failed:', err)
  }
}

const safeStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key) } catch { return null }
  },
  setItem: safeSetItem,
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  },
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface AppState {
  // Session
  language: Language
  uiLanguage: UiLanguage
  context: string
  messages: Message[]
  // Voice
  voiceHistory: VoiceHistoryEntry[]
  voiceHistoryIndex: number
  // Metrics
  metrics: AssistiveMetrics
  // Preferences (persisted)
  fontSize: number
  speechRate: number
  voiceLocale: string
  verbosityProfile: VerbosityProfile
  contrastMode: ContrastMode
  requireConfirm: boolean
  confirmationTier: ConfirmationTier
  perceptionProfile: PerceptionProfile
  themePack: ThemePack
  ambientEnabled: boolean
  hasCompletedOnboarding: boolean
}

interface AppActions {
  setLanguage(lang: Language): void
  setUiLanguage(lang: UiLanguage): void
  setContext(ctx: string): void
  addMessages(userMsg: Message, assistantMsg: Message): void
  clearMessages(): void
  setMessages(msgs: Message[]): void
  pushVoiceHistory(command: string): void
  setVoiceHistoryIndex(index: number): void
  removeVoiceHistoryItem(id: string): void
  clearVoiceHistory(): void
  trackKeystroke(key: string): void
  trackMouseAction(): void
  trackVoiceAction(): void
  addTaskRun(run: TaskRun): void
  setFontSize(size: number): void
  setSpeechRate(rate: number): void
  setVoiceLocale(locale: string): void
  setVerbosityProfile(profile: VerbosityProfile): void
  setContrastMode(mode: ContrastMode): void
  setRequireConfirm(required: boolean): void
  setConfirmationTier(tier: ConfirmationTier): void
  setPerceptionProfile(profile: PerceptionProfile): void
  setThemePack(pack: ThemePack): void
  setAmbientEnabled(enabled: boolean): void
  setHasCompletedOnboarding(done: boolean): void
}

const INITIAL_METRICS: AssistiveMetrics = {
  keystrokes: 0,
  mouseActions: 0,
  voiceActions: 0,
  taskRuns: [],
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      language: 'typescript',
      uiLanguage: 'en',
      context: '',
      messages: [],
      voiceHistory: [],
      voiceHistoryIndex: -1,
      metrics: INITIAL_METRICS,
      fontSize: 14,
      speechRate: 0.9,
      voiceLocale: 'en-US',
      verbosityProfile: 'standard',
      contrastMode: 'normal',
      requireConfirm: true,
      confirmationTier: 'standard',
      perceptionProfile: 'default',
      themePack: 'bioluminescence',
      ambientEnabled: false,
      hasCompletedOnboarding: true,

      // ── Actions ────────────────────────────────────────────────────────────
      setLanguage: (lang) => set({ language: lang }),
      setUiLanguage: (lang) => set({ uiLanguage: lang }),
      setContext: (ctx) => set({ context: ctx }),

      addMessages: (userMsg, assistantMsg) =>
        set((s) => ({ messages: [...s.messages, userMsg, assistantMsg] })),
      clearMessages: () => set({ messages: [] }),
      setMessages: (msgs) => set({ messages: msgs }),

      pushVoiceHistory: (command) =>
        set((s) => {
          const next = [
            ...s.voiceHistory,
            { id: crypto.randomUUID(), command, timestamp: Date.now() },
          ]
          return { voiceHistory: next, voiceHistoryIndex: next.length - 1 }
        }),
      setVoiceHistoryIndex: (index) => set({ voiceHistoryIndex: index }),
      removeVoiceHistoryItem: (id) =>
        set((s) => ({ voiceHistory: s.voiceHistory.filter((h) => h.id !== id) })),
      clearVoiceHistory: () => set({ voiceHistory: [], voiceHistoryIndex: -1 }),

      trackKeystroke: (key) => {
        if (key.length === 1 || key === 'Backspace' || key === 'Delete' || key === 'Enter') {
          set((s) => ({ metrics: { ...s.metrics, keystrokes: s.metrics.keystrokes + 1 } }))
        }
      },
      trackMouseAction: () =>
        set((s) => ({ metrics: { ...s.metrics, mouseActions: s.metrics.mouseActions + 1 } })),
      trackVoiceAction: () =>
        set((s) => ({ metrics: { ...s.metrics, voiceActions: s.metrics.voiceActions + 1 } })),
      addTaskRun: (run) =>
        set((s) => {
          const taskRuns = [...s.metrics.taskRuns, run].slice(-100)
          return { metrics: { ...s.metrics, taskRuns } }
        }),

      setFontSize: (size) => set({ fontSize: size }),
      setSpeechRate: (rate) => set({ speechRate: rate }),
      setVoiceLocale: (locale) => set({ voiceLocale: locale }),
      setVerbosityProfile: (profile) => set({ verbosityProfile: profile }),
      setContrastMode: (mode) => set({ contrastMode: mode }),
      setRequireConfirm: (required) => set({ requireConfirm: required }),
      setConfirmationTier: (tier) => set({ confirmationTier: tier }),
      setPerceptionProfile: (profile) => set({ perceptionProfile: profile }),
      setThemePack: (pack) => set({ themePack: pack }),
      setAmbientEnabled: (enabled) => set({ ambientEnabled: enabled }),
      setHasCompletedOnboarding: (done) => set({ hasCompletedOnboarding: done }),
    }),
    {
      name: 'devbuddy-session-v2',
      storage: createJSONStorage(() => safeStorage),
      // Exclude transient / function fields from persistence.
      partialize: (state) => ({
        language: state.language,
        uiLanguage: state.uiLanguage,
        context: state.context,
        messages: state.messages,
        voiceHistory: state.voiceHistory,
        voiceHistoryIndex: state.voiceHistoryIndex,
        metrics: state.metrics,
        fontSize: state.fontSize,
        speechRate: state.speechRate,
        voiceLocale: state.voiceLocale,
        verbosityProfile: state.verbosityProfile,
        contrastMode: state.contrastMode,
        requireConfirm: state.requireConfirm,
        confirmationTier: state.confirmationTier,
        perceptionProfile: state.perceptionProfile,
        themePack: state.themePack,
        ambientEnabled: state.ambientEnabled,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    },
  ),
)

// Convenience re-export for the task-run type so callers don't need to
// import from two places.
export type { TaskSource, InteractionMode }

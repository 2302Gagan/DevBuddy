// ── Voice state ──────────────────────────────────────────────────────────────
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

// ── Interaction mode ─────────────────────────────────────────────────────────
export type InteractionMode = 'voice' | 'keyboard' | 'hybrid'

// ── Programming language ─────────────────────────────────────────────────────
export type Language =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'dart'
  | 'swift'
  | 'kotlin'
  | 'java'
  | 'css'
  | 'html'

// ── UI / Appearance settings ─────────────────────────────────────────────────
export type UiLanguage = 'en' | 'es' | 'fr'
export type VerbosityProfile = 'compact' | 'standard' | 'detailed'
export type ContrastMode = 'normal' | 'high' | 'max'
export type PerceptionProfile = 'default' | 'low-vision' | 'color-safe' | 'screen-reader-first'
export type ThemePack = 'bioluminescence' | 'sunrise' | 'mono-pop'
export type ConfirmationTier = 'standard' | 'strict'
export type TaskSource = 'voice' | 'typed'

// ── Accessibility violation from axe-core ───────────────────────────────────
export interface A11yViolation {
  id: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help: string
  nodes: number
}

// ── Code output from Copilot ─────────────────────────────────────────────────
export interface CopilotResponse {
  code: string
  summary: string
  language: Language
  a11yViolations: A11yViolation[]
  hasA11yIssues: boolean
}

// ── Chat message ─────────────────────────────────────────────────────────────
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
  language?: Language
  summary?: string
  a11yViolations?: A11yViolation[]
  /** True when the language does not support DOM-based axe-core linting */
  a11yLintSkipped?: boolean
  timestamp: Date
}

// ── Metrics ──────────────────────────────────────────────────────────────────
export interface TaskRun {
  source: TaskSource
  mode: InteractionMode
  intent: string
  startedAt: number
  finishedAt: number
  durationSeconds: number
}

export interface AssistiveMetrics {
  keystrokes: number
  mouseActions: number
  voiceActions: number
  taskRuns: TaskRun[]
}

// ── Voice history ─────────────────────────────────────────────────────────────
export interface VoiceHistoryEntry {
  id: string
  command: string
  timestamp: number
}

// ── Session ──────────────────────────────────────────────────────────────────
export interface Session {
  id: string
  projectContext: string
  language: Language
  messages: Message[]
  createdAt: Date
}

// ── Copilot API request ──────────────────────────────────────────────────────
export interface CopilotRequest {
  intent: string
  language: Language
  projectContext?: string
  previousCode?: string
}

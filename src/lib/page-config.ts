import type { Language } from '@/lib/types'

export const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: 'python', label: 'Python' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'dart', label: 'Flutter / Dart' },
  { value: 'swift', label: 'Swift (iOS)' },
  { value: 'kotlin', label: 'Kotlin (Android)' },
  { value: 'java', label: 'Java' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
]

export const MISSION_CARDS = [
  {
    title: 'Flutter UI',
    emoji: '🦋',
    prompt: 'Create a Flutter login form with email and password fields, fully accessible',
  },
  {
    title: 'Python Data',
    emoji: '🐍',
    prompt: 'Write a Python function that reads a CSV and returns a summary dict',
  },
  {
    title: 'React A11Y',
    emoji: '⚛️',
    prompt: 'Build an accessible React button with keyboard and ARIA support',
  },
  {
    title: 'Swift Native',
    emoji: '🍎',
    prompt: 'Create a Swift UIViewController with a table view and screen reader labels',
  },
]

export const VOICE_LOCALES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
] as const

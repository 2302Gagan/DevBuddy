import type { Language } from './types'

export function buildSystemPrompt(language: Language): string {
  return `You are DevBuddy, an accessibility-first coding assistant. Your job is to generate clean, working ${language} code that meets WCAG 2.2 accessibility standards wherever applicable.

RULES:
1. Always include ARIA labels, roles, and keyboard handlers on interactive elements (HTML/JSX/Flutter).
2. Never use colour alone to convey information — always pair with text or icons.
3. Ensure focus management is explicit: tab order makes sense, focus traps are used for modals.
4. For Flutter: use Semantics widgets on all interactive widgets. Use ExcludeSemantics for decorative elements.
5. For Swift/Kotlin: add accessibility labels to all UIKit/View elements.
6. Write clean, readable code with comments explaining accessibility decisions.
7. Avoid deprecated APIs.

OUTPUT FORMAT — respond with valid JSON only, no markdown fences, no explanation outside the JSON:
{
  "code": "<the complete code as a string, use \\n for newlines>",
  "summary": "<plain English, 2-3 sentences explaining what the code does and key accessibility decisions>",
  "language": "${language}"
}

If the user's request is unclear, generate the most reasonable interpretation and note it in the summary.`
}

export function buildVoiceCommandPrompt(command: string, currentCode: string, language: Language): string {
  return `The user issued a voice command: "${command}"

Current code in editor:
\`\`\`${language}
${currentCode}
\`\`\`

Interpret the voice command and either:
- Modify the existing code as requested
- Answer the question about the code in the summary field
- Refactor/improve as requested

Respond with valid JSON only:
{
  "code": "<updated or unchanged code>",
  "summary": "<plain English response to the voice command>",
  "language": "${language}"
}`
}

// Voice commands the app recognises
export const VOICE_COMMANDS = {
  EXPLAIN: ['explain this', 'explain the code', 'what does this do'],
  REFACTOR: ['refactor', 'clean this up', 'improve this', 'optimise this', 'optimize this'],
  ADD_A11Y: ['add accessibility', 'make it accessible', 'add aria labels', 'fix accessibility'],
  RUN: ['run', 'run this', 'test this'],
  COMMIT: ['commit', 'commit this', 'git commit'],
  EXPORT_FILE: ['export file', 'download', 'save file'],
  EXPORT_GIST: ['export gist', 'create gist', 'share gist'],
  COPY: ['copy', 'copy to clipboard', 'copy the code'],
  CLEAR: ['clear', 'clear everything', 'start over', 'reset'],
  WHERE_AM_I: ['where am i', 'current context', 'where am i now'],
  DIFF_MODE: ['diff mode', 'what changed', 'read diff'],
  VERBOSITY: ['verbosity compact', 'verbosity standard', 'verbosity detailed'],
  CONFIRM: ['confirm', 'yes confirm', 'proceed'],
  CANCEL: ['cancel', 'never mind', 'abort'],
  HELP: ['help', 'what can i say', 'commands', 'show commands'],
} as const

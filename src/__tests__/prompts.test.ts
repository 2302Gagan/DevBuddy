import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildVoiceCommandPrompt, VOICE_COMMANDS } from '@/lib/prompts'
import type { Language } from '@/lib/types'

describe('buildSystemPrompt', () => {
  it('includes the requested language in the output', () => {
    const prompt = buildSystemPrompt('python')
    expect(prompt).toContain('python')
  })

  it('mentions WCAG', () => {
    expect(buildSystemPrompt('typescript')).toContain('WCAG')
  })

  it('instructs JSON-only output', () => {
    expect(buildSystemPrompt('html')).toContain('valid JSON only')
  })

  it('includes the language in the JSON schema example', () => {
    const prompt = buildSystemPrompt('dart')
    expect(prompt).toContain('"language": "dart"')
  })

  it('works for every supported Language value', () => {
    const langs: Language[] = [
      'python', 'javascript', 'typescript', 'dart', 'swift', 'kotlin', 'java', 'css', 'html',
    ]
    for (const lang of langs) {
      const p = buildSystemPrompt(lang)
      expect(p).toContain(lang)
    }
  })
})

describe('buildVoiceCommandPrompt', () => {
  it('embeds the voice command', () => {
    const prompt = buildVoiceCommandPrompt('add a button', '', 'typescript')
    expect(prompt).toContain('add a button')
  })

  it('embeds the current code', () => {
    const prompt = buildVoiceCommandPrompt('refactor', 'const x = 1', 'javascript')
    expect(prompt).toContain('const x = 1')
  })

  it('includes the language in the fenced code block', () => {
    const prompt = buildVoiceCommandPrompt('explain', 'fn main() {}', 'python')
    expect(prompt).toContain('```python')
  })

  it('instructs JSON-only output', () => {
    const prompt = buildVoiceCommandPrompt('explain', '', 'html')
    expect(prompt).toContain('valid JSON only')
  })
})

describe('VOICE_COMMANDS', () => {
  it('has entries for all core action groups', () => {
    expect(VOICE_COMMANDS.CLEAR).toBeDefined()
    expect(VOICE_COMMANDS.EXPORT_FILE).toBeDefined()
    expect(VOICE_COMMANDS.EXPORT_GIST).toBeDefined()
    expect(VOICE_COMMANDS.HELP).toBeDefined()
    expect(VOICE_COMMANDS.WHERE_AM_I).toBeDefined()
  })

  it('CLEAR includes "clear"', () => {
    expect(VOICE_COMMANDS.CLEAR).toContain('clear')
  })

  it('CONFIRM includes "confirm"', () => {
    expect(VOICE_COMMANDS.CONFIRM).toContain('confirm')
  })

  it('CANCEL includes "cancel"', () => {
    expect(VOICE_COMMANDS.CANCEL).toContain('cancel')
  })

  it('every group is a non-empty readonly array', () => {
    for (const [key, cmds] of Object.entries(VOICE_COMMANDS)) {
      expect(Array.isArray(cmds), `${key} should be an array`).toBe(true)
      expect(cmds.length, `${key} should have at least one command`).toBeGreaterThan(0)
    }
  })
})

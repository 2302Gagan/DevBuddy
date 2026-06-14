import { describe, it, expect, vi } from 'vitest'
import { isA11yApplicable, lintAccessibility } from '@/lib/a11y'

// Mock axe-core so the HTML linting path runs without a real browser engine
vi.mock('axe-core', () => ({
  default: { run: vi.fn().mockResolvedValue({ violations: [] }) },
}))

describe('isA11yApplicable', () => {
  it('returns true for html', () => {
    expect(isA11yApplicable('html')).toBe(true)
  })

  it('returns true for javascript', () => {
    expect(isA11yApplicable('javascript')).toBe(true)
  })

  it('returns true for typescript', () => {
    expect(isA11yApplicable('typescript')).toBe(true)
  })

  it('returns false for python', () => {
    expect(isA11yApplicable('python')).toBe(false)
  })

  it('returns false for dart', () => {
    expect(isA11yApplicable('dart')).toBe(false)
  })

  it('returns false for swift', () => {
    expect(isA11yApplicable('swift')).toBe(false)
  })

  it('returns false for kotlin', () => {
    expect(isA11yApplicable('kotlin')).toBe(false)
  })

  it('returns false for css', () => {
    expect(isA11yApplicable('css')).toBe(false)
  })
})

describe('lintAccessibility — skip path', () => {
  it('returns skipped=true for python without calling axe-core', async () => {
    const result = await lintAccessibility('x = 1', 'python')
    expect(result.skipped).toBe(true)
    expect(result.violations).toHaveLength(0)
    expect(result.skipReason).toContain('python')
  })

  it('returns skipped=true for dart', async () => {
    const result = await lintAccessibility('void main() {}', 'dart')
    expect(result.skipped).toBe(true)
  })

  it('returns skipped=true for swift', async () => {
    const result = await lintAccessibility('let x = 1', 'swift')
    expect(result.skipped).toBe(true)
  })

  it('includes the language name in skipReason', async () => {
    const result = await lintAccessibility('', 'kotlin')
    expect(result.skipReason).toContain('kotlin')
  })
})

describe('lintAccessibility — axe-core path (HTML)', () => {
  it('returns skipped=false for html', async () => {
    const result = await lintAccessibility('<button>Click me</button>', 'html')
    expect(result.skipped).toBe(false)
  })

  it('returns an array for violations', async () => {
    const result = await lintAccessibility('<p>hello</p>', 'html')
    expect(Array.isArray(result.violations)).toBe(true)
  })
})

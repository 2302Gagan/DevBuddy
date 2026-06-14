import type { Language, CopilotResponse } from '@/lib/types'

const LANGUAGE_VALUES: Language[] = [
  'python', 'javascript', 'typescript', 'dart', 'swift', 'kotlin', 'java', 'css', 'html',
]

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGE_VALUES.includes(value as Language)
}

function detectLanguageFromCode(code: string, fallback: Language): Language {
  const src = code.trim()
  if (!src) return fallback

  if (/\bimport\s+UIKit\b|\bUIViewController\b|\bfunc\s+[A-Za-z_]\w*\s*\(/m.test(src)) return 'swift'
  if (/^\s*fun\s+[A-Za-z_]\w*\s*\(|\bval\s+[A-Za-z_]\w*\s*[:=]/m.test(src)) return 'kotlin'
  if (/\bpublic\s+class\s+[A-Za-z_]\w*|\bpublic\s+static\s+void\s+main\s*\(|\bSystem\.out\.print/m.test(src)) return 'java'
  if (/^\s*def\s+[A-Za-z_]\w*\s*\(|\bimport\s+[A-Za-z_][\w.]*\s*$/m.test(src)) return 'python'
  if (/^\s*<!doctype\s+html>|<html[\s>]|<body[\s>]|<div[\s>]/im.test(src)) return 'html'
  if (/^[\s\S]*\{[\s\S]*:[\s\S]*;[\s\S]*\}/m.test(src) && !/\b(class|interface|function|const|let|var)\b/.test(src)) return 'css'
  if (/\binterface\s+[A-Za-z_]\w*|\btype\s+[A-Za-z_]\w*\s*=|:\s*[A-Za-z_][A-Za-z0-9_<>,[\]\s|?]*\s*(=|\{|\)|;)/m.test(src)) return 'typescript'
  if (/\bconst\s+[A-Za-z_]\w*\s*=|\bfunction\s+[A-Za-z_]\w*\s*\(|=>/m.test(src)) return 'javascript'
  return fallback
}

function stripFenceWrapper(source: string): string {
  const trimmed = source.trim()
  const fenced = trimmed.match(/^```(?:json|JSON)?\s*\n([\s\S]*?)\n```\s*$/)
  return fenced?.[1]?.trim() ?? trimmed
}

function extractFirstJsonObject(source: string): string | null {
  let start = -1
  let depth = 0
  let inString = false
  let escape = false

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]

    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{') {
      if (depth === 0) start = i
      depth += 1
      continue
    }

    if (ch === '}' && depth > 0) {
      depth -= 1
      if (depth === 0 && start >= 0) {
        return source.slice(start, i + 1)
      }
    }
  }

  return null
}

function tryParsePayload(source: string): { code?: string; summary?: string; language?: unknown } | null {
  const stripped = stripFenceWrapper(source)
  const candidates = [
    stripped,
    extractFirstJsonObject(stripped),
    extractFirstJsonObject(source),
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()))

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as { code?: string; summary?: string; language?: unknown }
    } catch {
      // Try next candidate.
    }
  }

  return null
}

function normalizeGeneratedCode(input: string): string {
  let current = String(input || '').trim()
  if (!current) return ''

  const unwrapCodeEnvelope = (value: string): string => {
    const trimmed = value.trim()
    if (!trimmed) return trimmed

    const fenced = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/)
    const unfenced = fenced?.[1]?.trim() ?? trimmed

    // Decode quoted JSON string literals like "import ...\\n...".
    if ((unfenced.startsWith('"') && unfenced.endsWith('"')) || (unfenced.startsWith("'") && unfenced.endsWith("'"))) {
      try {
        const decoded = JSON.parse(unfenced)
        if (typeof decoded === 'string') return decoded.trim()
      } catch {
        if (unfenced.startsWith("'") && unfenced.endsWith("'")) {
          try {
            const decoded = JSON.parse(`"${unfenced.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
            if (typeof decoded === 'string') return decoded.trim()
          } catch {
            // Fall through.
          }
        }
      }
    }

    try {
      const parsed: unknown = JSON.parse(unfenced)
      if (typeof parsed === 'string') return parsed.trim()
      if (parsed && typeof parsed === 'object' && 'code' in parsed) {
        const maybeCode = (parsed as { code?: unknown }).code
        if (typeof maybeCode === 'string') return maybeCode.trim()
      }
    } catch {
      // Keep original text when it is not JSON.
    }

    return unfenced
  }

  // Model output can be nested (JSON containing a stringified JSON `code` value).
  for (let i = 0; i < 3; i += 1) {
    const next = unwrapCodeEnvelope(current)
    if (!next || next === current) break
    current = next
  }

  return current
    .replace(/\r\n/g, '\n')
    .replace(/^\s*```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/\n?```\s*$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sanitizeSummary(input: string, generatedCode: string, language: Language): string {
  const summary = String(input || '').trim()
  if (!summary) return 'Code generated. Review for accessibility compliance.'

  // Guard against model drift where summary contains large code blocks.
  const looksLikeCode =
    summary.length > 420
    || /\b(class|interface|function|const|let|var|import|return|Widget|Scaffold|UIViewController)\b/.test(summary)
    || /[{};]{6,}/.test(summary)

  if (looksLikeCode) {
    const inferred = detectLanguageFromCode(generatedCode, language)
    return `Generated ${inferred} code with accessibility considerations. Review the code panel for details.`
  }

  return summary
}

export function parseCopilotContent(rawContent: string, language: Language): CopilotResponse {
  const parsed = tryParsePayload(rawContent)
  const parsedCode = normalizeGeneratedCode(parsed?.code || rawContent)
  const parsedLanguage = isLanguage(parsed?.language) ? parsed.language : language
  const finalLanguage = detectLanguageFromCode(parsedCode, parsedLanguage)

  return {
    code: parsedCode,
    summary: sanitizeSummary(parsed?.summary || '', parsedCode, language),
    language: finalLanguage,
    a11yViolations: [],
    hasA11yIssues: false,
  }
}

export function extractJsonStringField(source: string, field: 'summary' | 'code'): string {
  const key = `"${field}"`
  const keyPos = source.indexOf(key)
  if (keyPos === -1) return ''

  const colonPos = source.indexOf(':', keyPos + key.length)
  if (colonPos === -1) return ''

  let i = colonPos + 1
  while (i < source.length && /\s/.test(source[i])) i += 1
  if (source[i] !== '"') return ''

  i += 1
  let out = ''
  let escaped = false

  while (i < source.length) {
    const ch = source[i]
    if (escaped) {
      out += ch
      escaped = false
    } else if (ch === '\\') {
      escaped = true
    } else if (ch === '"') {
      break
    } else {
      out += ch
    }
    i += 1
  }

  return out
    .replaceAll(String.raw`\n`, '\n')
    .replaceAll(String.raw`\t`, '\t')
    .replaceAll(String.raw`\r`, '\r')
    .replaceAll(String.raw`\"`, '"')
    .replaceAll(String.raw`\\`, '\\')
}

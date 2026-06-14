import type { Language, VerbosityProfile } from '@/lib/types'

function extractSemantic(
  code: string,
  language: Language,
): { imports: Set<string>; functions: Set<string>; classes: Set<string> } {
  const imports = new Set<string>()
  const functions = new Set<string>()
  const classes = new Set<string>()

  const importPatterns: Record<Language, RegExp[]> = {
    python: [/^import\s+.+$/i, /^from\s+.+\s+import\s+.+$/i],
    javascript: [/^import\s+.+$/i],
    typescript: [/^import\s+.+$/i],
    dart: [/^import\s+['"].+['"];?$/i],
    swift: [/^import\s+[A-Za-z_]\w*$/],
    kotlin: [/^import\s+.+$/i],
    java: [/^import\s+.+;$/i],
    css: [],
    html: [],
  }

  const classPatterns: Record<Language, RegExp[]> = {
    python: [/^class\s+([A-Za-z_]\w*)\s*[(:]/],
    javascript: [/^(?:export\s+)?class\s+([A-Za-z_]\w*)/],
    typescript: [/^(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_]\w*)/],
    dart: [/^class\s+([A-Za-z_]\w*)/],
    swift: [/^class\s+([A-Za-z_]\w*)/],
    kotlin: [/^(?:data\s+|sealed\s+|abstract\s+)?class\s+([A-Za-z_]\w*)/],
    java: [/^(?:public\s+|private\s+|protected\s+)?(?:abstract\s+|final\s+)?class\s+([A-Za-z_]\w*)/],
    css: [],
    html: [],
  }

  const functionPatterns: Record<Language, RegExp[]> = {
    python: [/^def\s+([A-Za-z_]\w*)\s*\(/],
    javascript: [
      /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/,
      /^(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\(/,
    ],
    typescript: [
      /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/,
      /^(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\(/,
      /^(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z_]\w*)\s*\([^)]*\)\s*:\s*.+\s*\{/,
    ],
    dart: [/^(?:[A-Za-z_]\w*[<>?]*\s+)+([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/],
    swift: [/^func\s+([A-Za-z_]\w*)\s*\(/],
    kotlin: [/^fun\s+([A-Za-z_]\w*)\s*\(/],
    java: [/^(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?[A-Za-z_]\w*[<>]*\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/],
    css: [],
    html: [],
  }

  for (const raw of code.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    if (importPatterns[language].some((rx) => rx.test(line))) {
      imports.add(line)
    }

    for (const rx of classPatterns[language]) {
      const match = rx.exec(line)
      if (match?.[1]) { classes.add(match[1]); break }
    }

    for (const rx of functionPatterns[language]) {
      const match = rx.exec(line)
      if (match?.[1]) { functions.add(match[1]); break }
    }
  }

  return { imports, functions, classes }
}

function diffSet(before: Set<string>, after: Set<string>): { added: string[]; removed: string[] } {
  return {
    added: [...after].filter(x => !before.has(x)),
    removed: [...before].filter(x => !after.has(x)),
  }
}

export function buildDiffSpeech(
  current: string,
  previous: string,
  language: Language,
  verbosityProfile: VerbosityProfile,
): string {
  const prevSemantic = extractSemantic(previous, language)
  const currSemantic = extractSemantic(current, language)

  const importsDiff = diffSet(prevSemantic.imports, currSemantic.imports)
  const functionsDiff = diffSet(prevSemantic.functions, currSemantic.functions)
  const classesDiff = diffSet(prevSemantic.classes, currSemantic.classes)

  const prevLines = previous.split('\n')
  const currLines = current.split('\n')
  const max = Math.max(prevLines.length, currLines.length)
  const addedLines: string[] = []
  const changedLines: string[] = []

  for (let i = 0; i < max; i += 1) {
    const p = prevLines[i]
    const c = currLines[i]
    if (p === undefined && c !== undefined) {
      addedLines.push(c)
    } else if (p !== undefined && c !== undefined && p !== c) {
      changedLines.push(c)
    }
  }

  const semanticSummary = `Compared to previous output: ${functionsDiff.added.length} functions added, ${functionsDiff.removed.length} functions removed, ${classesDiff.added.length} classes added, ${classesDiff.removed.length} classes removed, and ${importsDiff.added.length + importsDiff.removed.length} import changes.`

  const hasSemanticChanges =
    functionsDiff.added.length > 0 || functionsDiff.removed.length > 0
    || classesDiff.added.length > 0 || classesDiff.removed.length > 0
    || importsDiff.added.length > 0 || importsDiff.removed.length > 0

  const lineSummary = `Line-level fallback: ${addedLines.length} added lines and ${changedLines.length} changed lines.`

  if (verbosityProfile === 'compact') {
    return hasSemanticChanges ? semanticSummary : lineSummary
  }

  const names: string[] = [
    ...functionsDiff.added.slice(0, 3).map(name => `added function ${name}`),
    ...classesDiff.added.slice(0, 2).map(name => `added class ${name}`),
    ...functionsDiff.removed.slice(0, 2).map(name => `removed function ${name}`),
    ...classesDiff.removed.slice(0, 2).map(name => `removed class ${name}`),
  ]

  if (hasSemanticChanges) {
    const details = names.slice(0, verbosityProfile === 'detailed' ? 8 : 4).join('. ')
    return details ? `${semanticSummary} ${details}.` : semanticSummary
  }

  const fallbackDetails = changedLines.slice(0, verbosityProfile === 'detailed' ? 6 : 3)
    .map((line, idx) => `Change ${idx + 1}: ${line}`)
    .join('. ')
  return fallbackDetails ? `${lineSummary} ${fallbackDetails}` : lineSummary
}

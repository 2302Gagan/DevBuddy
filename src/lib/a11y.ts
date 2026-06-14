import type { A11yViolation } from './types'

export interface A11yFixSuggestion {
  title: string
  details: string
  confidence: 'high' | 'medium' | 'low'
}

export interface LintResult {
  violations: A11yViolation[]
  skipped: boolean
  skipReason?: string
}

/** Returns true for languages where axe-core DOM linting is applicable. */
export function isA11yApplicable(language: string): boolean {
  return ['html', 'javascript', 'typescript'].includes(language)
}

/**
 * Strips script tags, inline event handlers, and javascript: URLs from
 * AI-generated HTML before injecting it into the live DOM for axe analysis.
 * This prevents XSS from adversarial or hallucinated model output.
 */
function sanitizeForAxe(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/javascript\s*:/gi, 'about:')
    .replace(/data\s*:\s*text\/html/gi, 'data:text/plain')
}

/**
 * Runs axe-core on an HTML string rendered in a temporary off-screen container.
 * Only applicable for HTML/JSX — returns skipped=true for other languages.
 */
export async function lintAccessibility(
  code: string,
  language: string
): Promise<LintResult> {
  if (!isA11yApplicable(language)) {
    return {
      violations: [],
      skipped: true,
      skipReason: `Automated DOM linting is not available for ${language}. Accessibility guidance is embedded in the generated code via the system prompt.`,
    }
  }

  // Strip JSX-specific syntax for HTML parsing
  const htmlCode = sanitizeForAxe(
    code
      .replace(/className=/g, 'class=')
      .replace(/htmlFor=/g, 'for=')
      .replace(/{['"`](.+?)['"`]}/g, '"$1"')
      .replace(/<>/g, '<div>')
      .replace(/<\/>/g, '</div>')
  )

  try {
    // axe-core bundles its own types; suppress the pre-install resolution error.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const axeModule = await import('axe-core')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axe = ((axeModule as any).default ?? axeModule) as any

    // Create a temp container kept off-screen but within the DOM (required by axe)
    const container = document.createElement('div')
    container.setAttribute('aria-hidden', 'true')
    container.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden'
    container.innerHTML = htmlCode
    document.body.appendChild(container)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (axe as any).run(container, {
      rules: {
        'color-contrast': { enabled: true },
        'button-name': { enabled: true },
        'image-alt': { enabled: true },
        'label': { enabled: true },
        'link-name': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'keyboard': { enabled: true },
      }
    })

    document.body.removeChild(container)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const violations: A11yViolation[] = results.violations.map((v: any) => ({
      id: v.id as string,
      impact: (v.impact ?? 'minor') as A11yViolation['impact'],
      description: v.description as string,
      help: v.help as string,
      nodes: (v.nodes as unknown[]).length,
    }))

    return { violations, skipped: false }
  } catch {
    // axe may fail on malformed HTML — return empty rather than crash
    return { violations: [], skipped: false }
  }
}

export function getImpactColor(impact: A11yViolation['impact']): string {
  switch (impact) {
    case 'critical': return 'text-red-600 dark:text-red-400'
    case 'serious':  return 'text-orange-600 dark:text-orange-400'
    case 'moderate': return 'text-yellow-600 dark:text-yellow-400'
    case 'minor':    return 'text-blue-600 dark:text-blue-400'
  }
}

export function getImpactBg(impact: A11yViolation['impact']): string {
  switch (impact) {
    case 'critical': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    case 'serious':  return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
    case 'moderate': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
    case 'minor':    return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
  }
}

export function explainViolationPlainLanguage(v: A11yViolation): string {
  switch (v.id) {
    case 'color-contrast':
      return 'Text does not stand out enough from its background, so low-vision users may struggle to read it.'
    case 'button-name':
      return 'A button has no clear accessible name, so screen readers cannot describe what it does.'
    case 'image-alt':
      return 'An image is missing meaningful alt text, so non-visual users miss important information.'
    case 'label':
      return 'A form control is missing an associated label, which makes input purpose unclear for assistive tech.'
    case 'link-name':
      return 'A link has no descriptive name, so users cannot understand where it goes.'
    case 'aria-required-attr':
      return 'An ARIA role is missing required attributes, so assistive tools may interpret it incorrectly.'
    case 'aria-valid-attr':
      return 'An invalid ARIA attribute is used, which can break screen-reader behavior.'
    case 'keyboard':
      return 'Some interactions cannot be completed with keyboard alone, blocking many mobility-impaired users.'
    default:
      return 'This issue can reduce usability for assistive technology users and should be fixed before release.'
  }
}

export function getFixSuggestions(v: A11yViolation): A11yFixSuggestion[] {
  switch (v.id) {
    case 'color-contrast':
      return [
        {
          title: 'Increase foreground/background contrast',
          details: 'Use WCAG AA contrast ratio of at least 4.5:1 for body text and 3:1 for large text.',
          confidence: 'high',
        },
        {
          title: 'Pair color with text cues',
          details: 'Do not rely only on color to indicate errors or state; add text labels/icons.',
          confidence: 'high',
        },
      ]
    case 'button-name':
      return [
        {
          title: 'Add clear button text or aria-label',
          details: 'Ensure every button exposes a purpose like "Save draft" or "Submit form".',
          confidence: 'high',
        },
      ]
    case 'image-alt':
      return [
        {
          title: 'Add descriptive alt text',
          details: 'Describe informative images; use empty alt (alt="") for decorative images.',
          confidence: 'high',
        },
      ]
    case 'label':
      return [
        {
          title: 'Associate labels with inputs',
          details: 'Use <label htmlFor="id"> and matching input id, or aria-label/aria-labelledby.',
          confidence: 'high',
        },
      ]
    case 'link-name':
      return [
        {
          title: 'Make link text descriptive',
          details: 'Replace generic text like "click here" with destination-specific text.',
          confidence: 'high',
        },
      ]
    case 'aria-required-attr':
      return [
        {
          title: 'Provide required ARIA attributes for role',
          details: 'Check role requirements and add required state/property attributes.',
          confidence: 'medium',
        },
      ]
    case 'aria-valid-attr':
      return [
        {
          title: 'Remove invalid ARIA attributes',
          details: 'Use only valid ARIA attributes for the selected role and element type.',
          confidence: 'medium',
        },
      ]
    case 'keyboard':
      return [
        {
          title: 'Ensure full keyboard operability',
          details: 'Add focusable controls, keyboard handlers, and visible focus states.',
          confidence: 'high',
        },
        {
          title: 'Validate focus order',
          details: 'Keep logical tab order and prevent keyboard traps in overlays/dialogs.',
          confidence: 'medium',
        },
      ]
    default:
      return [
        {
          title: 'Review semantic structure and ARIA usage',
          details: 'Use native HTML elements where possible and verify behavior with a screen reader.',
          confidence: 'low',
        },
      ]
  }
}

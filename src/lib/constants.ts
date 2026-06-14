// ── Copilot API route ─────────────────────────────────────────────────────────
export const COPILOT_RATE_LIMIT = 20
export const COPILOT_RATE_WINDOW_MS = 60_000
export const COPILOT_MAX_PAYLOAD_BYTES = 32_000
export const COPILOT_MAX_TOKENS_HARD_CAP = 8_192
export const COPILOT_DEFAULT_MAX_TOKENS = 4_096

// ── Azure AI Foundry / Phi-4 route ────────────────────────────────────────────
export const PHI4_RATE_LIMIT = 20
export const PHI4_RATE_WINDOW_MS = 60_000
export const PHI4_MAX_PAYLOAD_BYTES = 32_000
export const PHI4_MAX_TOKENS_HARD_CAP = 8_192
export const PHI4_DEFAULT_MAX_TOKENS = 4_096
export const PHI4_DEFAULT_DEPLOYMENT = 'phi-4'
export const PHI4_API_VERSION = '2024-12-01-preview'

// ── Gist export route ─────────────────────────────────────────────────────────
export const GIST_RATE_LIMIT = 5
export const GIST_RATE_WINDOW_MS = 60_000
export const GIST_MAX_CODE_BYTES = 500_000

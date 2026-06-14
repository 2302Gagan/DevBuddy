import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt, buildVoiceCommandPrompt } from '@/lib/prompts'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import {
  COPILOT_RATE_LIMIT,
  COPILOT_RATE_WINDOW_MS,
  COPILOT_MAX_PAYLOAD_BYTES,
  COPILOT_MAX_TOKENS_HARD_CAP,
  COPILOT_DEFAULT_MAX_TOKENS,
} from '@/lib/constants'
import type { Language } from '@/lib/types'

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip, COPILOT_RATE_LIMIT, COPILOT_RATE_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    )
  }

  // ── Origin guard (blocks cross-origin abuse of the server-side API key) ───
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { intent, language, projectContext, previousCode, isVoiceCommand, stream } = body

    if (!intent || !language) {
      return NextResponse.json({ error: 'Missing intent or language' }, { status: 400 })
    }

    // Guard against oversized payloads (context + previous code can be large).
    const payloadSize = JSON.stringify(body).length
    if (payloadSize > COPILOT_MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Request payload too large' }, { status: 413 })
    }

    const apiKey = process.env.GITHUB_COPILOT_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Copilot API key not configured' }, { status: 500 })
    }

    const apiUrl = process.env.COPILOT_API_URL || 'https://models.inference.ai.azure.com/chat/completions'
    const model  = process.env.COPILOT_MODEL || 'gpt-4o-mini'
    // Allow operators to tune output length; higher values help complex multi-file tasks.
    const maxTokens = Math.min(
      COPILOT_MAX_TOKENS_HARD_CAP,
      parseInt(process.env.COPILOT_MAX_TOKENS || String(COPILOT_DEFAULT_MAX_TOKENS), 10) || COPILOT_DEFAULT_MAX_TOKENS,
    )

    const systemPrompt = buildSystemPrompt(language as Language)

    const userMessage = isVoiceCommand && previousCode
      ? buildVoiceCommandPrompt(intent, previousCode, language as Language)
      : projectContext
        ? `Project context: ${projectContext}\n\nRequest: ${intent}`
        : intent

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
        stream: !!stream,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Copilot API error:', response.status, errText)
      let upstreamMessage = `Copilot API error (${response.status})`
      try {
        const errJson = JSON.parse(errText)
        if (errJson.message) upstreamMessage = errJson.message
        else if (errJson.error?.message) upstreamMessage = errJson.error.message
      } catch {
        if (errText) upstreamMessage = errText.slice(0, 200)
      }
      return NextResponse.json(
        { error: upstreamMessage },
        { status: response.status },
      )
    }

    if (stream) {
      if (!response.body) {
        return NextResponse.json({ error: 'Streaming response unavailable' }, { status: 500 })
      }
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      })
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content ?? ''

    let parsed: { code: string; summary: string; language: string }
    try {
      const clean = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = {
        code: rawContent,
        summary: 'Code generated. Review for accessibility compliance.',
        language,
      }
    }

    return NextResponse.json({
      code: parsed.code,
      summary: parsed.summary,
      language: parsed.language || language,
    })
  } catch (err) {
    console.error('API route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

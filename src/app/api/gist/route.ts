import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { GIST_RATE_LIMIT, GIST_RATE_WINDOW_MS, GIST_MAX_CODE_BYTES } from '@/lib/constants'
import type { Language } from '@/lib/types'

interface GistRequest {
  code?: string
  language?: Language
  description?: string
}

const EXT_MAP: Record<Language, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  dart: 'dart',
  swift: 'swift',
  kotlin: 'kt',
  java: 'java',
  css: 'css',
  html: 'html',
}

export async function POST(req: NextRequest) {
  // ── Rate limiting (5 gist exports/min — exports are write ops) ────────────
  const ip = getClientIp(req)
  const rl = checkRateLimit(`gist:${ip}`, GIST_RATE_LIMIT, GIST_RATE_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many export requests. Please wait a moment.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    )
  }

  // ── Origin guard ──────────────────────────────────────────────────────────
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await req.json()) as GistRequest
    const code = body.code?.trim()
    const language = body.language ?? 'typescript'

    if (!code) {
      return NextResponse.json({ error: 'Missing code to export' }, { status: 400 })
    }

    // Limit gist size to avoid excessively large GitHub API payloads.
    if (code.length > GIST_MAX_CODE_BYTES) {
      return NextResponse.json({ error: 'Code too large to export as a Gist' }, { status: 413 })
    }

    const token = process.env.GITHUB_GIST_TOKEN
    if (!token) {
      return NextResponse.json(
        { error: 'Gist export is not configured. Set GITHUB_GIST_TOKEN in .env.local.' },
        { status: 500 },
      )
    }

    const extension = EXT_MAP[language] || 'txt'
    const fileName = `devbuddy-output.${extension}`

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'User-Agent': 'devbuddy/1.0.0',
      },
      body: JSON.stringify({
        description: body.description || `DevBuddy export (${language})`,
        public: false,
        files: { [fileName]: { content: code } },
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('Gist export error:', detail)

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'GitHub authentication failed. Update GITHUB_GIST_TOKEN in .env.local with a valid token that has gist scope, then restart the dev server.' },
          { status: 401 },
        )
      }
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'GitHub denied Gist export. Ensure your token includes gist scope.' },
          { status: 403 },
        )
      }
      return NextResponse.json(
        { error: 'GitHub Gist export failed. Check token and permissions.' },
        { status: response.status },
      )
    }

    const payload = await response.json()
    return NextResponse.json({ url: payload.html_url, id: payload.id })
  } catch (err) {
    console.error('Gist route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

** Created by 2302Gagan
# ♿ DevBuddy — Accessible AI Coding Assistant

> Voice-driven, accessibility-first coding assistant powered by Microsoft Foundry.
> Built for developers with RSI, visual impairments, or motor disabilities.

**Agents League Hackathon 2026 — Creative Apps Track**

---

## What it does

DevBuddy lets you code entirely by voice or keyboard — no mouse required.
Speak your intent, get accessible code back, with WCAG 2.2 issues flagged automatically.

**Key features:**
- 🎤 Voice-to-Copilot pipeline — speak your intent, get code
- ⚡ Streaming Copilot responses with live progress preview
- ♿ WCAG 2.2 accessibility linting on every generated snippet
- 🔊 Text-to-speech summaries of generated code
- ⌨️ Full keyboard navigation — zero mouse dependency
- 🌓 High-contrast light/dark mode
- 🔡 Adjustable font size (12–24px)
- Supports: Python, TypeScript, JavaScript, Flutter/Dart, Swift, Kotlin, HTML

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/2302Gagan/devbuddy
cd devbuddy
npm install
```

### 2. Configure API key

```bash
cp .env.example .env.local
```

Open `.env.local` and add your GitHub token:

```
GITHUB_COPILOT_API_KEY=ghp_your_token_here

# Optional: enables "export gist" action
GITHUB_GIST_TOKEN=ghp_your_token_with_gist_scope
```

**How to get your token:**
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. Select scope: `copilot` (or use a fine-grained token with Copilot access)

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome.

> **Note:** Voice input requires Chrome or Edge. Firefox does not support the Web Speech API.

---

## Voice Commands

| Say | Action |
|-----|--------|
| "create a [description]" | Generate new code |
| "explain this" | Read a plain English explanation |
| "refactor" | Clean up and improve current code |
| "add accessibility" | Add ARIA labels and keyboard handling |
| "run" | Generate practical commands to run/test current code |
| "commit" | Generate a safe commit message and git commands |
| "export file" | Download generated code as a local file |
| "export gist" | Export generated code to a private GitHub Gist |
| "copy" | Copy code to clipboard |
| "clear" | Start over |
| "confirm" / "cancel" | Confirm or abort protected actions |
| "help" | List all commands |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start / stop voice input |
| `Escape` | Stop listening / cancel speech |
| `Ctrl + Enter` | Submit typed input |
| `Tab` | Navigate all controls |
| `Ctrl + C` | Copy code |
| `Ctrl + Shift + C` | Copy latest generated code |
| `Ctrl + Shift + E` | Export latest generated code to file |

---

## Architecture

```
Browser
  ├── Web Speech API (voice input)
  ├── Next.js Frontend (React + Tailwind)
  │   ├── useVoice() hook — manages speech recognition state
  │   ├── /api/copilot — server-side Copilot API proxy
  │   └── axe-core — WCAG linting on generated HTML/JSX
  └── Copilot API (GitHub)
        └── gpt-4o with accessibility system prompt
```

---

## Deploy to Vercel

```bash
npx vercel
```

Add `GITHUB_COPILOT_API_KEY` in Vercel project settings → Environment Variables.

---

## Accessibility Statement

DevBuddy is built to WCAG 2.2 Level AA:
- All interactive elements have `aria-label` or visible text labels
- Keyboard navigation covers 100% of functionality
- Focus indicators are visible at all times
- Colour is never the sole means of conveying information
- Live regions announce state changes to screen readers
- Reduced motion respected via `prefers-reduced-motion`

---

## License

MIT — built for the Microsoft Agents League Hackathon 2026.

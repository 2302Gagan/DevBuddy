import type { Metadata } from 'next'
import Script from 'next/script'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'DevBuddy — Accessible AI Coding Assistant',
  description: 'Voice-driven, accessibility-first coding assistant powered by GitHub Copilot. Built for developers with RSI, visual impairments, or motor disabilities.',
  keywords: ['accessibility', 'coding assistant', 'voice coding', 'GitHub Copilot', 'WCAG', 'inclusive development'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {/* Runs before hydration to set dark class without flash */}
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              var stored = localStorage.getItem('devbuddy-theme');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (stored === 'dark' || (!stored && prefersDark)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}</Script>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}

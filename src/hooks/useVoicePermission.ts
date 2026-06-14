'use client'

import { useCallback, useEffect, useState } from 'react'

export type VoicePermissionState = 'unknown' | 'granted' | 'denied'

const VOICE_PERMISSION_KEY = 'devbuddy-voice-permission-v1'

export function useVoicePermission() {
  const [voicePermission, setVoicePermission] = useState<VoicePermissionState>('unknown')
  // Start hidden — show only after we confirm permission is not granted
  const [showVoiceDisclaimer, setShowVoiceDisclaimer] = useState(false)

  useEffect(() => {
    const checkPermission = async () => {
      // Prefer the Permissions API for the real current state
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })

          if (result.state === 'granted') {
            setVoicePermission('granted')
            setShowVoiceDisclaimer(false)
            localStorage.setItem(VOICE_PERMISSION_KEY, 'granted')
            return
          }

          if (result.state === 'denied') {
            setVoicePermission('denied')
            setShowVoiceDisclaimer(true)
            localStorage.setItem(VOICE_PERMISSION_KEY, 'denied')
            return
          }

          // 'prompt' — browser hasn't asked yet; check if user already dismissed our modal
          const stored = localStorage.getItem(VOICE_PERMISSION_KEY)
          if (stored === 'denied') {
            // User previously clicked "Continue without voice" — respect that choice
            setVoicePermission('denied')
            setShowVoiceDisclaimer(false)
          } else {
            // First visit or unknown — show the disclaimer
            setVoicePermission('unknown')
            setShowVoiceDisclaimer(true)
          }
          return
        } catch {
          // Permissions API not supported — fall through to localStorage
        }
      }

      // Fallback: localStorage only
      const stored = localStorage.getItem(VOICE_PERMISSION_KEY)
      if (stored === 'granted') {
        setVoicePermission('granted')
        setShowVoiceDisclaimer(false)
      } else if (stored === 'denied') {
        setVoicePermission('denied')
        setShowVoiceDisclaimer(false) // User already made their choice
      } else {
        setVoicePermission('unknown')
        setShowVoiceDisclaimer(true)
      }
    }

    checkPermission()
  }, [])

  const requestVoicePermission = useCallback(async (): Promise<{ granted: boolean; errorName?: string }> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setVoicePermission('granted')
      setShowVoiceDisclaimer(false)
      localStorage.setItem(VOICE_PERMISSION_KEY, 'granted')
      return { granted: true }
    } catch (err: unknown) {
      setVoicePermission('denied')
      setShowVoiceDisclaimer(false)
      localStorage.setItem(VOICE_PERMISSION_KEY, 'denied')
      return { granted: false, errorName: String((err as { name?: string })?.name || 'unknown') }
    }
  }, [])

  const continueWithoutVoice = useCallback(() => {
    setVoicePermission('denied')
    setShowVoiceDisclaimer(false)
    localStorage.setItem(VOICE_PERMISSION_KEY, 'denied')
  }, [])

  const forceDeniedPermission = useCallback((showDisclaimer: boolean) => {
    setVoicePermission('denied')
    setShowVoiceDisclaimer(showDisclaimer)
    localStorage.setItem(VOICE_PERMISSION_KEY, 'denied')
  }, [])

  return {
    voicePermission,
    showVoiceDisclaimer,
    setShowVoiceDisclaimer,
    requestVoicePermission,
    continueWithoutVoice,
    forceDeniedPermission,
  }
}

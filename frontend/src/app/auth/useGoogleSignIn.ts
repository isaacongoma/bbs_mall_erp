import { useEffect, useEffectEvent } from 'react'

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string
        callback: (response: { credential?: string }) => void
        auto_select?: boolean
        cancel_on_tap_outside?: boolean
        use_fedcm_for_prompt?: boolean
      }) => void
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
      prompt: () => void
      cancel: () => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Google sign-in could not be loaded.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export function useGoogleSignIn(
  clientId: string | null | undefined,
  onCredential: (credential: string) => void,
  options: { button: HTMLElement | null; prompt: boolean; width?: number },
) {
  const deliver = useEffectEvent(onCredential)
  const { button, prompt, width } = options

  useEffect(() => {
    if (!clientId) return undefined
    let cancelled = false
    void loadScript()
      .then(() => {
        if (cancelled || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) deliver(response.credential)
          },
          auto_select: false,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true,
        })
        if (button) {
          window.google.accounts.id.renderButton(button, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center',
            width: width ?? button.clientWidth,
          })
        }
        if (prompt) window.google.accounts.id.prompt()
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      window.google?.accounts.id.cancel()
    }
  }, [clientId, button, prompt, width])
}

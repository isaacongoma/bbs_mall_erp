import { create } from 'zustand'

const STORAGE_KEY = 'bbs_erp_tokens'

interface StoredTokens {
  access: string | null
  refresh: string | null
}

function loadTokens(): StoredTokens {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<StoredTokens>
    return { access: parsed.access ?? null, refresh: parsed.refresh ?? null }
  } catch {
    return { access: null, refresh: null }
  }
}

function persistTokens(tokens: StoredTokens) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  } catch {
    return
  }
}

export function decodeUserId(token: string | null): string | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as { user_id?: string | number }
    return claims.user_id != null ? String(claims.user_id) : null
  } catch {
    return null
  }
}

interface AuthState extends StoredTokens {
  login: (email: string, password: string) => Promise<void>
  setTokens: (tokens: { access: string; refresh: string }) => void
  logout: () => void
  tryRefresh: () => Promise<boolean>
}

let refreshInFlight: Promise<boolean> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadTokens(),

  async login(email, password) {
    const response = await fetch('/api/auth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) throw new Error('Invalid email or password')
    const data = (await response.json()) as { access: string; refresh: string }
    const tokens = { access: data.access, refresh: data.refresh }
    persistTokens(tokens)
    set(tokens)
  },

  setTokens(tokens) {
    persistTokens(tokens)
    set(tokens)
  },

  logout() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      return
    } finally {
      set({ access: null, refresh: null })
    }
  },

  tryRefresh() {
    const { refresh } = get()
    if (!refresh) return Promise.resolve(false)
    if (refreshInFlight) return refreshInFlight

    refreshInFlight = (async () => {
      try {
        const response = await fetch('/api/auth/token/refresh/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        })
        if (!response.ok) throw new Error('refresh failed')
        const data = (await response.json()) as { access: string }
        const tokens = { access: data.access, refresh: get().refresh }
        persistTokens(tokens)
        set({ access: data.access })
        return true
      } catch {
        get().logout()
        return false
      } finally {
        refreshInFlight = null
      }
    })()

    return refreshInFlight
  },
}))

export const selectIsLoggedIn = (state: AuthState) => state.access !== null
export const selectSessionUser = (state: AuthState) => decodeUserId(state.access)

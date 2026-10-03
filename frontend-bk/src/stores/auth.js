// Replaces Frappe's cookie-based session (stores/session.js in the original)
// with JWT bearer-token auth, matching this backend's actual auth model
// (djangorestframework-simplejwt, not Frappe session cookies).
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'bbs_erp_tokens'

function loadTokens() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

// frappe-ui's own internals (e.g. frappe-ui/frappe's useOnboarding) read the
// current user off a `user_id` cookie -- Frappe's ambient cookie-session
// convention (see node_modules/frappe-ui/frappe/session.js's sessionUser()).
// We can't edit that package, so this keeps a same-named cookie in sync with
// the JWT session purely so those internals resolve a user instead of
// silently treating every request as Guest (frappe-ui bails out early, e.g.
// useOnboarding returns undefined, when sessionUser() is null).
function decodeUserId(token) {
  if (!token) return null
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    )
    return payload.user_id != null ? String(payload.user_id) : null
  } catch {
    return null
  }
}

function syncSessionCookie(token) {
  const userId = decodeUserId(token)
  if (userId) {
    document.cookie = `user_id=${encodeURIComponent(userId)}; path=/; max-age=${60 * 60 * 24 * 30}`
  } else {
    document.cookie = 'user_id=; path=/; max-age=0'
  }
}

export const authStore = defineStore('bbs-erp-auth', () => {
  const stored = loadTokens()
  const accessToken = ref(stored.access || null)
  const refreshToken = ref(stored.refresh || null)
  const isLoggedIn = computed(() => !!accessToken.value)

  syncSessionCookie(accessToken.value)

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access: accessToken.value, refresh: refreshToken.value }),
    )
    syncSessionCookie(accessToken.value)
  }

  async function login(email, password) {
    const response = await fetch('/api/auth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      throw new Error('Invalid email or password')
    }
    const data = await response.json()
    accessToken.value = data.access
    refreshToken.value = data.refresh
    persist()
  }

  function logout() {
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem(STORAGE_KEY)
    syncSessionCookie(null)
  }

  async function tryRefresh() {
    if (!refreshToken.value) return false
    try {
      const response = await fetch('/api/auth/token/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken.value }),
      })
      if (!response.ok) throw new Error('refresh failed')
      const data = await response.json()
      accessToken.value = data.access
      persist()
      return true
    } catch {
      logout()
      return false
    }
  }

  return { accessToken, refreshToken, isLoggedIn, login, logout, tryRefresh }
})

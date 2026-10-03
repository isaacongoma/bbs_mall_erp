// Frappe's `stores/session.js` wraps a cookie session (login/logout as
// whitelisted `frappe.*` resources, `user` read from the `user_id` cookie).
// We have no cookie session -- auth is JWT (see `./auth.js`, the store that
// actually talks to /api/auth/token/). This store exists only so the files
// ported verbatim from the original (e.g. `stores/users.js`, which does
// `sessionStore().user`) keep resolving `session.user` to the current user's
// identifier without needing to be edited themselves. That identifier is the
// Django user pk (stringified), matching how every Link-to-User field is
// serialized elsewhere in this port (see apps/crm/session_api.py).
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { authStore } from './auth'

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

export const sessionStore = defineStore('crm-session', () => {
  const auth = authStore()

  const user = computed(() => decodeUserId(auth.accessToken))
  const isLoggedIn = computed(() => auth.isLoggedIn)

  // Ported callers (e.g. UserDropdown.vue) call `sessionStore().logout.submit()`,
  // matching frappe-ui's createResource shape (a whitelisted "logout" RPC).
  // We only need the synchronous JWT clear -- wrap it so `.submit()` resolves.
  const logout = { submit: () => auth.logout() }

  return { user, isLoggedIn, logout }
})

const HOST_ID = 'frappe-lucide-sprite'
let pending: Promise<void> | null = null

export function ensureIconSprite(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  pending ??= import('../assets/desk/lucide-icons.svg?raw').then((module) => {
    if (document.getElementById(HOST_ID)) return
    const host = document.createElement('div')
    host.id = HOST_ID
    host.style.display = 'none'
    host.setAttribute('aria-hidden', 'true')
    host.innerHTML = module.default
    document.body.appendChild(host)
  })
  return pending
}

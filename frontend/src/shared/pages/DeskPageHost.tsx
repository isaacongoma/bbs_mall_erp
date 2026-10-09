import { useEffect, useRef, useState } from 'react'
import { ErrorMessage, Spinner, usePageMeta } from '@/design-system'
import '../frappe/styles/frappePage.css'
import { frappe } from '../frappe'
import { loadDeskBoot } from '../frappe/boot'
import { ensurePageScripts } from '../frappe/scriptLoader'

interface DeskPageHostProps {
  name: string
}

type AnyRecord = Record<string, any>

export default function DeskPageHost({ name }: DeskPageHostProps) {
  const container = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<{ name: string; error: string | null; ready: boolean }>({ name, error: null, ready: false })
  usePageMeta({ title: name })

  useEffect(() => {
    const host = container.current
    if (!host) return undefined
    let cancelled = false
    const wrapper = document.createElement('div')
    wrapper.className = 'frappe-page page-container'
    wrapper.id = `page-${name}`
    host.appendChild(wrapper)
    const pages = frappe.pages as AnyRecord
    pages[name] ??= {}

    void (async () => {
      try {
        await loadDeskBoot()
        await ensurePageScripts(name)
        if (cancelled) return
        const definition = pages[name] as AnyRecord
        definition.on_page_load?.(wrapper)
        definition.on_page_show?.(wrapper)
        window.cur_page = { page: wrapper, ...definition }
        setState({ name, error: null, ready: true })
      } catch (reason) {
        if (!cancelled) setState({ name, error: reason instanceof Error ? reason.message : String(reason), ready: true })
      }
    })()

    return () => {
      cancelled = true
      const definition = pages[name] as AnyRecord | undefined
      try {
        definition?.on_page_hide?.(wrapper)
      } catch {
        wrapper.remove()
      }
      wrapper.remove()
    }
  }, [name])

  const current = state.name === name ? state : { name, error: null, ready: false }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-auto">
      {current.error && <ErrorMessage className="m-6" message={current.error} />}
      {!current.ready && (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="md" />
        </div>
      )}
      <div ref={container} className="frappe-page-host flex-1 p-4 sm:p-6" />
    </main>
  )
}

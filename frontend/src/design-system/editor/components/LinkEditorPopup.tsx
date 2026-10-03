import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { LucideIcon } from '../../icons'
import { useLatest } from '../../hooks/useLatest'
import { cn } from '../../utils/cn'
import { isSafeUrl } from '../extensions/shared/url-safety'
import { EditorPopover } from './EditorPopover'

const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel']

export interface LinkEditorPopupProps {
  href: string
  startInEdit?: boolean
  onUpdateHref: (href: string) => void
  onClose: () => void
}

function normalizeHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function isValidLinkHref(href: string): boolean {
  if (!isSafeUrl(href, { allowedSchemes: ALLOWED_SCHEMES })) return false
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return false
  }
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    return url.hostname === 'localhost' || url.hostname.includes('.')
  }
  return true
}

export function LinkEditorPopup({ href, startInEdit, onUpdateHref, onClose }: LinkEditorPopupProps) {
  const [value, setValue] = useState(href)
  const [edit, setEdit] = useState(startInEdit ?? !href)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const latest = useLatest({ edit, href, onClose })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      const { edit: editing, href: original, onClose: close } = latest()
      if (editing && original) {
        setValue(original)
        setEdit(false)
        return
      }
      close()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [latest])

  useEffect(() => {
    if (!edit) return
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [edit])

  useEffect(() => {
    if (href || !edit || !navigator.clipboard?.readText) return
    let cancelled = false
    navigator.clipboard
      .readText()
      .then((text) => {
        if (cancelled) return
        const normalized = normalizeHref(text.trim())
        if (!isValidLinkHref(normalized)) return
        setValue((current) => (current ? current : normalized))
        requestAnimationFrame(() => inputRef.current?.select())
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [href, edit])

  const submit = () => {
    const normalized = normalizeHref(value)
    if (normalized === '') onUpdateHref('')
    else if (isValidLinkHref(normalized)) onUpdateHref(normalized)
    else {
      setShake(false)
      requestAnimationFrame(() => setShake(true))
    }
  }

  const copyLink = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      return
    }
  }

  return (
    <EditorPopover
      dialogLabel="Edit link"
      contentClass="flex min-w-60 max-w-80 items-center gap-1 rounded-md p-1"
      autofocus={false}
    >
      {edit ? (
        <>
          <div className={cn('flex-1', shake && 'editor-link-shake')} onAnimationEnd={() => setShake(false)}>
            <TextInput
              inputRef={inputRef}
              type="text"
              className="w-full"
              wrapperClassName="w-full"
              placeholder="https://example.com"
              value={value}
              onChange={setValue}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit()
              }}
            />
          </div>
          {href && (
            <Button
              size="xs"
              variant="ghost"
              tooltip="Remove link"
              icon="lucide-link-2-off"
              onClick={() => onUpdateHref('')}
            />
          )}
          <Button size="xs" variant="ghost" tooltip="Apply" icon="lucide-check" onClick={submit} />
        </>
      ) : (
        <>
          <LucideIcon name="lucide-globe" className="ml-1.5 size-4 shrink-0 text-ink-gray-5" />
          <div className="flex min-w-0 flex-1 pl-1.5">
            <a
              className="truncate border-b border-outline-gray-2 text-sm text-ink-gray-9 hover:border-outline-gray-3"
              title={value}
              href={value}
              target="_blank"
              rel="noopener noreferrer"
            >
              {value}
            </a>
          </div>
          <Button size="xs" variant="ghost" tooltip="Copy link" icon="lucide-copy" onClick={copyLink} />
          <Button size="xs" variant="ghost" onClick={() => setEdit(true)}>
            Edit
          </Button>
        </>
      )}
    </EditorPopover>
  )
}

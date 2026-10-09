import { useCallback, useEffect, useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dialog } from '@/design-system'
import { AuthError, createPasskey, loginApi, passkeysSupported } from '../auth/loginApi'

interface PasskeysDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PasskeyRow {
  id: number
  label: string
  created_at: string
  last_used_at: string | null
}

function describeDate(value: string | null): string {
  return value
    ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'
}

export function PasskeysDialog({ open, onOpenChange }: PasskeysDialogProps) {
  const [rows, setRows] = useState<PasskeyRow[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await loginApi.listPasskeys()
      setRows(list)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    let live = true
    loginApi
      .listPasskeys()
      .then((list) => {
        if (live) setRows(list)
      })
      .catch((caught: unknown) => {
        if (live) setError(caught instanceof Error ? caught.message : String(caught))
      })
    return () => {
      live = false
    }
  }, [open])

  async function add() {
    setBusy(true)
    setError('')
    try {
      await createPasskey(`${navigator.platform || 'This device'} · ${new Date().toLocaleDateString()}`)
      await load()
    } catch (caught) {
      const cancelled = caught instanceof DOMException && caught.name === 'NotAllowedError'
      setError(
        cancelled ? __('Passkey setup was cancelled.') : caught instanceof Error ? caught.message : String(caught),
      )
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    setError('')
    try {
      await loginApi.removePasskey(id)
      await load()
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : String(caught))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={__('Passkeys')} size="md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-gray-6">
          {__('Sign in with your fingerprint, face or screen lock instead of a password.')}
        </p>
        {rows.length ? (
          <ul className="divide-y divide-outline-gray-2 rounded-lg border border-outline-gray-2">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-base text-ink-gray-9">{row.label}</div>
                  <div className="text-sm text-ink-gray-5">
                    {__('Added {0}', [describeDate(row.created_at)])} ·{' '}
                    {__('Last used {0}', [describeDate(row.last_used_at)])}
                  </div>
                </div>
                <Button variant="subtle" theme="red" label={__('Remove')} onClick={() => void remove(row.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-gray-5">{__('No passkeys yet.')}</p>
        )}
        {error ? <p className="text-sm text-ink-red-4">{error}</p> : null}
        {passkeysSupported() ? (
          <Button variant="solid" label={__('Add a passkey')} loading={busy} onClick={() => void add()} />
        ) : (
          <p className="text-sm text-ink-gray-5">{__('This browser does not support passkeys.')}</p>
        )}
      </div>
    </Dialog>
  )
}

import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError } from '@/core/api/errors'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import { capture } from '@/core/telemetry'
import { Button, ErrorMessage } from '@/design-system'
import { FieldLayout } from '@/shared/components/FieldLayout'
import { QuickCreateDialog } from '@/shared/components/QuickCreateDialog'
import { useDocument } from '@/shared/hooks/useDocument'
import { useQuickEntryLayout } from '@/shared/hooks/useQuickEntryLayout'
import { useUiStore } from '@/shared/stores/uiStore'
import { evaluateDependsOnValue } from '@/shared/utils/expressions'
import { collectLayoutFields, mapLayoutFields } from '@/shared/utils/quickEntry'

type AnyRecord = Record<string, any>

export interface ContactModalOptions {
  redirect?: boolean
  afterInsert?: (doc: AnyRecord) => void
}

export interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: AnyRecord | null
  options?: ContactModalOptions
}

const DEFAULT_OPTIONS: ContactModalOptions = { redirect: true }

export function ContactModal({ open, onOpenChange, contact, options = DEFAULT_OPTIONS }: ContactModalProps) {
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)
  const bundle = useDocument('Contact')
  const record = bundle.document as unknown as AnyRecord
  const doc: AnyRecord = record.doc || {}

  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const rawTabs = useQuickEntryLayout('Contact', record as never)

  function showAddressModal(address?: string | null) {
    showDoctypeModal({
      name: address || null,
      doctype: 'Address',
      callbacks: {
        afterInsert: (created: AnyRecord) => {
          capture('address_created')
          record.setField('address', created.name)
        },
      },
    })
  }

  const tabs = rawTabs
    ? mapLayoutFields(rawTabs, (field) => {
        let next = field
        if (field.fieldname === 'email_id' || field.fieldname === 'mobile_no') {
          next = { ...next, read_only: false }
        } else if (field.fieldname === 'address') {
          next = {
            ...next,
            create: (value: string, close: () => void) => {
              record.setField('address', value)
              showAddressModal()
              close()
            },
            edit: (address: string) => showAddressModal(address),
          }
        }
        if (field.fieldname === 'first_name') next = { ...next, reqd: 1 }
        return next
      })
    : null

  const seed = useEffectEvent(() => {
    const source = contact?.data || contact || {}
    record.setDoc({ __newDocument: true, doctype: 'Contact', ...source })
  })

  useEffect(() => {
    seed()
  }, [])

  function validateRequiredFields(payload: AnyRecord): string | null {
    if (!tabs) return null
    const missing: string[] = []
    for (const field of collectLayoutFields(tabs)) {
      const mandatory =
        field.reqd || (field.mandatory_depends_on && evaluateDependsOnValue(field.mandatory_depends_on, payload))
      if (mandatory && !payload[field.fieldname]) missing.push(__(field.label))
    }
    if (missing.length) return __('{0} is required', [missing.join(', ')])
    if (payload.email_id && !payload.email_id.includes('@')) return __('Invalid Email Address')
    if (payload.mobile_no && isNaN(payload.mobile_no.replace(/[-+() ]/g, ''))) {
      return __('Mobile number should be a number')
    }
    return null
  }

  async function createContact() {
    setError(null)
    const payload: AnyRecord = { ...record.doc }

    const invalid = validateRequiredFields(payload)
    if (invalid) {
      setError(invalid)
      return
    }

    if (payload.email_id) {
      payload.email_ids = [{ email_id: payload.email_id, is_primary: 1 }]
      delete payload.email_id
    }
    if (payload.mobile_no) {
      payload.phone_nos = [{ phone: payload.mobile_no, is_primary_mobile_no: 1 }]
      delete payload.mobile_no
    }

    await bundle.triggerOnBeforeCreate?.()

    setCreating(true)
    try {
      const created = await rpc<AnyRecord>({
        url: 'frappe.client.insert',
        params: { doc: { doctype: 'Contact', ...payload } },
      })
      capture('contact_created')
      contact?.reload?.()
      if (created.name && options.redirect) router.push({ name: 'Contact', params: { contactId: created.name } })
      onOpenChange(false)
      options.afterInsert?.(created)
      record.setDoc({ __newDocument: true, doctype: 'Contact' })
    } catch (failure) {
      if (failure instanceof ApiError) setError(failure.messages[0] ?? null)
    } finally {
      setCreating(false)
    }
  }

  return (
    <QuickCreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Contact"
      doctype="Contact"
      footer={
        <div className="space-y-2">
          <Button
            className="w-full"
            variant="solid"
            label={__('Create')}
            loading={creating}
            onClick={() => void createContact()}
          />
        </div>
      }
    >
      {tabs?.length ? <FieldLayout tabs={tabs} data={doc} doctype="Contact" /> : null}
      {error && <ErrorMessage className="mt-6" message={__(error)} />}
    </QuickCreateDialog>
  )
}

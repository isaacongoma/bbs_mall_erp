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
import { useUsers } from '@/shared/hooks/useUsers'
import { mapLayoutFields } from '@/shared/utils/quickEntry'
import { useStatuses } from '../../hooks/useStatuses'

type AnyRecord = Record<string, any>

export interface LeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaults?: AnyRecord
}

export function LeadModal({ open, onOpenChange, defaults = {} }: LeadModalProps) {
  const { getUser } = useUsers()
  const { getLeadStatus, statusOptions } = useStatuses()
  const bundle = useDocument('CRM Lead')
  const lead = bundle.document as unknown as AnyRecord
  const doc: AnyRecord = lead.doc || {}

  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const leadStatuses = statusOptions('lead')
  const rawTabs = useQuickEntryLayout('CRM Lead', lead as never)

  const tabs = rawTabs
    ? mapLayoutFields(rawTabs, (field) =>
        field.fieldname === 'status'
          ? { ...field, fieldtype: 'Select', options: leadStatuses, prefix: getLeadStatus(doc.status)?.color }
          : field,
      )
    : null

  const seed = useEffectEvent(() => {
    lead.setDoc((current: AnyRecord) => {
      const next: AnyRecord = { ...current, no_of_employees: '1-10', ...defaults }
      if (!next.lead_owner) next.lead_owner = getUser().name
      if (!next.status && leadStatuses[0]?.value) next.status = leadStatuses[0].value
      return next
    })
  })

  useEffect(() => {
    seed()
  }, [])

  function validate(payload: AnyRecord): string | null {
    if (!payload.first_name) return __('First Name is mandatory')
    if (payload.annual_revenue) {
      if (typeof payload.annual_revenue === 'string') {
        payload.annual_revenue = payload.annual_revenue.replace(/,/g, '')
      } else if (isNaN(payload.annual_revenue)) {
        return __('Annual Revenue should be a number')
      }
    }
    if (payload.mobile_no && isNaN(payload.mobile_no.replace(/[-+() ]/g, ''))) {
      return __('Mobile number should be a number')
    }
    if (payload.email && !payload.email.includes('@')) return __('Invalid email address')
    if (!payload.status) return __('Status is required')
    return null
  }

  async function createNewLead() {
    const payload: AnyRecord = { ...lead.doc }
    if (payload.website && !payload.website.startsWith('http')) payload.website = 'https://' + payload.website
    lead.setDoc(payload)

    await bundle.triggerOnBeforeCreate?.()

    setError(null)
    const invalid = validate(payload)
    if (invalid) {
      setError(invalid)
      return
    }
    setCreating(true)
    try {
      const created = await rpc<AnyRecord>({
        url: 'frappe.client.insert',
        params: { doc: { doctype: 'CRM Lead', ...payload } },
      })
      capture('lead_created')
      onOpenChange(false)
      lead.setDoc({ __newDocument: true, doctype: 'CRM Lead' })
      router.push({ name: 'Lead', params: { leadId: created.name } })
    } catch (failure) {
      if (failure instanceof ApiError && failure.messages.length) setError(failure.messages.join('\n'))
      else setError((failure as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <QuickCreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Lead"
      doctype="CRM Lead"
      size="3xl"
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button variant="solid" label={__('Create')} loading={creating} onClick={() => void createNewLead()} />
        </div>
      }
    >
      <div>
        {tabs && <FieldLayout tabs={tabs} data={doc} />}
        {error && <ErrorMessage className="mt-4" message={__(error)} />}
      </div>
    </QuickCreateDialog>
  )
}

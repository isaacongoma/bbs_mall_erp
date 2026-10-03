import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError } from '@/core/api/errors'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import { capture } from '@/core/telemetry'
import { Button, ErrorMessage, Switch } from '@/design-system'
import { FieldLayout } from '@/shared/components/FieldLayout'
import { QuickCreateDialog } from '@/shared/components/QuickCreateDialog'
import { useDocument } from '@/shared/hooks/useDocument'
import { useQuickEntryLayout } from '@/shared/hooks/useQuickEntryLayout'
import { useUsers } from '@/shared/hooks/useUsers'
import { layoutHasSection, mapLayoutFields, mapLayoutSections } from '@/shared/utils/quickEntry'
import { useStatuses } from '../../hooks/useStatuses'

type AnyRecord = Record<string, any>

export interface DealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaults?: AnyRecord
}

const ORGANIZATION_SECTIONS = ['organization_section', 'organization_details_section']
const CONTACT_SECTIONS = ['contact_section', 'contact_details_section']

export function DealModal({ open, onOpenChange, defaults = {} }: DealModalProps) {
  const { getUser } = useUsers()
  const { getDealStatus, statusOptions } = useStatuses()
  const bundle = useDocument('CRM Deal')
  const deal = bundle.document as unknown as AnyRecord
  const doc: AnyRecord = deal.doc || {}

  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [chooseExistingOrganization, setChooseExistingOrganization] = useState(false)
  const [chooseExistingContact, setChooseExistingContact] = useState(false)

  const dealStatuses = statusOptions('deal')
  const rawTabs = useQuickEntryLayout('CRM Deal', deal as never)

  const hasOrganizationSections = layoutHasSection(rawTabs, ORGANIZATION_SECTIONS)
  const hasContactSections = layoutHasSection(rawTabs, CONTACT_SECTIONS)

  const tabs = rawTabs
    ? mapLayoutSections(
        mapLayoutFields(rawTabs, (field) =>
          field.fieldname === 'status'
            ? { ...field, fieldtype: 'Select', options: dealStatuses, prefix: getDealStatus(doc.status)?.color }
            : field,
        ),
        (section) => {
          if (section.name === 'organization_section') return { ...section, hidden: !chooseExistingOrganization }
          if (section.name === 'organization_details_section') return { ...section, hidden: chooseExistingOrganization }
          if (section.name === 'contact_section') return { ...section, hidden: !chooseExistingContact }
          if (section.name === 'contact_details_section') return { ...section, hidden: chooseExistingContact }
          return section
        },
      )
    : null

  const seed = useEffectEvent(() => {
    deal.setDoc((current: AnyRecord) => {
      const next: AnyRecord = { ...current, no_of_employees: '1-10', ...defaults }
      if (!next.deal_owner) next.deal_owner = getUser().name
      if (!next.status && dealStatuses[0]?.value) next.status = dealStatuses[0].value
      return next
    })
  })

  useEffect(() => {
    seed()
  }, [])

  function validate(payload: AnyRecord): string | null {
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

  async function createDeal() {
    const payload: AnyRecord = { ...deal.doc }
    if (payload.website && !payload.website.startsWith('http')) payload.website = 'https://' + payload.website
    if (chooseExistingContact) {
      payload.first_name = null
      payload.last_name = null
      payload.email = null
      payload.mobile_no = null
    } else {
      payload.contact = null
    }
    deal.setDoc(payload)

    await bundle.triggerOnBeforeCreate?.()

    setError(null)
    const invalid = validate(payload)
    if (invalid) {
      setError(invalid)
      return
    }
    setCreating(true)
    try {
      const name = await rpc<string>({
        url: 'crm.fcrm.doctype.crm_deal.crm_deal.create_deal',
        params: { doc: payload },
      })
      capture('deal_created')
      onOpenChange(false)
      router.push({ name: 'Deal', params: { dealId: name } })
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
      title="Create Deal"
      doctype="CRM Deal"
      size="3xl"
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button variant="solid" label={__('Create')} loading={creating} onClick={() => void createDeal()} />
        </div>
      }
    >
      <div>
        {(hasOrganizationSections || hasContactSections) && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {hasOrganizationSections && (
                <div className="flex items-center gap-3 text-sm text-ink-gray-5">
                  <div>{__('Choose Existing Organization')}</div>
                  <Switch value={chooseExistingOrganization} onChange={setChooseExistingOrganization} />
                </div>
              )}
              {hasContactSections && (
                <div className="flex items-center gap-3 text-sm text-ink-gray-5">
                  <div>{__('Choose Existing Contact')}</div>
                  <Switch value={chooseExistingContact} onChange={setChooseExistingContact} />
                </div>
              )}
            </div>
            <div className="my-5 h-px w-full border-t" />
          </>
        )}
        {tabs?.length ? <FieldLayout tabs={tabs} data={doc} doctype="CRM Deal" /> : null}
        {error && <ErrorMessage className="mt-4" message={__(error)} />}
      </div>
    </QuickCreateDialog>
  )
}

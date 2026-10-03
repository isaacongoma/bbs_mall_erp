import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError } from '@/core/api/errors'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import { useResource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import { Button, Dialog, ErrorMessage, Switch } from '@/design-system'
import { Link } from '@/shared/components/Controls/Link'
import { FieldLayout, type LayoutTab } from '@/shared/components/FieldLayout'
import { ContactsIcon, EditIcon } from '@/shared/components/Icons'
import { useDocument } from '@/shared/hooks/useDocument'
import { useIsMobileView } from '@/shared/hooks/useIsMobileView'
import { useMeta } from '@/shared/hooks/useMeta'
import { useUsers } from '@/shared/hooks/useUsers'
import { useUiStore } from '@/shared/stores/uiStore'
import type { DocField } from '@/shared/types/meta'
import { collectLayoutFields, mapLayoutFields } from '@/shared/utils/quickEntry'
import { useStatuses } from '../../hooks/useStatuses'
import { OrganizationsIcon } from '../Icons'

type AnyRecord = Record<string, any>

const GET_LAYOUT = 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout'
const LEAD_DEAL_FIELD_MAP: Record<string, string> = { deal_owner: 'lead_owner' }
const SKIP_PREFILL_FIELDS = ['organization', 'status']

export interface ConvertToDealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: AnyRecord
}

function hasValue(value: unknown): boolean {
  return value != null && value !== ''
}

function isCustomField(field: AnyRecord | undefined): boolean {
  return Boolean(
    field?.is_custom_field ||
    field?.custom ||
    field?.fieldname?.startsWith('custom_') ||
    field?.name === `${field?.parent}-${field?.fieldname}`,
  )
}

function matchingCustomLeadField(leadFields: DocField[], dealField: DocField): DocField | null {
  if (!isCustomField(dealField)) return null
  const matches = leadFields.filter(
    (leadField) =>
      isCustomField(leadField) && leadField.label === dealField.label && leadField.fieldtype === dealField.fieldtype,
  )
  return matches.length === 1 ? (matches[0] ?? null) : null
}

function leadFieldnameFor(lead: AnyRecord, leadFields: DocField[], field: DocField): string | undefined {
  const mapped = LEAD_DEAL_FIELD_MAP[field.fieldname]
  if (mapped) return mapped
  if (Object.hasOwn(lead, field.fieldname)) return field.fieldname
  return matchingCustomLeadField(leadFields, field)?.fieldname
}

export function ConvertToDealModal({ open, onOpenChange, lead }: ConvertToDealModalProps) {
  const { isManager } = useUsers()
  const isMobileView = useIsMobileView()
  const setUi = useUiStore((state) => state.set)
  const { getDealStatus, statusOptions } = useStatuses()
  const { doctypeMeta: leadMeta } = useMeta('CRM Lead')
  const leadBundle = useDocument('CRM Lead', lead.name)
  const dealBundle = useDocument('CRM Deal')
  const deal = dealBundle.document as unknown as AnyRecord
  const doc: AnyRecord = deal.doc || {}

  const [existingContactChecked, setExistingContactChecked] = useState(false)
  const [existingOrganizationChecked, setExistingOrganizationChecked] = useState(false)
  const [existingContact, setExistingContact] = useState('')
  const [existingOrganization, setExistingOrganization] = useState('')
  const [error, setError] = useState('')

  const dealStatuses = statusOptions('deal')
  const leadFields = leadMeta?.fields ?? []

  const layout = useResource<LayoutTab[]>({
    url: GET_LAYOUT,
    cache: ['RequiredFields', 'CRM Deal'],
    params: { doctype: 'CRM Deal', type: 'Required Fields' },
    auto: true,
  })

  const rawTabs = layout.data
  const dealTabs =
    rawTabs && collectLayoutFields(rawTabs).length
      ? mapLayoutFields(rawTabs, (field) =>
          field.fieldname === 'status'
            ? { ...field, fieldtype: 'Select', options: dealStatuses, prefix: getDealStatus(doc.status)?.color }
            : field,
        )
      : []

  const prefill = useEffectEvent((reset: boolean) => {
    const tabs = rawTabs
    if (!tabs) return
    deal.setDoc((current: AnyRecord) => {
      const next: AnyRecord = reset ? { __newDocument: true, doctype: 'CRM Deal' } : { ...current }
      for (const field of collectLayoutFields(tabs)) {
        if (field.fieldtype === 'Table') {
          next[field.fieldname] = []
          continue
        }
        if (SKIP_PREFILL_FIELDS.includes(field.fieldname)) continue
        if (hasValue(next[field.fieldname])) continue
        const leadFieldname = leadFieldnameFor(lead, leadFields, field)
        if (!leadFieldname) continue
        const value = lead[leadFieldname]
        if (value != null && value !== '') next[field.fieldname] = value
      }
      return next
    })
  })

  useEffect(() => {
    prefill(true)
  }, [rawTabs])

  useEffect(() => {
    prefill(false)
  }, [leadMeta])

  function openQuickEntryModal() {
    setUi({ showQuickEntryModal: true, quickEntryProps: { doctype: 'CRM Deal', onlyRequired: true } })
    onOpenChange(false)
  }

  async function convertToDeal() {
    setError('')

    if (existingContactChecked && !existingContact) {
      setError(__('Please select an existing contact'))
      return
    }
    if (existingOrganizationChecked && !existingOrganization) {
      setError(__('Please select an existing organization'))
      return
    }

    const contact = existingContactChecked ? existingContact : ''
    const organization = existingOrganizationChecked ? existingOrganization : ''
    setExistingContact(contact)
    setExistingOrganization(organization)

    await leadBundle.triggerConvertToDeal?.(lead, deal.doc, () => onOpenChange(false))

    try {
      const created = await rpc<string>({
        url: 'crm.fcrm.doctype.crm_lead.crm_lead.convert_to_deal',
        params: { lead: lead.name, deal: deal.doc, existing_contact: contact, existing_organization: organization },
      })
      if (!created) return
      onOpenChange(false)
      setExistingContactChecked(false)
      setExistingOrganizationChecked(false)
      setExistingContact('')
      setExistingOrganization('')
      setError('')
      capture('convert_lead_to_deal')
      router.push({ name: 'Deal', params: { dealId: created } })
    } catch (failure) {
      if (failure instanceof ApiError && failure.excType === 'MandatoryError') {
        const message = failure.messages
          .map((item) => {
            const parts = item.split(': ')
            return (parts[parts.length - 1] ?? '').trim()
          })
          .join(', ')
        setError(message.toLowerCase().includes('required') ? __(message) : __('{0} is required', [message]))
        return
      }
      setError(__('Error converting to deal: {0}', [failure instanceof ApiError ? failure.messages[0] : undefined]))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      titleContent={
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{__('Convert to Deal')}</h3>
          </div>
          <div className="flex items-center gap-1">
            {isManager() && !isMobileView && (
              <Button
                variant="ghost"
                tooltip={__("Edit deal's mandatory fields layout")}
                icon={EditIcon}
                onClick={openQuickEntryModal}
              />
            )}
            <Button icon="lucide-x" variant="ghost" onClick={() => onOpenChange(false)} />
          </div>
        </div>
      }
      actionsContent={() => (
        <div className="flex justify-end">
          <Button label={__('Convert')} variant="solid" onClick={() => void convertToDeal()} />
        </div>
      )}
    >
      <div className="mb-4 flex items-center gap-2 text-ink-gray-5">
        <OrganizationsIcon className="h-4 w-4" />
        <label className="block text-base">{__('Organization')}</label>
      </div>
      <div className="ml-6 text-ink-gray-9">
        <div className="flex items-center justify-between text-base">
          <div>{__('Choose Existing')}</div>
          <Switch value={existingOrganizationChecked} onChange={setExistingOrganizationChecked} />
        </div>
        {existingOrganizationChecked ? (
          <Link
            className="form-control mt-2.5"
            size="md"
            value={existingOrganization}
            doctype="CRM Organization"
            onChange={setExistingOrganization}
          />
        ) : (
          <div className="mt-2.5 text-base">
            {__('New organization will be created based on the data in details section')}
          </div>
        )}
      </div>

      <div className="mb-4 mt-6 flex items-center gap-2 text-ink-gray-5">
        <ContactsIcon className="h-4 w-4" />
        <label className="block text-base">{__('Contact')}</label>
      </div>
      <div className="ml-6 text-ink-gray-9">
        <div className="flex items-center justify-between text-base">
          <div>{__('Choose Existing')}</div>
          <Switch value={existingContactChecked} onChange={setExistingContactChecked} />
        </div>
        {existingContactChecked ? (
          <Link
            className="form-control mt-2.5"
            size="md"
            value={existingContact}
            doctype="Contact"
            onChange={setExistingContact}
          />
        ) : (
          <div className="mt-2.5 text-base">{__("New contact will be created based on the person's details")}</div>
        )}
      </div>

      {dealTabs.length > 0 && <div className="my-6 h-px w-full border-t" />}
      {dealTabs.length > 0 && <FieldLayout tabs={dealTabs} data={doc} doctype="CRM Deal" />}
      <ErrorMessage className="mt-4" message={error} />
    </Dialog>
  )
}

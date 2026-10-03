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
import { mapLayoutFields } from '@/shared/utils/quickEntry'

type AnyRecord = Record<string, any>

export interface OrganizationModalOptions {
  redirect?: boolean
  afterInsert?: (doc: AnyRecord) => void
}

export interface OrganizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: AnyRecord
  options?: OrganizationModalOptions
}

const DEFAULT_OPTIONS: OrganizationModalOptions = { redirect: true }

export function OrganizationModal({ open, onOpenChange, data, options = DEFAULT_OPTIONS }: OrganizationModalProps) {
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)
  const bundle = useDocument('CRM Organization')
  const organization = bundle.document as unknown as AnyRecord
  const doc: AnyRecord = organization.doc || {}

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const rawTabs = useQuickEntryLayout('CRM Organization', organization as never)

  function showAddressModal(address?: string | null) {
    showDoctypeModal({
      name: address || null,
      doctype: 'Address',
      callbacks: {
        afterInsert: (created: AnyRecord) => {
          capture('address_created')
          organization.setField('address', created.name)
        },
      },
    })
  }

  const tabs = rawTabs
    ? mapLayoutFields(rawTabs, (field) =>
        field.fieldname === 'address'
          ? {
              ...field,
              create: (value: string, close: () => void) => {
                organization.setField('address', value)
                showAddressModal()
                close()
              },
              edit: (address: string) => showAddressModal(address),
            }
          : field,
      )
    : null

  const seed = useEffectEvent(() => {
    organization.setDoc((current: AnyRecord) => ({
      ...current,
      ...(data?.no_of_employees ? {} : { no_of_employees: '1-10' }),
      ...data,
    }))
  })

  useEffect(() => {
    seed()
  }, [])

  async function createOrganization() {
    setLoading(true)
    setError(null)
    try {
      await bundle.triggerOnBeforeCreate?.()
      const created = await rpc<AnyRecord>({
        url: 'frappe.client.insert',
        params: { doc: { doctype: 'CRM Organization', ...organization.doc } },
      })
      if (created.name) {
        capture('organization_created')
        if (options.redirect) router.push({ name: 'Organization', params: { organizationId: created.name } })
        onOpenChange(false)
        options.afterInsert?.(created)
        organization.setDoc({ __newDocument: true, doctype: 'CRM Organization' })
      }
    } catch (failure) {
      if (failure instanceof ApiError) setError(failure.messages[0] ?? null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <QuickCreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Organization"
      doctype="CRM Organization"
      footer={
        <div className="space-y-2">
          <Button
            className="w-full"
            variant="solid"
            label={__('Create')}
            loading={loading}
            onClick={() => void createOrganization()}
          />
        </div>
      }
    >
      {tabs?.length ? <FieldLayout tabs={tabs} data={doc} doctype="CRM Organization" /> : null}
      {error && <ErrorMessage className="mt-8" message={__(error)} />}
    </QuickCreateDialog>
  )
}

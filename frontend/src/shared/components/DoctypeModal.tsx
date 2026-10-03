import { useEffect, useEffectEvent, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { ApiError } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Button, Dialog, ErrorMessage } from '@/design-system'
import { useDocument } from '../hooks/useDocument'
import { useIsMobileView } from '../hooks/useIsMobileView'
import { useUsers } from '../hooks/useUsers'
import { useUiStore } from '../stores/uiStore'
import { CustomActions } from './CustomActions'
import { EditIcon } from './Icons'
import { FieldLayout, type LayoutTab } from './FieldLayout'

type AnyRecord = Record<string, any>

const GET_LAYOUT = 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout'

export interface DoctypeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctypeTitle?: string
  doctype?: string
  docname?: string
  defaults?: AnyRecord
  onAfterInsert?: (saved: AnyRecord) => void
  onAfterUpdate?: (saved: AnyRecord) => void
}

export function DoctypeModal({
  open,
  onOpenChange,
  doctypeTitle = '',
  doctype = '',
  docname = '',
  defaults = {},
  onAfterInsert,
  onAfterUpdate,
}: DoctypeModalProps) {
  const { isManager } = useUsers()
  const isMobileView = useIsMobileView()
  const setUi = useUiStore((state) => state.set)
  const bundle = useDocument(doctype, docname || null)
  const document = bundle.document as unknown as AnyRecord
  const doc: AnyRecord = document.doc || {}

  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const layout = useResource<LayoutTab[]>({
    url: GET_LAYOUT,
    cache: ['Quick Entry', doctype],
    params: { doctype, type: 'Quick Entry' },
    auto: true,
  })

  const editMode = Boolean(doc.name)

  const applyDefaults = useEffectEvent(() => {
    if (document.isNew && typeof document.setDoc === 'function') {
      document.setDoc((current: AnyRecord) => ({ ...current, ...defaults }))
    }
    void bundle.triggerOnRender()
  })

  useEffect(() => {
    applyDefaults()
  }, [])

  async function create() {
    setCreating(true)
    try {
      await bundle.triggerOnBeforeCreate?.()
      const saved = await rpc<AnyRecord>({
        url: 'frappe.client.insert',
        params: { doc: { doctype, ...document.doc } },
      })
      if (typeof document.setDoc === 'function') document.setDoc({ __newDocument: true, doctype })
      onAfterInsert?.(saved)
      onOpenChange(false)
    } catch (failure) {
      if (failure instanceof ApiError && failure.excType === 'MandatoryError') {
        const fieldName = failure.messages
          .map((message) => {
            const parts = message.split(': ')
            return (parts[parts.length - 1] ?? '').trim()
          })
          .join(', ')
        setError(__('Mandatory field error: {0}', [fieldName]))
      } else {
        setError((failure instanceof ApiError && failure.messages[0]) || __('Could not create document'))
      }
    } finally {
      setCreating(false)
    }
  }

  function update() {
    void document.save.submit(null, {
      onSuccess: (saved: AnyRecord) => {
        onAfterUpdate?.(saved)
        onOpenChange(false)
      },
      onError: (failure: AnyRecord) => {
        setError(failure?.messages?.[0] || __('Could not update document'))
      },
    })
  }

  function openQuickEntryModal() {
    setUi({ showQuickEntryModal: true, quickEntryProps: { doctype } })
    requestAnimationFrame(() => onOpenChange(false))
  }

  const label = doctypeTitle || doctype

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="xl" bare>
      <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">
              {editMode ? __('Edit ' + label) : __('Create ' + label)}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {document.actions?.length > 0 && (
              <CustomActions actions={document.actions} close={() => onOpenChange(false)} />
            )}
            {isManager() && !isMobileView && (
              <Button
                variant="ghost"
                className="w-7"
                tooltip={__('Edit Fields Layout')}
                icon={EditIcon}
                onClick={openQuickEntryModal}
              />
            )}
            <Button variant="ghost" className="w-7" icon="lucide-x" onClick={() => onOpenChange(false)} />
          </div>
        </div>
        <div>
          {layout.data && <FieldLayout tabs={layout.data} data={doc} doctype={doctype} docname={docname} />}
          {error && <ErrorMessage className="mt-4" message={__(error)} />}
        </div>
      </div>
      <div className="px-4 pb-7 pt-4 sm:px-6">
        <div className="flex flex-row-reverse gap-2">
          <Button
            variant="solid"
            label={editMode ? __('Update') : __('Create')}
            loading={editMode ? Boolean(document.save?.loading) : creating}
            onClick={() => (editMode ? update() : void create())}
          />
        </div>
      </div>
    </Dialog>
  )
}

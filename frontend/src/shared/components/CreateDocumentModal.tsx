import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { ApiError } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Button, Dialog, ErrorMessage } from '@/design-system'
import { useDocument } from '../hooks/useDocument'
import { useIsMobileView } from '../hooks/useIsMobileView'
import { useMeta } from '../hooks/useMeta'
import { useUsers } from '../hooks/useUsers'
import { useUiStore } from '../stores/uiStore'
import { FieldLayout, type LayoutTab } from './FieldLayout'
import { EditIcon } from './Icons'

type AnyRecord = Record<string, any>

const GET_LAYOUT = 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout'

export interface CreateDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype: string
  data?: AnyRecord | string
  onCallback?: (doc: AnyRecord) => void
}

function withNewNameField(tabs: LayoutTab[] | null, autoname: string | undefined): LayoutTab[] | null {
  if (!tabs || autoname?.toLowerCase() !== 'prompt') return tabs
  const list = tabs as unknown as AnyRecord[]
  const present = list.some((tab) =>
    tab.sections.some((section: AnyRecord) =>
      section.columns.some((column: AnyRecord) =>
        column.fields.some((field: AnyRecord) => field.fieldname === '__newname'),
      ),
    ),
  )
  if (present) return tabs
  const nameField = { fieldname: '__newname', label: __('Name'), fieldtype: 'Data', reqd: 1 }
  return list.map((tab, tabIndex) =>
    tabIndex !== 0
      ? tab
      : {
          ...tab,
          sections: tab.sections.map((section: AnyRecord, sectionIndex: number) =>
            sectionIndex !== 0
              ? section
              : {
                  ...section,
                  columns: section.columns.map((column: AnyRecord, columnIndex: number) =>
                    columnIndex !== 0 ? column : { ...column, fields: [nameField, ...column.fields] },
                  ),
                },
          ),
        },
  ) as unknown as LayoutTab[]
}

export function CreateDocumentModal({ open, onOpenChange, doctype, data = {}, onCallback }: CreateDocumentModalProps) {
  const { isManager } = useUsers()
  const isMobileView = useIsMobileView()
  const setUi = useUiStore((state) => state.set)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bundle = useDocument(doctype)
  const document = bundle.document as unknown as AnyRecord
  const { doctypeMeta } = useMeta(doctype)

  const title = __('New {0}', [doctype.replace(/^(CRM |FCRM )/, '')])

  const layout = useResource<LayoutTab[]>({
    url: GET_LAYOUT,
    cache: ['QuickEntry', doctype],
    params: { doctype, type: 'Quick Entry' },
    auto: true,
  })

  const tabs = useMemo(() => withNewNameField(layout.data, doctypeMeta?.autoname), [layout.data, doctypeMeta?.autoname])

  const seed = useEffectEvent((meta: NonNullable<typeof doctypeMeta>) => {
    const next: AnyRecord = {}
    if (typeof data === 'object') {
      Object.assign(next, data)
    } else if (meta.autoname && meta.autoname.indexOf('field:') !== -1) {
      next[meta.autoname.slice(6)] = data
    } else if (meta.autoname && meta.autoname === 'prompt') {
      next.__newname = data
    } else if (meta.title_field) {
      next[meta.title_field] = data
    }
    document.setDoc?.((current: AnyRecord) => ({ ...current, ...next }))
  })

  useEffect(() => {
    if (doctypeMeta) seed(doctypeMeta)
  }, [doctypeMeta])

  async function create() {
    setLoading(true)
    setError(null)
    try {
      await bundle.triggerOnBeforeCreate?.()
      const created = await rpc<AnyRecord>({
        url: 'frappe.client.insert',
        params: { doc: { doctype, ...document.doc } },
      })
      onOpenChange(false)
      onCallback?.(created)
      document.setDoc?.({ __newDocument: true, doctype })
    } catch (failure) {
      if (failure instanceof ApiError) setError(failure.messages[0] ?? null)
    } finally {
      setLoading(false)
    }
  }

  function openQuickEntryModal() {
    setUi({ showQuickEntryModal: true, quickEntryProps: { doctype } })
    requestAnimationFrame(() => onOpenChange(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="xl" bare>
      <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{__(title) || __('Untitled')}</h3>
          </div>
          <div className="flex items-center gap-1">
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
        {tabs && (
          <div>
            <FieldLayout tabs={tabs} data={document.doc} doctype={doctype} />
            <ErrorMessage className="mt-2" message={error ?? ''} />
          </div>
        )}
      </div>
      <div className="px-4 pb-7 pt-4 sm:px-6">
        <div className="space-y-2">
          <Button
            className="w-full"
            variant="solid"
            label={__('Create')}
            loading={loading}
            onClick={() => void create()}
          />
        </div>
      </div>
    </Dialog>
  )
}

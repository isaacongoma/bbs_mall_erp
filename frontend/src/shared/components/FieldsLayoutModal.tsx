import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import { Badge, Button, Dialog } from '@/design-system'
import { FieldLayout, type LayoutTab } from './FieldLayout'
import { FieldLayoutEditor } from './FieldLayoutEditor'

const GET_LAYOUT = 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout'
const SAVE_LAYOUT = 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.save_fields_layout'

export interface FieldsLayoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  layoutType: string
  title: string
  cacheKey: string
  doctype?: string
  parentDoctype?: string
  previewAsGridRow?: boolean
  onReload?: () => void
}

export function FieldsLayoutModal({
  open,
  onOpenChange,
  layoutType,
  title,
  cacheKey,
  doctype = 'CRM Lead',
  parentDoctype,
  previewAsGridRow = false,
  onReload,
}: FieldsLayoutModalProps) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [tabs, setTabs] = useState<LayoutTab[] | null>(null)
  const [baseline, setBaseline] = useState('')

  const params: Record<string, string> = { doctype, type: layoutType }
  if (parentDoctype !== undefined) params.parent_doctype = parentDoctype

  const resource = useResource<LayoutTab[]>({
    url: GET_LAYOUT,
    cache: parentDoctype !== undefined ? [cacheKey, doctype, parentDoctype] : [cacheKey, doctype],
    params,
    auto: true,
  })

  const resourceData = resource.data
  const [syncedData, setSyncedData] = useState<LayoutTab[] | null>(null)
  if (resourceData && resourceData !== syncedData) {
    const serialized = JSON.stringify(resourceData)
    setSyncedData(resourceData)
    setBaseline(serialized)
    setTabs(JSON.parse(serialized))
  }

  const dirty = tabs !== null && JSON.stringify(tabs) !== baseline

  async function saveChanges() {
    if (!tabs) return
    const layout = JSON.parse(JSON.stringify(tabs)) as Array<{
      sections?: Array<{ columns: Array<{ fields?: Array<{ fieldname?: string; name?: string } | string> }> }>
    }>
    layout.forEach((tab) => {
      tab.sections?.forEach((section) => {
        section.columns.forEach((column) => {
          if (!column.fields) return
          column.fields = column.fields.map((field) =>
            typeof field === 'string' ? field : (field.fieldname ?? field.name)!,
          )
        })
      })
    })
    setLoading(true)
    try {
      await rpc({ url: SAVE_LAYOUT, params: { doctype, type: layoutType, layout: JSON.stringify(layout) } })
      onOpenChange(false)
      capture('data_fields_layout_builder', { doctype })
      onReload?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="4xl"
      titleContent={
        <h3 className="flex items-center gap-2 text-3xl-semibold leading-6 text-ink-gray-9">
          <div>{title}</div>
          {dirty && <Badge label={__('Not Saved')} variant="subtle" theme="orange" />}
        </h3>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-between gap-2">
          <Button label={preview ? __('Hide Preview') : __('Show Preview')} onClick={() => setPreview(!preview)} />
          <div className="flex flex-row-reverse gap-2">
            <Button loading={loading} label={__('Save')} variant="solid" onClick={() => void saveChanges()} />
            <Button label={__('Reset')} onClick={() => void resource.reload().catch(() => undefined)} />
          </div>
        </div>
        {tabs && (
          <div>
            {!preview ? (
              <FieldLayoutEditor tabs={tabs} onChange={setTabs} doctype={doctype} />
            ) : (
              <FieldLayout tabs={tabs} data={{}} preview isGridRow={previewAsGridRow} />
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}

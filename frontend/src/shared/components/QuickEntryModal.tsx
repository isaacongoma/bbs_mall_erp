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

export interface QuickEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype?: string
  onlyRequired?: boolean
}

export function QuickEntryModal({
  open,
  onOpenChange,
  doctype = 'CRM Lead',
  onlyRequired = false,
}: QuickEntryModalProps) {
  const type = onlyRequired ? 'Required Fields' : 'Quick Entry'
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [tabs, setTabs] = useState<LayoutTab[] | null>(null)
  const [baseline, setBaseline] = useState('')
  const [syncedData, setSyncedData] = useState<LayoutTab[] | null>(null)

  const resource = useResource<LayoutTab[]>({
    url: GET_LAYOUT,
    cache: ['QuickEntryModal', doctype, onlyRequired],
    params: { doctype, type },
    auto: true,
  })

  const resourceData = resource.data
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
      sections?: Array<{ columns: Array<{ fields?: Array<{ fieldname: string } | string> }> }>
    }>
    layout.forEach((tab) => {
      tab.sections?.forEach((section) => {
        section.columns.forEach((column) => {
          if (!column.fields) return
          column.fields = column.fields.map((field) => (typeof field === 'string' ? field : field.fieldname))
        })
      })
    })
    setLoading(true)
    try {
      await rpc({ url: SAVE_LAYOUT, params: { doctype, type, layout: JSON.stringify(layout) } })
      onOpenChange(false)
      capture('quick_entry_layout_builder', { doctype })
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
          <div>{__('Edit Quick Entry Layout')}</div>
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
              <FieldLayoutEditor tabs={tabs} onChange={setTabs} doctype={doctype} onlyRequired={onlyRequired} />
            ) : (
              <FieldLayout tabs={tabs} data={{}} preview />
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}

import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import { Badge, Button, Dialog } from '@/design-system'
import { SidePanelLayout, type SidePanelSection } from './SidePanelLayout'
import { SidePanelLayoutEditor } from './SidePanelLayoutEditor'

export interface SidePanelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype?: string
  onReload?: () => void
}

const GET_LAYOUT = 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout'
const SAVE_LAYOUT = 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.save_fields_layout'

interface LayoutTab {
  sections: SidePanelSection[]
  [key: string]: unknown
}

function normalize(tabs: LayoutTab[]): LayoutTab[] {
  return tabs.map((tab) => ({
    ...tab,
    sections: tab.sections.map((section) => ({
      ...section,
      columns: (section.columns ?? []).map((column, index) => ({
        ...column,
        name: column.name ?? (index === 0 ? `${section.name}_col` : `${section.name}_col_${index}`),
      })),
    })),
  }))
}

export function SidePanelModal({ open, onOpenChange, doctype = 'CRM Lead', onReload }: SidePanelModalProps) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [tabs, setTabs] = useState<LayoutTab[] | null>(null)
  const [baseline, setBaseline] = useState('')

  const resource = useResource<LayoutTab[]>({
    url: GET_LAYOUT,
    cache: ['SidePanel', doctype],
    params: { doctype, type: 'Side Panel' },
    auto: true,
  })

  const resourceData = resource.data
  const [syncedData, setSyncedData] = useState<LayoutTab[] | null>(null)
  if (resourceData && resourceData !== syncedData) {
    const normalized = normalize(resourceData)
    const serialized = JSON.stringify(normalized)
    setSyncedData(resourceData)
    setBaseline(serialized)
    setTabs(JSON.parse(serialized))
  }

  const dirty = tabs !== null && JSON.stringify(tabs) !== baseline
  const sections = tabs?.[0]?.sections

  async function saveChanges() {
    if (!tabs) return
    const layout = JSON.parse(JSON.stringify(tabs)) as Array<{
      sections: Array<{ columns?: Array<{ fields?: Array<{ fieldname?: string } | string> }> }>
    }>
    layout.forEach((tab) => {
      tab.sections.forEach((section) => {
        section.columns?.forEach((column) => {
          if (!column.fields) return
          column.fields = column.fields
            .map((field) => (typeof field === 'string' ? field : field.fieldname))
            .filter((name): name is string => Boolean(name))
        })
      })
    })
    setLoading(true)
    try {
      await rpc({
        url: SAVE_LAYOUT,
        params: { doctype, type: 'Side Panel', layout: JSON.stringify(layout[0]!.sections) },
      })
      onOpenChange(false)
      capture('side_panel_layout_builder', { doctype })
      onReload?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="3xl"
      titleContent={
        <h3 className="flex items-center gap-2 text-3xl-semibold leading-6 text-ink-gray-9">
          <div>{__('Edit Field Layout')}</div>
          {dirty && <Badge label={__('Not Saved')} variant="subtle" theme="orange" />}
        </h3>
      }
    >
      <div className="flex flex-col gap-5.5">
        <div className="flex justify-between gap-2">
          <Button label={preview ? __('Hide Preview') : __('Show Preview')} onClick={() => setPreview(!preview)} />
          <div className="flex flex-row-reverse gap-2">
            <Button loading={loading} label={__('Save')} variant="solid" onClick={() => void saveChanges()} />
            <Button label={__('Reset')} onClick={() => void resource.reload().catch(() => undefined)} />
          </div>
        </div>
        {sections && (
          <div className="flex gap-4">
            <SidePanelLayoutEditor
              className="flex flex-1 flex-col pr-2"
              sections={sections}
              doctype={doctype}
              onChange={(next) =>
                setTabs((current) => (current ? [{ ...current[0]!, sections: next }, ...current.slice(1)] : current))
              }
            />
            {preview ? (
              <div className="flex flex-1 flex-col rounded border">
                <SidePanelLayout
                  sections={sections}
                  doctype={doctype}
                  docname=""
                  preview
                  renderSection={({ section }) =>
                    section.name === 'contacts_section' ? (
                      <div className="flex h-16 items-center justify-center text-base text-ink-gray-5">
                        {__('No Contacts Added')}
                      </div>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded bg-surface-gray-2 text-ink-gray-5">
                {__('Toggle on for Preview')}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}

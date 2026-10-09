import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dialog, FormControl } from '@/design-system'
import type { DocField } from '../types/meta'

export interface DeskListSettingsValue {
  fields: string[]
  pageLength: number
  disableCount: boolean
  disableSidebar: boolean
}

interface DeskListSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fields: DocField[]
  value: DeskListSettingsValue
  onApply: (value: DeskListSettingsValue) => void
}

export function DeskListSettings({ open, onOpenChange, fields, value, onApply }: DeskListSettingsProps) {
  const [draft, setDraft] = useState(value)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={__('List Settings')}
      size="md"
      actions={[
        {
          label: __('Apply'),
          variant: 'solid',
          onClick: ({ close }) => {
            onApply(draft)
            close()
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <FormControl
          type="select"
          label={__('Rows per page')}
          value={String(draft.pageLength)}
          options={[20, 50, 100].map((count) => ({ label: String(count), value: String(count) }))}
          onChange={(next: unknown) => setDraft({ ...draft, pageLength: Number(next) || 20 })}
        />
        <div>
          <div className="mb-2 text-sm-medium text-ink-gray-8">{__('Visible fields')}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <FormControl
                key={field.fieldname}
                type="checkbox"
                label={__(field.label ?? field.fieldname)}
                value={draft.fields.includes(field.fieldname)}
                onChange={(checked: boolean) => {
                  const next = checked
                    ? [...draft.fields, field.fieldname]
                    : draft.fields.filter((fieldname) => fieldname !== field.fieldname)
                  setDraft({ ...draft, fields: next.length ? next : [field.fieldname] })
                }}
              />
            ))}
          </div>
        </div>
        <FormControl
          type="checkbox"
          label={__('Disable row count')}
          value={draft.disableCount}
          onChange={(checked: boolean) => setDraft({ ...draft, disableCount: checked })}
        />
        <FormControl
          type="checkbox"
          label={__('Disable sidebar')}
          value={draft.disableSidebar}
          onChange={(checked: boolean) => setDraft({ ...draft, disableSidebar: checked })}
        />
        <Button
          variant="ghost"
          label={__('Reset fields')}
          onClick={() => setDraft({ ...draft, fields: fields.map((field) => field.fieldname) })}
        />
      </div>
    </Dialog>
  )
}

import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Checkbox, Dialog } from '@/design-system'
import { useMeta } from '../../hooks/useMeta'
import { downloadTemplate, importableFields } from '../../utils/dataImport'

export interface TemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype: string
}

export function TemplateModal({ open, onOpenChange, doctype }: TemplateModalProps) {
  const { doctypeMeta } = useMeta(doctype)
  const fields = [
    { fieldname: 'name', label: 'ID', reqd: 1 },
    ...importableFields(doctypeMeta?.fields ?? []).map((field) => ({
      fieldname: field.fieldname,
      label: field.label || field.fieldname,
      reqd: field.reqd ? 1 : 0,
    })),
  ]
  const [selection, setSelection] = useState<Record<string, boolean> | null>(null)

  const selected =
    selection ?? Object.fromEntries(fields.filter((field) => field.reqd).map((field) => [field.fieldname, true]))

  function setAll(value: (field: (typeof fields)[number]) => boolean) {
    setSelection(Object.fromEntries(fields.map((field) => [field.fieldname, value(field)])))
  }

  async function handleExport() {
    const chosen = fields.filter((field) => selected[field.fieldname]).map((field) => field.fieldname)
    await downloadTemplate(doctype, { [doctype]: chosen })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={__('Export Data')}
      size="2xl"
      actionsContent={({ close }) => (
        <div className="flex justify-end space-x-2">
          <Button label={__('Export')} variant="solid" onClick={() => void handleExport()} />
          <Button label={__('Cancel')} onClick={close} />
        </div>
      )}
    >
      <div className="space-y-5 text-base">
        <div className="border-t">
          <p className="mt-2 text-ink-gray-5">{__('Select the fields you want to include in the template.')}</p>
          <div className="mb-5 mt-2 space-x-2">
            <Button label={__('Select All')} onClick={() => setAll(() => true)} />
            <Button label={__('Select Mandatory Fields')} onClick={() => setAll((field) => Boolean(field.reqd))} />
            <Button label={__('Unselect All')} onClick={() => setAll(() => false)} />
          </div>
          <div className="space-y-2">
            <div className="text-ink-gray-5">{doctype}</div>
            <div className="grid grid-cols-2 gap-5">
              {fields.map((field) => (
                <div key={field.fieldname} className="flex items-center space-x-2">
                  <Checkbox
                    id={`checkbox-${field.fieldname}`}
                    value={Boolean(selected[field.fieldname])}
                    onChange={(checked: boolean) => setSelection({ ...selected, [field.fieldname]: checked })}
                  />
                  <label htmlFor={`checkbox-${field.fieldname}`} className={field.reqd ? 'text-ink-red-6' : ''}>
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

import { __ } from '@/core/i18n'
import { useDocumentResource } from '@/core/resources'
import { Button, Select, toast } from '@/design-system'
import { Link } from '@/shared/components/Controls/Link'
import { SettingRow, SettingsPanel } from '@/shared/components/Settings/SettingsPanel'
import { useMeta } from '@/shared/hooks/useMeta'

type AnyRecord = Record<string, any>

export function DefaultsSettings() {
  const { getFields } = useMeta('System Settings')
  const resource = useDocumentResource({ doctype: 'System Settings', name: 'System Settings', auto: true })
  const settings = (resource ?? null) as unknown as AnyRecord | null
  const doc: AnyRecord = settings?.doc ?? {}
  const fields = getFields() ?? []

  function optionsFor(fieldname: string) {
    const field = fields.find((candidate) => candidate.fieldname === fieldname)
    return (field?.options as never) ?? []
  }

  function update(fieldname: string, value: unknown) {
    settings?.setField(fieldname, value)
  }

  function save() {
    settings?.save.submit(null, {
      onSuccess: () => toast.success(__('Settings updated successfully')),
      onError: (error: AnyRecord) => toast.error(error?.messages?.[0] || __('Failed to save settings')),
    })
  }

  return (
    <SettingsPanel
      title={__('System Defaults')}
      description={__(
        'Configure default settings for your CRM system, including default currency, date formats, and other system-wide preferences to ensure consistency across your system.',
      )}
      actions={
        settings?.isDirty ? (
          <Button label={__('Update')} variant="solid" loading={Boolean(settings.save?.loading)} onClick={save} />
        ) : null
      }
    >
      <SettingRow
        title={__('Currency')}
        description={__('Defines the default currency for all records, can be overridden at the field level')}
      >
        <Link
          className="w-24"
          doctype="Currency"
          value={doc.currency}
          onChange={(value) => update('currency', value)}
        />
      </SettingRow>
      <SettingRow
        divider
        title={__('Currency Precision')}
        description={__('Number of decimal places used for all currency values')}
      >
        <Select
          className="!w-16"
          value={doc.currency_precision}
          options={optionsFor('currency_precision')}
          placeholder="3"
          onChange={(value) => update('currency_precision', value)}
        />
      </SettingRow>
      <SettingRow
        title={__('Number Format')}
        description={__('Controls how numbers are displayed (e.g., commas, decimal separators)')}
      >
        <Select
          className="!w-32"
          value={doc.number_format}
          options={optionsFor('number_format')}
          onChange={(value) => update('number_format', value)}
        />
      </SettingRow>
      <SettingRow
        divider
        title={__('Float Precision')}
        description={__('Number of decimal places for non-currency numeric fields')}
      >
        <Select
          className="!w-16"
          value={doc.float_precision}
          options={optionsFor('float_precision')}
          placeholder="3"
          onChange={(value) => update('float_precision', value)}
        />
      </SettingRow>
      <SettingRow title={__('Date Format')} description={__('Display format for dates across the system')}>
        <Select
          className="!w-32"
          value={doc.date_format}
          options={optionsFor('date_format')}
          onChange={(value) => update('date_format', value)}
        />
      </SettingRow>
      <SettingRow title={__('Time Format')} description={__('Select whether to display time with or without seconds')}>
        <Select
          className="!w-28"
          value={doc.time_format}
          options={optionsFor('time_format')}
          onChange={(value) => update('time_format', value)}
        />
      </SettingRow>
    </SettingsPanel>
  )
}

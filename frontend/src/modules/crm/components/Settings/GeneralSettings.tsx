import { __ } from '@/core/i18n'
import { FormControl, Switch, toast } from '@/design-system'
import { SettingRow, SettingsPanel } from '@/shared/components/Settings/SettingsPanel'
import { useSettings } from '../../hooks/useSettings'

type AnyRecord = Record<string, any>

export function GeneralSettings() {
  const { _settings } = useSettings()
  const settings = _settings as unknown as AnyRecord
  const doc: AnyRecord = settings.doc ?? {}

  function toggle(key: string, value: boolean) {
    settings.setField(key, value ? 1 : 0)
    settings.save.submit(null, {
      onSuccess: () => toast.success(value ? __('Setting enabled successfully') : __('Setting disabled successfully')),
    })
  }

  function select(key: string, value: string) {
    settings.setField(key, value)
    settings.save.submit(null, { onSuccess: () => toast.success(__('Setting updated successfully')) })
  }

  return (
    <SettingsPanel title={__('General Settings')} description={__('Configure general settings for your application')}>
      <SettingRow
        divider
        title={__('Update timestamp on new communication')}
        description={__('Update the modified timestamp on new email communication & comments for leads & deals')}
      >
        <Switch
          size="sm"
          value={Boolean(doc.update_timestamp_on_new_communication)}
          onChange={(value) => toggle('update_timestamp_on_new_communication', value)}
        />
      </SettingRow>
      <SettingRow
        divider
        title={__('Mark lead/deal as replied on response')}
        description={__(
          'Automatically sets communication status to “Replied” for the lead or deal when a response is received. Applies only when SLA is enabled',
        )}
      >
        <Switch
          size="sm"
          value={Boolean(doc.auto_mark_replied_on_response)}
          onChange={(value) => toggle('auto_mark_replied_on_response', value)}
        />
      </SettingRow>
      <SettingRow
        divider
        title={__('Reopen lead/deal on new communication')}
        description={__(
          'Automatically sets communication status to “Open” for the lead or deal when a new communication is created. Applies only when SLA is enabled',
        )}
      >
        <Switch
          size="sm"
          value={Boolean(doc.auto_reopen_on_new_communication)}
          onChange={(value) => toggle('auto_reopen_on_new_communication', value)}
        />
      </SettingRow>
      <SettingRow
        divider
        title={__('Timeline timestamp format')}
        description={__(
          'Show timestamps in the activity timeline as relative time (5 mins ago) or an exact date & time',
        )}
      >
        <FormControl
          type="select"
          className="w-40"
          value={doc.crm_timeline_timestamp_format || 'Relative'}
          options={[
            { label: __('Relative'), value: 'Relative' },
            { label: __('Exact'), value: 'Exact' },
          ]}
          placeholder={__('Relative')}
          onChange={(value: string) => select('crm_timeline_timestamp_format', value)}
        />
      </SettingRow>
      <SettingRow
        divider
        title={__('Timeline sort order')}
        description={__('Order of activities, emails, comments and calls in the timeline')}
      >
        <FormControl
          type="select"
          className="w-40"
          value={doc.crm_timeline_sort_order || 'Oldest First'}
          options={[
            { label: __('Oldest First'), value: 'Oldest First' },
            { label: __('Newest First'), value: 'Newest First' },
          ]}
          placeholder={__('Oldest First')}
          onChange={(value: string) => select('crm_timeline_sort_order', value)}
        />
      </SettingRow>
    </SettingsPanel>
  )
}

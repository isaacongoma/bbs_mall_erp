import { __ } from '@/core/i18n'
import { useDocumentResource, useResource } from '@/core/resources'
import { Badge, Button, Combobox, toast } from '@/design-system'
import { Link } from '@/shared/components/Controls/Link'
import { SettingsLayoutBase } from '@/shared/components/Settings/SettingsPanel'
import { ThemeSwitcher } from '@/shared/components/Settings/ThemeSwitcher'
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts'
import { useSession } from '@/shared/hooks/useSession'
import { CRMLogo } from '../Icons'
import { useSettings } from '../../hooks/useSettings'

type AnyRecord = Record<string, any>

export function PreferencesSettings() {
  const { user: sessionUser } = useSession()
  const { brand } = useSettings()
  const resource = useDocumentResource({ doctype: 'User', name: sessionUser ?? '', auto: true })
  const user = resource as unknown as AnyRecord | null
  const doc: AnyRecord | null = user?.doc ?? null
  const isDirty = Boolean(user?.isDirty)

  const timeZones = useResource<AnyRecord>({
    url: 'frappe.core.doctype.user.user.get_timezones',
    cache: 'TimeZones',
    auto: true,
  })

  function save() {
    if (!user) return
    const refreshRequired =
      user.doc.language !== user.originalDoc?.language || user.doc.time_zone !== user.originalDoc?.time_zone
    user.save.submit(null, {
      onSuccess: () => {
        toast.success(__('Preferences updated successfully'))
        if (refreshRequired) window.location.reload()
      },
      onError: (error: AnyRecord) => toast.error(error.message + ': ' + error.messages?.[0]),
    })
  }

  useKeyboardShortcuts({
    ignoreTyping: false,
    shortcuts: [
      {
        match: (event) => (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's',
        action: () => {
          if (isDirty) save()
        },
      },
    ],
  })

  if (!doc) return null

  const timezoneOptions = ((timeZones.data?.timezones as string[] | undefined) ?? []).map((zone) => ({
    label: zone,
    value: zone,
  }))

  return (
    <SettingsLayoutBase
      title={__('Preferences')}
      description={__('Choose how you want to use the application by setting your preferences.')}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-base-semibold text-ink-gray-9">{__('Appearance')}</div>
          </div>
        </div>
        <div className="my-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-base-medium text-ink-gray-8">{__('Theme')}</span>
            <span className="text-p-sm text-ink-gray-6">{__('Switch between light, dark, or system theme')}</span>
          </div>
          <ThemeSwitcher logo={brand.logo || CRMLogo} name={brand.name || 'CRM'} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex h-7 items-center gap-2">
            <div className="text-base-semibold text-ink-gray-9">{__('Language & Time')}</div>
            {isDirty && <Badge variant="subtle" theme="orange" size="sm" label={__('Not Saved')} />}
          </div>
          {isDirty && <Button label={__('Save')} loading={Boolean(user?.save?.loading)} onClick={save} />}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-base-medium text-ink-gray-8">{__('Language')}</span>
            <span className="text-p-sm text-ink-gray-6">{__('Change language of the application.')}</span>
          </div>
          <Link
            className="w-40"
            doctype="Language"
            value={doc.language}
            onChange={(value) => user?.setField('language', value)}
          />
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-base-medium text-ink-gray-8">{__('Timezone')}</span>
            <span className="text-p-sm text-ink-gray-6">{__('Change timezone of the application.')}</span>
          </div>
          <Combobox
            className="w-40"
            value={doc.time_zone}
            options={timezoneOptions}
            onChange={(value) => user?.setField('time_zone', value)}
          />
        </div>
      </div>
    </SettingsLayoutBase>
  )
}

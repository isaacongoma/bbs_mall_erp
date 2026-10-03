import { __ } from '@/core/i18n'
import { useDocumentResource } from '@/core/resources'
import { Switch, toast } from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { SettingRow } from '@/shared/components/Settings/SettingsPanel'

type AnyRecord = Record<string, any>

export function EnrichmentSettings() {
  const resource = useDocumentResource({
    doctype: 'CRM Enrichment Settings',
    name: 'CRM Enrichment Settings',
    auto: true,
  })
  const settings = resource as unknown as AnyRecord | null
  const doc: AnyRecord = settings?.doc ?? {}

  function update(fieldname: string, value: boolean) {
    settings?.setField(fieldname, value ? 1 : 0)
    settings?.save.submit(null, {
      onSuccess: () => toast.success(value ? __('Setting enabled successfully') : __('Setting disabled successfully')),
      onError: (error: AnyRecord) => toast.error(error?.messages?.[0] || __('Could not save')),
    })
  }

  return (
    <div className="flex h-full flex-col gap-6 px-6 py-8 text-ink-gray-8">
      <div className="flex flex-col gap-1 px-2">
        <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none">{__('Enrichment')}</h2>
        <p className="text-p-base text-ink-gray-6">{__('Fill in company details from a record’s website')}</p>
      </div>
      {settings?.get?.loading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingIndicator className="size-8" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <SettingRow
            title={__('Enable enrichment')}
            description={__(
              'Turn on enrichment for this site. When off, the Enrich button is hidden and no record is enriched',
            )}
          >
            <Switch size="sm" value={Boolean(doc.enabled)} onChange={(value) => update('enabled', value)} />
          </SettingRow>
          <SettingRow
            title={__('Auto-enrich new records')}
            description={__('Enrich a new record as soon as it is created')}
          >
            <Switch
              size="sm"
              value={Boolean(doc.auto_enrich)}
              disabled={!doc.enabled}
              onChange={(value) => update('auto_enrich', value)}
            />
          </SettingRow>
        </div>
      )}
    </div>
  )
}

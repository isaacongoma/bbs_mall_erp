import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useDocumentResource } from '@/core/resources'
import { Button, Combobox, FormControl, Password, Switch, toast } from '@/design-system'
import { useIntegrationsStore } from '../../stores/integrationsStore'
import { IntegrationSettingsLayout } from './IntegrationSettingsLayout'

type AnyRecord = Record<string, any>

export interface TwilioSettingsProps {
  onBack: () => void
}

export function TwilioSettings({ onBack }: TwilioSettingsProps) {
  const resource = useDocumentResource({
    doctype: 'CRM Twilio Settings',
    name: 'CRM Twilio Settings',
    auto: true,
  }) as unknown as AnyRecord | null
  const [fetchingApps, setFetchingApps] = useState(false)
  const doc: AnyRecord | null = resource?.doc ?? null
  const isDirty = Boolean(resource?.isDirty)

  const apps: { label: string; value: string }[] =
    doc?.account_sid && doc?.twilio_apps
      ? String(doc.twilio_apps)
          .split(',')
          .map((app) => ({ label: app, value: app }))
      : []

  function update(enabled?: boolean) {
    if (!resource) return
    const nextEnabled = enabled ?? Boolean(resource.doc?.enabled)
    resource.save.submit(null, {
      onSuccess: () => {
        void resource.reload()
        useIntegrationsStore.getState().setEnabled('twilio', nextEnabled)
      },
      onError: (error: unknown) => toast.error(toErrorMessage(error) || __('Failed to update Twilio settings')),
    })
  }

  function disable() {
    resource?.setField('enabled', false)
    update(false)
  }

  async function refreshApps() {
    setFetchingApps(true)
    try {
      await rpc({ url: 'crm.integrations.twilio.fetch_applications' })
      await resource?.reload()
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Failed to fetch Twilio apps'))
    } finally {
      setFetchingApps(false)
    }
  }

  return (
    <IntegrationSettingsLayout
      title={__('Twilio Settings')}
      disabledTitle={__('Twilio Integration Disabled')}
      disabledDescription={__('Enable Twilio integration to make and receive calls directly from your CRM')}
      resource={resource}
      isDirty={isDirty}
      saving={Boolean(resource?.save?.loading)}
      onBack={onBack}
      onEnable={() => resource?.setField('enabled', true)}
      onDisable={disable}
      onUpdate={() => update()}
      onDiscard={() => void resource?.reload()}
    >
      <div className="grid grid-cols-2 gap-4">
        <FormControl
          label={__('Account SID')}
          type="text"
          placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          required
          autoComplete="off"
          value={doc?.account_sid ?? ''}
          onChange={(value: string) => resource?.setField('account_sid', value)}
        />
        <Password
          label={__('Auth Token')}
          placeholder="************"
          required
          value={doc?.auth_token ?? ''}
          onChange={(value: string) => resource?.setField('auth_token', value)}
        />
      </div>
      {resource?.originalDoc?.account_sid && apps.length > 0 && (
        <>
          <div className="h-px border-t border-outline-elevation-2" />
          <div className="flex items-center justify-between gap-8">
            <div className="flex flex-col">
              <div className="truncate text-p-base-medium text-ink-gray-7">{__('Twilio App Name')}</div>
              <div className="text-p-sm text-ink-gray-5">{__('Select a Twilio app for your CRM')}</div>
            </div>
            <div className="flex items-center gap-2">
              <Combobox
                value={doc?.app_name ?? null}
                options={apps}
                onChange={(value) => resource?.setField('app_name', value)}
                footer={() => (
                  <Button
                    label={__('Refresh Apps')}
                    theme="gray"
                    variant="subtle"
                    className="w-full"
                    iconLeft="lucide-refresh-cw"
                    loading={fetchingApps}
                    onClick={() => void refreshApps()}
                  />
                )}
              />
            </div>
          </div>
        </>
      )}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="truncate text-p-base-medium text-ink-gray-7">{__('Record Calls')}</div>
          <div className="truncate text-p-sm text-ink-gray-5">
            {__('Enable call recording for incoming and outgoing calls')}
          </div>
        </div>
        <div>
          <Switch
            size="sm"
            value={Boolean(doc?.record_calls)}
            onChange={(value) => resource?.setField('record_calls', value)}
          />
        </div>
      </div>
    </IntegrationSettingsLayout>
  )
}

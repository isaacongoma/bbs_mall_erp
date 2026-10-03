import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useDocumentResource } from '@/core/resources'
import { FormControl, Password, Switch, toast } from '@/design-system'
import { useIntegrationsStore } from '../../stores/integrationsStore'
import { IntegrationSettingsLayout } from './IntegrationSettingsLayout'

type AnyRecord = Record<string, any>

export interface ExotelSettingsProps {
  onBack: () => void
}

export function ExotelSettings({ onBack }: ExotelSettingsProps) {
  const resource = useDocumentResource({
    doctype: 'CRM Exotel Settings',
    name: 'CRM Exotel Settings',
    auto: true,
  }) as unknown as AnyRecord | null
  const doc: AnyRecord | null = resource?.doc ?? null
  const isDirty = Boolean(resource?.isDirty)

  function update(enabled?: boolean) {
    if (!resource) return
    const nextEnabled = enabled ?? Boolean(resource.doc?.enabled)
    resource.save.submit(null, {
      onSuccess: () => {
        void resource.reload()
        useIntegrationsStore.getState().setEnabled('exotel', nextEnabled)
      },
      onError: (error: unknown) => toast.error(toErrorMessage(error) || __('Failed to update Exotel settings')),
    })
  }

  function disable() {
    resource?.setField('enabled', false)
    update(false)
  }

  function text(field: string, label: string, placeholder: string) {
    return (
      <FormControl
        label={label}
        type="text"
        placeholder={placeholder}
        required
        autoComplete="off"
        value={doc?.[field] ?? ''}
        onChange={(value: string) => resource?.setField(field, value)}
      />
    )
  }

  return (
    <IntegrationSettingsLayout
      title={__('Exotel Settings')}
      disabledTitle={__('Exotel Integration Disabled')}
      disabledDescription={__('Enable Exotel integration to make and receive calls directly from your CRM')}
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
        {text('api_key', __('API Key'), 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')}
        <Password
          label={__('API Token')}
          placeholder="************"
          required
          value={doc?.api_token ?? ''}
          onChange={(value: string) => resource?.setField('api_token', value)}
        />
        {text('account_sid', __('Account SID'), 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')}
        {text('webhook_verify_token', __('Webhook Verify Token'), 'my_secure_token_123')}
        {text('subdomain', __('Subdomain'), 'api.exotel.com')}
      </div>
      <div className="h-px border-t border-outline-elevation-2" />
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
            value={Boolean(doc?.record_call)}
            onChange={(value) => resource?.setField('record_call', value)}
          />
        </div>
      </div>
    </IntegrationSettingsLayout>
  )
}

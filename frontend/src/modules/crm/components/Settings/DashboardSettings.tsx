import { useState } from 'react'
import { __ } from '@/core/i18n'
import { useRoute } from '@/core/navigation'
import { Button, ErrorMessage, FormControl, Switch, createDialog, toast } from '@/design-system'
import { Link } from '@/shared/components/Controls/Link'
import { SettingRow, SettingsPanel } from '@/shared/components/Settings/SettingsPanel'
import { sendBroadcast } from '@/shared/hooks/useBroadcast'
import { useSettings } from '../../hooks/useSettings'

type AnyRecord = Record<string, any>

const PROVIDERS_REQUIRING_KEY = ['exchangerate.host', 'exchangerate-api']

const PROVIDER_META: Record<string, { label: string; docsUrl: string; docsLabel: string }> = {
  'exchangerate.host': {
    label: 'Exchangerate Host',
    docsUrl: 'https://exchangerate.host/#/docs/access_key',
    docsLabel: 'exchangerate.host',
  },
  'exchangerate-api': {
    label: 'Exchangerate API',
    docsUrl: 'https://www.exchangerate-api.com',
    docsLabel: 'exchangerate-api.com',
  },
}

export function DashboardSettings() {
  const route = useRoute()
  const { _settings } = useSettings()
  const settings = _settings as unknown as AnyRecord
  const doc: AnyRecord = settings.doc ?? {}
  const [errorMessage, setErrorMessage] = useState('')

  const requiresAccessKey = PROVIDERS_REQUIRING_KEY.includes(doc.service_provider)
  const providerMeta = PROVIDER_META[doc.service_provider]

  function updateSettings() {
    setErrorMessage('')
    if (!doc.currency) {
      setErrorMessage(__('Please select a currency before saving.'))
      return
    }
    if (requiresAccessKey && !doc.access_key) {
      setErrorMessage(__('Please enter the {0} access key.', [providerMeta?.label]))
      return
    }
    settings.save.submit(null, {
      onSuccess: () => {
        toast.success(__('Dashboard settings updated successfully'))
        if (route.name === 'Deal') sendBroadcast('reload-deal-sections')
      },
    })
  }

  function setCurrency(value: string) {
    createDialog({
      title: __('Set Currency'),
      message: __('Are you sure you want to set the currency as {0}? This cannot be changed later.', [value]),
      actions: [
        {
          label: __('Save'),
          variant: 'solid',
          onClick: ({ close }) => {
            settings.setField('currency', value)
            settings.save.submit(null, {
              onSuccess: () => {
                toast.success(__('Currency set as {0} successfully', [value]))
                close()
              },
            })
          },
        },
      ],
    })
  }

  return (
    <SettingsPanel
      title={__('Dashboard')}
      description={__(
        'Configure how your dashboard calculates, formats, and displays key metrics, including forecasting, deal values, and currency settings',
      )}
      actions={
        settings.isDirty ? (
          <Button
            label={__('Update')}
            variant="solid"
            loading={Boolean(settings.save?.loading)}
            onClick={updateSettings}
          />
        ) : null
      }
    >
      <SettingRow
        divider
        title={__('Enable Forecasting')}
        description={__('Makes "Expected Closure Date" and "Expected Deal Value" mandatory for deal value forecasting')}
      >
        <Switch
          size="sm"
          value={Boolean(doc.enable_forecasting)}
          onChange={(value) => settings.setField('enable_forecasting', value ? 1 : 0)}
        />
      </SettingRow>
      <SettingRow
        divider
        title={__('Auto Update Expected Deal Value')}
        description={__(
          'Automatically update "Expected Deal Value" based on the total value of associated products in a deal',
        )}
      >
        <Switch
          size="sm"
          value={Boolean(doc.auto_update_expected_deal_value)}
          onChange={(value) => settings.setField('auto_update_expected_deal_value', value ? 1 : 0)}
        />
      </SettingRow>
      <SettingRow
        divider
        title={__('Dashboard Currency')}
        description={__(
          'Dashboard number cards & charts will show currency in the selected format. Once set, cannot be edited.',
        )}
      >
        {doc.currency ? (
          <div className="text-base text-ink-gray-8">{doc.currency}</div>
        ) : (
          <Link
            className="form-control w-40 flex-1 truncate"
            value={doc.currency}
            doctype="Currency"
            placeholder={__('Select Currency')}
            placement="bottom-end"
            onChange={setCurrency}
          />
        )}
      </SettingRow>
      <SettingRow
        divider={requiresAccessKey}
        title={__('Exchange Rate Provider')}
        description={__('Configure the exchange rate provider for your CRM')}
      >
        <FormControl
          type="select"
          className="w-44"
          value={doc.service_provider}
          options={[
            { label: 'Frankfurter', value: 'frankfurter.app' },
            { label: 'Fawaz Ahmed Exchange API', value: 'fawazahmed-exchange-api' },
            { label: 'Exchangerate Host', value: 'exchangerate.host' },
            { label: 'Exchangerate API', value: 'exchangerate-api' },
          ]}
          placeholder={__('Select Provider')}
          disabled={!doc.currency}
          onChange={(value: string) => {
            settings.setField('service_provider', value)
            settings.setField('access_key', '')
          }}
        />
      </SettingRow>
      {requiresAccessKey && providerMeta && (
        <div className="flex items-center justify-between gap-8 p-3">
          <div className="flex flex-col">
            <div className="truncate text-p-base-medium text-ink-gray-7">{__('Access Key')}</div>
            <div className="text-p-sm text-ink-gray-5">
              {__('Access key for {0}. Required for fetching exchange rates.', [providerMeta.label])}
            </div>
            <div className="text-p-sm text-ink-gray-5">
              {__('You can get your access key from ')}
              <a
                className="text-ink-gray-7 hover:underline"
                href={providerMeta.docsUrl}
                target="_blank"
                rel="noreferrer"
              >
                {__(providerMeta.docsLabel)}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FormControl
              type="text"
              className="w-44"
              value={doc.access_key ?? ''}
              placeholder={__('Enter Access Key')}
              disabled={!doc.currency}
              onChange={(value: string) => settings.setField('access_key', value)}
            />
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="px-3">
          <ErrorMessage message={__(errorMessage)} />
        </div>
      )}
    </SettingsPanel>
  )
}

import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { Button, ErrorMessage, toast } from '@/design-system'
import {
  customProviderFields,
  emailIcon,
  emailServices,
  popularProviderFields,
  validateInputs,
  type EmailAccountState,
} from '../../utils/emailConfig'
import { EmailAccountFields } from './EmailAccountFields'
import { EmailProviderIcon } from './EmailProviderIcon'

type AnyRecord = Record<string, any>

export interface EmailEditProps {
  accountData: AnyRecord
  onBack: () => void
}

function initialState(account: AnyRecord): EmailAccountState {
  return {
    email_account_name: account.email_account_name || '',
    service: account.service || '',
    email_id: account.email_id || '',
    api_key: account.api_key || null,
    api_secret: account.api_secret || null,
    password: account.password || null,
    frappe_mail_site: account.frappe_mail_site || '',
    enable_incoming: Boolean(account.enable_incoming),
    enable_outgoing: Boolean(account.enable_outgoing),
    default_outgoing: Boolean(account.default_outgoing),
    default_incoming: Boolean(account.default_incoming),
    create_lead_from_incoming_email: Boolean(account.create_lead_from_incoming_email),
  }
}

const COMPARED: (keyof EmailAccountState)[] = [
  'email_account_name',
  'email_id',
  'api_key',
  'api_secret',
  'password',
  'enable_incoming',
  'enable_outgoing',
  'default_outgoing',
  'default_incoming',
  'frappe_mail_site',
  'create_lead_from_incoming_email',
]

export function EmailEdit({ accountData, onBack }: EmailEditProps) {
  const [original] = useState(() => initialState(accountData))
  const [state, setState] = useState<EmailAccountState>(original)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isCustom = Boolean(emailServices().find((service) => service.name === accountData.service)?.custom)
  const isDirty = COMPARED.some((key) => state[key] !== original[key])

  async function update() {
    const message = validateInputs(state, isCustom)
    setError(message)
    if (message) return
    if (!isDirty) {
      toast.info(__('No changes made'))
      return
    }
    setLoading(true)
    try {
      await rpc({
        url: 'frappe.client.set_value',
        params: { doctype: 'Email Account', name: accountData.email_account_name, fieldname: state },
      })
      toast.success(__('Email account updated successfully'))
      onBack()
    } catch (failure) {
      setLoading(false)
      setError(toErrorMessage(failure) || __('Failed to update email account: invalid credentials'))
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div role="heading" aria-level={1} className="flex justify-between gap-1">
        <h2 className="text-2xl-semibold text-ink-gray-8">{__('Edit Email')}</h2>
      </div>
      <div className="w-fit">
        <EmailProviderIcon logo={emailIcon(accountData.service)} label={accountData.service} />
      </div>
      <div className="flex items-center gap-2 rounded-md p-2 ring-1 ring-outline-gray-3">
        <span className="lucide-circle-alert size-6 min-h-5 min-w-5 max-w-5 text-ink-gray-4" aria-hidden="true" />
        <div className="text-wrap text-xs text-ink-gray-6">
          {__('To know more about setting up email accounts, click')}{' '}
          <a
            href="https://docs.erpnext.com/docs/user/manual/en/email-account"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {__('here')}
          </a>
          .
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <EmailAccountFields
          fields={isCustom ? customProviderFields() : popularProviderFields()}
          state={state}
          onChange={(patch) => setState((current) => ({ ...current, ...patch }))}
        />
        {error && <ErrorMessage className="ml-1" message={error} />}
      </div>
      <div className="mt-auto flex justify-between">
        <Button label={__('Back')} theme="gray" variant="outline" disabled={loading} onClick={onBack} />
        <Button label={__('Update Account')} variant="solid" loading={loading} onClick={() => void update()} />
      </div>
    </div>
  )
}

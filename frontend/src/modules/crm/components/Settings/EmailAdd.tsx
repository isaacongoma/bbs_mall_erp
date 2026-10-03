import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { Button, ErrorMessage, toast } from '@/design-system'
import {
  customProviderFields,
  emailServices,
  emptyEmailAccount,
  popularProviderFields,
  validateInputs,
  type EmailAccountState,
  type EmailService,
} from '../../utils/emailConfig'
import { EmailAccountFields } from './EmailAccountFields'
import { EmailProviderIcon } from './EmailProviderIcon'

export interface EmailAddProps {
  onBack: () => void
}

export function EmailAdd({ onBack }: EmailAddProps) {
  const [state, setState] = useState<EmailAccountState>(emptyEmailAccount)
  const [selected, setSelected] = useState<EmailService | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const services = emailServices()

  function select(service: EmailService) {
    setSelected(service)
    setState((current) => ({ ...current, service: service.name }))
  }

  async function create() {
    if (!selected) return
    const message = validateInputs(state, selected.custom)
    setError(message)
    if (message) return
    setLoading(true)
    try {
      await rpc({ url: 'frappe.client.insert', params: { doc: { doctype: 'Email Account', ...state } } })
      toast.success(__('Email account created successfully'))
      onBack()
    } catch (failure) {
      setError(toErrorMessage(failure) || __('Failed to create email account: invalid credentials'))
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div role="heading" aria-level={1} className="flex flex-col gap-1">
        <h2 className="text-2xl-semibold text-ink-gray-8">{__('Setup Email')}</h2>
        <p className="text-sm text-ink-gray-5">{__('Choose the email service provider you want to configure.')}</p>
      </div>
      <div className="flex flex-wrap items-center">
        {services.map((service) => (
          <div
            key={service.name}
            className="mt-4 flex w-[70px] flex-col items-center gap-1"
            onClick={() => select(service)}
          >
            <EmailProviderIcon label={service.name} logo={service.icon} selected={selected?.name === service.name} />
          </div>
        ))}
      </div>
      {selected && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-md p-2 text-ink-gray-6 ring-1 ring-outline-gray-3">
            <span className="lucide-circle-alert size-5 min-h-5 min-w-5 max-w-5" aria-hidden="true" />
            <div className="text-wrap text-xs">
              {selected.info}{' '}
              <a href={selected.link} target="_blank" rel="noreferrer" className="underline">
                {__('here')}
              </a>
              .
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <EmailAccountFields
              fields={selected.custom ? customProviderFields() : popularProviderFields()}
              state={state}
              onChange={(patch) => setState((current) => ({ ...current, ...patch }))}
            />
            <ErrorMessage className="ml-1" message={error} />
          </div>
        </div>
      )}
      {selected && (
        <div className="mt-auto flex justify-between">
          <Button label={__('Back')} variant="outline" disabled={loading} onClick={onBack} />
          <Button label={__('Create')} variant="solid" loading={loading} onClick={() => void create()} />
        </div>
      )}
    </div>
  )
}

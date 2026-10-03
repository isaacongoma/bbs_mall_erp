import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useDocumentResource } from '@/core/resources'
import { Badge, Button, ErrorMessage, FormControl, toast } from '@/design-system'
import { useSession } from '@/shared/hooks/useSession'
import { useUsers } from '@/shared/hooks/useUsers'
import { validatePhone } from '@/shared/utils/validation'
import { useTelephony } from '../../hooks/useTelephony'

type AnyRecord = Record<string, any>

export interface TelephonySettingsProps {
  onUpdateStep: (step: 'telephony-settings' | 'twilio-settings' | 'exotel-settings') => void
}

function Divider() {
  return <div className="mx-2 h-px border-t border-outline-elevation-2" />
}

interface NumberRowProps {
  title: string
  description: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

function NumberRow({ title, description, placeholder, value, onChange }: NumberRowProps) {
  return (
    <div className="flex items-center justify-between gap-8 py-3 pl-2 pr-1">
      <div className="flex flex-col">
        <div className="truncate text-p-base-medium text-ink-gray-7">{title}</div>
        <div className="text-p-sm text-ink-gray-5">{description}</div>
      </div>
      <div>
        <FormControl
          className="w-44 flex-1 truncate p-1"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          error={Boolean(value) && !validatePhone(value) ? __('Enter a valid phone number') : undefined}
        />
      </div>
    </div>
  )
}

export function TelephonySettings({ onUpdateStep }: TelephonySettingsProps) {
  const { isEnabled } = useTelephony()
  const { isManager } = useUsers()
  const { user: sessionUser } = useSession()
  const resource = useDocumentResource({
    doctype: 'CRM Telephony Agent',
    name: sessionUser ?? '',
    auto: true,
  }) as unknown as AnyRecord | null
  const doc: AnyRecord | null = resource?.doc ?? null
  const isDirty = Boolean(resource?.isDirty)

  function update() {
    if (!resource || !isDirty) return
    resource.save.submit(null, {
      onError: (error: unknown) => toast.error(toErrorMessage(error)),
    })
  }

  const twilio = isEnabled('twilio')
  const exotel = isEnabled('exotel')

  return (
    <div className="flex h-full flex-col gap-6 px-6 py-8">
      <div className="flex justify-between px-2 text-ink-gray-8">
        <div className="flex w-9/12 flex-col gap-1">
          <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none text-ink-gray-8">
            {__('Telephony Settings')}
            {isDirty && <Badge label={__('Not Saved')} variant="subtle" theme="orange" />}
          </h2>
          <p className="text-p-base text-ink-gray-6">{__('Configure telephony settings for your CRM')}</p>
        </div>
        <div className="item-center flex w-3/12 justify-end space-x-2">
          {isDirty && (
            <Button loading={Boolean(resource?.save?.loading)} label={__('Update')} variant="solid" onClick={update} />
          )}
        </div>
      </div>

      {doc && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex items-center justify-between gap-8 py-3 pl-2 pr-1">
            <div className="flex flex-col">
              <div className="truncate text-p-base-medium text-ink-gray-7">{__('Default Medium')}</div>
              <div className="text-p-sm text-ink-gray-5">{__('Default calling medium for logged-in user')}</div>
            </div>
            <div className="flex items-center gap-1">
              <FormControl
                type="select"
                className="w-44 p-1"
                options={[
                  { label: '', value: '' },
                  { label: __('Twilio'), value: 'Twilio' },
                  { label: __('Exotel'), value: 'Exotel' },
                ]}
                placeholder={__('Select Medium')}
                value={doc.default_medium ?? ''}
                onChange={(value: string) => resource?.setField('default_medium', value)}
              />
              {doc.default_medium && (
                <Button
                  icon="lucide-x"
                  tooltip={__('Clear')}
                  onClick={() => resource?.setField('default_medium', '')}
                />
              )}
            </div>
          </div>
          {twilio && (
            <>
              <Divider />
              <NumberRow
                title={__('Twilio Number')}
                description={__('Set the Twilio number to be used for outgoing calls.')}
                placeholder={__('Enter Twilio Number')}
                value={doc.twilio_number ?? ''}
                onChange={(value) => resource?.setField('twilio_number', value)}
              />
            </>
          )}
          {exotel && (
            <>
              <Divider />
              <NumberRow
                title={__('Exotel Number')}
                description={__('Set the Exotel number to be used for outgoing calls.')}
                placeholder={__('Enter Exotel Number')}
                value={doc.exotel_number ?? ''}
                onChange={(value) => resource?.setField('exotel_number', value)}
              />
              <NumberRow
                title={__('Personal Mobile Number')}
                description={__('Enter your personal mobile number used by Exotel to make calls')}
                placeholder={__('Enter Personal Mobile Number')}
                value={doc.mobile_no ?? ''}
                onChange={(value) => resource?.setField('mobile_no', value)}
              />
            </>
          )}

          {isManager() && (
            <>
              <div className="mt-4 flex items-center justify-between px-2 py-3 text-lg-semibold text-ink-gray-8">
                {__('Integrations')}
              </div>
              <div className="flex items-center justify-between px-2 py-3">
                <div className="flex flex-col gap-1">
                  <span className="text-base-medium text-ink-gray-8">{__('Twilio')}</span>
                  <span className="text-p-sm text-ink-gray-6">
                    {__('Configure your Twilio telephony integration settings here')}
                  </span>
                </div>
                <Button
                  label={twilio ? __('Update Configuration') : __('Configure')}
                  onClick={() => onUpdateStep('twilio-settings')}
                />
              </div>
              <Divider />
              <div className="flex items-center justify-between px-2 py-3">
                <div className="flex flex-col gap-1">
                  <span className="text-base-medium text-ink-gray-8">{__('Exotel')}</span>
                  <span className="text-p-sm text-ink-gray-6">
                    {__('Configure your Exotel telephony integration settings here')}
                  </span>
                </div>
                <Button
                  label={exotel ? __('Update Configuration') : __('Configure')}
                  onClick={() => onUpdateStep('exotel-settings')}
                />
              </div>
            </>
          )}
        </div>
      )}
      <ErrorMessage message={(resource?.save?.error as string | undefined) ?? ''} />
    </div>
  )
}

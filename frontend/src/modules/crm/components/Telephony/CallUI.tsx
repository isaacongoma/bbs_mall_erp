import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Dialog, FormControl, toast, useLatest } from '@/design-system'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { useTelephony } from '../../hooks/useTelephony'
import { useIntegrationsStore } from '../../stores/integrationsStore'
import { ExotelCallUI } from './ExotelCallUI'
import { TwilioCallUI, type CallUIHandle } from './TwilioCallUI'

const MEDIA = [
  { key: 'twilio', label: 'Twilio' },
  { key: 'exotel', label: 'Exotel' },
]

export function CallUI() {
  const setMakeCall = useGlobalStore((state) => state.setMakeCall)
  const defaultCallingMedium = useIntegrationsStore((state) => state.defaultCallingMedium)
  const { isEnabled, isAnyEnabled } = useTelephony()

  const twilioRef = useRef<CallUIHandle | null>(null)
  const exotelRef = useRef<CallUIHandle | null>(null)

  const [callMedium, setCallMedium] = useState<string | null>(null)
  const [isDefaultMedium, setIsDefaultMedium] = useState(false)
  const [show, setShow] = useState(false)
  const [mobileNumber, setMobileNumber] = useState('')

  const enabled = MEDIA.filter(({ key }) => isEnabled(key))
  const selectedMedium = callMedium ?? enabled[0]?.label ?? 'Twilio'

  function handleFor(label: string) {
    return label === 'Twilio' ? twilioRef.current : exotelRef.current
  }

  async function setDefaultCallingMedium(medium: string) {
    await rpc({ url: 'crm.integrations.api.set_default_calling_medium', params: { medium } })
    useIntegrationsStore.setState({ defaultCallingMedium: medium })
    toast.success(__('Default calling medium set successfully to {0}', [medium]))
  }

  function makeCallUsing(number: string, medium: string) {
    if (isDefaultMedium && medium) void setDefaultCallingMedium(medium)
    void handleFor(medium)?.makeOutgoingCall(number)
    setShow(false)
  }

  const makeCall = (number: string) => {
    if (enabled.length > 1 && !defaultCallingMedium) {
      setMobileNumber(number)
      setShow(true)
      return
    }
    const medium = defaultCallingMedium || enabled[0]?.label || 'Twilio'
    setMobileNumber(number)
    makeCallUsing(number, medium)
  }

  const getMakeCall = useLatest(makeCall)

  const activate = useEffectEvent(() => {
    for (const { label } of enabled) {
      void handleFor(label)?.setup()
    }
    if (isAnyEnabled) setMakeCall((number: string) => getMakeCall()(number))
  })

  useEffect(() => {
    activate()
  }, [isAnyEnabled])

  return (
    <>
      <TwilioCallUI ref={twilioRef} />
      <ExotelCallUI ref={exotelRef} />
      <Dialog
        open={show}
        onOpenChange={setShow}
        title={__('Make Call')}
        actions={[
          {
            label: __('Call using {0}', [selectedMedium]),
            variant: 'solid',
            onClick: () => makeCallUsing(mobileNumber, selectedMedium),
          },
        ]}
      >
        <div className="flex flex-col gap-4">
          <FormControl type="text" label={__('Mobile Number')} value={mobileNumber} onChange={setMobileNumber} />
          <FormControl
            type="select"
            label={__('Calling Medium')}
            value={selectedMedium}
            options={['Twilio', 'Exotel']}
            onChange={setCallMedium}
          />
          <div className="flex flex-col gap-1">
            <FormControl
              type="checkbox"
              label={__('Make {0} as default calling medium', [selectedMedium])}
              value={isDefaultMedium}
              onChange={setIsDefaultMedium}
            />
            {isDefaultMedium && (
              <div className="text-sm text-ink-gray-4">
                {__('You can change the default calling medium from the settings')}
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </>
  )
}

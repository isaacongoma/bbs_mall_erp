import { useState } from 'react'
import { ExotelSettings } from './ExotelSettings'
import { TelephonySettings } from './TelephonySettings'
import { TwilioSettings } from './TwilioSettings'

type Step = 'telephony-settings' | 'twilio-settings' | 'exotel-settings'

export function TelephonyPage() {
  const [step, setStep] = useState<Step>('telephony-settings')
  if (step === 'twilio-settings') return <TwilioSettings onBack={() => setStep('telephony-settings')} />
  if (step === 'exotel-settings') return <ExotelSettings onBack={() => setStep('telephony-settings')} />
  return <TelephonySettings onUpdateStep={setStep} />
}

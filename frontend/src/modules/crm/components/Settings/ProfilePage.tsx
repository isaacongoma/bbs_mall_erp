import { useState } from 'react'
import { ProfileSettings } from './ProfileSettings'
import { UserEmailSettings } from './UserEmailSettings'

type Step = 'profile-settings' | 'user-email-settings'

export function ProfilePage() {
  const [step, setStep] = useState<Step>('profile-settings')
  if (step === 'user-email-settings') return <UserEmailSettings onUpdateStep={setStep} />
  return <ProfileSettings onUpdateStep={setStep} />
}

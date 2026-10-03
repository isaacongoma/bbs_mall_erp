import { useState } from 'react'
import { EmailAccountList } from './EmailAccountList'
import { EmailAdd } from './EmailAdd'
import { EmailEdit } from './EmailEdit'

type AnyRecord = Record<string, any>
type Step = 'email-list' | 'email-add' | 'email-edit'

export function EmailConfig() {
  const [step, setStep] = useState<Step>('email-list')
  const [accountData, setAccountData] = useState<AnyRecord | null>(null)

  return (
    <div className="flex-1 p-8">
      {step === 'email-add' && (
        <div className="h-full">
          <EmailAdd onBack={() => setStep('email-list')} />
        </div>
      )}
      {step === 'email-list' && (
        <div className="h-full">
          <EmailAccountList
            onAdd={() => setStep('email-add')}
            onEdit={(account) => {
              setAccountData(account)
              setStep('email-edit')
            }}
          />
        </div>
      )}
      {step === 'email-edit' && accountData && (
        <div className="h-full">
          <EmailEdit accountData={accountData} onBack={() => setStep('email-list')} />
        </div>
      )}
    </div>
  )
}

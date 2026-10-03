import { useState } from 'react'
import { AssignmentRuleView } from './AssignmentRuleView'
import { AssignmentRules } from './AssignmentRules'

type AnyRecord = Record<string, any>

interface Step {
  screen: 'list' | 'view'
  data: AnyRecord | null
}

export function AssignmentRulePage() {
  const [step, setStep] = useState<Step>({ screen: 'list', data: null })

  if (step.screen === 'view') {
    return (
      <AssignmentRuleView
        key={step.data?.name ?? 'new'}
        rule={step.data}
        onOpen={(data) => setStep({ screen: 'view', data })}
        onBack={() => setStep({ screen: 'list', data: null })}
      />
    )
  }
  return <AssignmentRules onOpen={(data) => setStep({ screen: 'view', data })} />
}

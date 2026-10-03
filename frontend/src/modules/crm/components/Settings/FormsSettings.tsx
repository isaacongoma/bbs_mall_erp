import { useRef, useState } from 'react'
import { FormBuilderPanel } from './FormBuilderPanel'
import { FormsList, type FormsListHandle } from './FormsList'

export function FormsSettings() {
  const [screen, setScreen] = useState<'list' | 'builder'>('list')
  const [activeName, setActiveName] = useState<string | null>(null)
  const listRef = useRef<FormsListHandle | null>(null)

  if (screen === 'builder' && activeName) {
    return (
      <FormBuilderPanel
        key={activeName}
        name={activeName}
        onBack={() => setScreen('list')}
        onSaved={() => listRef.current?.reload()}
      />
    )
  }
  return (
    <FormsList
      handleRef={listRef}
      onOpen={(name) => {
        setActiveName(name)
        setScreen('builder')
      }}
    />
  )
}

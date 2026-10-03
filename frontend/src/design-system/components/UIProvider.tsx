import type { ReactNode } from 'react'
import { Dialogs } from './Dialog'
import { ToastProvider } from './Toast'

export function UIProvider({ children }: { children?: ReactNode }) {
  return (
    <>
      {children}
      <Dialogs />
      <ToastProvider />
    </>
  )
}

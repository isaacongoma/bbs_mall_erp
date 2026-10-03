import type { ReactNode } from 'react'
import { useListView } from '../../hooks/useListView'
import { Button, type ButtonProps } from '../Button'

export function ListEmptyState({ children }: { children?: ReactNode }) {
  const list = useListView()
  const emptyState = list.options.emptyState

  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-base">
      {children ?? (
        <>
          <div className="text-2xl-medium text-ink-gray-8 mt-6">{emptyState?.title}</div>
          <div className="mt-1 text-base text-ink-gray-5">{emptyState?.description}</div>
          {emptyState?.button && <Button {...(emptyState.button as ButtonProps)} className="mt-4" />}
        </>
      )}
    </div>
  )
}

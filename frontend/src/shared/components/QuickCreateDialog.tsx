import type { ReactNode } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dialog, type DialogSize } from '@/design-system'
import { useIsMobileView } from '../hooks/useIsMobileView'
import { useUsers } from '../hooks/useUsers'
import { useUiStore } from '../stores/uiStore'
import { EditIcon } from './Icons'

export interface QuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  doctype: string
  size?: DialogSize
  footer: ReactNode
  children: ReactNode
}

export function QuickCreateDialog({
  open,
  onOpenChange,
  title,
  doctype,
  size = 'xl',
  footer,
  children,
}: QuickCreateDialogProps) {
  const { isManager } = useUsers()
  const isMobileView = useIsMobileView()
  const setUi = useUiStore((state) => state.set)

  function openQuickEntryModal() {
    setUi({ showQuickEntryModal: true, quickEntryProps: { doctype } })
    requestAnimationFrame(() => onOpenChange(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size={size} bare>
      <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{__(title)}</h3>
          </div>
          <div className="flex items-center gap-1">
            {isManager() && !isMobileView && (
              <Button
                variant="ghost"
                className="w-7"
                tooltip={__('Edit Fields Layout')}
                icon={EditIcon}
                onClick={openQuickEntryModal}
              />
            )}
            <Button variant="ghost" className="w-7" icon="lucide-x" onClick={() => onOpenChange(false)} />
          </div>
        </div>
        {children}
      </div>
      <div className="px-4 pb-7 pt-4 sm:px-6">{footer}</div>
    </Dialog>
  )
}

import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, Dialog } from '@/design-system'

export interface BulkDeleteLinkedDocModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype: string
  items: string[]
  reload: () => void
}

export function BulkDeleteLinkedDocModal({
  open,
  onOpenChange,
  doctype,
  items,
  reload,
}: BulkDeleteLinkedDocModalProps) {
  const [confirmInfo, setConfirmInfo] = useState({ show: false, delete: false })

  async function deleteDocs() {
    await rpc({
      url: 'crm.api.doc.delete_bulk_docs',
      params: { items, doctype, delete_linked: confirmInfo.delete },
    })
    setConfirmInfo({ show: false, delete: false })
    onOpenChange(false)
    reload()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      body={
        <>
          <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{__('Delete')}</h3>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" icon="lucide-x" onClick={() => onOpenChange(false)} />
              </div>
            </div>
            <div className="text-base text-ink-gray-5">
              {__('Are you sure you want to delete {0} items?', [items.length])}
            </div>
          </div>
          <div className="px-4 pb-7 pt-0 sm:px-6">
            <div className="flex flex-row-reverse gap-2">
              <Button
                label={__('Delete {0} items', [items.length])}
                iconLeft="lucide-trash-2"
                variant="solid"
                theme="red"
                onClick={() => setConfirmInfo({ show: true, delete: true })}
              />
              <Button
                label={__('Unlink & Delete {0} items', [items.length])}
                iconLeft="lucide-unlock"
                variant="solid"
                onClick={() => setConfirmInfo({ show: true, delete: false })}
              />
            </div>
          </div>
          {confirmInfo.show && (
            <>
              <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{__('Delete')}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" icon="lucide-x" onClick={() => onOpenChange(false)} />
                  </div>
                </div>
                <div className="text-base text-ink-gray-5">
                  {confirmInfo.delete
                    ? __('This will delete selected items and items linked to it, are you sure?')
                    : __('This will delete selected items and unlink linked items to it, are you sure?')}
                </div>
              </div>
              <div className="px-4 pb-7 pt-0 sm:px-6">
                <div className="flex flex-row-reverse gap-2">
                  <Button
                    label={confirmInfo.delete ? __('Delete') : __('Unlink & Delete')}
                    iconLeft={confirmInfo.delete ? 'lucide-trash-2' : 'lucide-unlock'}
                    variant="solid"
                    theme="red"
                    onClick={() => void deleteDocs()}
                  />
                  <Button
                    label={__('Cancel')}
                    variant="subtle"
                    onClick={() => setConfirmInfo((current) => ({ ...current, show: false }))}
                  />
                </div>
              </div>
            </>
          )}
        </>
      }
    />
  )
}

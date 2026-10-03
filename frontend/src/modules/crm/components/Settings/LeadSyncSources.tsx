import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Badge, Button, Dropdown, Switch, toast } from '@/design-system'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'

type AnyRecord = Record<string, any>

export interface LeadSyncSourcesProps {
  sources: AnyRecord
  onStep: (step: 'new-source' | 'edit-source', data?: AnyRecord) => void
}

export function LeadSyncSources({ sources, onStep }: LeadSyncSourcesProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const loading = Boolean(sources.list?.loading)
  const rows = (sources.data as AnyRecord[] | null) ?? []

  function toggle(source: AnyRecord, enabled: boolean) {
    sources.setValue.submit(
      { name: source.name, enabled: enabled ? 1 : 0 },
      {
        onSuccess: () =>
          toast.success(enabled ? __('Source enabled successfully') : __('Source disabled successfully')),
        onError: (error: AnyRecord) => toast.error(error.messages?.[0] || __('Failed to update source')),
      },
    )
  }

  function remove(source: AnyRecord) {
    setConfirmDelete(false)
    sources.delete.submit(source.name, {
      onSuccess: () => toast.success(__('Lead sync source deleted successfully')),
      onError: (error: AnyRecord) => toast.error(error.messages?.[0] || __('Failed to delete lead sync source')),
    })
  }

  function options(source: AnyRecord) {
    return [
      { label: __('Duplicate'), icon: 'copy', onClick: () => onStep('new-source', { ...source }) },
      ...confirmDeleteOptions({
        onConfirmDelete: () => remove(source),
        isConfirmingDelete: confirmDelete,
        setConfirmingDelete: setConfirmDelete,
      }).filter((option) => option.condition()),
    ]
  }

  return (
    <div className="flex h-full flex-col gap-6 text-ink-gray-8">
      <div className="flex justify-between px-2 pt-2">
        <div className="flex w-9/12 flex-col gap-1">
          <h2 className="flex h-5 items-center gap-2 text-2xl-semibold leading-none">
            {__('Lead Sources')}
            <Badge theme="orange" size="sm">
              Beta
            </Badge>
          </h2>
          <p className="text-p-base text-ink-gray-6">
            {__('Add, edit, and manage sources for automatic lead syncing to your CRM')}
          </p>
        </div>
        <div className="item-center flex w-3/12 justify-end space-x-2">
          <Button label={__('New')} iconLeft="lucide-plus" variant="solid" onClick={() => onStep('new-source')} />
        </div>
      </div>

      {loading && (
        <div className="mt-28 flex h-full w-full justify-between">
          <Button loading variant="ghost" className="w-full" size="lg" />
        </div>
      )}

      {!loading && !rows.length && (
        <EmptyState name="Lead Sources" description="Add and manage your lead sources here." icon="refresh-cw" />
      )}

      {!loading && rows.length > 0 && (
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center px-4 py-2 text-sm text-ink-gray-5">
            <div className="w-4/6">{__('Name')}</div>
            <div className="w-1/6">{__('Source')}</div>
            <div className="w-1/6">{__('Enabled')}</div>
          </div>
          <div className="mx-4 h-px border-t border-outline-elevation-2" />
          <ul className="overflow-y-auto px-2">
            {rows.map((source, index) => (
              <div key={source.name}>
                <li
                  className="flex cursor-pointer items-center justify-between rounded p-3 hover:bg-surface-sidebar"
                  onClick={() => onStep('edit-source', { ...source })}
                >
                  <div className="flex w-4/6 flex-col pr-5">
                    <div className="truncate text-p-base-medium text-ink-gray-7">{source.name}</div>
                  </div>
                  <div className="flex w-1/6 flex-col pr-5">
                    <div className="truncate text-p-base-medium text-ink-gray-7">{source.type}</div>
                  </div>
                  <div className="flex w-1/6 items-center justify-between" onClick={(event) => event.stopPropagation()}>
                    <Switch size="sm" value={Boolean(source.enabled)} onChange={(value) => toggle(source, value)} />
                    <Dropdown
                      placement="right"
                      options={options(source) as never}
                      onOpenChange={() => setConfirmDelete(false)}
                    >
                      <Button icon="lucide-more-horizontal" variant="ghost" />
                    </Dropdown>
                  </div>
                </li>
                {rows.length !== index + 1 && <div className="mx-2 h-px border-t border-outline-elevation-2" />}
              </div>
            ))}
            {sources.hasNextPage && (
              <div className="flex justify-center">
                <Button
                  className="mt-3.5 p-2"
                  label={__('Load More')}
                  iconLeft="lucide-refresh-cw"
                  onClick={() => sources.next()}
                />
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

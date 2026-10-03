import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dropdown, Select, Switch, TextInput, toast } from '@/design-system'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { sendBroadcast } from '@/shared/hooks/useBroadcast'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'
import { EmailTemplateIcon } from '../Icons/EmailTemplateIcon'

type AnyRecord = Record<string, any>

export interface EmailTemplatesProps {
  templates: AnyRecord
  onNew: (template?: AnyRecord) => void
  onEdit: (template: AnyRecord) => void
}

export function EmailTemplates({ templates, onNew, onEdit }: EmailTemplatesProps) {
  const [search, setSearch] = useState('')
  const [currentDoctype, setCurrentDoctype] = useState('All')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const data = (templates.data as AnyRecord[] | null) ?? []
  const needle = search.toLowerCase()
  const list = data
    .filter(
      (template) =>
        !search ||
        template.name.toLowerCase().includes(needle) ||
        (template.subject ?? '').toLowerCase().includes(needle),
    )
    .filter((template) => currentDoctype === 'All' || template.reference_doctype === currentDoctype)

  function toggle(template: AnyRecord, enabled: boolean) {
    templates.setValue.submit(
      { name: template.name, enabled: enabled ? 1 : 0 },
      {
        onSuccess: () => {
          toast.success(enabled ? __('Template enabled successfully') : __('Template disabled successfully'))
          sendBroadcast('refresh-email-templates')
        },
        onError: (error: AnyRecord) => toast.error(error.messages?.[0] || __('Failed to update template')),
      },
    )
  }

  function remove(template: AnyRecord) {
    setConfirmDelete(false)
    templates.delete.submit(template.name, {
      onSuccess: () => toast.success(__('Template deleted successfully')),
      onError: (error: AnyRecord) => toast.error(error.messages?.[0] || __('Failed to delete template')),
    })
  }

  function dropdownOptions(template: AnyRecord) {
    return [
      { label: __('Duplicate'), icon: 'copy', onClick: () => onNew({ ...template }) },
      ...confirmDeleteOptions({
        onConfirmDelete: () => remove(template),
        isConfirmingDelete: confirmDelete,
        setConfirmingDelete: setConfirmDelete,
      }).filter((option) => option.condition()),
    ]
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6 text-ink-gray-8">
      <div className="flex justify-between px-2 pt-2">
        <div className="flex w-9/12 flex-col gap-1">
          <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none">{__('Email Templates')}</h2>
          <p className="text-p-base text-ink-gray-6">
            {__('Add, edit, and manage email templates for various CRM communications')}
          </p>
        </div>
        <div className="item-center flex w-3/12 justify-end space-x-2">
          <Button label={__('New')} iconLeft="lucide-plus" variant="solid" onClick={() => onNew()} />
        </div>
      </div>

      {templates.list?.loading && (
        <div className="mt-28 flex h-full w-full justify-between">
          <Button loading variant="ghost" className="w-full" size="lg" />
        </div>
      )}

      {!templates.list?.loading && !data.length && (
        <EmptyState name="Email Templates" description="Add one to get started." icon={EmailTemplateIcon} />
      )}

      {!templates.list?.loading && data.length > 0 && (
        <div className="flex flex-col overflow-hidden">
          {data.length > 10 && (
            <div className="mb-4 flex items-center gap-2 px-2 pt-0.5">
              <TextInput
                value={search}
                onChange={setSearch}
                debounce={300}
                placeholder={__('Search Template')}
                wrapperClassName="w-full"
                prefix={<span className="lucide-search h-4 w-4 text-ink-gray-6" aria-hidden="true" />}
              />
              <Select
                className="shrink-0"
                value={currentDoctype}
                onChange={(value) => setCurrentDoctype(String(value ?? 'All'))}
                options={[
                  { label: __('All'), value: 'All' },
                  { label: __('Lead'), value: 'CRM Lead' },
                  { label: __('Deal'), value: 'CRM Deal' },
                ]}
              />
            </div>
          )}
          <div className="flex items-center px-4 py-2 text-sm text-ink-gray-5">
            <div className="w-4/6">{__('Template Name')}</div>
            <div className="w-1/6">{__('For')}</div>
            <div className="w-1/6">{__('Enabled')}</div>
          </div>
          <div className="mx-4 h-px border-t border-outline-elevation-2" />
          <ul className="overflow-y-auto px-2">
            {list.map((template, index) => (
              <div key={template.name}>
                <li
                  className="flex cursor-pointer items-center justify-between rounded p-3 hover:bg-surface-sidebar"
                  onClick={() => onEdit({ ...template })}
                >
                  <div className="flex w-4/6 flex-col pr-5">
                    <div className="truncate text-p-base-medium text-ink-gray-7">{template.name}</div>
                    <div className="truncate text-p-sm text-ink-gray-5">{template.subject}</div>
                  </div>
                  <div className="w-1/6 text-base text-ink-gray-6">
                    {(template.reference_doctype ?? '').replace('CRM ', '')}
                  </div>
                  <div className="flex w-1/6 items-center justify-between" onClick={(event) => event.stopPropagation()}>
                    <Switch size="sm" value={Boolean(template.enabled)} onChange={(value) => toggle(template, value)} />
                    <Dropdown
                      placement="right"
                      options={dropdownOptions(template) as never}
                      onOpenChange={() => setConfirmDelete(false)}
                    >
                      <Button icon="lucide-more-horizontal" variant="ghost" />
                    </Dropdown>
                  </div>
                </li>
                {list.length !== index + 1 && <div className="mx-2 h-px border-t border-outline-elevation-2" />}
              </div>
            ))}
            {!templates.list?.loading && templates.hasNextPage && (
              <div className="flex justify-center">
                <Button
                  className="mt-3.5 p-2"
                  loading={Boolean(templates.list?.loading)}
                  label={__('Load More')}
                  iconLeft="lucide-refresh-cw"
                  onClick={() => templates.next()}
                />
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

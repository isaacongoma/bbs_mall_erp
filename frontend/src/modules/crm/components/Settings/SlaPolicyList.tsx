import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { Badge, Button, Dialog, Dropdown, FormControl, Switch, TextInput, toast } from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { SettingsLayoutBase } from '@/shared/components/Settings/SettingsPanel'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'

type AnyRecord = Record<string, any>

export interface SlaPolicyListProps {
  list: AnyRecord
  search: string
  onSearch: (value: string) => void
  onOpen: (data: AnyRecord | null, fetchData?: boolean) => void
}

export function SlaPolicyList({ list, search, onSearch, onOpen }: SlaPolicyListProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [duplicateDialog, setDuplicateDialog] = useState({ show: false, name: '', source: '' })
  const allPolicies = (list.data as AnyRecord[] | null) ?? []
  const policies = allPolicies.filter((sla) => String(sla.name).toLowerCase().includes(search.toLowerCase()))
  const loading = Boolean(list.list?.loading)

  async function duplicate() {
    try {
      const source = await rpc<AnyRecord>({
        url: 'frappe.client.get',
        params: { doctype: 'CRM Service Level Agreement', name: duplicateDialog.source },
      })
      const created = await rpc<AnyRecord>({
        url: 'frappe.client.insert',
        params: {
          doc: {
            doctype: 'CRM Service Level Agreement',
            ...source,
            default: false,
            sla_name: duplicateDialog.name,
          },
        },
      })
      void list.reload()
      toast.success(__('SLA policy duplicated'))
      setDuplicateDialog({ show: false, name: '', source: '' })
      setTimeout(() => onOpen(created, true), 250)
    } catch (failure) {
      toast.error(toErrorMessage(failure))
    }
  }

  function remove(sla: AnyRecord) {
    list.delete.submit(sla.name, {
      onSuccess: () => toast.success(__('SLA policy deleted')),
      onError: (error: AnyRecord) => toast.error(error.messages?.[0] || __('Something went wrong, try again later')),
    })
  }

  function toggle(sla: AnyRecord) {
    if (sla.default) {
      toast.error(__('An SLA set as default cannot be disabled'))
      return
    }
    list.setValue.submit(
      { name: sla.name, enabled: !sla.enabled },
      { onSuccess: () => toast.success(__('SLA policy status updated')) },
    )
  }

  function options(sla: AnyRecord) {
    return [
      {
        label: __('Duplicate'),
        icon: 'copy',
        onClick: () => setDuplicateDialog({ show: true, name: `${sla.name} (Copy)`, source: sla.name }),
      },
      ...confirmDeleteOptions({
        onConfirmDelete: () => remove(sla),
        isConfirmingDelete: confirmingDelete,
        setConfirmingDelete,
      }).filter((option) => option.condition()),
    ]
  }

  return (
    <>
      <SettingsLayoutBase
        title={__('SLA Policies')}
        description={__('Manage your service level agreement policies')}
        headerActions={<Button label={__('New')} variant="solid" iconLeft="lucide-plus" onClick={() => onOpen(null)} />}
        headerBottom={
          allPolicies.length > 9 || search.length ? (
            <div className="relative">
              <TextInput
                value={search}
                onChange={onSearch}
                debounce={300}
                placeholder={__('Search')}
                type="text"
                className="rounded border-outline-gray-2 bg-surface-gray-2 p-4 pr-12 hover:bg-surface-gray-2 focus:ring-0"
                prefix={<span className="lucide-search size-4" aria-hidden="true" />}
              />
              {search && (
                <Button
                  icon="lucide-x"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => onSearch('')}
                />
              )}
            </div>
          ) : undefined
        }
      >
        {loading && !list.data ? (
          <div className="mt-12 flex items-center justify-center">
            <LoadingIndicator className="w-4" />
          </div>
        ) : (
          <div className="h-full">
            {!loading && !policies.length ? (
              <EmptyState
                name="SLA Policies"
                title="No SLA Policies Found"
                description="Add one to get started."
                icon="shield-check"
              />
            ) : (
              <div className="-ml-2">
                <div className="ml-2 grid grid-cols-7 items-center gap-3 text-sm text-ink-gray-5">
                  <div className="col-span-5">{__('Policy Name')}</div>
                  <div className="col-span-1">{__('Apply On')}</div>
                  <div className="col-span-1">{__('Enabled')}</div>
                </div>
                <hr className="mx-2 mt-2 border-outline-gray-2" />
                {policies.map((sla, index) => (
                  <div key={sla.name}>
                    <div className="grid cursor-pointer grid-cols-7 items-center gap-4 rounded hover:bg-surface-sidebar">
                      <div
                        className="col-span-5 flex h-14 w-full items-center gap-2 pl-2"
                        onClick={() => onOpen(sla, true)}
                      >
                        <div className="truncate text-base-medium text-ink-gray-7">{sla.name}</div>
                        {sla.default && (
                          <Badge theme="gray" size="sm">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-1 text-sm text-ink-gray-8">
                        {sla.apply_on === 'CRM Lead' ? 'Lead' : 'Deal'}
                      </div>
                      <div className="flex w-full items-center justify-between pr-2">
                        <div>
                          <Switch size="sm" value={Boolean(sla.enabled)} onChange={() => toggle(sla)} />
                        </div>
                        <div>
                          <Dropdown placement="right" options={options(sla) as never}>
                            <Button
                              icon="lucide-more-horizontal"
                              variant="ghost"
                              onClick={() => setConfirmingDelete(false)}
                            />
                          </Dropdown>
                        </div>
                      </div>
                    </div>
                    {index !== policies.length - 1 && <hr className="mx-2 border-outline-gray-2" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SettingsLayoutBase>
      <Dialog
        open={duplicateDialog.show}
        onOpenChange={(open) => setDuplicateDialog((current) => ({ ...current, show: open }))}
        title={__('Duplicate SLA Policy')}
        actionsContent={() => (
          <div className="flex justify-end gap-2">
            <Button
              variant="subtle"
              label={__('Close')}
              onClick={() => setDuplicateDialog({ show: false, name: '', source: '' })}
            />
            <Button variant="solid" label={__('Duplicate')} onClick={() => void duplicate()} />
          </div>
        )}
      >
        <div className="flex flex-col gap-4">
          <FormControl
            label={__('New SLA Policy Name')}
            type="text"
            maxLength={100}
            value={duplicateDialog.name}
            onChange={(value: string) => setDuplicateDialog((current) => ({ ...current, name: value }))}
          />
        </div>
      </Dialog>
    </>
  )
}

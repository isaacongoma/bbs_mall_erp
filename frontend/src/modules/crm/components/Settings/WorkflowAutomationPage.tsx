import { useEffect, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useListResource } from '@/core/resources'
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  Dropdown,
  Switch,
  TextInput,
  Tooltip,
  createDialog,
  toast,
} from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { SettingsLayoutBase } from '@/shared/components/Settings/SettingsPanel'
import { useUsers } from '@/shared/hooks/useUsers'
import { useUiStore } from '@/shared/stores/uiStore'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'
import { WorkflowAutomationBuilder } from './WorkflowAutomationBuilder'
import { WorkflowAutomationDetail } from './WorkflowAutomationDetail'

type AnyRecord = Record<string, any>

const IDENTITY_FIELDS = [
  'name',
  'creation',
  'modified',
  'owner',
  'modified_by',
  'idx',
  'parent',
  'parentfield',
  'parenttype',
]
const COLUMNS = 'minmax(0, 4fr) minmax(0, 2fr) minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1.5fr)'

function withoutIdentity(row: AnyRecord): AnyRecord {
  const copy = { ...row }
  IDENTITY_FIELDS.forEach((field) => delete copy[field])
  return copy
}

const compareDesc = (a: unknown, b: unknown) => String(b || '').localeCompare(String(a || ''))

export function WorkflowAutomationPage() {
  const { getUser } = useUsers()
  const [screen, setScreen] = useState<'list' | 'detail'>('list')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  const automations = useListResource({
    doctype: 'Automation Flow',
    fields: ['name', 'title', 'document_type', 'owner', 'enabled', 'creation', 'modified'],
    cache: ['workflowAutomations'],
    orderBy: 'creation desc',
    pageLength: 99,
    auto: true,
  })

  useEffect(() => {
    useUiStore.getState().set({ disableSettingModalOutsideClick: showBuilder })
  }, [showBuilder])

  useEffect(
    () => () => {
      useUiStore.getState().set({ disableSettingModalOutsideClick: false })
    },
    [],
  )

  const rows = (automations.data as AnyRecord[] | null) ?? []
  const loading = Boolean(automations.list?.loading)
  const showSearch = Boolean(search) || rows.length > 9
  const needle = search.toLowerCase()
  const filtered = [
    ...(search
      ? rows.filter((row) =>
          [row.title, row.name, row.document_type, getUser(row.owner).full_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle)),
        )
      : rows),
  ].sort((a, b) => compareDesc(a.creation, b.creation) || compareDesc(a.name, b.name))

  function reloadList() {
    void automations.reload()
  }

  function backToList() {
    setSelected('')
    setScreen('list')
    reloadList()
  }

  function closeBuilder() {
    setShowBuilder(false)
    setDirty(false)
    backToList()
  }

  function requestClose() {
    if (!dirty) {
      closeBuilder()
      return
    }
    createDialog({
      title: __('Unsaved changes'),
      message: __('You have unsaved changes. Do you wish to exit?'),
      size: 'sm',
      actions: [
        { label: __('Keep editing'), onClick: ({ close }: { close: () => void }) => close() },
        {
          label: __('Discard and exit'),
          variant: 'solid',
          theme: 'red',
          onClick: ({ close }: { close: () => void }) => {
            close()
            closeBuilder()
          },
        },
      ],
    } as never)
  }

  async function toggleAutomation(automation: AnyRecord, enabled: boolean) {
    if (toggling.has(automation.name)) return
    setToggling((current) => new Set(current).add(automation.name))
    try {
      await rpc({
        url: 'frappe.client.set_value',
        params: { doctype: 'Automation Flow', name: automation.name, fieldname: 'enabled', value: enabled ? 1 : 0 },
      })
      toast.success(__('Automation updated'))
      reloadList()
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Could not update automation'))
    } finally {
      setToggling((current) => {
        const next = new Set(current)
        next.delete(automation.name)
        return next
      })
    }
  }

  function nextCopyTitle(title: string): string {
    const taken = new Set(rows.map((row) => row.title))
    let index = 1
    while (taken.has(`${title} (${index})`)) index += 1
    return `${title} (${index})`
  }

  async function duplicateAutomation(automation: AnyRecord) {
    try {
      const source = await rpc<AnyRecord>({
        url: 'frappe.client.get',
        params: { doctype: 'Automation Flow', name: automation.name },
      })
      await rpc({
        url: 'frappe.client.insert',
        params: {
          doc: {
            ...withoutIdentity(source),
            doctype: 'Automation Flow',
            title: nextCopyTitle(source.title),
            enabled: 0,
            actions: (source.actions || []).map(withoutIdentity),
          },
        },
      })
      toast.success(__('Automation duplicated'))
      reloadList()
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Could not duplicate automation'))
    }
  }

  async function deleteAutomation(automation: AnyRecord) {
    await rpc({ url: 'frappe.client.delete', params: { doctype: 'Automation Flow', name: automation.name } })
    toast.success(__('Automation deleted'))
    setConfirmingDelete('')
    reloadList()
  }

  function rowOptions(automation: AnyRecord) {
    return [
      { label: __('Duplicate'), icon: 'copy', onClick: () => void duplicateAutomation(automation) },
      ...confirmDeleteOptions({
        isConfirmingDelete: confirmingDelete === automation.name,
        setConfirmingDelete: (value) => setConfirmingDelete(value ? automation.name : ''),
        onConfirmDelete: () => void deleteAutomation(automation),
      }).filter((option) => option.condition()),
    ]
  }

  return (
    <>
      {screen === 'list' ? (
        <SettingsLayoutBase
          title={__('Workflow Automations')}
          description={__('Create workflow automations for CRM documents')}
          headerActions={
            <Button
              label={__('New')}
              variant="solid"
              iconLeft="lucide-plus"
              onClick={() => {
                setSelected('')
                setShowBuilder(true)
              }}
            />
          }
          headerBottom={
            showSearch ? (
              <div className="relative">
                <TextInput
                  value={search}
                  placeholder={__('Search')}
                  debounce={300}
                  className="rounded border-outline-gray-2 bg-surface-gray-2"
                  prefix={<span className="lucide-search size-4" aria-hidden="true" />}
                  onChange={setSearch}
                />
                {search && (
                  <Button
                    icon="lucide-x"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setSearch('')}
                  />
                )}
              </div>
            ) : undefined
          }
        >
          {loading ? (
            <div className="mt-10 flex justify-center">
              <LoadingIndicator className="w-4" />
            </div>
          ) : !filtered.length ? (
            <EmptyState
              name="Workflow Automations"
              icon="workflow"
              title={__('No workflow automations yet')}
              description={__('Add one to get started.')}
              width="lg"
            />
          ) : (
            <div className="workflow-automation-list">
              <div
                className="sticky top-0 z-10 mx-3 grid items-center gap-2 border-b border-outline-gray-2 bg-surface-elevation-2 py-2 text-sm text-ink-gray-5"
                style={{ gridTemplateColumns: COLUMNS }}
              >
                <span>{__('Name')}</span>
                <span>{__('Document Type')}</span>
                <span>{__('Status')}</span>
                <span>{__('Enabled')}</span>
                <span>{__('Created By')}</span>
              </div>
              {filtered.map((row) => (
                <div
                  key={row.name}
                  className="mx-3 grid h-14 cursor-pointer items-center gap-2 border-b border-outline-gray-2 hover:bg-surface-gray-2"
                  style={{ gridTemplateColumns: COLUMNS }}
                  onClick={() => {
                    setSelected(row.name)
                    setScreen('detail')
                  }}
                >
                  <span className="truncate text-base-medium text-ink-gray-7">{row.title || row.name}</span>
                  <span className="truncate text-sm">{row.document_type || __('Any document')}</span>
                  <span>
                    <Badge
                      label={row.enabled ? __('Enabled') : __('Draft')}
                      theme={row.enabled ? 'green' : 'orange'}
                      variant="outline"
                    />
                  </span>
                  <div onClick={(event) => event.stopPropagation()}>
                    <Switch
                      size="sm"
                      value={Boolean(row.enabled)}
                      disabled={toggling.has(row.name)}
                      aria-label={__('Enabled')}
                      onChange={(value) => void toggleAutomation(row, value)}
                    />
                  </div>
                  <div
                    className="flex w-full items-center justify-between pr-1"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Tooltip text={getUser(row.owner).full_name}>
                      <UserAvatarLite user={row.owner} />
                    </Tooltip>
                    <Dropdown placement="right" options={rowOptions(row) as never}>
                      <Button
                        icon="lucide-more-horizontal"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => setConfirmingDelete('')}
                      />
                    </Dropdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SettingsLayoutBase>
      ) : (
        <WorkflowAutomationDetail automationName={selected} onEdit={() => setShowBuilder(true)} onBack={backToList} />
      )}

      <Dialog open={showBuilder} onOpenChange={() => undefined} size="6xl" bare dismissible={false}>
        <div className="h-[calc(100vh_-_6rem)]">
          {showBuilder && (
            <WorkflowAutomationBuilder
              key={selected || 'new'}
              automationName={selected}
              onDirtyChange={setDirty}
              onClose={requestClose}
              onSaved={(saved) => {
                setSelected(saved?.name || selected)
                reloadList()
              }}
            />
          )}
        </div>
      </Dialog>
    </>
  )
}

function UserAvatarLite({ user }: { user: string }) {
  const { getUser } = useUsers()
  const info = getUser(user)
  return <Avatar image={info.user_image} label={info.full_name} size="sm" />
}

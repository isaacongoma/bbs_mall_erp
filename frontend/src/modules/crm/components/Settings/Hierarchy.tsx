import '../../styles/hierarchy.css'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useDocumentResource, useListResource } from '@/core/resources'
import { Button, Dialog, TextInput, Tooltip, createDialog, toast } from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { useUsers } from '@/shared/hooks/useUsers'
import { useHierarchyDragDrop } from '../../hooks/useHierarchyDragDrop'
import { HierarchyRow } from './HierarchyRow'
import { HierarchyTree } from './HierarchyTree'
import { HierarchyUserMultiSelect } from './HierarchyUserMultiSelect'

type AnyRecord = Record<string, any>

const DOCTYPE = 'CRM Sales Hierarchy'
const ROLE_RANK: Record<string, number> = { 'Sales Manager': 0, 'Sales User': 1 }

export function Hierarchy() {
  const { crmUsers, getUserRole, isAdmin } = useUsers()
  const canEdit = isAdmin()
  const roleLabel = (role: string) =>
    role === 'Sales Manager' ? __('Sales Manager') : role === 'Sales User' ? __('Sales User') : role

  const settings = useDocumentResource({
    doctype: 'FCRM Settings',
    name: 'FCRM Settings',
    auto: true,
  }) as unknown as AnyRecord | null
  const hierarchyEnabled = Boolean(settings?.doc?.enable_sales_hierarchy)

  const nodes = useListResource({
    doctype: DOCTYPE,
    fields: ['name', 'user', 'full_name', 'reports_to', 'is_group'],
    orderBy: 'lft asc',
    pageLength: 0,
    auto: true,
  })

  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [dialogSelected, setDialogSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<AnyRecord | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const nodesLoading = Boolean(nodes.list?.loading)

  const enriched = ((nodes.data as AnyRecord[] | null) ?? [])
    .map((node) => {
      const user = crmUsers.find((candidate) => candidate.name === node.user) as AnyRecord | undefined
      const role = getUserRole(node.user) || 'Sales User'
      const rank = ROLE_RANK[role]
      if (rank === undefined) return null
      return {
        ...node,
        full_name: user?.full_name || node.full_name || node.user,
        email: user?.email || node.user,
        user_image: user?.user_image,
        enabled: user?.enabled !== 0,
        role,
        role_label: roleLabel(role),
        role_rank: rank,
      } as AnyRecord
    })
    .filter((node): node is AnyRecord => node !== null)

  const byName = new Map<string, AnyRecord>(
    enriched.map((node) => [node.name, { ...node, children: [] as AnyRecord[] }]),
  )
  const roots: AnyRecord[] = []
  byName.forEach((node) => {
    const parent = node.reports_to ? byName.get(node.reports_to) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })

  const query = search.trim().toLowerCase()
  const matches = (node: AnyRecord) =>
    !query || node.full_name?.toLowerCase().includes(query) || node.email?.toLowerCase().includes(query)
  function prune(node: AnyRecord): AnyRecord | null {
    if (matches(node)) return { ...node, children: node.children || [] }
    const children = (node.children || []).map(prune).filter((child: AnyRecord | null) => child !== null)
    return children.length ? { ...node, children } : null
  }
  const visibleRoots = roots.map(prune).filter((node): node is AnyRecord => node !== null)

  function lastNode(list: AnyRecord[]): AnyRecord | null {
    const last = list[list.length - 1]
    if (!last) return null
    return last.children?.length ? lastNode(last.children) : last
  }
  const lastName = lastNode(visibleRoots)?.name

  const placed = new Set(enriched.map((node) => node.user))
  function getCandidates(parent: AnyRecord | null) {
    const parentRank = parent?.role_rank ?? -1
    return crmUsers
      .filter((user) => {
        if (placed.has(user.name) || user.name === 'Administrator') return false
        const role = getUserRole(user.name)
        return role !== null && role in ROLE_RANK && (ROLE_RANK[role] ?? 99) >= parentRank
      })
      .map((user) => ({
        value: user.name,
        full_name: user.full_name || user.name,
        email: user.email || user.name,
        user_image: user.user_image,
        role_label: roleLabel(getUserRole(user.name) ?? ''),
      }))
  }

  async function reparent(name: string, parent: string | null) {
    try {
      await rpc({
        url: 'frappe.client.set_value',
        params: { doctype: DOCTYPE, name, fieldname: 'reports_to', value: parent || '' },
      })
      toast.success(__('Updated reports to'))
      void nodes.reload()
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Could not update report to'))
    }
  }

  async function bulkAdd(parent: AnyRecord | null, userIds: string[]): Promise<boolean> {
    if (!userIds.length) return false
    setSaving(true)
    let added = 0
    let lastError: unknown = null
    try {
      for (const user of userIds) {
        try {
          await rpc({
            url: 'frappe.client.insert',
            params: { doc: { doctype: DOCTYPE, user, reports_to: parent ? parent.name : null, is_group: 0 } },
          })
          added++
        } catch (failure) {
          lastError = failure
        }
      }
      if (added) {
        toast.success(added === 1 ? __('User added to hierarchy') : __('{0} users added to hierarchy', [added]))
      }
      if (lastError) toast.error(toErrorMessage(lastError) || __('Some users could not be added'))
      await nodes.reload()
      return added > 0 && !lastError
    } finally {
      setSaving(false)
    }
  }

  async function confirmBulkAdd() {
    if (await bulkAdd(null, dialogSelected)) {
      setShowAdd(false)
      setDialogSelected([])
    }
  }

  function toggleEnable(currentlyEnabled: boolean) {
    if (!settings) return
    const save = (value: number, message: string) => {
      settings.setField('enable_sales_hierarchy', value)
      settings.save.submit(null, {
        onSuccess: () => toast.success(message),
        onError: (error: unknown) => toast.error(toErrorMessage(error) || __('Failed to update setting')),
      })
    }
    if (currentlyEnabled) {
      createDialog({
        title: __('Disable Sales Hierarchy'),
        message: __('Lead and deal visibility will no longer be restricted by the reporting tree. Are you sure?'),
        actions: [
          {
            label: __('Disable'),
            variant: 'solid',
            theme: 'red',
            onClick: ({ close }: { close: () => void }) => {
              save(0, __('Sales hierarchy disabled'))
              close()
            },
          },
        ],
      } as never)
    } else {
      save(1, __('Sales hierarchy enabled'))
    }
  }

  function descendantsOf(name: string): AnyRecord[] {
    const out: AnyRecord[] = []
    const visit = (parent: string) =>
      enriched
        .filter((node) => node.reports_to === parent)
        .forEach((child) => {
          visit(child.name)
          out.push(child)
        })
    visit(name)
    return out
  }

  const hasChild = Boolean(removeTarget && enriched.some((node) => node.reports_to === removeTarget.name))
  const unlinkCount = removeTarget ? descendantsOf(removeTarget.name).length + 1 : 0

  async function confirmRemove(mode: 'simple' | 'reassign' | 'cascade') {
    if (!removeTarget) return
    setRemoving(mode)
    try {
      if (mode === 'reassign') {
        for (const child of enriched.filter((node) => node.reports_to === removeTarget.name)) {
          await rpc({
            url: 'frappe.client.set_value',
            params: {
              doctype: DOCTYPE,
              name: child.name,
              fieldname: 'reports_to',
              value: removeTarget.reports_to || '',
            },
          })
        }
        await rpc({ url: 'frappe.client.delete', params: { doctype: DOCTYPE, name: removeTarget.name } })
      } else if (mode === 'cascade') {
        for (const node of [...descendantsOf(removeTarget.name), removeTarget]) {
          await rpc({ url: 'frappe.client.delete', params: { doctype: DOCTYPE, name: node.name } })
        }
      } else {
        await rpc({ url: 'frappe.client.delete', params: { doctype: DOCTYPE, name: removeTarget.name } })
      }
      toast.success(__('Removed from hierarchy.'))
      void nodes.reload()
      setRemoveTarget(null)
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Could not remove.'))
    } finally {
      setRemoving(null)
    }
  }

  const drag = useHierarchyDragDrop(reparent)
  const settingsSaving = Boolean(settings?.save?.loading)

  return (
    <div className="flex h-full flex-col gap-4 p-6 text-ink-gray-8">
      <div className="flex justify-between px-2 pt-2">
        <div className="flex w-9/12 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="flex h-5 text-2xl-semibold leading-none">{__('Sales Hierarchy')}</h2>
            <Tooltip text={__('View documentation')}>
              <a href="https://docs.frappe.io/crm/settings/sales-hierarchy" target="_blank" rel="noreferrer">
                <span className="lucide-circle-question-mark h-4 w-4 text-ink-gray-6" aria-hidden="true" />
              </a>
            </Tooltip>
          </div>
          <p className="text-p-base text-ink-gray-6">
            {__('Restrict visibility of Leads and Deals based on a reporting tree.')}
          </p>
        </div>
        {hierarchyEnabled && canEdit && (
          <div className="item-center flex w-3/12 justify-end space-x-2">
            <Button label={__('Disable')} loading={settingsSaving} onClick={() => toggleEnable(true)} />
            <Button
              label={__('Add User')}
              iconLeft="lucide-plus"
              variant="solid"
              onClick={() => {
                setDialogSelected([])
                setShowAdd(true)
              }}
            />
          </div>
        )}
      </div>

      {!settings?.doc ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingIndicator className="size-6" />
        </div>
      ) : !hierarchyEnabled ? (
        <div className="relative flex w-full flex-1 justify-center">
          <div
            className="absolute left-1/2 flex w-64 -translate-x-1/2 flex-col items-center gap-3"
            style={{ top: '35%' }}
          >
            <span className="lucide-network size-7.5 text-ink-gray-5" aria-hidden="true" />
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-lg-medium text-ink-gray-8">{__('Enable Sales Hierarchy')}</span>
              <span className="text-center text-p-base text-ink-gray-6">
                {__('Restrict visibility using a reporting tree')}
              </span>
              {canEdit && (
                <Button variant="solid" loading={settingsSaving} onClick={() => toggleEnable(false)}>
                  {__('Enable')}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-2">
          <div className="flex items-center gap-2 pb-4 pt-0.5">
            {enriched.length > 0 && (
              <TextInput
                value={search}
                onChange={setSearch}
                debounce={200}
                placeholder={__('Search users')}
                wrapperClassName="w-full"
                prefix={<span className="lucide-search size-4 text-ink-gray-6" aria-hidden="true" />}
              />
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {nodesLoading && !nodes.data ? (
              <div className="flex items-center justify-center py-12">
                <LoadingIndicator className="size-6" />
              </div>
            ) : !visibleRoots.length ? (
              <EmptyState
                name="Users in Hierarchy"
                title={search ? __('No matching users') : __('No users in hierarchy')}
                description={search ? __('No users match the current filter.') : __('Add one to get started.')}
                icon="users"
              />
            ) : null}
            {visibleRoots.map((root) => (
              <HierarchyTree
                key={root.name}
                node={root}
                renderNode={({ node, hasChildren, isCollapsed, toggle }) => (
                  <HierarchyRow
                    node={node}
                    hasChildren={hasChildren}
                    isCollapsed={isCollapsed}
                    isLast={node.name === lastName}
                    rowClass={drag.rowClasses(node)}
                    handlers={drag.handlers}
                    getCandidates={getCandidates}
                    candidatesLoading={nodesLoading}
                    canEdit={canEdit}
                    onToggle={toggle}
                    onBulkAdd={({ parent, userIds }) => void bulkAdd(parent, userIds)}
                    onRemove={setRemoveTarget}
                    onMoveToRoot={(target) => void reparent(target.name, null)}
                  />
                )}
              />
            ))}
          </div>
        </div>
      )}

      {drag.dragLabel &&
        createPortal(
          <div
            className="pointer-events-none fixed rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
            style={{ top: `${drag.point.y + 25}px`, left: `${drag.point.x - 25}px` }}
          >
            {drag.dragLabel}
          </div>,
          document.body,
        )}

      <Dialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title={__('Add Users')}
        actions={[
          {
            label: __('Add ({0})', [dialogSelected.length]),
            variant: 'solid',
            disabled: !dialogSelected.length,
            loading: saving,
            onClick: () => void confirmBulkAdd(),
          },
        ]}
      >
        <HierarchyUserMultiSelect
          value={dialogSelected}
          onChange={setDialogSelected}
          candidates={getCandidates(null)}
          loading={nodesLoading}
          showMail
        />
      </Dialog>

      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)} size="md" bare>
        <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{__('Delete')}</h3>
            <Button variant="ghost" icon="lucide-x" onClick={() => setRemoveTarget(null)} />
          </div>
          <div className="text-base text-ink-gray-5">
            {hasChild
              ? __('Remove {0} from the hierarchy. What should happen to their direct reports?', [
                  removeTarget?.full_name ?? '',
                ])
              : __('Are you sure you want to remove {0} from the hierarchy?', [removeTarget?.full_name ?? ''])}
          </div>
        </div>
        <div className="bg-surface-elevation-2 px-4 pb-6 pt-0 sm:px-6">
          <div className="flex w-full justify-end gap-2">
            {hasChild ? (
              <>
                <Button
                  label={__('Unlink & Delete {0} Users', [unlinkCount])}
                  iconLeft="lucide-trash-2"
                  variant="solid"
                  theme="red"
                  loading={removing === 'cascade'}
                  onClick={() => void confirmRemove('cascade')}
                />
                <Button
                  label={__('Delete Only User')}
                  iconLeft="lucide-unlock"
                  variant="subtle"
                  loading={removing === 'reassign'}
                  onClick={() => void confirmRemove('reassign')}
                />
              </>
            ) : (
              <Button
                label={__('Delete')}
                iconLeft="lucide-trash-2"
                variant="solid"
                theme="red"
                loading={removing === 'simple'}
                onClick={() => void confirmRemove('simple')}
              />
            )}
          </div>
        </div>
      </Dialog>
    </div>
  )
}

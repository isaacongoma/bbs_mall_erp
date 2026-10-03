import { useEffect, useState, type ReactNode } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import { capture } from '@/core/telemetry'
import { createDialog, toast, type DropdownActionOption } from '@/design-system'
import { AssignmentModal, type Assignee } from '../components/AssignmentModal'
import { BulkDeleteLinkedDocModal } from '../components/BulkDeleteLinkedDocModal'
import type { CustomAction } from '../components/CustomActions'
import { DeleteLinkedDocModal } from '../components/DeleteLinkedDocModal'
import { EditValueModal } from '../components/EditValueModal'
import { useGlobalStore } from '../stores/globalStore'
import type { ViewListResource } from '../types/view'
import { setupListCustomizations } from '../utils/customization'

export type BulkAction = DropdownActionOption

export interface BulkActionOptions {
  hideEdit?: boolean
  hideDelete?: boolean
  hideAssign?: boolean
}

export interface BulkActionContext {
  selections: Set<string>
  unselectAll: () => void
  reload: (unselectAll?: () => void) => void
}

export interface UseListBulkActionsInput {
  list: ViewListResource
  doctype: string
  options?: BulkActionOptions
  isLostStatus?: (doctype: string, status: string) => boolean
  extraActions?: (context: BulkActionContext) => BulkAction[]
  viewLinkedDoc?: (row: Record<string, any>) => void
  routeName?: string
}

interface DeleteModalState {
  showLinkedDocsModal: boolean
  showDeleteModal: boolean
  docname: string | null
  items: string[]
}

const CLOSED_DELETE_MODAL: DeleteModalState = {
  showLinkedDocsModal: false,
  showDeleteModal: false,
  docname: null,
  items: [],
}

export function useListBulkActions({
  list,
  doctype,
  options = {},
  isLostStatus,
  extraActions,
  viewLinkedDoc,
  routeName = '',
}: UseListBulkActionsInput) {
  const $socket = useGlobalStore((state) => state.$socket)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set())
  const [unselectAllAction, setUnselectAllAction] = useState<(() => void) | null>(null)
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>(CLOSED_DELETE_MODAL)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [bulkAssignees, setBulkAssignees] = useState<Assignee[]>([])
  const [customBulkActions, setCustomBulkActions] = useState<
    Array<{ label: string; onClick: (context: unknown) => void }>
  >([])
  const [customListActions, setCustomListActions] = useState<CustomAction[]>([])

  const hasData = Boolean(list.data)

  useEffect(() => {
    if (!hasData) return
    let cancelled = false
    void (async () => {
      const customization = await setupListCustomizations(list.data, {
        list,
        call: rpc,
        toast,
        $dialog: createDialog,
        $socket,
        router,
      })
      if (cancelled) return
      setCustomBulkActions((customization?.bulkActions || list.data?.bulkActions || []) as never)
      setCustomListActions((customization?.actions || list.data?.listActions || []) as never)
    })()
    return () => {
      cancelled = true
    }
  }, [hasData, list, $socket])

  function reload(unselectAll?: () => void) {
    setDeleteModal(CLOSED_DELETE_MODAL)
    unselectAllAction?.()
    unselectAll?.()
    void list.reload().catch(() => undefined)
  }

  function editValues(selections: Set<string>, unselectAll: () => void) {
    setSelectedValues(selections)
    setShowEditModal(true)
    setUnselectAllAction(() => unselectAll)
  }

  function deleteValues(selections: Set<string>, unselectAll: () => void) {
    setUnselectAllAction(() => unselectAll)
    const docs = Array.from(selections)
    if (docs.length === 1) setDeleteModal({ ...CLOSED_DELETE_MODAL, showLinkedDocsModal: true, docname: docs[0]! })
    else setDeleteModal({ ...CLOSED_DELETE_MODAL, showDeleteModal: true, items: docs })
  }

  function assignValues(selections: Set<string>, unselectAll: () => void) {
    setShowAssignmentModal(true)
    setSelectedValues(selections)
    setUnselectAllAction(() => unselectAll)
  }

  function clearAssignments(selections: Set<string>, unselectAll: () => void) {
    createDialog({
      title: __('Clear Assignment'),
      message: __('Are you sure you want to clear assignment for {0} item(s)?', [selections.size]),
      actions: [
        {
          label: __('Clear Assignment'),
          variant: 'solid',
          theme: 'red',
          onClick: ({ close }) => {
            capture('bulk_clear_assignment')
            void rpc({
              url: 'frappe.desk.form.assign_to.remove_multiple',
              params: { doctype, names: JSON.stringify(Array.from(selections)), ignore_permissions: true },
            }).then(() => {
              toast.success(__('Assignment Cleared Successfully'))
              reload(unselectAll)
              close()
            })
          },
        },
      ],
    })
  }

  function bulkActions(selections: Set<string>, unselectAll: () => void): BulkAction[] {
    const actions: BulkAction[] = []

    if (!options.hideEdit) actions.push({ label: __('Edit'), onClick: () => editValues(selections, unselectAll) })
    if (!options.hideDelete) actions.push({ label: __('Delete'), onClick: () => deleteValues(selections, unselectAll) })
    if (!options.hideAssign) {
      actions.push({ label: __('Assign To'), onClick: () => assignValues(selections, unselectAll) })
      actions.push({ label: __('Clear Assignment'), onClick: () => clearAssignments(selections, unselectAll) })
    }

    if (extraActions) actions.push(...extraActions({ selections, unselectAll, reload }))

    customBulkActions.forEach((action) => {
      actions.push({
        label: __(action.label),
        onClick: () =>
          action.onClick({
            list,
            selections,
            unselectAll,
            call: rpc,
            toast,
            $dialog: createDialog,
            router,
          }),
      })
    })
    return actions
  }

  const modals: ReactNode = (
    <>
      {showEditModal && (
        <EditValueModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          doctype={doctype}
          selectedValues={selectedValues}
          isLostStatus={isLostStatus}
          onReload={() => reload()}
        />
      )}
      {showAssignmentModal && (
        <AssignmentModal
          open={showAssignmentModal}
          onOpenChange={setShowAssignmentModal}
          assignees={bulkAssignees}
          onAssigneesChange={setBulkAssignees}
          docs={selectedValues}
          doctype={doctype}
          onReload={() => reload()}
        />
      )}
      {deleteModal.showLinkedDocsModal && deleteModal.docname && (
        <DeleteLinkedDocModal
          open
          onOpenChange={(open) => setDeleteModal((current) => ({ ...current, showLinkedDocsModal: open }))}
          name={routeName}
          doctype={doctype}
          docname={deleteModal.docname}
          reload={() => reload()}
          viewLinkedDoc={viewLinkedDoc}
        />
      )}
      {deleteModal.showDeleteModal && (
        <BulkDeleteLinkedDocModal
          open
          onOpenChange={(open) => setDeleteModal((current) => ({ ...current, showDeleteModal: open }))}
          doctype={doctype}
          items={deleteModal.items}
          reload={() => reload()}
        />
      )}
    </>
  )

  return { bulkActions, customListActions, modals }
}

export type ListBulkActions = ReturnType<typeof useListBulkActions>

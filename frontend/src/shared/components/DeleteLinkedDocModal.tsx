import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import { useResource } from '@/core/resources'
import { Button, Dialog, toast, type ListRowData } from '@/design-system'
import { expireDeletionMarker, markDocumentAsDeleted, unmarkDocumentAsDeleted } from '../data/document'
import { linkedDocColumnLabels } from '../utils/linkedDocs'
import { LinkedDocsListView } from './ListViews/LinkedDocsListView'

export interface DeleteLinkedDocModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  doctype: string
  docname: string
  title?: string | null
  reload?: (() => void) | null
  viewLinkedDoc?: (row: ListRowData) => void
}

interface ConfirmInfo {
  show: boolean
  title: string
  message?: string
  delete?: boolean
}

interface LinkedDoc extends ListRowData {
  id: string
  reference_doctype: string
  reference_docname: string
}

export function DeleteLinkedDocModal({
  open,
  onOpenChange,
  name,
  doctype,
  docname,
  title = null,
  reload = null,
  viewLinkedDoc,
}: DeleteLinkedDocModalProps) {
  const [selections, setSelections] = useState<string[]>([])
  const [confirmInfo, setConfirmInfo] = useState<ConfirmInfo>({ show: false, title: '' })
  const [deleting, setDeleting] = useState(false)

  const linkedDocsResource = useResource<Array<Record<string, any>>>({
    url: 'crm.api.doc.get_linked_docs_of_document',
    params: { doctype, docname },
    auto: true,
    validate(params) {
      if (!params?.doctype || !params?.docname) return false as never
    },
  })

  const linkedDocs: LinkedDoc[] = (linkedDocsResource.data ?? []).map(
    (doc) => ({ id: doc.reference_docname, ...doc }) as LinkedDoc,
  )

  function cancel() {
    setConfirmInfo((current) => ({ ...current, show: false }))
    setSelections([])
  }

  async function unlinkLinkedDoc(flag: { delete: boolean }) {
    const items =
      selections.length > 0
        ? selections.map((selection) => {
            const found = linkedDocs.find((entry) => entry.id === selection)!
            return { doctype: found.reference_doctype, docname: found.reference_docname }
          })
        : linkedDocs.map((entry) => ({ doctype: entry.reference_doctype, docname: entry.reference_docname }))

    await rpc({
      url: 'crm.api.doc.remove_linked_doc_reference',
      params: { items, remove_contact: doctype === 'Contact', delete: flag.delete },
    })
    void linkedDocsResource.reload().catch(() => undefined)
    setConfirmInfo({ show: false, title: '' })
  }

  function confirm(kind: 'delete' | 'unlink') {
    const items = selections.length === 0 ? 'all' : selections.length
    setConfirmInfo(
      kind === 'delete'
        ? {
            show: true,
            title: __('Delete Linked Item'),
            message: __('Are you sure you want to delete {0} linked item(s)?', [items]),
            delete: true,
          }
        : {
            show: true,
            title: __('Unlink Linked Item'),
            message: __('Are you sure you want to unlink {0} linked item(s)?', [items]),
            delete: false,
          },
    )
  }

  async function removeDocLinks() {
    await unlinkLinkedDoc({ delete: Boolean(confirmInfo.delete) })
    setSelections([])
  }

  async function deleteDoc() {
    markDocumentAsDeleted(doctype, docname)
    setDeleting(true)
    try {
      await rpc({ url: 'frappe.client.delete', params: { doctype, name: docname } })
    } catch (error) {
      unmarkDocumentAsDeleted(doctype, docname)
      throw error
    } finally {
      setDeleting(false)
    }
    expireDeletionMarker(doctype, docname)
    toast.success(__('{0} deleted successfully', [title ? `${docname} (${title})` : docname]))
    onOpenChange(false)
    router.push({ name })
    reload?.()
  }

  const hasLinked = linkedDocs.length > 0
  const countLabel = selections.length

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      body={
        !confirmInfo.show ? (
          <>
            <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">
                    {!hasLinked ? __('Delete') : __('Delete or unlink linked documents')}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" icon="lucide-x" onClick={() => onOpenChange(false)} />
                </div>
              </div>
              <div>
                {hasLinked ? (
                  <div>
                    <span className="text-base text-ink-gray-5">
                      {__('Delete or unlink these linked documents before deleting this document')}
                    </span>
                    <LinkedDocsListView
                      className="mt-4"
                      rows={linkedDocs}
                      columns={linkedDocColumnLabels()}
                      onSelectionsChanged={(next) => setSelections(Array.from(next).map(String))}
                      viewLinkedDoc={viewLinkedDoc}
                    />
                  </div>
                ) : (
                  <div className="text-base text-ink-gray-5">
                    {__('Are you sure you want to delete {0} - {1}?', [doctype, docname])}
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 pb-7 pt-0 sm:px-6">
              <div className="flex flex-row-reverse gap-2">
                {hasLinked && (
                  <Button
                    label={countLabel === 0 ? __('Delete All') : __('Delete {0} Item(s)', [countLabel])}
                    theme="red"
                    variant="solid"
                    iconLeft="lucide-trash-2"
                    onClick={() => confirm('delete')}
                  />
                )}
                {hasLinked && (
                  <Button
                    label={countLabel === 0 ? __('Unlink All') : __('Unlink {0} Item(s)', [countLabel])}
                    variant="subtle"
                    theme="gray"
                    iconLeft="lucide-unlock"
                    onClick={() => confirm('unlink')}
                  />
                )}
                {!hasLinked && (
                  <Button
                    variant="solid"
                    iconLeft="lucide-trash-2"
                    label={__('Delete')}
                    loading={deleting}
                    theme="red"
                    onClick={() => void deleteDoc()}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{confirmInfo.title}</h3>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" icon="lucide-x" onClick={() => onOpenChange(false)} />
              </div>
            </div>
            <div className="text-base text-ink-gray-5">{confirmInfo.message}</div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={cancel}>
                {__('Cancel')}
              </Button>
              <Button variant="solid" label={confirmInfo.title} theme="red" onClick={() => void removeDocLinks()} />
            </div>
          </div>
        )
      }
    />
  )
}

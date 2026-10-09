import { useMemo, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, createDialog, Dialog, FeatherIcon, Spinner, toast } from '@/design-system'
import { FilesUploader } from '@/shared/components/FilesUploader'
import { isImage } from '@/shared/utils/text'
import { makeHrmsResource, messageTransform, useHrmsQuery } from '../stores/resource'

interface HrmsAttachment {
  name: string
  file_name?: string | null
  file_url?: string | null
  is_private?: boolean | number | null
}

interface HrmsAttachmentsProps {
  doctype: string
  docname: string
  readOnly: boolean
}

function extension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export function HrmsAttachments({ doctype, docname, readOnly }: HrmsAttachmentsProps) {
  const resource = useMemo(
    () => makeHrmsResource<unknown>('hrms.api.get_attachments', `hrms:attachments:${doctype}:${docname}`),
    [docname, doctype],
  )
  const query = useHrmsQuery(resource, { dt: doctype, dn: docname }, Boolean(docname))
  const attachments = query.data ? messageTransform<HrmsAttachment[]>(query.data) : []
  const [uploaderOpen, setUploaderOpen] = useState(false)
  const [preview, setPreview] = useState<HrmsAttachment | null>(null)

  function reload() {
    void resource.reload().catch(() => undefined)
  }

  function deleteAttachment(attachment: HrmsAttachment) {
    createDialog({
      title: __('Delete Attachment'),
      message: __('Are you sure you want to delete {0}?', [attachment.file_name ?? attachment.name]),
      actions: [
        {
          label: __('Delete'),
          variant: 'solid',
          theme: 'red',
          onClick: async ({ close }) => {
            await rpc({ url: 'hrms.api.delete_attachment', params: { filename: attachment.name } })
            reload()
            toast.success(__('Attachment deleted'))
            close()
          },
        },
      ],
    })
  }

  function togglePrivacy(attachment: HrmsAttachment) {
    const isPrivate = Boolean(attachment.is_private)
    const nextLabel = isPrivate ? __('public') : __('private')
    createDialog({
      title: __('Change Attachment Privacy'),
      message: __('Make this attachment {0}?', [nextLabel]),
      actions: [
        {
          label: __('Make {0}', [nextLabel]),
          variant: 'solid',
          onClick: async ({ close }) => {
            await rpc({
              url: 'frappe.client.set_value',
              params: { doctype: 'File', name: attachment.name, fieldname: { is_private: !isPrivate } },
            })
            reload()
            toast.success(__('Attachment privacy updated'))
            close()
          },
        },
      ],
    })
  }

  return (
    <section className="mt-6 border-t border-outline-gray-2 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-gray-8">{__('Attachments')}</h2>
          <p className="mt-1 text-sm text-ink-gray-6">{__('Files attached to this document')}</p>
        </div>
        {!readOnly && (
          <Button variant="outline" iconLeft="lucide-paperclip" onClick={() => setUploaderOpen(true)}>
            {__('Attach files')}
          </Button>
        )}
      </div>
      {query.loading && !attachments.length ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      ) : attachments.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {attachments.map((attachment) => {
            const fileName = attachment.file_name ?? attachment.name
            const fileUrl = attachment.file_url ?? ''
            const image = isImage(extension(fileName))
            return (
              <div
                key={attachment.name}
                className="flex min-w-0 items-center gap-3 rounded-lg border border-outline-gray-2 bg-surface-base p-3"
              >
                <button
                  type="button"
                  className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border border-outline-gray-2 bg-surface-gray-1"
                  aria-label={__('Preview {0}', [fileName])}
                  onClick={() => setPreview(attachment)}
                >
                  {image && fileUrl ? (
                    <img src={fileUrl} alt={fileName} className="size-full object-cover" />
                  ) : (
                    <FeatherIcon name="file" className="size-5 text-ink-gray-6" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="block max-w-full truncate text-left text-sm font-medium text-ink-gray-8 hover:text-ink-blue-7"
                    onClick={() => setPreview(attachment)}
                  >
                    {fileName}
                  </button>
                  <p className="mt-1 text-xs text-ink-gray-5">
                    {attachment.is_private ? __('Private') : __('Public')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    icon="eye"
                    aria-label={__('Preview {0}', [fileName])}
                    onClick={() => setPreview(attachment)}
                  />
                  <a
                    className="inline-flex size-8 items-center justify-center rounded text-ink-gray-7 hover:bg-surface-gray-2"
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={fileName}
                    aria-label={__('Download {0}', [fileName])}
                  >
                    <FeatherIcon name="download" className="size-4" />
                  </a>
                  {!readOnly && (
                    <>
                      <Button
                        variant="ghost"
                        icon={attachment.is_private ? 'unlock' : 'lock'}
                        aria-label={attachment.is_private ? __('Make Public') : __('Make Private')}
                        onClick={() => togglePrivacy(attachment)}
                      />
                      <Button
                        variant="ghost"
                        theme="red"
                        icon="trash-2"
                        aria-label={__('Delete Attachment')}
                        onClick={() => deleteAttachment(attachment)}
                      />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-outline-gray-2 p-5 text-center text-sm text-ink-gray-5">
          {__('No attachments yet')}
        </p>
      )}
      <FilesUploader
        open={uploaderOpen}
        onOpenChange={setUploaderOpen}
        doctype={doctype}
        docname={docname}
        onAfter={(files) => {
          reload()
          toast.success(__('{0} attachment(s) added', [files.length]))
        }}
      />
      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreview(null)}
        title={preview?.file_name ?? __('Attachment')}
        size="2xl"
      >
        {preview && (
          <div className="flex min-h-48 flex-col items-center justify-center gap-4">
            {isImage(extension(preview.file_name ?? '')) && preview.file_url ? (
              <img
                src={preview.file_url}
                alt={preview.file_name ?? preview.name}
                className="max-h-[60vh] max-w-full rounded-lg object-contain"
              />
            ) : (
              <FeatherIcon name="file-text" className="size-12 text-ink-gray-5" />
            )}
            <a
              href={preview.file_url ?? ''}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-ink-blue-7 hover:underline"
            >
              {__('Open attachment')}
            </a>
          </div>
        )}
      </Dialog>
    </section>
  )
}

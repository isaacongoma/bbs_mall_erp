import type { ComponentType } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, createDialog, FeatherIcon } from '@/design-system'
import { FileAudioIcon, FileTextIcon, FileVideoIcon } from '@/shared/components/Icons'
import { isImage, convertSize } from '@/shared/utils/text'
import { TimelineTimestamp } from './TimelineTimestamp'

export interface AttachmentAreaProps {
  attachments: Array<Record<string, any>>
  onReload?: () => void
}

const AUDIO_EXTENSIONS = ['wav', 'mp3', 'ogg', 'flac', 'aac']
const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mkv', 'flv', 'mov']

function fileIcon(type?: string): ComponentType<{ className?: string }> {
  if (!type) return FileTextIcon
  const lower = type.toLowerCase()
  if (AUDIO_EXTENSIONS.includes(lower)) return FileAudioIcon
  if (VIDEO_EXTENSIONS.includes(lower)) return FileVideoIcon
  return FileTextIcon
}

export function AttachmentArea({ attachments, onReload }: AttachmentAreaProps) {
  function togglePrivate(fileName: string, isPrivate: boolean) {
    const changeTo = isPrivate ? __('public') : __('private')
    createDialog({
      title: __('Make attachment {0}', [changeTo]),
      message: __('Are you sure you want to make this attachment {0}?', [changeTo]),
      actions: [
        {
          label: __('Make {0}', [changeTo]),
          variant: 'solid',
          onClick: async ({ close }) => {
            await rpc({
              url: 'frappe.client.set_value',
              params: { doctype: 'File', name: fileName, fieldname: { is_private: !isPrivate } },
            })
            onReload?.()
            close()
          },
        },
      ],
    })
  }

  function deleteAttachment(fileName: string) {
    createDialog({
      title: __('Delete Attachment'),
      message: __('Are you sure you want to delete this attachment?'),
      actions: [
        {
          label: __('Delete'),
          variant: 'solid',
          theme: 'red',
          onClick: async ({ close }) => {
            await rpc({ url: 'frappe.client.delete', params: { doctype: 'File', name: fileName } })
            onReload?.()
            close()
          },
        },
      ],
    })
  }

  if (!attachments.length) return null

  return (
    <div>
      {attachments.map((attachment, index) => {
        const Icon = fileIcon(attachment.file_type)
        const image = isImage(attachment.file_type)
        return (
          <div key={attachment.name}>
            <div
              className="activity flex cursor-pointer justify-between gap-2 rounded p-2.5 text-base hover:bg-surface-sidebar"
              onClick={() => window.open(attachment.file_url, '_blank')}
            >
              <div className="flex gap-2 truncate">
                <div
                  className={`flex size-11 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-surface-base ${image ? '' : 'border'}`}
                >
                  {image ? (
                    <img className="size-full object-cover" src={attachment.file_url} alt={attachment.file_name} />
                  ) : (
                    <Icon className="size-4 text-ink-gray-7" />
                  )}
                </div>
                <div className="flex flex-col justify-center gap-1 truncate">
                  <div className="truncate text-base text-ink-gray-8">{attachment.file_name}</div>
                  <div className="mb-1 text-sm text-ink-gray-5">{convertSize(attachment.file_size)}</div>
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <TimelineTimestamp date={attachment.creation} />
                <div className="flex gap-1">
                  <Button
                    tooltip={attachment.is_private ? __('Make Public') : __('Make Private')}
                    className="!size-5"
                    onClick={(event) => {
                      event.stopPropagation()
                      togglePrivate(attachment.name, attachment.is_private)
                    }}
                  >
                    <FeatherIcon name={attachment.is_private ? 'lock' : 'unlock'} className="size-3 text-ink-gray-7" />
                  </Button>
                  <Button
                    tooltip={__('Delete Attachment')}
                    className="!size-5"
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteAttachment(attachment.name)
                    }}
                  >
                    <span className="lucide-trash-2 size-3 text-ink-gray-7" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
            {index < attachments.length - 1 && <div className="mx-2 h-px border-t border-outline-elevation-2" />}
          </div>
        )
      })}
    </div>
  )
}

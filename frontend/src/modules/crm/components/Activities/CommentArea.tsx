import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, Dropdown, toast } from '@/design-system'
import { AttachmentItem } from '@/shared/components/AttachmentItem'
import { RichTextField } from '@/shared/components/RichTextField'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useSession } from '@/shared/hooks/useSession'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'
import { sanitizeHTML } from '@/shared/utils/text'
import { TimelineTimestamp } from './TimelineTimestamp'

export interface CommentAreaProps {
  activity: Record<string, any>
  className?: string
  onReload?: () => void
}

export function CommentArea({ activity, className, onReload }: CommentAreaProps) {
  const { user } = useSession()
  const isOwner = activity.owner === user
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function saveEdit() {
    if (editContent === activity.content) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await rpc({
        url: 'frappe.client.set_value',
        params: { doctype: 'Comment', name: activity.name, fieldname: 'content', value: editContent },
      })
      setEditing(false)
      onReload?.()
    } catch {
      toast.error(__('Failed to update comment'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteComment() {
    try {
      await rpc({ url: 'frappe.client.delete', params: { doctype: 'Comment', name: activity.name } })
      onReload?.()
    } catch {
      toast.error(__('Failed to delete comment'))
    }
  }

  const menuOptions = [
    {
      label: __('Edit'),
      icon: 'lucide-edit-2',
      onClick: () => {
        setEditContent(activity.content || '')
        setEditing(true)
      },
    },
    ...confirmDeleteOptions({
      onConfirmDelete: () => void deleteComment(),
      isConfirmingDelete: confirmingDelete,
      setConfirmingDelete,
    }),
  ]

  return (
    <div id={activity.name} className={className}>
      <div className="mb-1 flex items-center justify-stretch gap-2 py-1 text-base">
        <div className="inline-flex flex-wrap items-center gap-1 text-ink-gray-5">
          <UserAvatar className="mr-1" user={activity.owner} size="md" />
          <span className="font-medium text-ink-gray-8">{activity.owner_name}</span>
          <span>{__('added a')}</span>
          <span className="max-w-xs truncate font-medium text-ink-gray-8">{__('comment')}</span>
        </div>
        <div className="ml-auto flex items-center gap-1 whitespace-nowrap">
          <TimelineTimestamp date={activity.creation} />
          {isOwner && !editing && (
            <Dropdown options={menuOptions as never} placement="right" onOpenChange={() => setConfirmingDelete(false)}>
              <Button icon="lucide-more-horizontal" variant="ghost" className="!h-6 !w-6" />
            </Dropdown>
          )}
        </div>
      </div>
      <div className="rounded bg-surface-gray-1 px-3 py-[7.5px] text-base leading-6 transition-all duration-300 ease-in-out">
        {editing ? (
          <>
            <RichTextField
              content={editContent}
              editorClass="prose-sm max-w-none min-h-[3rem]"
              onChange={setEditContent}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                label={__('Cancel')}
                onClick={() => {
                  setEditing(false)
                  setEditContent('')
                }}
              />
              <Button variant="solid" label={__('Save')} loading={saving} onClick={() => void saveEdit()} />
            </div>
          </>
        ) : (
          <>
            <div className="prose-f" dangerouslySetInnerHTML={{ __html: sanitizeHTML(activity.content) }} />
            {activity.attachments?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {activity.attachments.map((attachment: Record<string, any>) => (
                  <AttachmentItem key={attachment.file_url} label={attachment.file_name} url={attachment.file_url} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

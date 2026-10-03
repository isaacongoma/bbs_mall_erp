import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, Dropdown, toast } from '@/design-system'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUsers } from '@/shared/hooks/useUsers'
import { sanitizeHTML } from '@/shared/utils/text'
import type { ActivityModals } from '../../types/activities'
import { TimelineTimestamp } from './TimelineTimestamp'

export interface NoteAreaProps {
  note: Record<string, any>
  modalRef: ActivityModals
  onReload?: () => void
}

export function NoteArea({ note, modalRef, onReload }: NoteAreaProps) {
  const { getUser } = useUsers()

  async function deleteNote(name: string) {
    await toast.promise(rpc({ url: 'frappe.client.delete', params: { doctype: 'FCRM Note', name } }), {
      loading: __('Deleting note...'),
      success: __('Note deleted'),
      error: __('Failed to delete note'),
    })
    onReload?.()
  }

  return (
    <div className="activity group flex h-48 cursor-pointer flex-col justify-between gap-2 rounded-md bg-surface-gray-1 px-4 py-3 hover:bg-surface-gray-2">
      <div className="flex items-center justify-between">
        <div className="truncate text-lg-medium text-ink-gray-8">{note.title}</div>
        <span className="h-6 w-6" onClick={(event) => event.stopPropagation()}>
          <Dropdown
            options={[
              { label: __('Edit'), icon: 'lucide-edit-2', onClick: () => modalRef.showNote(note) },
              { label: __('Delete'), icon: 'lucide-trash-2', onClick: () => void deleteNote(note.name) },
            ]}
          >
            <Button
              icon="lucide-more-horizontal"
              variant="ghost"
              className="!h-6 !w-6 hover:bg-surface-gray-2"
              onClick={(event) => {
                event.stopPropagation()
                event.preventDefault()
              }}
            />
          </Dropdown>
        </span>
      </div>
      {note.content && (
        <div
          className="prose-f prose-sm max-w-none flex-1 overflow-hidden text-p-sm text-ink-gray-5"
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(note.content) }}
        />
      )}
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <UserAvatar user={note.owner} size="xs" />
          <div className="truncate text-sm text-ink-gray-8" title={getUser(note.owner).full_name}>
            {getUser(note.owner).full_name}
          </div>
        </div>
        <TimelineTimestamp date={note.modified} className="truncate text-sm text-ink-gray-7" />
      </div>
    </div>
  )
}

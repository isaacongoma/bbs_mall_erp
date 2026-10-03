import { __ } from '@/core/i18n'
import { rpc } from '@/core/api/rpc'
import { capture } from '@/core/telemetry'
import { Button, Dropdown, ListFooter, Tooltip } from '@/design-system'
import { LayoutHeader } from '@/shared/components/LayoutHeader'
import { EmptyState } from '@/shared/components/ListViews'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { ViewBreadcrumbs } from '@/shared/components/ViewBreadcrumbs'
import { ViewControls } from '@/shared/components/ViewControls'
import { useOpenFromUrl } from '@/shared/hooks/useOpenFromUrl'
import { useUsers } from '@/shared/hooks/useUsers'
import { useViewController } from '@/shared/hooks/useViewController'
import { useObservable } from '@/core/resources'
import { useUiStore } from '@/shared/stores/uiStore'
import { formatDate, timeAgo } from '@/shared/utils/date'
import { sanitizeHTML } from '@/shared/utils/text'
import { NoteIcon } from '../components/Icons'
import { useSettings } from '../hooks/useSettings'

type AnyRecord = Record<string, any>

export default function Notes() {
  const { getUser } = useUsers()
  const { brand } = useSettings()
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)
  const controller = useViewController({
    doctype: 'FCRM Note',
    options: { hideColumnsButton: true, defaultViewName: __('Notes View') },
    brandFavicon: brand.favicon,
  })
  const { list } = controller
  useObservable(list)
  const data = list.data as AnyRecord | null
  const notes: AnyRecord[] = data?.data ?? []

  const reload = () => void list.reload().catch(() => undefined)
  const callbacks = {
    afterInsert: () => {
      reload()
      capture('note_created')
    },
    afterUpdate: () => {
      reload()
      capture('note_updated')
    },
  }

  function createNote() {
    showDoctypeModal({ doctype: 'FCRM Note', title: 'Note', callbacks })
  }

  function editNote(name: string) {
    showDoctypeModal({ name, doctype: 'FCRM Note', title: 'Note', callbacks })
  }

  async function deleteNote(name: string) {
    await rpc({ url: 'frappe.client.delete', params: { doctype: 'FCRM Note', name } })
    reload()
  }

  useOpenFromUrl(notes.length > 0, (name) => {
    if (notes.some((note) => note.name === name)) editNote(name)
  })

  return (
    <>
      <LayoutHeader
        left={<ViewBreadcrumbs routeName="Notes" viewControls={controller} />}
        right={<Button variant="solid" label={__('Create')} iconLeft="lucide-plus" onClick={createNote} />}
      />
      <ViewControls controller={controller} />
      <div className="flex-1 overflow-y-auto">
        {notes.length > 0 && (
          <div className="grid grid-cols-1 gap-2 px-3 pb-2 sm:grid-cols-4 sm:gap-4 sm:px-5 sm:pb-3">
            {notes.map((note) => (
              <div
                key={note.name}
                className="group flex h-56 cursor-pointer flex-col justify-between gap-2 rounded-lg border px-5 py-4 shadow-sm hover:bg-surface-sidebar"
                onClick={() => editNote(note.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="truncate text-lg-medium text-ink-gray-9">{note.title}</div>
                  <span onClick={(event) => event.stopPropagation()}>
                    <Dropdown
                      options={[
                        { label: __('Edit'), icon: 'edit-2', onClick: () => editNote(note.name) },
                        { label: __('Delete'), icon: 'trash-2', onClick: () => void deleteNote(note.name) },
                      ]}
                    >
                      <Button icon="lucide-more-horizontal" variant="ghost" className="hover:bg-surface-base" />
                    </Dropdown>
                  </span>
                </div>
                {note.content && (
                  <div
                    className="prose-f prose-sm text-p-sm max-w-none flex-1 overflow-hidden text-ink-gray-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(note.content) }}
                  />
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar user={note.owner} size="xs" />
                    <div className="text-sm text-ink-gray-8">{getUser(note.owner).full_name}</div>
                  </div>
                  <Tooltip text={formatDate(note.modified)}>
                    <div className="text-sm text-ink-gray-7">{__(timeAgo(note.modified))}</div>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {notes.length > 0 ? (
        <ListFooter
          value={data?.page_length_count}
          onChange={(value) => controller.updatePageLength(value)}
          onLoadMore={() => controller.loadMore()}
          left={undefined}
          options={{ rowCount: data?.row_count, totalCount: data?.total_count }}
        />
      ) : (
        <EmptyState name="Notes" icon={NoteIcon} />
      )}
    </>
  )
}

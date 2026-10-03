import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Avatar, Button, Popover, createDialog } from '@/design-system'
import { useUsers } from '@/shared/hooks/useUsers'
import { useUiStore } from '@/shared/stores/uiStore'
import type { AssigneeRow } from '../../utils/assignmentRules'

export interface AssigneeSearchProps {
  assigned: AssigneeRow[]
  onAdd: (row: AssigneeRow) => void
}

export function AssigneeSearch({ assigned, onAdd }: AssigneeSearchProps) {
  const { crmUsers } = useUsers()
  const [query, setQuery] = useState('')

  const usersList = crmUsers
    .filter((user) => user.name !== 'Administrator')
    .filter((user) => user.name?.includes(query) || user.full_name?.includes(query))
    .filter((user) => !assigned.some((row) => row.user === user.email))

  function inviteAgent() {
    createDialog({
      title: __('Invite Agent'),
      message: __('You will be redirected to invite user page, unsaved changes will be lost.'),
      actions: [
        {
          label: __('Go to Invite Page'),
          variant: 'solid',
          onClick: ({ close }) => {
            useUiStore.getState().set({ activeSettingsPage: 'Invite User' })
            close()
          },
        },
      ],
    })
  }

  return (
    <Popover
      placement="bottom-end"
      target={({ togglePopover }) => (
        <Button variant="subtle" iconLeft="lucide-plus" label={__('Add Assignee')} onClick={() => togglePopover()} />
      )}
      body={({ togglePopover }) => (
        <div className="mt-1 w-60 rounded-lg bg-surface-base py-1 text-base shadow-2xl">
          <div className="relative px-1.5 pt-0.5">
            <input
              className="form-input w-full"
              type="text"
              value={query}
              autoComplete="off"
              placeholder={__('Search')}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              className="absolute right-1.5 inline-flex h-7 w-7 items-center justify-center"
              onClick={() => setQuery('')}
            >
              <span className="lucide-x w-4" aria-hidden="true" />
            </button>
          </div>
          <ul className="my-2 max-h-64 overflow-y-auto px-1.5">
            {usersList.map((user) => (
              <li
                key={user.email}
                className="flex w-full cursor-pointer items-center rounded p-1.5 text-base hover:bg-surface-gray-1"
                onClick={(event) => {
                  event.stopPropagation()
                  onAdd({
                    full_name: user.full_name,
                    email: user.email,
                    user_image: user.user_image,
                    user: user.email,
                  })
                }}
              >
                <div className="flex w-full select-none items-center gap-2">
                  <Avatar shape="circle" image={user.user_image} label={user.full_name} size="lg" />
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-ink-gray-7">{user.full_name}</div>
                    <div className="text-ink-gray-6">{user.email}</div>
                  </div>
                </div>
              </li>
            ))}
            {usersList.length === 0 && (
              <li className="mt-1.5 rounded-md p-1.5 text-base text-ink-gray-5">{__('No Results Found')}</li>
            )}
          </ul>
          <div className="border-t p-1.5 pb-0.5 *:w-full">
            <Button
              variant="ghost"
              iconLeft="lucide-plus"
              className="w-full"
              label={__('Invite Agent')}
              onClick={() => {
                inviteAgent()
                togglePopover()
              }}
            />
          </div>
        </div>
      )}
    />
  )
}

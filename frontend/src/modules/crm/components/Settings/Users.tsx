import { useMemo, useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useObservable } from '@/core/resources'
import { Avatar, Button, Dropdown, Select, TextInput, Tooltip, toast } from '@/design-system'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { useUsers } from '@/shared/hooks/useUsers'
import { useUiStore } from '@/shared/stores/uiStore'
import { ensureUsersLoaded } from '@/shared/stores/usersStore'
import type { CrmUser } from '@/shared/types/users'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'
import { DropdownOption } from '@/shared/utils/optionComponents'
import { AddExistingUserModal } from './AddExistingUserModal'

const ROLE_LABELS: Record<string, string> = {
  'System Manager': 'Admin',
  'Sales Manager': 'Manager',
  'Sales User': 'Sales User',
}

const ROLE_ICONS: Record<string, string> = {
  'System Manager': 'shield',
  'Sales Manager': 'briefcase',
  'Sales User': 'user-check',
}

const ROLES = ['System Manager', 'Sales Manager', 'Sales User']

export function Users() {
  const { crmUsers, isManager } = useUsers()
  const usersResource = useObservable(ensureUsersLoaded())
  const [showAddExisting, setShowAddExisting] = useState(false)
  const [search, setSearch] = useState('')
  const [currentRole, setCurrentRole] = useState('All')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const loading = usersResource.loading && !crmUsers.length

  const usersList = useMemo(
    () =>
      crmUsers
        .filter((user) => user.name !== 'Administrator')
        .filter((user) => user.name?.includes(search) || user.full_name?.includes(search))
        .filter((user) => currentRole === 'All' || user.role === currentRole),
    [crmUsers, search, currentRole],
  )

  async function updateRole(user: CrmUser, newRole: string) {
    if (user.role === newRole) return
    try {
      await rpc({ url: 'crm.api.user.update_user_role', params: { user: user.name, new_role: newRole } })
      toast.success(__('{0} has been granted {1} access', [user.full_name, __(ROLE_LABELS[newRole] ?? newRole)]))
      await usersResource.reload()
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Something went wrong'))
    }
  }

  async function removeUser(user: CrmUser) {
    try {
      await rpc({ url: 'crm.api.user.remove_crm_roles_from_user', params: { user: user.name } })
      toast.success(__('User {0} has been removed', [user.full_name]))
      await usersResource.reload()
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Something went wrong'))
    }
  }

  function roleOptions(user: CrmUser) {
    return ROLES.map((role) => ({
      label: __(ROLE_LABELS[role] ?? role),
      component: () => (
        <DropdownOption
          option={__(ROLE_LABELS[role] ?? role)}
          icon={ROLE_ICONS[role]}
          selected={user.role === role}
          onClick={() => void updateRole(user, role)}
        />
      ),
      onClick: () => void updateRole(user, role),
    }))
  }

  function moreOptions(user: CrmUser) {
    return confirmDeleteOptions({
      onConfirmDelete: () => void removeUser(user),
      isConfirmingDelete: confirmRemove,
      setConfirmingDelete: setConfirmRemove,
      label: __('Remove'),
    }).filter((option) => option.condition())
  }

  return (
    <>
      <div className="flex h-full flex-col gap-6 p-6 text-ink-gray-8">
        <div className="flex justify-between px-2 pt-2">
          <div className="flex w-9/12 flex-col gap-1">
            <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none">{__('Users')}</h2>
            <p className="text-p-base text-ink-gray-6">
              {__(
                'Manage CRM users by adding or inviting them, and assign roles to control their access and permissions',
              )}
            </p>
          </div>
          <div className="item-center flex w-3/12 justify-end space-x-2">
            <Dropdown
              placement="right"
              options={[
                { label: __('Add Existing User'), onClick: () => setShowAddExisting(true) },
                {
                  label: __('Invite New User'),
                  onClick: () => useUiStore.getState().set({ activeSettingsPage: 'Invite User' }),
                },
              ]}
            >
              <Button label={__('New')} iconLeft="lucide-plus" variant="solid" />
            </Dropdown>
          </div>
        </div>

        {loading && (
          <div className="mt-28 flex h-full w-full justify-between">
            <Button loading variant="ghost" className="w-full" size="lg" />
          </div>
        )}

        {!loading && crmUsers.length === 1 && (
          <EmptyState name="Users" description={__('Add one to get started.')} icon="user" />
        )}

        {!loading && crmUsers.length > 1 && (
          <div className="flex flex-col overflow-hidden">
            {crmUsers.length > 10 && (
              <div className="mb-4 flex items-center gap-2 px-2 pt-0.5">
                <TextInput
                  inputRef={searchRef}
                  value={search}
                  onChange={setSearch}
                  debounce={300}
                  placeholder={__('Search User')}
                  wrapperClassName="w-full"
                  prefix={<span className="lucide-search h-4 w-4 text-ink-gray-6" aria-hidden="true" />}
                />
                <Select
                  className="shrink-0"
                  value={currentRole}
                  onChange={(value) => setCurrentRole(String(value ?? 'All'))}
                  options={[
                    { label: __('All'), value: 'All' },
                    { label: __('Admin'), value: 'System Manager' },
                    { label: __('Manager'), value: 'Sales Manager' },
                    { label: __('Sales User'), value: 'Sales User' },
                  ]}
                />
              </div>
            )}
            <ul className="divide-y divide-outline-elevation-2 overflow-y-auto px-2">
              {usersList.map((user) => (
                <li key={user.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <Avatar image={user.user_image} label={user.full_name} size="xl" />
                    <div className="ml-3 flex flex-col">
                      <div className="flex items-center text-p-base text-ink-gray-8">{user.full_name}</div>
                      <div className="text-p-sm text-ink-gray-5">{user.name}</div>
                    </div>
                  </div>
                  <div className="flex flex-row-reverse items-center gap-2">
                    <Dropdown
                      placement="right"
                      options={moreOptions(user) as never}
                      onOpenChange={() => setConfirmRemove(false)}
                    >
                      <Button icon="lucide-more-horizontal" />
                    </Dropdown>
                    {isManager() && user.role === 'System Manager' ? (
                      <Tooltip text={__('Cannot change role of user with Admin access')}>
                        <Button label={__('Admin')} iconLeft="lucide-shield" />
                      </Tooltip>
                    ) : (
                      <Dropdown placement="right" options={roleOptions(user) as never}>
                        <Button
                          label={__(ROLE_LABELS[user.role ?? ''] ?? '')}
                          iconRight="lucide-chevron-down"
                          iconLeft={`lucide-${ROLE_ICONS[user.role ?? ''] ?? 'user-check'}`}
                        />
                      </Dropdown>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {showAddExisting && <AddExistingUserModal open={showAddExisting} onOpenChange={setShowAddExisting} />}
    </>
  )
}

import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useObservable } from '@/core/resources'
import { Button, Dialog, FormControl, toast } from '@/design-system'
import { EmailMultiSelect } from '@/shared/components/Controls/EmailMultiSelect'
import { useUsers } from '@/shared/hooks/useUsers'
import { ensureUsersLoaded } from '@/shared/stores/usersStore'
import { validateEmail } from '@/shared/utils/validation'
import { ROLE_DESCRIPTIONS, roleSelectOptions } from './roles'

export interface AddExistingUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddExistingUserModal({ open, onOpenChange }: AddExistingUserModalProps) {
  const { crmUsers, isAdmin } = useUsers()
  const usersResource = useObservable(ensureUsersLoaded())
  const [newUsers, setNewUsers] = useState<string[]>([])
  const [role, setRole] = useState('Sales User')
  const [loading, setLoading] = useState(false)

  async function addUsers() {
    setLoading(true)
    try {
      await rpc({ url: 'crm.api.user.add_existing_users', params: { users: JSON.stringify(newUsers), role } })
      toast.success(__('Users Added Successfully'))
      setNewUsers([])
      onOpenChange(false)
      await usersResource.reload()
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Failed to Add Users'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={__('Add Existing User')}
      actionsContent={() => (
        <div className="flex justify-end gap-2">
          <Button
            variant="solid"
            label={__('Add')}
            disabled={!newUsers.length}
            loading={loading}
            onClick={() => void addUsers()}
          />
        </div>
      )}
    >
      <div className="mb-4 flex gap-1 rounded border p-2 text-ink-gray-5">
        <span className="lucide-info mt-0.5 size-3.5" aria-hidden="true" />
        <p className="text-p-sm">
          {__(
            'Add existing system users to this CRM. Assign them a role to grant access with their current credentials.',
          )}
        </p>
      </div>
      <label className="mb-1.5 block text-xs text-ink-gray-5">{__('Users')}</label>
      <div className="group rounded bg-surface-gray-2 p-2 hover:bg-surface-gray-3">
        {crmUsers.length > 0 && (
          <EmailMultiSelect
            values={newUsers}
            onChange={setNewUsers}
            inputClass="!bg-surface-gray-2 hover:!bg-surface-gray-3 group-hover:!bg-surface-gray-3"
            placeholder={__('john@doe.com')}
            validate={validateEmail}
            fetchUsers
            existingEmails={[...crmUsers.map((user) => user.name), 'admin@example.com']}
            errorMessage={(value) => __('{0} is an invalid email address', [value])}
            emptyPlaceholder={__('No Users Found')}
          />
        )}
      </div>
      <FormControl
        type="select"
        className="mt-4"
        label={__('Role')}
        value={role}
        onChange={(value: string) => setRole(value)}
        options={roleSelectOptions(isAdmin())}
        description={ROLE_DESCRIPTIONS[role]}
      />
    </Dialog>
  )
}

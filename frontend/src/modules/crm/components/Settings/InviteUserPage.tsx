import { useState, type FormEvent } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useListResource } from '@/core/resources'
import { Button, ErrorMessage, FormControl, toast } from '@/design-system'
import { useUsers } from '@/shared/hooks/useUsers'
import { convertArrayToString } from '@/shared/utils/collections'
import { validateEmail } from '@/shared/utils/validation'
import { ROLE_DESCRIPTIONS, roleLabel, roleSelectOptions } from './roles'

type Invitation = { name: string; email: string; role: string }

function existingMessage(invitees: string[], existing: string[], template: string): string | null {
  const known = new Set(existing)
  const matches = [...new Set(invitees)].filter((email) => known.has(email))
  return matches.length ? __(template, [matches.join(', ')]) : null
}

export function InviteUserPage() {
  const { crmUsers, isAdmin } = useUsers()
  const [invitees, setInvitees] = useState<string[]>([])
  const [role, setRole] = useState('Sales User')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const pending = useListResource({
    doctype: 'CRM Invitation',
    filters: { status: 'Pending' },
    fields: ['name', 'email', 'role'],
    pageLength: 999,
    auto: true,
  })
  const pendingInvitations = (pending.data as Invitation[] | null) ?? []

  const userExistMessage = existingMessage(
    invitees,
    crmUsers.map((user) => user.name),
    'User with email {0} already exists',
  )
  const inviteeExistMessage = existingMessage(
    invitees,
    pendingInvitations.map((invitation) => invitation.email),
    'User with email {0} already invited',
  )

  function updateInvitees(value: string) {
    setInvitees(
      value
        .split(',')
        .map((email) => email.trim())
        .filter((email) => validateEmail(email)),
    )
  }

  async function sendInvites() {
    setSending(true)
    try {
      await rpc({ url: 'crm.api.invite_by_email', params: { emails: convertArrayToString(invitees), role } })
      setRole('Sales User')
      setError(null)
      setInvitees([])
      void pending.reload()
      toast.success(__('Invitations sent successfully'))
    } catch (failure) {
      const message = toErrorMessage(failure)
      setError(message)
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  async function deleteInvitation(name: string) {
    setDeleting(name)
    try {
      await pending.delete.submit(name)
    } finally {
      setDeleting(null)
    }
  }

  const message = userExistMessage || inviteeExistMessage

  return (
    <div className="flex h-full flex-col gap-6 px-6 py-8 text-ink-gray-8">
      <div className="flex justify-between px-2">
        <div className="flex w-9/12 flex-col gap-1">
          <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none">{__('Send Invites To')}</h2>
          <p className="text-p-base text-ink-gray-6">
            {__('Invite users to access CRM. Specify their roles to control access and permissions')}
          </p>
        </div>
        <div className="item-center flex w-3/12 justify-end space-x-2">
          <Button
            label={__('Send Invites')}
            variant="solid"
            disabled={!invitees.length || Boolean(message)}
            loading={sending}
            onClick={() => void sendInvites()}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-2">
        <div>
          <FormControl
            type="textarea"
            label={__('Invite By Email')}
            placeholder="user1@example.com, user2@example.com, ..."
            debounce={100}
            disabled={sending}
            description={__('You can invite multiple users by comma separating their email addresses')}
            onInput={(event: FormEvent<HTMLTextAreaElement>) => updateInvitees(event.currentTarget.value)}
          />
          {message && <div className="mt-1.5 text-xs text-ink-red-6">{message}</div>}
          <FormControl
            type="select"
            className="mt-4"
            label={__('Invite As')}
            value={role}
            onChange={(value: string) => setRole(value)}
            options={roleSelectOptions(isAdmin())}
            description={ROLE_DESCRIPTIONS[role]}
          />
        </div>
        {pendingInvitations.length > 0 && !invitees.length && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-base-semibold">
              <div>{__('Pending Invites')}</div>
            </div>
            <ul className="flex flex-col gap-1">
              {pendingInvitations.map((invitation) => (
                <li
                  key={invitation.name}
                  className="flex items-center justify-between rounded-lg bg-surface-gray-2 px-2 py-1"
                >
                  <div className="text-base">
                    <span className="text-ink-gray-8">{invitation.email}</span>
                    <span className="text-ink-gray-5"> ({roleLabel(invitation.role)})</span>
                  </div>
                  <div>
                    <Button
                      tooltip={__('Delete Invitation')}
                      icon="lucide-x"
                      variant="ghost"
                      loading={deleting === invitation.name}
                      onClick={() => void deleteInvitation(invitation.name)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <ErrorMessage message={error ?? ''} />
    </div>
  )
}

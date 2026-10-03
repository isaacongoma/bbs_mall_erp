import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { Button, Dialog, Password, toast } from '@/design-system'
import { isStrongPassword, passwordFeedback } from '../utils/password'

export interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}

function LockIcon() {
  return <span className="lucide-lock-keyhole size-4 text-ink-gray-4" aria-hidden="true" />
}

export function ChangePasswordModal({ open, onOpenChange, onChanged }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const message = passwordFeedback(currentPassword, newPassword, confirmPassword)

  async function updatePassword() {
    setLoading(true)
    try {
      await rpc({
        url: 'crm.api.user.change_password',
        params: { old_password: currentPassword, new_password: newPassword },
      })
      toast.success(__('Password updated successfully'))
      onOpenChange(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onChanged?.()
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Failed to update password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={__('Change Password')}
      actionsContent={() => (
        <div className="flex items-center justify-between">
          <div>
            {message && (
              <p className={`text-sm ${message === __('Passwords match') ? 'text-ink-green-6' : 'text-ink-red-6'}`}>
                {message}
              </p>
            )}
          </div>
          <Button
            variant="solid"
            label={__('Update')}
            disabled={
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword ||
              !isStrongPassword(newPassword)
            }
            loading={loading}
            onClick={() => void updatePassword()}
          />
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        <Password
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder={__('Current Password')}
          maxLength={50}
          prefix={<LockIcon />}
        />
        <Password
          value={newPassword}
          onChange={setNewPassword}
          placeholder={__('New Password')}
          maxLength={50}
          prefix={<LockIcon />}
        />
        <Password
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder={__('Confirm Password')}
          maxLength={50}
          prefix={<LockIcon />}
        />
      </div>
    </Dialog>
  )
}

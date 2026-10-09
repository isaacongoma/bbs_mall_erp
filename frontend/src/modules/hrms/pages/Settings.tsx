import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Switch } from '@/design-system'
import { ChangePasswordModal } from '@/shared/components/ChangePasswordModal'
import { useHrmsSession } from '../hooks/useHrmsSession'
import { useHrmsPushNotifications } from '../stores/notificationStore'

export default function Settings() {
  const { settings } = useHrmsSession()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const push = useHrmsPushNotifications()
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-ink-gray-9">{__('Settings')}</h1>
      <section className="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base">
        <Button
          variant="ghost"
          className="w-full justify-start rounded-none border-b border-outline-gray-1 px-4 py-5"
          onClick={() => setPasswordOpen(true)}
        >
          {__('Change Password')}
        </Button>
        <div className="p-4">
          <Switch
            label={__('Enable Push Notifications')}
            value={push.enabled}
            onChange={(value) => void push.toggle(value)}
            disabled={!push.available || push.loading}
            description={
              !settings || !push.available
                ? __('Push notifications have been disabled on your site.')
                : push.loading
                  ? push.enabled
                    ? __('Disabling Push Notifications...')
                    : __('Enabling Push Notifications...')
                  : __('Manage notifications for your HR workspace.')
            }
          />
        </div>
      </section>
      <ChangePasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />
    </main>
  )
}

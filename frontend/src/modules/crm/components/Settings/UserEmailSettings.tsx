import { __ } from '@/core/i18n'
import { useDocumentResource, useListResource } from '@/core/resources'
import { Badge, Button, Combobox, toast } from '@/design-system'
import { RichTextField } from '@/shared/components/RichTextField'
import { SettingsLayoutBase } from '@/shared/components/Settings/SettingsPanel'
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts'
import { useSession } from '@/shared/hooks/useSession'

type AnyRecord = Record<string, any>

export interface UserEmailSettingsProps {
  onUpdateStep: (step: 'profile-settings' | 'user-email-settings') => void
}

export function UserEmailSettings({ onUpdateStep }: UserEmailSettingsProps) {
  const { user: sessionUser } = useSession()
  const resource = useDocumentResource({ doctype: 'User', name: sessionUser ?? '', auto: true })
  const user = resource as unknown as AnyRecord | null
  const doc: AnyRecord | null = user?.doc ?? null
  const isDirty = Boolean(user?.isDirty)

  const emails = useListResource({
    doctype: 'Email Account',
    cache: ['Outgoing Email Accounts'],
    fields: ['name', 'email_id'],
    filters: { enable_outgoing: 1 },
    auto: true,
  })

  const linked: AnyRecord[] = doc?.user_emails ?? []
  const linkedEmails = linked.map((entry) => entry.email_id)
  const filteredEmails = ((emails.data as AnyRecord[] | null) ?? [])
    .map((account) => ({ label: account.name, value: account.name, email: account.email_id }))
    .filter((option) => !linkedEmails.includes(option.email))

  function addEmail(option: AnyRecord | null) {
    if (!option) return
    user?.setField('user_emails', [...linked, { email_account: option.label, email_id: option.email }])
  }

  function removeEmail(entry: AnyRecord) {
    user?.setField(
      'user_emails',
      linked.filter((candidate) => candidate.email_id !== entry.email_id),
    )
  }

  function update() {
    user?.save.submit(null, {
      onSuccess: () => toast.success(__('Email settings updated successfully')),
    })
  }

  useKeyboardShortcuts({
    ignoreTyping: false,
    shortcuts: [
      {
        match: (event) => (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's',
        action: () => {
          if (isDirty) update()
        },
      },
    ],
  })

  if (!doc) return null

  return (
    <SettingsLayoutBase
      title={
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            iconLeft="lucide-chevron-left"
            label={__('Email Settings')}
            size="md"
            className="-ml-4 !max-w-96 cursor-pointer !justify-start !pr-0 text-2xl-semibold hover:bg-transparent hover:opacity-70 focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 active:bg-transparent active:text-ink-gray-5 active:outline-none active:ring-0 active:ring-offset-0"
            onClick={() => onUpdateStep('profile-settings')}
          />
          {isDirty && <Badge label={__('Not Saved')} variant="subtle" theme="orange" />}
        </div>
      }
      headerActions={isDirty ? <Button variant="solid" label={__('Update')} onClick={update} /> : undefined}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-base-medium text-ink-gray-8">{__('Signature')}</span>
          <span className="text-p-sm text-ink-gray-6">{__('Manage your email signature')}</span>
        </div>
        <RichTextField
          editorClass="prose-sm min-h-28 max-w-full border rounded-b-lg border-t-0 p-2 border-outline-elevation-2"
          content={doc.email_signature}
          placeholder="Type something..."
          fixedMenu
          onChange={(value) => user?.setField('email_signature', value)}
        />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-base-medium text-ink-gray-8">{__('Emails')}</span>
          <span className="text-p-sm text-ink-gray-6">
            {__('Switch between outgoing email accounts when sending emails')}
          </span>
        </div>
        <div>
          {linked.length > 0 && (
            <div className="mb-2 w-full rounded-md border border-outline-elevation-2">
              <div className="grid grid-cols-[4fr_4fr_0.3fr] gap-2 border-b border-outline-elevation-2 px-4 py-3 text-sm-medium text-ink-gray-5">
                <span>{__('Email Account')}</span>
                <span>{__('Email')}</span>
                <span />
              </div>
              {linked.map((entry) => (
                <div
                  key={entry.name ?? entry.email_id}
                  className="group grid grid-cols-[4fr_4fr_0.3fr] items-center gap-2 border-b border-outline-elevation-2 px-4 py-2.5 text-base last:border-b-0"
                >
                  <span className="truncate font-medium text-ink-gray-8">{entry.email_account}</span>
                  <span className="truncate text-ink-gray-6">{entry.email_id}</span>
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      className="w-10"
                      variant="ghost"
                      tooltip={__('Remove')}
                      icon="lucide-x"
                      onClick={(event) => {
                        event.preventDefault()
                        removeEmail(entry)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Combobox
            value={null}
            options={filteredEmails}
            onSelectedOptionChange={(option) => addEmail(option as AnyRecord | null)}
            trigger={({ open, setOpen }) => (
              <Button
                className="!bg-surface-elevation-2"
                variant="outline"
                label={__('Add Email')}
                iconLeft="lucide-plus"
                onClick={() => setOpen(!open)}
              />
            )}
            itemLabel={({ item }) => (
              <div className="flex flex-col gap-1 text-ink-gray-9">
                <div>{item.label}</div>
                <div className="text-sm text-ink-gray-4">{(item as AnyRecord).email}</div>
              </div>
            )}
          />
        </div>
      </div>
    </SettingsLayoutBase>
  )
}

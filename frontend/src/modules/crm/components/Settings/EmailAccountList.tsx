import { __ } from '@/core/i18n'
import { useListResource } from '@/core/resources'
import { Badge, Button } from '@/design-system'
import { Email2Icon } from '@/shared/components/Icons'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { emailIcon } from '../../utils/emailConfig'
import { EmailProviderIcon } from './EmailProviderIcon'

type AnyRecord = Record<string, any>

export interface EmailAccountListProps {
  onAdd: () => void
  onEdit: (account: AnyRecord) => void
}

function badgeTitle(account: AnyRecord): string {
  if (account.default_incoming && account.default_outgoing) return __('Default Sending & Inbox')
  if (account.default_incoming) return __('Default Inbox')
  if (account.default_outgoing) return __('Default Sending')
  return __('Inbox')
}

export function EmailAccountList({ onAdd, onEdit }: EmailAccountListProps) {
  const emailAccounts = useListResource({
    doctype: 'Email Account',
    cache: ['Email Accounts'],
    fields: ['*'],
    pageLength: 10,
    auto: true,
  })

  const accounts = ((emailAccounts.data as AnyRecord[] | null) ?? []).filter(
    (account) => !String(account.email_id ?? '').includes('example'),
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-between text-ink-gray-8">
        <div className="flex w-9/12 flex-col gap-1">
          <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none">{__('Email Accounts')}</h2>
          <p className="text-p-base text-ink-gray-6">
            {__(
              'Manage your email accounts to send and receive emails directly from CRM. You can add multiple accounts and set one as default for incoming and outgoing emails.',
            )}
          </p>
        </div>
        <div className="item-center flex w-3/12 justify-end space-x-2">
          <Button label={__('Add Account')} theme="gray" variant="solid" iconLeft="lucide-plus" onClick={onAdd} />
        </div>
      </div>
      {!emailAccounts.list.loading && accounts.length > 0 ? (
        <div className="mt-4">
          {accounts.map((account, index) => (
            <div key={account.name}>
              <div
                className="flex cursor-pointer items-center justify-between rounded border-outline-elevation-2 px-2 py-3 hover:bg-surface-sidebar"
                onClick={() => onEdit(account)}
              >
                <div className="flex items-center justify-between gap-2">
                  <EmailProviderIcon logo={emailIcon(account.service)} />
                  <div>
                    <div className="text-p-base text-ink-gray-8">{account.email_account_name}</div>
                    <div className="text-p-sm text-ink-gray-5">{account.email_id}</div>
                  </div>
                </div>
                <div>
                  <Badge variant="subtle" label={badgeTitle(account)} theme="gray" />
                </div>
              </div>
              {accounts.length !== index + 1 && <div className="mx-2 h-px border-t border-outline-elevation-2" />}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState name="Email Accounts" description={__('Add one to get started.')} icon={Email2Icon} />
      )}
    </div>
  )
}

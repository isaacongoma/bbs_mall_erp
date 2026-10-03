import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import type { Resource } from '@/core/resources'
import { Avatar, Badge, Button, Dropdown } from '@/design-system'
import { CollapsibleSection } from '@/shared/components/CollapsibleSection'
import { Link } from '@/shared/components/Controls/Link'
import { ArrowUpRightIcon, Email2Icon, LoadingIndicator, PhoneIcon, SuccessIcon } from '@/shared/components/Icons'

type AnyRecord = Record<string, any>

export interface DealContactsActionsProps {
  onAddContact: (name: string) => void
  onCreateContact: (firstName: string) => void
}

export function DealContactsActions({ onAddContact, onCreateContact }: DealContactsActionsProps) {
  return (
    <div className="pr-2">
      <Link
        value=""
        doctype="Contact"
        onCreate={(value, close) => {
          onCreateContact(value)
          close()
        }}
        onChange={onAddContact}
        target={({ togglePopover }) => (
          <Button className="h-7 px-3" variant="ghost" icon="lucide-plus" onClick={() => togglePopover()} />
        )}
      />
    </div>
  )
}

export interface DealContactsBodyProps {
  contacts: Resource<AnyRecord[]>
  onRemove: (name: string) => void
  onSetPrimary: (name: string) => void
}

export function DealContactsBody({ contacts, onRemove, onSetPrimary }: DealContactsBodyProps) {
  const list = contacts.data ?? []

  function contactOptions(contact: AnyRecord) {
    const options: AnyRecord[] = [
      { label: __('Remove'), icon: 'lucide-trash-2', onClick: () => onRemove(contact.name) },
    ]
    if (!contact.is_primary) {
      options.push({
        label: __('Set as Primary Contact'),
        icon: () => <SuccessIcon className="h-4 w-4" />,
        onClick: () => onSetPrimary(contact.name),
      })
    }
    return options
  }

  if (contacts.loading && list.length === 0) {
    return (
      <div className="flex min-h-20 flex-1 items-center justify-center gap-3 text-base text-ink-gray-4">
        <LoadingIndicator className="h-4 w-4" />
        <span>{__('Loading...')}</span>
      </div>
    )
  }

  if (!list.length) {
    return (
      <div className="flex h-20 items-center justify-center text-base text-ink-gray-5">{__('No Contacts Added')}</div>
    )
  }

  return (
    <div className="contacts-area">
      {list.map((contact, index) => (
        <div key={contact.name}>
          <div className={`px-2 pb-2.5 ${index === 0 ? 'pt-5' : 'pt-2.5'}`}>
            <CollapsibleSection
              opened={contact.opened}
              header={({ opened, toggle }) => (
                <div className="flex cursor-pointer items-center justify-between gap-2 pr-1 text-base leading-5 text-ink-gray-7">
                  <div className="flex h-7 items-center gap-2 truncate" onClick={toggle}>
                    <Avatar label={contact.full_name} image={contact.image} size="md" />
                    <div className="truncate">{contact.full_name}</div>
                    {contact.is_primary ? (
                      <Badge className="ml-2" variant="outline" label={__('Primary')} theme="green" />
                    ) : null}
                  </div>
                  <div className="flex items-center">
                    <Dropdown options={contactOptions(contact) as never}>
                      <Button icon="lucide-more-horizontal" className="text-ink-gray-5" variant="ghost" />
                    </Dropdown>
                    <Button
                      variant="ghost"
                      tooltip={__('View Contact')}
                      icon={ArrowUpRightIcon}
                      onClick={() => router.push({ name: 'Contact', params: { contactId: contact.name } })}
                    />
                    <Button
                      variant="ghost"
                      className={`transition-all duration-300 ease-in-out ${opened ? 'rotate-90' : ''}`}
                      icon="lucide-chevron-right"
                      onClick={toggle}
                    />
                  </div>
                </div>
              )}
            >
              <div className="flex flex-col gap-1.5 text-base">
                {contact.email && (
                  <div className="flex items-center gap-3 pb-1.5 pl-1 pt-4 text-ink-gray-8">
                    <Email2Icon className="h-4 w-4" />
                    {contact.email}
                  </div>
                )}
                {contact.mobile_no && (
                  <div className="flex items-center gap-3 p-1 py-1.5 text-ink-gray-8">
                    <PhoneIcon className="h-4 w-4" />
                    {contact.mobile_no}
                  </div>
                )}
                {!contact.email && !contact.mobile_no && (
                  <div className="flex items-center justify-center py-4 text-sm text-ink-gray-4">
                    {__('No Details Added')}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>
          {index !== list.length - 1 && <div className="mx-2 h-px border-t border-outline-elevation-2" />}
        </div>
      ))}
    </div>
  )
}

import { __ } from '@/core/i18n'
import { Button, Dropdown, type DropdownOption } from '@/design-system'
import { MultiActionButton } from '@/shared/components/MultiActionButton'
import { AttachmentIcon, CommentIcon, Email2Icon, PhoneIcon } from '@/shared/components/Icons'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { useEmailComposerStore } from '../../stores/emailComposerStore'
import { useIntegrationsStore } from '../../stores/integrationsStore'
import type { ActivityModals } from '../../types/activities'
import { NoteIcon, TaskIcon, WhatsAppIcon } from '../Icons'

export interface ActivityHeaderProps {
  tabs: Array<{ name: string }>
  title: string
  doc: Record<string, any>
  modalRef: ActivityModals
  onTabChange: (index: number) => void
  onShowWhatsappTemplates: () => void
  onShowFilesUploader: () => void
  onShowWhatsappBox?: () => void
}

export function ActivityHeader({
  tabs,
  title,
  doc,
  modalRef,
  onTabChange,
  onShowWhatsappTemplates,
  onShowFilesUploader,
  onShowWhatsappBox,
}: ActivityHeaderProps) {
  const makeCall = useGlobalStore((state) => state.makeCall)
  const set = useEmailComposerStore((state) => state.set)
  const callEnabled = useIntegrationsStore((state) => state.callEnabled)
  const whatsappEnabled = useIntegrationsStore((state) => state.whatsappEnabled)

  if (title === 'Data') return null

  const defaultActions: DropdownOption[] = [
    { icon: Email2Icon, label: __('Email'), onClick: () => set({ show: true }) },
    { icon: CommentIcon, label: __('Comment'), onClick: () => set({ showComment: true }) },
    { icon: PhoneIcon, label: __('Log a Call'), onClick: () => modalRef.createCallLog() },
    ...(callEnabled
      ? [{ icon: PhoneIcon, label: __('Make a Call'), onClick: () => makeCall(doc.mobile_no) } as DropdownOption]
      : []),
    { icon: NoteIcon, label: __('Note'), onClick: () => modalRef.showNote() },
    { icon: TaskIcon, label: __('Task'), onClick: () => modalRef.showTask() },
    { icon: AttachmentIcon, label: __('Upload Attachment'), onClick: onShowFilesUploader },
    ...(whatsappEnabled
      ? [
          {
            icon: WhatsAppIcon,
            label: __('WhatsApp Message'),
            onClick: () => onTabChange(tabs.findIndex((tab) => tab.name === 'WhatsApp')),
          } as DropdownOption,
        ]
      : []),
  ]

  const callActions = [
    { label: __('Log a Call'), icon: 'lucide-plus', onClick: () => modalRef.createCallLog() },
    ...(callEnabled ? [{ label: __('Make a Call'), icon: PhoneIcon, onClick: () => makeCall(doc.mobile_no) }] : []),
  ]

  let action
  switch (title) {
    case 'Emails':
      action = (
        <Button variant="solid" label={__('New Email')} iconLeft="lucide-plus" onClick={() => set({ show: true })} />
      )
      break
    case 'Comments':
      action = (
        <Button
          variant="solid"
          label={__('New Comment')}
          iconLeft="lucide-plus"
          onClick={() => set({ showComment: true })}
        />
      )
      break
    case 'Calls':
      action = <MultiActionButton variant="solid" options={callActions as never} />
      break
    case 'Notes':
      action = (
        <Button variant="solid" label={__('New Note')} iconLeft="lucide-plus" onClick={() => modalRef.showNote()} />
      )
      break
    case 'Tasks':
      action = (
        <Button variant="solid" label={__('New Task')} iconLeft="lucide-plus" onClick={() => modalRef.showTask()} />
      )
      break
    case 'Attachments':
      action = (
        <Button variant="solid" label={__('Upload Attachment')} iconLeft="lucide-plus" onClick={onShowFilesUploader} />
      )
      break
    case 'WhatsApp':
      action = (
        <div className="flex shrink-0 gap-2">
          <Button label={__('Send Template')} onClick={onShowWhatsappTemplates} />
          <Button
            variant="solid"
            label={__('New Message')}
            iconLeft="lucide-plus"
            onClick={() => onShowWhatsappBox?.()}
          />
        </div>
      )
      break
    default:
      action = (
        <span onClick={(event) => event.stopPropagation()}>
          <Dropdown options={defaultActions}>
            {({ open }) => (
              <Button
                variant="solid"
                className="flex items-center gap-1"
                label={__('New')}
                iconLeft="lucide-plus"
                iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}
              />
            )}
          </Dropdown>
        </span>
      )
  }

  return (
    <div className="flex items-center justify-between text-lg-medium sm:mx-10 sm:mb-4 sm:mt-8">
      <div className="flex h-8 items-center text-2xl-semibold text-ink-gray-8">{__(title)}</div>
      {action}
    </div>
  )
}

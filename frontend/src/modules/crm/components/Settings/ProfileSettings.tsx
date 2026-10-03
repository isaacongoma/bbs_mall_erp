import { useRef, useState } from 'react'
import { __ } from '@/core/i18n'
import { useDocumentResource } from '@/core/resources'
import { Avatar, Button, ErrorMessage, FileUploader, TextInput, Tooltip, toast } from '@/design-system'
import { ChangePasswordModal } from '@/shared/components/ChangePasswordModal'
import { EditIcon, LoadingIndicator } from '@/shared/components/Icons'
import { SettingsLayoutBase } from '@/shared/components/Settings/SettingsPanel'
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts'
import { useSession } from '@/shared/hooks/useSession'
import { validateIsImageFile } from '@/shared/utils/text'

type AnyRecord = Record<string, any>

export interface ProfileSettingsProps {
  onUpdateStep: (step: 'profile-settings' | 'user-email-settings') => void
}

export function ProfileSettings({ onUpdateStep }: ProfileSettingsProps) {
  const { user: sessionUser } = useSession()
  const resource = useDocumentResource({ doctype: 'User', name: sessionUser ?? '', auto: true })
  const user = resource as unknown as AnyRecord | null
  const doc: AnyRecord | null = user?.doc ?? null
  const isDirty = Boolean(user?.isDirty)

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [hoveringRemove, setHoveringRemove] = useState(false)
  const [editName, setEditName] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const nameInput = useRef<HTMLInputElement | null>(null)

  const fullName = doc ? [doc.first_name, doc.last_name].filter(Boolean).join(' ') : ''

  function setFullName(value: string) {
    const [firstName = '', ...lastName] = value.split(' ')
    user?.setField('first_name', firstName)
    user?.setField('last_name', lastName.join(' '))
  }

  function save() {
    if (!user) return
    if (!isDirty) {
      setEditName(false)
      return
    }
    user.save.submit(null, {
      onSuccess: () => {
        setEditName(false)
        toast.success(__('Profile updated successfully'))
      },
      onError: (error: AnyRecord) => toast.error(error.message + ': ' + error.messages?.[0]),
    })
  }

  function updateImage(fileUrl = '') {
    setHoveringRemove(false)
    user?.setField('user_image', fileUrl)
    save()
  }

  useKeyboardShortcuts({
    ignoreTyping: false,
    shortcuts: [
      {
        match: (event) => (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's',
        action: () => {
          if (isDirty) save()
        },
      },
    ],
  })

  if (!doc) return null

  const tooltipText = hoveringRemove ? __('Remove Photo') : doc.user_image ? __('Change Photo') : __('Upload Photo')

  return (
    <>
      <SettingsLayoutBase title={__('Profile')} description={__('Manage your profile & login information.')}>
        <div className="flex items-center justify-between gap-2 pb-8 pt-1.5">
          <FileUploader
            validateFile={validateIsImageFile}
            onSuccess={(file) => updateImage(file.file_url)}
            onFailure={(failure) => setUploadError(failure instanceof Error ? failure.message : String(failure))}
          >
            {({ openFileSelector, uploading }) => (
              <div className="flex items-center justify-center gap-2">
                <div className="group relative !size-14">
                  <Avatar className="!size-14" image={doc.user_image} label={fullName} />
                  <Tooltip text={tooltipText} placement="bottom" hoverDelay={0}>
                    <div
                      className="absolute left-0 top-0 z-[1] flex !size-14 h-9 cursor-pointer items-center justify-center rounded-full"
                      onClick={(event) => {
                        event.stopPropagation()
                        openFileSelector()
                      }}
                    />
                  </Tooltip>
                  {doc.user_image && (
                    <div
                      className="absolute -right-1 -top-1 z-[1] flex size-4 cursor-pointer items-center justify-center rounded-full bg-surface-base opacity-0 outline outline-black-overlay-50 duration-300 ease-in-out hover:bg-surface-gray-2 group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation()
                        updateImage()
                      }}
                      onMouseEnter={() => setHoveringRemove(true)}
                      onMouseLeave={() => setHoveringRemove(false)}
                    >
                      <span className="lucide-x size-3.5 cursor-pointer text-ink-gray-4" aria-hidden="true" />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-full bg-black/20">
                      <LoadingIndicator className="size-4" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-1">
                    {!editName ? (
                      <div className="flex items-center gap-1">
                        <span className="text-lg !font-semibold text-ink-gray-8 sm:text-2xl">{fullName}</span>
                        <Button
                          className="!h-5 !px-1"
                          variant="ghost"
                          onClick={() => {
                            setEditName(true)
                            requestAnimationFrame(() => nameInput.current?.focus())
                          }}
                        >
                          <EditIcon className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <TextInput
                          inputRef={nameInput}
                          value={fullName}
                          onChange={setFullName}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') save()
                            if (event.key === 'Escape') {
                              event.stopPropagation()
                              setEditName(false)
                            }
                          }}
                        />
                        <Button variant="outline" icon="lucide-check" onClick={save} />
                      </div>
                    )}
                    <span className="text-p-sm text-ink-gray-6">{doc.email}</span>
                  </div>
                  <ErrorMessage message={uploadError ? __(uploadError) : ''} />
                </div>
              </div>
            )}
          </FileUploader>
        </div>
        <div>
          <div className="text-base-semibold text-ink-gray-9">{__('Account Info & Security')}</div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-base-medium text-ink-gray-8">{__('Emails & Signature')}</span>
              <span className="text-p-sm text-ink-gray-6">
                {__('Manage your account emails and email signature for communication.')}
              </span>
            </div>
            <Button label={__('Configure')} onClick={() => onUpdateStep('user-email-settings')} />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-base-medium text-ink-gray-8">{__('Password')}</span>
              <span className="text-p-sm text-ink-gray-6">{__('Change your account password for security.')}</span>
            </div>
            <Button label={__('Change Password')} onClick={() => setShowChangePasswordModal(true)} />
          </div>
        </div>
      </SettingsLayoutBase>
      {showChangePasswordModal && (
        <ChangePasswordModal open={showChangePasswordModal} onOpenChange={setShowChangePasswordModal} />
      )}
    </>
  )
}

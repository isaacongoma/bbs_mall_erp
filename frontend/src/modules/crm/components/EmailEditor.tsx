import Paragraph from '@tiptap/extension-paragraph'
import { useEffect, useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { capture } from '@/core/telemetry'
import { Button, FileUploader, FormControl, type ButtonProps, type UploadedFile } from '@/design-system'
import { Editor, EditorContent, EditorFixedMenu, EditorTableMenu, type EditorHandle } from '@/design-system/editor'
import { AttachmentItem } from '@/shared/components/AttachmentItem'
import { EmailMultiSelect, type EmailMultiSelectHandle } from '@/shared/components/Controls'
import { EmojiPicker } from '@/shared/components/EmojiPicker'
import { AttachmentIcon, SmileIcon } from '@/shared/components/Icons'
import { useDocument } from '@/shared/hooks/useDocument'
import { useSession } from '@/shared/hooks/useSession'
import { buildEditorExtensions, fullToolbar, uploadFile } from '@/shared/utils/editorConfig'
import { submitShortcutLabel } from '@/shared/utils/platform'
import { validateEmail } from '@/shared/utils/validation'
import { useEmailComposerStore } from '../stores/emailComposerStore'
import { EmailTemplateIcon } from './Icons'
import { EmailTemplateSelectorModal } from './EmailTemplateSelectorModal'

const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        renderHTML: (attributes) => (attributes.class ? { class: `${attributes.class}` } : {}),
      },
    }
  },
})

export interface EmailEditorProps {
  doc: { name?: string; email?: string }
  content: string
  onContentChange: (content: string) => void
  attachments: UploadedFile[]
  onAttachmentsChange: (attachments: UploadedFile[]) => void
  placeholder?: string | null
  editable?: boolean
  doctype?: string
  submitButtonProps?: ButtonProps
  discardButtonProps?: ButtonProps
}

export function EmailEditor({
  doc,
  content,
  onContentChange,
  attachments,
  onAttachmentsChange,
  placeholder = null,
  editable = true,
  doctype = 'CRM Lead',
  submitButtonProps,
  discardButtonProps,
}: EmailEditorProps) {
  const { user: sessionUser } = useSession()
  const { document: userDocument } = useDocument('User', sessionUser)
  const composer = useEmailComposerStore()
  const { set } = composer
  const [handle, setHandle] = useState<EditorHandle | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const ccInput = useRef<EmailMultiSelectHandle>(null)
  const bccInput = useRef<EmailMultiSelectHandle>(null)
  const [extensions] = useState(() =>
    buildEditorExtensions({ starterKit: { paragraph: false }, extra: [CustomParagraph] }),
  )

  const userDoc = (
    userDocument as unknown as { doc?: { user_emails?: Array<{ email_account: string; email_id: string }> } }
  ).doc
  const fromOptions = (() => {
    if (!userDoc?.user_emails?.length) return []
    const emails = userDoc.user_emails.map((entry) => ({
      label: `${entry.email_account} <${entry.email_id}>`,
      value: entry.email_id,
    }))
    if (emails.length === 1 && emails[0]!.value === sessionUser) return []
    return emails
  })()

  const fromKey = fromOptions.map((option) => option.value).join('|')
  useEffect(() => {
    const options = fromKey ? fromKey.split('|') : []
    const state = useEmailComposerStore.getState()
    const match = state.replyAddresses.find((address) => options.includes(address))
    if (match) set({ fromEmail: match, replyAddresses: [] })
    else if (!options.includes(state.fromEmail)) set({ fromEmail: options[0] ?? '' })
  }, [fromKey, composer.replyAddresses, set])

  useEffect(() => {
    set({ editor: handle?.editor ?? null })
    return () => set({ editor: null })
  }, [handle?.editor, set])

  function appendEmoji(emoji: string) {
    const editor = handle?.editor
    if (!editor) return
    editor.commands.insertContent(emoji)
    editor.commands.focus()
    capture('emoji_inserted_in_email', { emoji })
  }

  async function applyEmailTemplate(template: Record<string, any>) {
    const data = await rpc<{ subject?: string; message?: string }>({
      url: 'frappe.email.doctype.email_template.email_template.get_email_template',
      params: { template_name: template.name, doc: { ...doc, doc } },
    })
    if (data.subject) set({ subject: data.subject })
    if (data.message) onContentChange(data.message)
    setShowTemplates(false)
    capture('email_template_applied', { doctype })
  }

  function toggle(kind: 'cc' | 'bcc') {
    const next = !composer[kind]
    set({ [kind]: next })
    if (next) requestAnimationFrame(() => (kind === 'cc' ? ccInput : bccInput).current?.setFocus())
  }

  const invalidMessage = (value: string) => __('{0} is an invalid email address', [value])

  return (
    <>
      <Editor
        ref={setHandle}
        extensions={extensions}
        value={content}
        onChange={(next) => onContentChange(typeof next === 'string' ? next : '')}
        placeholder={placeholder ?? undefined}
        editable={editable}
        uploadFunction={(file) => uploadFile(file, doctype, doc.name)}
      >
        <div className="relative w-full">
          <div className="flex flex-col gap-3">
            {fromOptions.length > 0 && (
              <div className="mx-4 flex h-10 items-center gap-2 border-t pt-2.5">
                <span className="text-xs text-ink-gray-4">{__('FROM')}:</span>
                <FormControl
                  type="select"
                  variant="ghost"
                  className="w-full"
                  value={composer.fromEmail}
                  options={fromOptions}
                  onChange={(next: unknown) => set({ fromEmail: String(next) })}
                />
              </div>
            )}
            <div className={`mx-4 flex items-center gap-2 ${fromOptions.length ? '' : 'border-t pt-2.5'}`}>
              <span className="mr-2 text-xs text-ink-gray-4">{__('TO')}:</span>
              <div className="flex-1">
                <EmailMultiSelect
                  variant="ghost"
                  validate={validateEmail}
                  fetchContacts
                  errorMessage={invalidMessage}
                  values={composer.toEmails}
                  onChange={(next) => set({ toEmails: next })}
                />
              </div>
              <div className="flex gap-1.5">
                <Button
                  label={__('CC')}
                  variant="ghost"
                  className={composer.cc ? '!bg-surface-gray-4 hover:bg-surface-gray-3' : '!text-ink-gray-4'}
                  onClick={() => toggle('cc')}
                />
                <Button
                  label={__('BCC')}
                  variant="ghost"
                  className={composer.bcc ? '!bg-surface-gray-4 hover:bg-surface-gray-3' : '!text-ink-gray-4'}
                  onClick={() => toggle('bcc')}
                />
              </div>
            </div>
            {composer.cc && (
              <div className="mx-4 flex items-center gap-2">
                <span className="text-xs text-ink-gray-4">{__('CC')}:</span>
                <div className="flex-1">
                  <EmailMultiSelect
                    handleRef={ccInput}
                    variant="ghost"
                    fetchContacts
                    validate={validateEmail}
                    errorMessage={invalidMessage}
                    values={composer.ccEmails}
                    onChange={(next) => set({ ccEmails: next })}
                  />
                </div>
              </div>
            )}
            {composer.bcc && (
              <div className="mx-4 flex items-center gap-2">
                <span className="text-xs text-ink-gray-4">{__('BCC')}:</span>
                <div className="flex-1">
                  <EmailMultiSelect
                    handleRef={bccInput}
                    variant="ghost"
                    fetchContacts
                    validate={validateEmail}
                    errorMessage={invalidMessage}
                    values={composer.bccEmails}
                    onChange={(next) => set({ bccEmails: next })}
                  />
                </div>
              </div>
            )}
            <div className="mx-4 flex items-center gap-2 pb-2.5">
              <span className="text-xs text-ink-gray-4">{__('SUBJECT')}:</span>
              <input
                value={composer.subject}
                onChange={(event) => set({ subject: event.target.value })}
                className="flex-1 border-none bg-surface-base text-base text-ink-gray-9 hover:bg-surface-base focus:border-none focus:!shadow-none focus-visible:!ring-0"
              />
            </div>
          </div>
          <EditorContent
            className={`prose-sm max-w-none [&_p.reply-to-content]:hidden ${editable ? 'mx-4 max-h-[35vh] overflow-y-auto border-t py-3' : ''}`}
          />
          <EditorTableMenu />
          {editable && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 px-4">
                {attachments.map((attachment) => (
                  <AttachmentItem
                    key={attachment.file_url}
                    label={attachment.file_name}
                    suffix={
                      <span
                        className="lucide-x h-3.5"
                        aria-hidden="true"
                        onClick={(event) => {
                          event.stopPropagation()
                          onAttachmentsChange(attachments.filter((entry) => entry !== attachment))
                        }}
                      />
                    }
                  />
                ))}
              </div>
              <div className="flex justify-between gap-2 overflow-hidden border-t px-4 py-2.5">
                <div className="flex items-center gap-1 overflow-x-auto">
                  <Button
                    tooltip={__('Insert Email Template')}
                    variant="ghost"
                    icon={EmailTemplateIcon}
                    onClick={() => setShowTemplates(true)}
                  />
                  <FileUploader
                    uploadArgs={{ doctype, docname: doc.name, private: true }}
                    onSuccess={(file) => onAttachmentsChange([...attachments, file])}
                  >
                    {({ openFileSelector }) => (
                      <Button
                        tooltip={__('Attach a File')}
                        icon={AttachmentIcon}
                        variant="ghost"
                        onClick={openFileSelector}
                      />
                    )}
                  </FileUploader>
                  <EditorFixedMenu items={fullToolbar} />
                  <EmojiPicker onChange={appendEmoji}>
                    {({ togglePopover }) => (
                      <Button
                        tooltip={__('Insert Emoji')}
                        icon={SmileIcon}
                        variant="ghost"
                        onClick={() => togglePopover()}
                      />
                    )}
                  </EmojiPicker>
                </div>
                <div className="mt-2 flex items-center justify-end space-x-2 sm:mt-0">
                  <Button {...discardButtonProps} label={__('Discard')} />
                  <Button variant="solid" {...submitButtonProps} label={`${__('Send')} (${submitShortcutLabel})`} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Editor>
      <EmailTemplateSelectorModal
        open={showTemplates}
        onOpenChange={setShowTemplates}
        doctype={doctype}
        onApply={(template) => void applyEmailTemplate(template)}
      />
    </>
  )
}

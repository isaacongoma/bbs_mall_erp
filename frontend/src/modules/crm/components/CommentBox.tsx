import { useEffect, useState } from 'react'
import { __ } from '@/core/i18n'
import { capture } from '@/core/telemetry'
import { Button, FileUploader, useLatest, type ButtonProps, type UploadedFile } from '@/design-system'
import {
  Editor,
  EditorContent,
  EditorFixedMenu,
  EditorTableMenu,
  type EditorHandle,
  type TiptapEditor,
} from '@/design-system/editor'
import { AttachmentItem } from '@/shared/components/AttachmentItem'
import { EmojiPicker } from '@/shared/components/EmojiPicker'
import { AttachmentIcon, SmileIcon } from '@/shared/components/Icons'
import { useUsers } from '@/shared/hooks/useUsers'
import { submitShortcutLabel } from '@/shared/utils/platform'
import { buildEditorExtensions, fullToolbar, uploadFile } from '@/shared/utils/editorConfig'

export interface CommentBoxProps {
  doc: { name?: string }
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

export function CommentBox({
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
}: CommentBoxProps) {
  const { crmUsers } = useUsers()
  const mentions = crmUsers
    .filter((user) => user.enabled)
    .map((user) => ({ id: user.name, label: user.full_name?.trim() || user.name }))
  const getMentions = useLatest(mentions)
  const [extensions] = useState(() => buildEditorExtensions({ mentions: getMentions }))
  const [handle, setHandle] = useState<EditorHandle | null>(null)

  useEffect(() => {
    if (editable) handle?.editor?.commands.focus()
  }, [editable, handle])

  function appendEmoji(emoji: string) {
    const editor: TiptapEditor | null | undefined = handle?.editor
    if (!editor) return
    editor.commands.insertContent(emoji)
    editor.commands.focus()
    capture('emoji_inserted_in_comment', { emoji })
  }

  return (
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
        <EditorContent
          className={`prose-sm max-w-none ${editable ? 'mx-4 max-h-[50vh] min-h-[7rem] overflow-y-auto border-t py-3' : ''}`}
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
                <FileUploader
                  uploadArgs={{ doctype, docname: doc.name, private: true }}
                  onSuccess={(file) => onAttachmentsChange([...attachments, file])}
                >
                  {({ openFileSelector }) => (
                    <Button
                      tooltip={__('Attach a File')}
                      variant="ghost"
                      icon={AttachmentIcon}
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
                <Button variant="solid" {...submitButtonProps} label={`${__('Comment')} (${submitShortcutLabel})`} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Editor>
  )
}

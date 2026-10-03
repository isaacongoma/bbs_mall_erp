import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { call } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { capture } from '@/core/telemetry'
import { Button, Dropdown, FileUploader, Textarea, toast } from '@/design-system'
import { EmojiPicker } from '@/shared/components/EmojiPicker'
import { SmileIcon } from '@/shared/components/Icons'
import { sanitizeHTML } from '@/shared/utils/text'
import type { WhatsAppReply } from '../../types/whatsapp'

export interface WhatsAppBoxHandle {
  show: () => void
}

export interface WhatsAppBoxProps {
  doctype: string
  doc: Record<string, any>
  reply: WhatsAppReply
  onReplyChange: (reply: WhatsAppReply) => void
  onSent: () => void
  className?: string
  ref?: Ref<WhatsAppBoxHandle>
}

export function WhatsAppBox({ doctype, doc, reply, onReplyChange, onSent, className, ref }: WhatsAppBoxProps) {
  const [content, setContent] = useState('')
  const [rows, setRows] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileTypeRef = useRef('')

  function focus() {
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  useImperativeHandle(ref, () => ({ show: focus }), [])

  const replyMessage = reply.message

  useEffect(() => {
    if (replyMessage) requestAnimationFrame(() => textareaRef.current?.focus())
  }, [replyMessage])

  async function send(attach: string, contentType: string, message: string) {
    const args = {
      reference_doctype: doctype,
      reference_name: doc.name,
      message,
      to: doc.mobile_no,
      attach,
      reply_to: reply.name || '',
      content_type: contentType,
    }
    setContent('')
    fileTypeRef.current = ''
    onReplyChange({})
    try {
      await call('crm.api.whatsapp.create_whatsapp_message', args)
      onSent()
    } catch (error) {
      toast.error(toErrorMessage(error) || __('Failed to send WhatsApp message'))
    }
  }

  function uploadFile(file: { file_url: string }) {
    void send(file.file_url, fileTypeRef.current, content)
    capture('whatsapp_upload_file')
  }

  function sendTextMessage(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return
    event.stopPropagation()
    if (event.shiftKey) return
    event.preventDefault()
    void send('', 'text', content)
    textareaRef.current?.blur()
    capture('whatsapp_send_message')
  }

  return (
    <>
      {reply.message && (
        <div className="flex items-center justify-around gap-2 px-3 pt-2 sm:px-10">
          <div
            className={`mb-1 ml-13 flex-1 cursor-pointer rounded border-0 border-l-4 bg-surface-gray-2 p-2 text-base text-ink-gray-5 ${
              reply.type === 'Incoming' ? 'border-green-500' : 'border-blue-400'
            }`}
          >
            <div
              className={`mb-1 text-sm-bold ${reply.type === 'Incoming' ? 'text-ink-green-5' : 'text-ink-blue-link'}`}
            >
              {reply.from_name || __('You')}
            </div>
            <div
              className="max-h-12 overflow-hidden"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(reply.message) }}
            />
          </div>
          <Button variant="ghost" icon="lucide-x" onClick={() => onReplyChange({})} />
        </div>
      )}
      <div className={`flex items-end gap-2 px-3 py-2.5 sm:px-10 ${className ?? ''}`}>
        <div className="flex h-8 items-center gap-2">
          <FileUploader onSuccess={(file) => uploadFile(file as { file_url: string })}>
            {({ openFileSelector }) => (
              <div className="flex items-center space-x-2">
                <Dropdown
                  options={[
                    {
                      label: __('Upload Document'),
                      icon: 'file',
                      onClick: () => {
                        fileTypeRef.current = 'document'
                        openFileSelector()
                      },
                    },
                    {
                      label: __('Upload Image'),
                      icon: 'image',
                      onClick: () => {
                        fileTypeRef.current = 'image'
                        openFileSelector()
                      },
                    },
                    {
                      label: __('Upload Video'),
                      icon: 'video',
                      onClick: () => {
                        fileTypeRef.current = 'video'
                        openFileSelector()
                      },
                    },
                  ]}
                >
                  <span className="lucide-plus size-4.5 cursor-pointer text-ink-gray-5" aria-hidden="true" />
                </Dropdown>
              </div>
            )}
          </FileUploader>
          <EmojiPicker
            onChange={(emoji) => {
              setContent((current) => current + emoji)
              textareaRef.current?.focus()
              capture('whatsapp_emoji_added')
            }}
          >
            {({ togglePopover }) => (
              <SmileIcon
                className="flex size-4.5 cursor-pointer rounded-sm text-2xl leading-none text-ink-gray-4"
                onClick={() => togglePopover()}
              />
            )}
          </EmojiPicker>
        </div>
        <Textarea
          textareaRef={textareaRef}
          value={content}
          onChange={setContent}
          className="min-h-8 w-full"
          wrapperClassName="w-full"
          rows={rows}
          placeholder={__('Type your message here...')}
          onFocus={() => setRows(6)}
          onBlur={() => setRows(1)}
          onKeyDown={sendTextMessage}
        />
      </div>
    </>
  )
}

import { __ } from '@/core/i18n'
import { call } from '@/core/api/rpc'
import { capture } from '@/core/telemetry'
import { Badge, Button, Dropdown, Tooltip, toast } from '@/design-system'
import { EmojiPicker } from '@/shared/components/EmojiPicker'
import { CheckIcon, DocumentIcon, DoubleCheckIcon, ReactIcon } from '@/shared/components/Icons'
import { formatDate } from '@/shared/utils/date'
import { toErrorMessage } from '@/core/api/errors'
import type { WhatsAppMessage, WhatsAppReply } from '../../types/whatsapp'
import { formatWhatsAppMessage, scrollToMessage } from '../../utils/whatsapp'

export interface WhatsAppAreaProps {
  messages: WhatsAppMessage[]
  onReload: () => void
  onReply: (reply: WhatsAppReply) => void
}

function openFileInAnotherTab(url?: string): void {
  if (url) window.open(url, '_blank')
}

function Html({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: formatWhatsAppMessage(html) }} />
}

export function WhatsAppArea({ messages, onReload, onReply }: WhatsAppAreaProps) {
  async function reactOnMessage(name: string, emoji: string) {
    try {
      await call('crm.api.whatsapp.react_on_whatsapp_message', { emoji, reply_to_name: name })
      capture('whatsapp_react_on_message')
      onReload()
    } catch (error) {
      toast.error(toErrorMessage(error) || __('Failed to add reaction to the message'))
    }
  }

  function messageOptions(message: WhatsAppMessage) {
    return [
      {
        label: 'Reply',
        onClick: () => onReply({ ...message, message: formatWhatsAppMessage(message.message) }),
      },
    ]
  }

  return (
    <div>
      {messages.map((whatsapp) => {
        const failed = whatsapp.status === 'failed'
        const hasFileMessage = !whatsapp.message.startsWith('/files/')
        return (
          <div
            key={whatsapp.name}
            className={`activity group flex gap-2 ${whatsapp.type === 'Outgoing' ? 'flex-row-reverse' : ''} ${
              whatsapp.reaction ? 'mb-7' : 'mb-3'
            }`}
          >
            <div
              id={whatsapp.name}
              className="group/message relative max-w-[90%] rounded-md bg-surface-gray-1 p-1.5 pl-2 text-base text-ink-gray-9 shadow-sm"
            >
              {failed && <Badge theme="red" label={whatsapp.status} className="absolute -top-2 right-0" />}
              {whatsapp.is_reply && (
                <div
                  className={`mb-1 cursor-pointer rounded border-0 border-l-4 bg-surface-gray-3 p-2 text-ink-gray-5 ${
                    whatsapp.reply_to_type === 'Incoming' ? 'border-green-500' : 'border-blue-400'
                  }`}
                  onClick={() => whatsapp.reply_to && scrollToMessage(whatsapp.reply_to)}
                >
                  <div
                    className={`mb-1 text-sm-bold ${
                      whatsapp.reply_to_type === 'Incoming' ? 'text-ink-green-5' : 'text-ink-blue-link'
                    }`}
                  >
                    {whatsapp.reply_to_from || __('You')}
                  </div>
                  <div className="flex max-h-12 flex-col gap-2 overflow-hidden">
                    {whatsapp.header && <div className="text-base-semibold">{whatsapp.header}</div>}
                    <Html html={whatsapp.reply_message ?? ''} />
                    {whatsapp.footer && <div className="text-xs text-ink-gray-5">{whatsapp.footer}</div>}
                  </div>
                </div>
              )}
              <div className="flex justify-between gap-2">
                {!failed && (
                  <div
                    className="absolute -right-0.5 -top-0.5 flex cursor-pointer gap-1 rounded-full bg-surface-base pb-2 pl-2 pr-1.5 pt-1.5 opacity-0 group-hover/message:opacity-100"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 1) 35%, rgba(238, 130, 238, 0) 100%)',
                    }}
                  >
                    <Dropdown options={messageOptions(whatsapp)}>
                      <span className="lucide-chevron-down size-4 text-ink-gray-5" aria-hidden="true" />
                    </Dropdown>
                  </div>
                )}
                {whatsapp.reaction && (
                  <div className="absolute -bottom-5 flex gap-1 rounded-full border bg-surface-base p-1 pb-[3px] shadow-sm">
                    <div className="flex size-4 items-center justify-center">{whatsapp.reaction}</div>
                  </div>
                )}
                {whatsapp.message_type === 'Template' ? (
                  <div className="flex flex-col gap-2">
                    {whatsapp.header && <div className="text-base-semibold">{whatsapp.header}</div>}
                    <Html html={whatsapp.template ?? ''} />
                    {whatsapp.footer && <div className="text-xs text-ink-gray-5">{whatsapp.footer}</div>}
                  </div>
                ) : whatsapp.content_type === 'text' || whatsapp.content_type === 'button' ? (
                  <Html html={whatsapp.message} />
                ) : whatsapp.content_type === 'image' ? (
                  <div>
                    <img
                      src={whatsapp.attach}
                      className="h-40 cursor-pointer rounded-md"
                      onClick={() => openFileInAnotherTab(whatsapp.attach)}
                    />
                    {hasFileMessage && <Html className="mt-1.5" html={whatsapp.message} />}
                  </div>
                ) : whatsapp.content_type === 'document' ? (
                  <div className="flex items-center gap-2">
                    <DocumentIcon
                      className="size-10 cursor-pointer rounded-md text-ink-gray-4"
                      onClick={() => openFileInAnotherTab(whatsapp.attach)}
                    />
                    <div className="text-ink-gray-5">Document</div>
                  </div>
                ) : whatsapp.content_type === 'audio' ? (
                  <div className="flex items-center gap-2">
                    <audio src={whatsapp.attach} controls className="cursor-pointer" />
                  </div>
                ) : whatsapp.content_type === 'video' ? (
                  <div className="flex-col items-center gap-2">
                    <video src={whatsapp.attach} controls className="h-40 cursor-pointer rounded-md" />
                    {hasFileMessage && <Html className="mt-1.5" html={whatsapp.message} />}
                  </div>
                ) : null}
                <div className="-mb-1 flex shrink-0 items-end gap-1 text-ink-gray-5">
                  <Tooltip text={formatDate(whatsapp.creation, 'ddd, MMM D, YYYY')}>
                    <div className="text-2xs">{formatDate(whatsapp.creation, 'hh:mm a')}</div>
                  </Tooltip>
                  {whatsapp.type === 'Outgoing' && (
                    <div>
                      {['sent', 'Success'].includes(whatsapp.status ?? '') ? (
                        <CheckIcon className="size-4" />
                      ) : ['read', 'delivered'].includes(whatsapp.status ?? '') ? (
                        <DoubleCheckIcon className={`size-4 ${whatsapp.status === 'read' ? 'text-ink-blue-5' : ''}`} />
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!failed && (
              <div className="flex items-center justify-center opacity-0 transition-all ease-in group-hover:opacity-100">
                <EmojiPicker reaction onChange={(emoji) => void reactOnMessage(whatsapp.name, emoji)}>
                  {({ togglePopover }) => (
                    <Button className="mt-0.5 !size-6 rounded-full" onClick={() => togglePopover()}>
                      <ReactIcon className="text-ink-gray-3" />
                    </Button>
                  )}
                </EmojiPicker>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

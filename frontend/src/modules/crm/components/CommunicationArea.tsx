import { useEffect, useEffectEvent, type KeyboardEvent } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import { Button, toast, useLocalStorage, type UploadedFile } from '@/design-system'
import { CommentIcon, Email2Icon } from '@/shared/components/Icons'
import { useUsers } from '@/shared/hooks/useUsers'
import { isContentEmpty } from '@/shared/utils/text'
import { useEmailComposerStore } from '../stores/emailComposerStore'
import { CommentBox } from './CommentBox'
import { EmailEditor } from './EmailEditor'

type AnyRecord = Record<string, any>

export interface CommunicationAreaProps {
  doctype?: string
  doc: AnyRecord
  onReload: () => void
  onScroll?: () => void
}

function buildSubject(doc: AnyRecord): string {
  let prefix = ''
  if (doc?.lead_name) prefix = doc.lead_name
  else if (doc?.organization) prefix = doc.organization
  return `${prefix} (#${doc.name})`
}

export function CommunicationArea({ doctype = 'CRM Lead', doc, onReload, onScroll }: CommunicationAreaProps) {
  const { getUser } = useUsers()
  const userEmail = getUser().email
  const draftKey = `${userEmail}-${doctype}-${doc.name}`
  const composer = useEmailComposerStore()
  const { set } = composer

  const [newEmail, setNewEmail] = useLocalStorage<string>(`emailBoxContent-${draftKey}`, '')
  const [signatureAdded, setSignatureAdded] = useLocalStorage<boolean>(`emailSignatureAdded-${draftKey}`, false)
  const [newComment, setNewComment] = useLocalStorage<string>(`commentBoxContent-${draftKey}`, '')
  const [attachments, setAttachments] = useLocalStorage<UploadedFile[]>(`attachments-${draftKey}`, [])

  const subject = buildSubject(doc)
  const signature = useResource<string>({
    url: 'crm.api.get_user_signature',
    cache: 'user-email-signature',
    auto: true,
  })

  const initialiseComposer = useEffectEvent(() => {
    set({ subject, toEmails: doc.email ? [doc.email] : [] })
  })

  useEffect(() => {
    initialiseComposer()
  }, [])

  useEffect(() => {
    if (!newEmail) setSignatureAdded(false)
  }, [newEmail, setSignatureAdded])

  const showEmailBox = composer.show
  const showCommentBox = composer.showComment

  const prepareEditor = useEffectEvent(() => {
    const editor = useEmailComposerStore.getState().editor
    if (!editor) return
    editor.commands.focus()
    if (!signature.data || signatureAdded) return
    const rendered = signature.data.replaceAll('\n', '<br>')
    let html = editor.getHTML()
    html = html.startsWith('<p></p>') ? html.slice(7) : html
    editor.commands.setContent(rendered + html)
    editor.commands.focus('start')
    setSignatureAdded(true)
  })

  useEffect(() => {
    if (showEmailBox) prepareEditor()
  }, [showEmailBox, signature.data])

  const commentEmpty = isContentEmpty(newComment)
  const emailEmpty = isContentEmpty(newEmail) || !composer.toEmails.length

  async function sendMail() {
    const state = useEmailComposerStore.getState()
    if (attachments.length) capture('email_attachments_added')
    await rpc({
      url: 'frappe.core.doctype.communication.email.make',
      params: {
        recipients: state.toEmails.join(', '),
        attachments: attachments.map((file) => file.name),
        cc: state.ccEmails.join(', '),
        bcc: state.bccEmails.join(', '),
        subject: state.subject,
        content: newEmail,
        doctype,
        name: doc.name,
        send_email: 1,
        sender: state.fromEmail || userEmail,
        sender_full_name: getUser()?.full_name || undefined,
      },
    })
  }

  async function sendComment() {
    const comment = await rpc({
      url: 'crm.api.comment.add_comment',
      params: {
        reference_doctype: doctype,
        reference_name: doc.name,
        content: newComment,
        attachments: attachments.map((file) => file.name),
      },
    })
    if (comment && attachments.length) capture('comment_attachments_added')
  }

  async function deleteAttachedFiles() {
    if (!attachments.length) return
    await Promise.all(
      attachments.map(async (file) => {
        try {
          await rpc({ url: 'frappe.client.delete', params: { doctype: 'File', name: file.name } })
        } catch (error) {
          console.warn(`Failed to delete file ${file.name}:`, error)
        }
      }),
    )
    setAttachments([])
  }

  async function submitEmail() {
    if (emailEmpty) return
    set({ show: false })
    const sending = sendMail()
    toast.promise(sending, {
      loading: __('Sending email...'),
      success: __('Email sent'),
      error: (error: any) => error?.messages?.[0] || __('Failed to send email!'),
    })
    try {
      await sending
    } catch {
      return
    }
    setNewEmail('')
    setAttachments([])
    onReload()
    onScroll?.()
    capture('email_sent', { doctype })
  }

  async function submitComment() {
    if (commentEmpty) return
    set({ showComment: false })
    const sending = sendComment()
    toast.promise(sending, {
      loading: __('Sending comment...'),
      success: __('Comment sent'),
      error: (error: any) => error?.messages?.[0] || __('Failed to send comment!'),
    })
    try {
      await sending
    } catch {
      return
    }
    setNewComment('')
    setAttachments([])
    onReload()
    onScroll?.()
    capture('comment_sent', { doctype })
  }

  function submitOnShortcut(handler: () => void) {
    return (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.stopPropagation()
        handler()
      }
    }
  }

  return (
    <>
      <div className="flex justify-between gap-3 border-t px-4 py-2.5">
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            className={showEmailBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : ''}
            label={__('Reply')}
            iconLeft={Email2Icon}
            onClick={() => set({ showComment: false, show: !showEmailBox })}
          />
          <Button
            variant="ghost"
            label={__('Comment')}
            className={showCommentBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : ''}
            iconLeft={CommentIcon}
            onClick={() => set({ show: false, showComment: !showCommentBox })}
          />
        </div>
      </div>
      <div
        style={{ display: showEmailBox ? undefined : 'none' }}
        onKeyDownCapture={submitOnShortcut(() => void submitEmail())}
      >
        <EmailEditor
          doc={doc}
          content={newEmail}
          onContentChange={setNewEmail}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          submitButtonProps={{ variant: 'solid', onClick: () => void submitEmail(), disabled: emailEmpty }}
          discardButtonProps={{
            onClick: async () => {
              await deleteAttachedFiles()
              set({
                show: false,
                subject,
                toEmails: doc.email ? [doc.email] : [],
                ccEmails: [],
                bccEmails: [],
                cc: false,
                bcc: false,
              })
              setNewEmail('')
            },
          }}
          editable={showEmailBox}
          doctype={doctype}
          placeholder={__('Hi John, \n\nCan you please provide more details on this...')}
        />
      </div>
      <div
        style={{ display: showCommentBox ? undefined : 'none' }}
        onKeyDownCapture={submitOnShortcut(() => void submitComment())}
      >
        <CommentBox
          doc={doc}
          content={newComment}
          onContentChange={setNewComment}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          submitButtonProps={{ variant: 'solid', onClick: () => void submitComment(), disabled: commentEmpty }}
          discardButtonProps={{
            onClick: async () => {
              await deleteAttachedFiles()
              set({ showComment: false })
              setNewComment('')
            },
          }}
          editable={showCommentBox}
          doctype={doctype}
          placeholder={__('@John, can you please check this?')}
        />
      </div>
    </>
  )
}

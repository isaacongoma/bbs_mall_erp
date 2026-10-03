import { create } from 'zustand'
import type { Editor } from '@tiptap/core'

interface EmailComposerState {
  show: boolean
  showComment: boolean
  subject: string
  fromEmail: string
  toEmails: string[]
  ccEmails: string[]
  bccEmails: string[]
  cc: boolean
  bcc: boolean
  replyAddresses: string[]
  editor: Editor | null
  set: (patch: Partial<Omit<EmailComposerState, 'set' | 'reset' | 'startReply'>>) => void
  reset: (subject: string, toEmail?: string | null) => void
  startReply: (email: Record<string, any>, replyAll?: boolean) => void
}

function splitAddresses(value?: string | null): string[] {
  return value ? value.split(',').map((entry) => entry.trim()) : []
}

export const useEmailComposerStore = create<EmailComposerState>((set, get) => ({
  show: false,
  showComment: false,
  subject: '',
  fromEmail: '',
  toEmails: [],
  ccEmails: [],
  bccEmails: [],
  cc: false,
  bcc: false,
  replyAddresses: [],
  editor: null,
  set: (patch) => set(patch),
  reset(subject, toEmail) {
    set({
      show: false,
      showComment: false,
      subject,
      toEmails: toEmail ? [toEmail] : [],
      ccEmails: [],
      bccEmails: [],
      cc: false,
      bcc: false,
      replyAddresses: [],
    })
  },
  startReply(email, replyAll = false) {
    const recipients = splitAddresses(email.recipients)
    const replyAddresses: string[] = []
    for (const addresses of [email.sender, email.recipients, email.cc, email.bcc]) {
      for (const address of splitAddresses(addresses)) replyAddresses.push(address)
    }

    const subject = String(email.subject ?? '').startsWith('Re:') ? email.subject : `Re: ${email.subject}`
    let ccEmails: string[] = []
    let bccEmails: string[] = []
    let cc = false
    let bcc = false

    if (replyAll) {
      let ccList: string[] | undefined = email.cc ? splitAddresses(email.cc) : undefined
      const bccList: string[] | undefined = email.bcc ? splitAddresses(email.bcc) : undefined
      if (ccList?.length) {
        const rest = recipients.filter((recipient) => !ccList!.includes(recipient))
        ccList = [...ccList, ...rest]
      } else {
        ccList = recipients
      }
      cc = Boolean(ccList)
      bcc = Boolean(bccList)
      ccEmails = ccList ?? []
      bccEmails = bccList ?? []
    }

    set({
      show: true,
      showComment: false,
      replyAddresses,
      toEmails: [email.sender],
      cc,
      bcc,
      ccEmails,
      bccEmails,
      subject,
    })

    const editor = get().editor
    editor
      ?.chain()
      .clearContent()
      .updateAttributes('paragraph', { class: 'reply-to-content' })
      .insertContent(`<blockquote>${email.content}</blockquote>`)
      .focus('all')
      .insertContentAt(0, { type: 'paragraph' })
      .focus('start')
      .run()
  },
}))

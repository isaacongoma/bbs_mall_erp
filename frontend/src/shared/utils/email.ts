import { rpc } from '@/core/api/rpc'

export interface DocumentEmailRequest {
  doctype: string
  name: string
  recipients: string
  subject: string
  content: string
  cc?: string
  bcc?: string
  sendMeACopy?: boolean
  printFormat?: string
}

export function sendDocumentEmail(request: DocumentEmailRequest): Promise<unknown> {
  return rpc({
    url: 'frappe.core.doctype.communication.email.make',
    method: 'POST',
    params: {
      doctype: request.doctype,
      name: request.name,
      recipients: request.recipients,
      subject: request.subject,
      content: request.content,
      cc: request.cc ?? '',
      bcc: request.bcc ?? '',
      send_me_a_copy: request.sendMeACopy ? 1 : 0,
      send_email: 1,
      print_format: request.printFormat ?? '',
    },
  })
}

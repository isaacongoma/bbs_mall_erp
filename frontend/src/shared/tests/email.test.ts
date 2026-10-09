import { describe, expect, it, vi } from 'vitest'
import { sendDocumentEmail } from '../utils/email'

vi.mock('@/core/api/rpc', () => ({
  rpc: vi.fn(async (request) => request),
}))

describe('document email transport', () => {
  it('sends a communication linked to the current document', async () => {
    const result = await sendDocumentEmail({
      doctype: 'Employee',
      name: 'EMP-0001',
      recipients: 'employee@example.com',
      subject: 'Employee',
      content: '<p>Hello</p>',
      sendMeACopy: true,
    })
    expect(result).toMatchObject({
      url: 'frappe.core.doctype.communication.email.make',
      method: 'POST',
      params: {
        doctype: 'Employee',
        name: 'EMP-0001',
        recipients: 'employee@example.com',
        send_email: 1,
        send_me_a_copy: 1,
      },
    })
  })
})

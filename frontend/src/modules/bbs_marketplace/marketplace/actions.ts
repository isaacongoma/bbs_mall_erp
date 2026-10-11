import { __, frappe } from '@/shared/frappe'

export const STATUS_COLORS: Record<string, string> = {
  Draft: 'gray',
  'Pending Approval': 'orange',
  Approved: 'blue',
  Published: 'green',
  Active: 'green',
  Paused: 'yellow',
  Rejected: 'red',
  Suspended: 'red',
  Closed: 'gray',
  Archived: 'gray',
  'Pending Payment': 'orange',
  Requested: 'orange',
  New: 'orange',
  Processing: 'blue',
  Accepted: 'blue',
  Packed: 'blue',
  'Pickup Scheduled': 'blue',
  'Partially Shipped': 'purple',
  Shipped: 'purple',
  'In Transit': 'purple',
  'Picked Up': 'purple',
  'Out for Delivery': 'purple',
  Delivered: 'green',
  Completed: 'green',
  Paid: 'green',
  Pending: 'orange',
  Initiated: 'orange',
  Failed: 'red',
  'Failed Delivery': 'red',
  Returning: 'orange',
  'Returned to Seller': 'gray',
  Returned: 'gray',
  Cancelled: 'red',
  Expired: 'gray',
  Refunded: 'gray',
  Received: 'blue',
}

export function indicate(frm: any, field = 'status') {
  const value = frm.doc[field]
  if (value) frm.page.set_indicator(__(value), STATUS_COLORS[value] ?? 'gray')
}

interface PromptField {
  label: string
  fieldname: string
  fieldtype?: string
  reqd?: number
  options?: string
}

interface ActionOptions {
  group?: string
  confirm?: string
  args?: Record<string, unknown>
  prompt?: PromptField[]
}

export function docAction(frm: any, label: string, method: string, options: ActionOptions = {}) {
  const run = (extra: Record<string, unknown> = {}) =>
    frm.call({
      doc: frm.doc,
      method,
      args: { ...(options.args ?? {}), ...extra },
      freeze: true,
      callback: () => frm.reload_doc(),
    })
  const handler = () => {
    if (options.prompt) {
      frappe.prompt(options.prompt, (values: Record<string, unknown>) => run(values), __(label), __('Continue'))
    } else if (options.confirm) {
      frappe.confirm(options.confirm, () => run())
    } else {
      run()
    }
  }
  frm.add_custom_button(__(label), handler, options.group ? __(options.group) : undefined)
}

export function listingStatusAction(frm: any, label: string, status: string, group = 'Moderation', needNotes = false) {
  docAction(frm, label, 'set_status', {
    group,
    args: { status },
    prompt: needNotes ? [{ label: __('Reason'), fieldname: 'notes', fieldtype: 'Small Text', reqd: 1 }] : undefined,
  })
}

export function viewButton(frm: any, label: string, doctype: string, name?: string | null) {
  if (name) frm.add_custom_button(__(label), () => frappe.set_route('Form', doctype, name), __('View'))
}

export function listButton(frm: any, label: string, doctype: string, filters: Record<string, unknown>) {
  frm.add_custom_button(__(label), () => frappe.set_route('List', doctype, filters), __('View'))
}

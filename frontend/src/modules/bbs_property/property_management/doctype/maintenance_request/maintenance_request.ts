import { __, frappe } from '@/shared/frappe'

const PRIORITY: Record<string, string> = { Low: 'gray', Medium: 'blue', High: 'orange', Urgent: 'red' }
const STATUS: Record<string, string> = {
  Open: 'red',
  Assigned: 'orange',
  'In Progress': 'blue',
  'On Hold': 'gray',
  Resolved: 'green',
  Closed: 'green',
  Cancelled: 'gray',
}

function setStatus(frm: any, status: string, extra: Record<string, unknown> = {}) {
  frm.set_value('status', status)
  Object.entries(extra).forEach(([field, value]) => frm.set_value(field, value))
  frm.save()
}

frappe.ui.form.on('Maintenance Request', {
  setup(frm: any) {
    frm.set_query('unit', () => ({ filters: { property: frm.doc.property } }))
    frm.set_query('assigned_to', () => ({ filters: { enabled: 1, user_type: 'System User' } }))
  },

  refresh(frm: any) {
    if (frm.is_new()) return
    frm.page.set_indicator(__(frm.doc.status), STATUS[frm.doc.status] ?? 'gray')
    frm.dashboard.add_indicator(__('{0} priority', [frm.doc.priority]), PRIORITY[frm.doc.priority] ?? 'gray')
    if (frm.doc.due_by && !['Resolved', 'Closed', 'Cancelled'].includes(frm.doc.status)) {
      const late = frappe.datetime.get_diff(frappe.datetime.now_datetime(), frm.doc.due_by) > 0
      frm.dashboard.add_indicator(
        late
          ? __('Response overdue since {0}', [frappe.datetime.str_to_user(frm.doc.due_by)])
          : __('Respond by {0}', [frappe.datetime.str_to_user(frm.doc.due_by)]),
        late ? 'red' : 'gray',
      )
    }
    if (!['Resolved', 'Closed', 'Cancelled'].includes(frm.doc.status)) {
      if (frm.doc.assigned_to !== frappe.session.user) {
        frm.add_custom_button(
          __('Assign to Me'),
          () => setStatus(frm, 'Assigned', { assigned_to: frappe.session.user }),
          __('Actions'),
        )
      }
      if (frm.doc.status !== 'In Progress') {
        frm.add_custom_button(__('Start Work'), () => setStatus(frm, 'In Progress'), __('Actions'))
      }
      frm.add_custom_button(__('Put on Hold'), () => setStatus(frm, 'On Hold'), __('Actions'))
      frm.add_custom_button(__('Mark Resolved'), () => frm.trigger('resolve'), __('Actions'))
    }
    if (frm.doc.status === 'Resolved') {
      frm.add_custom_button(__('Close'), () => setStatus(frm, 'Closed'), __('Actions'))
    }
    frm.add_custom_button(__('Add Update'), () => frm.trigger('add_update'))
    if (frm.doc.customer && frm.doc.chargeable_to_tenant && !frm.doc.charge_invoice && frm.doc.actual_cost) {
      frm.add_custom_button(
        __('Recharge Tenant'),
        () => {
          frm.call({
            doc: frm.doc,
            method: 'make_recharge_invoice',
            freeze: true,
            callback: (r: any) => {
              if (r.message) frappe.set_route('Form', 'Sales Invoice', r.message)
            },
          })
        },
        __('Actions'),
      )
    }
    if (frm.doc.charge_invoice) {
      frm.add_custom_button(
        __('Recharge Invoice'),
        () => frappe.set_route('Form', 'Sales Invoice', frm.doc.charge_invoice),
        __('View'),
      )
    }
  },

  resolve(frm: any) {
    frappe.prompt(
      { fieldname: 'resolution', fieldtype: 'Small Text', label: __('What was done?'), reqd: 1 },
      (values: any) => setStatus(frm, 'Resolved', { resolution: values.resolution }),
      __('Resolve Request'),
      __('Mark Resolved'),
    )
  },

  add_update(frm: any) {
    const dialog = new frappe.ui.Dialog({
      title: __('Add Update'),
      fields: [
        { fieldname: 'note', fieldtype: 'Small Text', label: __('Note'), reqd: 1 },
        { fieldname: 'visible_to_tenant', fieldtype: 'Check', label: __('Visible to Tenant'), default: 1 },
      ],
      primary_action_label: __('Post'),
      primary_action(values: any) {
        frm.call({
          doc: frm.doc,
          method: 'add_note',
          args: values,
          callback: () => {
            dialog.hide()
            frm.reload_doc()
          },
        })
      },
    })
    dialog.show()
  },

  property(frm: any) {
    frm.set_value('unit', null)
  },
})

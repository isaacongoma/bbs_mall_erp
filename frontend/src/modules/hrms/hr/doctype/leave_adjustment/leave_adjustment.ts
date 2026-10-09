import { __, frappe, hrms } from '@/shared/frappe'

frappe.ui.form.on('Leave Adjustment', {
  refresh(frm: any) {
    hrms.leave_utils.add_view_ledger_button(frm)
    frm.set_query('leave_type', () => {
      return {
        query: 'hrms.hr.doctype.leave_adjustment.leave_adjustment.get_allocated_leave_types',
        filters: {
          employee: frm.doc.employee,
        },
      }
    })
  },
  employee(frm: any) {
    if (frm.doc.employee) {
      frm.trigger('set_leave_allocation')
    }
  },
  leave_type(frm: any) {
    if (frm.doc.leave_type) {
      frm.trigger('set_leave_allocation')
    }
  },
  posting_date(frm: any) {
    if (frm.doc.posting_date) frm.trigger('set_leave_allocation')
  },
  set_leave_allocation: function (frm: any) {
    if (frm.doc.posting_date && frm.doc.employee && frm.doc.leave_type) {
      frappe.call({
        method: 'hrms.hr.doctype.leave_adjustment.leave_adjustment.get_leave_allocation_for_posting_date',
        args: {
          posting_date: frm.doc.posting_date,
          employee: frm.doc.employee,
          leave_type: frm.doc.leave_type,
        },
        callback: function (r: any) {
          if (r.message?.length) {
            frm.set_value('leave_allocation', r.message[0].name)
          } else {
            frappe.msgprint(
              __('No leave allocation found for {0} for {1} on given date.', [
                frm.doc.employee_name,
                frm.doc.leave_type,
              ]),
            )
            frm.set_value('leave_allocation', null)
          }
        },
      })
    }
  },
})

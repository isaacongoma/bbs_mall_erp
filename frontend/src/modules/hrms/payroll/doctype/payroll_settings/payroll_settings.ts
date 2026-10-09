import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Payroll Settings', {
  refresh: function (frm: any) {
    frm.set_query('sender', () => {
      return {
        filters: {
          enable_outgoing: 1,
        },
      }
    })
  },
  encrypt_salary_slips_in_emails: function (frm: any) {
    let encrypt_state = frm.doc.encrypt_salary_slips_in_emails
    frm.set_df_property('password_policy', 'reqd', encrypt_state)
  },
  validate: function (frm: any) {
    let policy = frm.doc.password_policy
    if (policy) {
      if (policy.includes(' ') || policy.includes('--')) {
        frappe.msgprint(
          __(
            'Password policy cannot contain spaces or simultaneous hyphens. The format will be restructured automatically',
          ),
        )
      }
      frm.set_value(
        'password_policy',
        policy
          .split(new RegExp(' |-', 'g'))
          .filter((token: any) => token)
          .join('-'),
      )
    }
  },
})

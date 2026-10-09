import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('User Permission', {
  setup: (frm?: any) => {
    frm.set_query('allow', () => {
      return {
        filters: {
          issingle: 0,
          istable: 0,
        },
      }
    })
    frm.set_query('applicable_for', () => {
      return {
        query: 'frappe.core.doctype.user_permission.user_permission.get_applicable_for_doctype_list',
        filters: {
          doctype: frm.doc.allow,
        },
      }
    })
  },
  refresh: (frm?: any) => {
    frm.add_custom_button(__('View Permitted Documents'), () =>
      frappe.set_route('query-report', 'Permitted Documents For User', {
        user: frm.doc.user,
      }),
    )
    frm.trigger('set_applicable_for_constraint')
    frm.trigger('toggle_hide_descendants')
  },
  allow: (frm?: any) => {
    if (frm.doc.allow) {
      if (frm.doc.for_value) {
        frm.set_value('for_value', null)
      }
      frm.trigger('toggle_hide_descendants')
    }
  },
  apply_to_all_doctypes: (frm?: any) => {
    frm.trigger('set_applicable_for_constraint')
  },
  set_applicable_for_constraint: (frm?: any) => {
    frm.toggle_reqd('applicable_for', !frm.doc.apply_to_all_doctypes)
    if (frm.doc.apply_to_all_doctypes && frm.doc.applicable_for) {
      frm.set_value('applicable_for', null, null, true)
    }
  },
  toggle_hide_descendants: (frm?: any) => {
    let show = frappe.boot.nested_set_doctypes.includes(frm.doc.allow)
    frm.toggle_display('hide_descendants', show)
  },
})

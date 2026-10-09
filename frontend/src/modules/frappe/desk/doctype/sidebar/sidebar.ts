import { __, frappe } from '@/shared/frappe'
const API = 'frappe.desk.doctype.sidebar.sidebar'
frappe.ui.form.on('Sidebar', {
  refresh(frm?: any) {
    if (frm.is_new()) return
    if (!frappe.boot.developer_mode) return
    if (frm.doc.standard) {
      frm.add_custom_button(__('Unmark as Standard'), () => {
        frappe.confirm(
          __(
            'Stop shipping {0} with its app? Its exported file and this document are removed, and {1} goes back to the sidebar computed from its contents.',
            [frm.doc.name, frm.doc.module],
          ),
          () =>
            frappe
              .xcall(`${API}.unmark_as_standard`, { sidebar: frm.doc.name })
              .then(() => frappe.set_route('List', 'Sidebar')),
        )
      })
      return
    }
    frm.add_custom_button(__('Mark as Standard'), () => {
      frappe.confirm(__('Write {0} into {1} so the app ships it?', [frm.doc.name, frm.doc.app || __('its app')]), () =>
        frappe.xcall(`${API}.mark_as_standard`, { module: frm.doc.module }).then(() => frm.reload_doc()),
      )
    })
  },
})

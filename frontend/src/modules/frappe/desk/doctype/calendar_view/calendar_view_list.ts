import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Calendar View'] = {
  button: {
    show(doc?: any) {
      return doc.name
    },
    get_label() {
      return frappe.utils.icon('calendar', 'sm')
    },
    get_description(doc?: any) {
      return __('View {0}', [`${doc.name}`])
    },
    action(doc?: any) {
      frappe.set_route('List', doc.reference_doctype, 'Calendar', doc.name)
    },
  },
}

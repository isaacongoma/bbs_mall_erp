import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['ToDo'] = {
  hide_name_column: true,
  add_fields: ['reference_type', 'reference_name'],
  onload: function (me?: any) {
    me.page.set_title(__('To Do'))
  },
  button: {
    show: function (doc?: any) {
      return doc.reference_name
    },
    get_label: function () {
      return __('Open', null, 'Access')
    },
    get_description: function (doc?: any) {
      return __('Open {0}', [`${__(doc.reference_type)}: ${doc.reference_name}`])
    },
    action: function (doc?: any) {
      frappe.set_route('Form', doc.reference_type, doc.reference_name)
    },
  },
}

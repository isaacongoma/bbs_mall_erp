import { __, erpnext, frappe } from '@/shared/frappe'
frappe.listview_settings['Code List'] = {
  onload: function (listview?: any) {
    listview.page.add_inner_button(__('Import Genericode File'), function () {
      erpnext.edi.import_genericode(listview)
    })
  },
  hide_name_column: true,
}

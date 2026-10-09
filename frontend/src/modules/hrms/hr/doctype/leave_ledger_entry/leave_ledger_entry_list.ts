import { frappe } from '@/shared/frappe'

frappe.listview_settings['Leave Ledger Entry'] = {
  onload: function (listview: any) {
    if (listview.page.fields_dict.transaction_type) {
      listview.page.fields_dict.transaction_type.get_query = function () {
        return {
          filters: {
            name: ['in', ['Leave Allocation', 'Leave Application', 'Leave Encashment']],
          },
        }
      }
    }
  },
}

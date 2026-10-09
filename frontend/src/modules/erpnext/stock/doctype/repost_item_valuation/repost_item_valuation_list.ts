import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Repost Item Valuation'] = {
  add_fields: ['status', 'name', 'voucher_type', 'voucher_no'],
  get_indicator: function (doc?: any) {
    if (doc.status === 'Completed') {
      return [__('Completed'), 'green', 'status,=,Completed']
    } else if (doc.status === 'Queued') {
      return [__('Queued'), 'red', 'status,=,Queued']
    } else if (doc.status === 'In Progress') {
      return [__('In Progress'), 'orange', 'status,=,In Progress']
    } else if (doc.status === 'Failed') {
      return [__('Failed'), 'red', 'status,=,Failed']
    } else {
      return [__(doc.status), 'blue', true]
    }
  },
  onload: function (listview?: any) {
    const method = 'erpnext.stock.doctype.repost_item_valuation.repost_item_valuation.bulk_restart_reposting'
    listview.page.add_action_item(__('Restart Failed Entries'), () => {
      listview.call_for_selected_items(method, { status: 'Failed' })
    })
  },
}

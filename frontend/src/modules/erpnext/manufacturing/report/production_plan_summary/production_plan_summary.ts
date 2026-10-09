import { __, frappe } from '@/shared/frappe'
frappe.query_reports['Production Plan Summary'] = {
  filters: [
    {
      fieldname: 'production_plan',
      label: __('Production Plan'),
      fieldtype: 'Link',
      options: 'Production Plan',
      reqd: 1,
      get_query: function () {
        return {
          filters: {
            docstatus: 1,
          },
        }
      },
    },
  ],
  formatter: function (value?: any, row?: any, column?: any, data?: any, default_formatter?: any) {
    let color: any
    value = default_formatter(value, row, column, data)
    if (column.fieldname == 'item_code' && !data.document_type) {
      color = data.pending_qty > 0 ? 'var(--red-500)' : 'var(--green-600)'
      value = `<a style='color:${color}' href="${frappe.utils.get_form_link('Item', data['item_code'])}" data-doctype="Item">${frappe.utils.escape_html(data['item_code'])}</a>`
    }
    if (column.fieldname == 'status' && data.status && frappe.ui.badge) {
      const themes: any = {
        Completed: 'green',
        'In Process': 'blue',
        'Not Started': 'amber',
        Submitted: 'blue',
        Stopped: 'red',
        Closed: 'gray',
        'To Receive and Bill': 'amber',
        'To Receive': 'amber',
        'To Bill': 'amber',
      }
      value = frappe.ui.badge.html({
        label: __(data.status),
        theme: themes[data.status] || 'gray',
      })
    }
    return value
  },
}

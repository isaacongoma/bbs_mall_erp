import { $, frappe } from '@/shared/frappe/runtime'
frappe.find = {
  page_primary_action: () => {
    return $('.page-actions:visible .primary-action')
  },
  field: (fieldname?: any, value?: any) => {
    return new Promise((resolve?: any) => {
      let input = $(`[data-fieldname="${fieldname}"] :input`)
      if (value) {
        input.val(value).trigger('change')
        frappe.after_ajax(() => {
          resolve(input)
        })
      } else {
        resolve(input)
      }
    })
  },
}

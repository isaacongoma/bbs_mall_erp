import { $, __, frappe } from '@/shared/frappe'
frappe.query_reports['UAE VAT 201'] = {
  filters: [
    {
      fieldname: 'company',
      label: __('Company'),
      fieldtype: 'Link',
      options: 'Company',
      reqd: 1,
      default: frappe.defaults.get_user_default('Company'),
      get_query: function () {
        return {
          filters: {
            country: 'United Arab Emirates',
          },
        }
      },
    },
    {
      fieldname: 'from_date',
      label: __('From Date'),
      fieldtype: 'Date',
      reqd: 1,
      default: frappe.datetime.add_months(frappe.datetime.get_today(), -3),
    },
    {
      fieldname: 'to_date',
      label: __('To Date'),
      fieldtype: 'Date',
      reqd: 1,
      default: frappe.datetime.get_today(),
    },
  ],
  formatter: function (value?: any, _row?: any, _column?: any, data?: any) {
    let $value: any
    if (
      data &&
      (data.legend == 'VAT on Sales and All Other Outputs' || data.legend == 'VAT on Expenses and All Other Inputs') &&
      data.legend == value
    ) {
      value = $(`<span>${value}</span>`)
      $value = $(value).css('font-weight', 'bold')
      value = $value.wrap('<p></p>').parent().html()
    }
    return value
  },
}

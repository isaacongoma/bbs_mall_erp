import { $, frappe } from '@/shared/frappe'
frappe.ui.form.on('Currency Exchange Settings', {
  service_provider: function (frm?: any) {
    frm.call({
      method: 'erpnext.accounts.doctype.currency_exchange_settings.currency_exchange_settings.get_api_endpoint',
      args: {
        service_provider: frm.doc.service_provider,
        use_http: frm.doc.use_http,
      },
      callback: function (r?: any) {
        if (r && r.message) {
          let result: any = [],
            params: any = {}
          if (frm.doc.service_provider == 'exchangerate.host') {
            result = ['result']
            params = {
              date: '{transaction_date}',
              from: '{from_currency}',
              to: '{to_currency}',
            }
          } else if (['frankfurter.app', 'frankfurter.dev'].includes(frm.doc.service_provider)) {
            result = ['rates', '{to_currency}']
            params = {
              base: '{from_currency}',
              symbols: '{to_currency}',
            }
          } else if (frm.doc.service_provider == 'frankfurter.dev - v2') {
            result = ['rate']
            params = {
              date: '{transaction_date}',
            }
          }
          add_param(frm, r.message, params, result)
        }
      },
    })
  },
  use_http: function (frm?: any) {
    frm.trigger('service_provider')
  },
})
function add_param(frm?: any, api?: any, params?: any, result?: any) {
  let row: any
  frm.clear_table('req_params')
  frm.clear_table('result_key')
  frm.doc.api_endpoint = api
  $.each(params, function (key?: any, value?: any) {
    row = frm.add_child('req_params')
    row.key = key
    row.value = value
  })
  $.each(result, function (_key?: any, value?: any) {
    row = frm.add_child('result_key')
    row.key = value
  })
  frm.refresh_fields()
}

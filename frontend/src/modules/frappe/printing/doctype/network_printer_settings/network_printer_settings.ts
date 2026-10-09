import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Network Printer Settings', {
  onload(frm?: any) {
    frm.trigger('connect_print_server')
  },
  server_ip(frm?: any) {
    frm.trigger('connect_print_server')
  },
  port(frm?: any) {
    frm.trigger('connect_print_server')
  },
  connect_print_server(frm?: any) {
    if (frm.doc.server_ip && frm.doc.port && frm.perm[0].write) {
      frappe.call({
        doc: frm.doc,
        method: 'get_printers_list',
        args: {
          ip: frm.doc.server_ip,
          port: frm.doc.port,
        },
        callback: function (data?: any) {
          frm.set_df_property('printer_name', 'options', [''].concat(data.message))
        },
      })
    }
  },
})

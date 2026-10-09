import { frappe, refresh_field } from '@/shared/frappe'
frappe.ui.form.on('Domain Settings', {
  before_load: function (frm?: any) {
    if (!frm.domains_multicheck) {
      frm.domains_multicheck = frappe.ui.form.make_control({
        parent: frm.fields_dict.domains_html.$wrapper,
        df: {
          fieldname: 'domains_multicheck',
          fieldtype: 'MultiCheck',
          get_data: () => {
            let active_domains = (frm.doc.active_domains || []).map((row?: any) => row.domain)
            return frappe.boot.all_domains.map((domain?: any) => {
              return {
                label: domain,
                value: domain,
                checked: active_domains.includes(domain),
              }
            })
          },
          on_change: () => {
            frm.dirty()
          },
        },
        render_input: true,
      })
      frm.domains_multicheck.refresh_input()
    }
  },
  validate: function (frm?: any) {
    frm.trigger('set_options_in_table')
  },
  set_options_in_table: function (frm?: any) {
    let selected_options = frm.domains_multicheck.get_value()
    let unselected_options = frm.domains_multicheck.options
      .map((option?: any) => option.value)
      .filter((value?: any) => {
        return !selected_options.includes(value)
      })
    let map: any = {},
      list: any = []
    ;(frm.doc.active_domains || []).map((row?: any) => {
      map[row.domain] = row.name
      list.push(row.domain)
    })
    unselected_options.map((option?: any) => {
      if (list.includes(option)) {
        frappe.model.clear_doc('Has Domain', map[option])
      }
    })
    selected_options.map((option?: any) => {
      if (!list.includes(option)) {
        frappe.model.clear_doc('Has Domain', map[option])
        let row = frappe.model.add_child(frm.doc, 'Has Domain', 'active_domains')
        row.domain = option
      }
    })
    refresh_field('active_domains')
  },
})

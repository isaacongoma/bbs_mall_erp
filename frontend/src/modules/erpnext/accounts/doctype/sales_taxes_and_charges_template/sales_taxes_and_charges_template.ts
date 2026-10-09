import { erpnext, frappe } from '@/shared/frappe'
erpnext.accounts.taxes.setup_tax_validations('Sales Taxes and Charges Template')
erpnext.accounts.taxes.setup_tax_filters('Sales Taxes and Charges')
frappe.ui.form.on('Sales Taxes and Charges Template', {
  setup: function (frm?: any) {
    frm.cscript.tax_table = 'Sales Taxes and Charges'
  },
})

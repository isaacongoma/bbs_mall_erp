import { __, erpnext, frappe, locals, refresh_field } from '@/shared/frappe'
erpnext.accounts.taxes.setup_tax_validations('Purchase Taxes and Charges Template')
erpnext.accounts.taxes.setup_tax_filters('Purchase Taxes and Charges')
frappe.ui.form.on('Purchase Taxes and Charges Template', {
  setup: function (frm?: any) {
    frm.cscript.tax_table = 'Purchase Taxes and Charges'
  },
})
frappe.ui.form.on('Purchase Taxes and Charges', {
  add_deduct_tax(_doc?: any, cdt?: any, cdn?: any) {
    const d = locals[cdt][cdn]
    if (!d.category && d.add_deduct_tax) {
      frappe.msgprint(__('Please select Category first'))
      d.add_deduct_tax = ''
    } else if (d.category != 'Total' && d.add_deduct_tax == 'Deduct') {
      frappe.msgprint(__("Cannot deduct when category is for 'Valuation' or 'Valuation and Total'"))
      d.add_deduct_tax = ''
    }
    refresh_field('add_deduct_tax', d.name, 'taxes')
  },
  category(_doc?: any, cdt?: any, cdn?: any) {
    const d = locals[cdt][cdn]
    if (d.category != 'Total' && d.add_deduct_tax == 'Deduct') {
      frappe.msgprint(__("Cannot deduct when category is for 'Valuation' or 'Valuation and Total'"))
      d.add_deduct_tax = ''
    }
    refresh_field('add_deduct_tax', d.name, 'taxes')
  },
})

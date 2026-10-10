import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Property Settings', {
  setup(frm: any) {
    frm.set_query('mpesa_clearing_account', () => ({
      filters: { company: frm.doc.default_company, account_type: ['in', ['Bank', 'Cash']], is_group: 0 },
    }))
    ;['rent_item', 'service_charge_item', 'turnover_rent_item', 'late_fee_item', 'maintenance_charge_item'].forEach(
      (field) => {
        frm.set_query(field, () => ({ filters: { is_sales_item: 1, is_stock_item: 0, disabled: 0 } }))
      },
    )
  },
  refresh(frm: any) {
    frm.add_custom_button(
      __('Register M-Pesa Paybill URLs'),
      () => {
        frappe.call({
          method: 'bbs_property.property_management.mpesa.register_c2b_urls',
          freeze: true,
          callback(r: any) {
            if (!r.exc) frappe.msgprint({ title: __('M-Pesa'), message: JSON.stringify(r.message), indicator: 'green' })
          },
        })
      },
      __('M-Pesa'),
    )
    frm.add_custom_button(
      __('Show Callback URLs'),
      () => {
        frappe.call({
          method: 'bbs_property.property_management.mpesa.get_callback_urls',
          callback(r: any) {
            const urls = r.message || {}
            frappe.msgprint({
              title: __('Callback URLs'),
              message: Object.entries(urls)
                .map(([label, url]) => `<p><b>${label}</b><br><code>${url}</code></p>`)
                .join(''),
            })
          },
        })
      },
      __('M-Pesa'),
    )
    frm.add_custom_button(__('Run Billing Now'), () =>
      frappe.new_doc('Lease Billing Run', { company: frm.doc.default_company }),
    )
  },
})

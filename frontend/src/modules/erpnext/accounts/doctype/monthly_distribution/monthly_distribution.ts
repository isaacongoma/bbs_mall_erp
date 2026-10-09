import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Monthly Distribution', {
  onload(frm?: any) {
    if (frm.doc.__islocal) {
      return frm.call('get_months').then(() => {
        frm.refresh_field('percentages')
      })
    }
  },
  refresh(frm?: any) {
    frm.toggle_display('distribution_id', frm.doc.__islocal)
  },
})

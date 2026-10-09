import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Package', {
  validate: function (frm?: any) {
    if (!frm.doc.package_name) {
      frm.set_value('package_name', frm.doc.name.toLowerCase().replace(' ', '-'))
    }
  },
  license_type: function (frm?: any) {
    frappe
      .call('frappe.core.doctype.package.package.get_license_text', {
        license_type: frm.doc.license_type,
      })
      .then((r?: any) => {
        frm.set_value('license', r.message)
      })
  },
})

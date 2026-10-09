import { __, erpnext, frappe, refresh_field } from '@/shared/frappe'

frappe.provide('erpnext.job_offer')
frappe.ui.form.on('Job Offer', {
  onload: function (frm: any) {
    frm.set_query('select_terms', function () {
      return { filters: { hr: 1 } }
    })
  },
  setup: function (frm: any) {
    frm.email_field = 'applicant_email'
  },
  select_terms: function (frm: any) {
    erpnext.utils.get_terms(frm.doc.select_terms, frm.doc, function (r: any) {
      if (!r.exc) {
        frm.set_value('terms', r.message)
      }
    })
  },
  job_offer_term_template: function (frm: any) {
    if (!frm.doc.job_offer_term_template) return
    frappe.db.get_doc('Job Offer Term Template', frm.doc.job_offer_term_template).then((doc: any) => {
      frm.clear_table('offer_terms')
      doc.offer_terms.forEach((term: any) => {
        frm.add_child('offer_terms', term)
      })
      refresh_field('offer_terms')
    })
  },
  refresh: function (frm: any) {
    if (
      !frm.doc.__islocal &&
      frm.doc.status == 'Accepted' &&
      frm.doc.docstatus === 1 &&
      (!frm.doc.__onload || !frm.doc.__onload.employee)
    ) {
      frm.add_custom_button(__('Create Employee'), function () {
        erpnext.job_offer.make_employee(frm)
      })
    }
    if (frm.doc.__onload && frm.doc.__onload.employee) {
      frm.add_custom_button(__('Show Employee'), function () {
        frappe.set_route('Form', 'Employee', frm.doc.__onload.employee)
      })
    }
  },
})
erpnext.job_offer.make_employee = function (frm: any) {
  frappe.model.open_mapped_doc({
    method: 'hrms.hr.doctype.job_offer.job_offer.make_employee',
    frm: frm,
  })
}

import { __, cur_frm, frappe } from '@/shared/frappe'

frappe.ui.form.on('Employee Referral', {
  refresh: function (frm: any) {
    if (frm.doc.docstatus === 1 && frm.doc.status === 'Pending') {
      frm.add_custom_button(__('Reject Employee Referral'), function () {
        frappe.confirm(
          __('Are you sure you want to reject the Employee Referral?'),
          function () {
            frm.doc.status = 'Rejected'
            frm.dirty()
            frm.save_or_update()
          },
          function () {
            window.close()
          },
        )
      })
      frm
        .add_custom_button(__('Create Job Applicant'), function () {
          frm.events.create_job_applicant(frm)
        })
        .addClass('btn-primary')
    }
    if (frm.doc.docstatus === 1 && frm.doc.status === 'Accepted') {
      frappe.db
        .get_list('Additional Salary', {
          filters: {
            ref_docname: cur_frm.doc.name,
            docstatus: 1,
          },
          fields: [{ COUNT: 'name', as: 'additional_salary_count' }],
        })
        .then((data: any) => {
          let additional_salary_count = data[0].additional_salary_count
          if (frm.doc.is_applicable_for_referral_bonus && !additional_salary_count) {
            frm
              .add_custom_button(__('Create Additional Salary'), function () {
                frm.events.create_additional_salary(frm)
              })
              .addClass('btn-primary')
          }
        })
    }
  },
  create_job_applicant: function (frm: any) {
    frappe.call({
      method: 'hrms.hr.doctype.employee_referral.employee_referral.create_job_applicant',
      args: {
        source_name: frm.docname,
      },
    })
  },
  create_additional_salary: function (frm: any) {
    frappe.call({
      method: 'hrms.hr.doctype.employee_referral.employee_referral.create_additional_salary',
      args: {
        employee_referral: frm.doc.name,
      },
      callback: function (r: any) {
        let doclist = frappe.model.sync(r.message)
        frappe.set_route('Form', doclist[0].doctype, doclist[0].name)
      },
    })
  },
})

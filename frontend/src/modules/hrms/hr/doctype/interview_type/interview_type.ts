import { __, frappe, refresh_field } from '@/shared/frappe'

frappe.ui.form.on('Interview Type', {
  refresh: function (frm: any) {
    if (!frm.doc.__islocal) {
      frm.add_custom_button(__('Create Interview'), function () {
        frm.events.create_interview(frm)
      })
    }
  },
  designation: function (frm: any) {
    if (frm.doc.designation) {
      frappe.db.get_doc('Designation', frm.doc.designation).then((designation: any) => {
        frappe.model.clear_table(frm.doc, 'expected_skill_set')
        designation.skills.forEach((designation_skill: any) => {
          const row = frm.add_child('expected_skill_set')
          row.skill = designation_skill.skill
        })
        refresh_field('expected_skill_set')
      })
    }
  },
  create_interview: function (frm: any) {
    frappe.call({
      method: 'hrms.hr.doctype.interview_type.interview_type.create_interview',
      args: {
        docname: frm.doc.name,
      },
      callback: function (r: any) {
        let doclist = frappe.model.sync(r.message)
        frappe.set_route('Form', doclist[0].doctype, doclist[0].name)
      },
    })
  },
})

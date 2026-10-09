import { frappe, refresh_field } from '@/shared/frappe'

frappe.ui.form.on('Employee Skill Map', {
  designation: (frm: any) => {
    frm.set_value('employee_skills', null)
    if (frm.doc.designation) {
      frappe.db.get_doc('Designation', frm.doc.designation).then((designation: any) => {
        designation.skills.forEach((designation_skill: any) => {
          let row = frappe.model.add_child(frm.doc, 'Employee Skill', 'employee_skills')
          row.skill = designation_skill.skill
          row.proficiency = 1
        })
        refresh_field('employee_skills')
      })
    }
  },
})

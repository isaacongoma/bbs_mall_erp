import { frappe } from '@/shared/frappe'

frappe.ui.form.on('Training Feedback', {
  onload: function (frm: any) {
    frm.add_fetch('training_event', 'course', 'course')
    frm.add_fetch('training_event', 'event_name', 'event_name')
    frm.add_fetch('training_event', 'trainer_name', 'trainer_name')
  },
})

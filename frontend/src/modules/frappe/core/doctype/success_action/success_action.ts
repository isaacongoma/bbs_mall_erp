import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Success Action', {
  on_load: (frm?: any) => {
    if (!frm.action_multicheck) {
      frm.trigger('set_next_action_multicheck')
    }
  },
  refresh: (frm?: any) => {
    if (!frm.action_multicheck) {
      frm.trigger('set_next_action_multicheck')
    }
  },
  validate: (frm?: any) => {
    const checked_actions = frm.action_multicheck.get_checked_options()
    if (checked_actions.length < 2) {
      frappe.msgprint(__('Select atleast 2 actions'))
    } else {
      return true
    }
  },
  before_save: (frm?: any) => {
    const checked_actions = frm.action_multicheck.get_checked_options()
    frm.doc.next_actions = checked_actions.join('\n')
  },
  after_save: (frm?: any) => {
    frappe.boot.success_action.push(frm.doc)
  },
  set_next_action_multicheck: (frm?: any) => {
    const next_actions_wrapper = frm.fields_dict.next_actions_html.$wrapper
    const checked_actions = frm.doc.next_actions ? frm.doc.next_actions.split('\n') : []
    const action_multicheck_options = get_default_next_actions().map((action?: any) => {
      return {
        label: action.label,
        value: action.value,
        checked: checked_actions.length ? checked_actions.includes(action.value) : 1,
      }
    })
    frm.action_multicheck = frappe.ui.form.make_control({
      parent: next_actions_wrapper,
      df: {
        label: __('Next Actions'),
        fieldname: 'next_actions_multicheck',
        fieldtype: 'MultiCheck',
        options: action_multicheck_options,
        select_all: true,
      },
      render_input: true,
    })
  },
})
const get_default_next_actions = () => {
  return [
    { label: __('New'), value: 'new' },
    { label: __('Print'), value: 'print' },
    { label: __('Email'), value: 'email' },
    { label: __('View All'), value: 'list' },
  ]
}

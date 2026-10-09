import { $, __, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.ui.form')
frappe.provide('frappe.success_action')
frappe.ui.form.SuccessAction = class SuccessAction {
  [key: string]: any
  constructor(form?: any) {
    this.form = form
    this.load_setting()
  }
  load_setting(this: any) {
    this.setting = frappe.boot.success_action.find((setting?: any) => setting.ref_doctype === this.form.doctype)
  }
  show(this: any) {
    if (!this.setting) return
    if (this.form.doc.docstatus === 0 && !this.is_first_creation()) return
    this.prepare_dom()
    this.show_alert()
  }
  prepare_dom(this: any) {
    this.container = $(document.body).find('.success-container')
    if (!this.container.length) {
      this.container = $('<div class="success-container">').appendTo(document.body)
    }
  }
  show_alert(this: any) {
    frappe.db.get_list(this.form.doctype, { limit: 2 }).then((result?: any) => {
      const count = result.length
      const setting = this.setting
      const doctype = setting.ref_doctype
      const stored = count === 1 ? setting.first_success_message : setting.message
      let message: any
      if (doctype && stored && stored.includes(doctype)) {
        message = __(stored.replace(doctype, '{0}'), [__(doctype)])
      } else {
        message = __(stored)
      }
      const $buttons = this.get_actions().map((action?: any) => {
        const $btn = $(`<button class="next-action"><span>${__(action.label)}</span></button>`)
        $btn.click(() => action.action(this.form))
        return $btn
      })
      const next_action_container = $(`<div class="next-action-container"></div>`)
      next_action_container.append($buttons)
      const html = next_action_container
      frappe.show_alert(
        {
          message: message,
          body: html,
          indicator: 'green',
        },
        setting.action_timeout || 7,
      )
    })
  }
  get_actions(this: any) {
    const actions: any = []
    const checked_actions = this.setting.next_actions.split('\n')
    checked_actions.forEach((action?: any) => {
      if (typeof action === 'string' && this.default_actions[action]) {
        actions.push(this.default_actions[action])
      } else if (typeof action === 'object') {
        actions.push(action)
      }
    })
    return actions
  }
  get default_actions() {
    return {
      new: {
        label: __('New'),
        action: (frm?: any) => frappe.new_doc(frm.doctype),
      },
      print: {
        label: __('Print'),
        action: (frm?: any) => frm.print_doc(),
      },
      email: {
        label: __('Email'),
        action: (frm?: any) => frm.email_doc(),
      },
      list: {
        label: __('View All'),
        action: (frm?: any) => {
          frappe.set_route('List', frm.doctype)
        },
      },
    }
  }
  is_first_creation(this: any) {
    let { modified, creation } = this.form.doc
    modified = modified.split('.')[0]
    creation = creation.split('.')[0]
    return modified === creation
  }
}

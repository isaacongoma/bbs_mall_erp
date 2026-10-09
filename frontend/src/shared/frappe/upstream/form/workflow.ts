import { $, __, frappe } from '@/shared/frappe/runtime'
frappe.ui.form.States = class FormStates {
  [key: string]: any
  constructor(opts?: any) {
    $.extend(this, opts)
    this.state_fieldname = frappe.workflow.get_state_fieldname(this.frm.doctype)
    if (!this.state_fieldname) return
    this.update_fields = frappe.workflow.get_update_fields(this.frm.doctype)
    let me = this
    $(this.frm.wrapper).bind('render_complete', function () {
      me.refresh()
    })
  }
  setup_help(this: any) {
    let me = this
    this.frm.page.add_action_item(
      __('Help'),
      function () {
        frappe.workflow.setup(me.frm.doctype)
        let state = me.get_state()
        let d = new frappe.ui.Dialog({
          title: 'Workflow: ' + frappe.workflow.workflows[me.frm.doctype].name,
        })
        frappe.workflow.get_transitions(me.frm.doc).then((transitions?: any) => {
          const next_actions =
            $.map(transitions, (d?: any) => `${frappe.utils.bold(d.action)} ${__('by Role')} ${d.allowed}`).join(
              ', ',
            ) || __('None: End of Workflow').bold()
          const document_editable_by = frappe.workflow
            .get_document_state_roles(me.frm.doctype, state)
            .map((role?: any) => frappe.utils.bold(role))
            .join(', ')
          $(d.body)
            .html(
              `
					<p>${__('Current status')}: ${frappe.utils.bold(state)}</p>
					<p>${__('Document is only editable by users with role')}: ${document_editable_by}</p>
					<p>${__('Next actions')}: ${next_actions}</p>
					<p>${__('{0}: Other permission rules may also apply', [__('Note').bold()])}</p>
				`,
            )
            .css({ padding: '15px' })
          d.show()
        })
      },
      true,
    )
  }
  refresh(this: any) {
    this.frm.page.clear_actions_menu()
    if (this.frm.doc.__islocal) {
      this.set_default_state()
      return
    }
    const state = this.get_state()
    if (state) {
      this.show_actions(state)
    }
  }
  show_actions(this: any) {
    let added = false
    let me = this
    if (this.frm.doc.__unsaved === 1) {
      return
    }
    function has_approval_access(transition?: any) {
      let approval_access = false
      const user = frappe.session.user
      if (user === 'Administrator' || transition.allow_self_approval || user !== me.frm.doc.owner) {
        approval_access = true
      }
      return approval_access
    }
    const docname = this.frm.doc.name
    frappe.workflow.get_transitions(this.frm.doc).then((transitions?: any) => {
      if (this.frm.doc.name !== docname) return
      transitions.forEach((d?: any) => {
        if (frappe.user_roles.includes(d.allowed) && has_approval_access(d)) {
          added = true
          me.frm.page.add_action_item(__(d.action), function () {
            if (frappe.workflow?.workflows?.[me.frm.doctype]?.enable_action_confirmation) {
              frappe.confirm(__('Are you sure you want to {0}?', [d.action]), () => me.handle_workflow_action(d))
            } else {
              me.handle_workflow_action(d)
            }
          })
        }
      })
      this.setup_btn(added)
    })
  }
  handle_workflow_action(this: any, transition?: any) {
    let me = this
    frappe.dom.freeze()
    me.frm.selected_workflow_action = transition.action
    me.frm.script_manager.trigger('before_workflow_action').then(() => {
      frappe
        .xcall('frappe.model.workflow.apply_workflow', {
          doc: me.frm.doc,
          action: transition.action,
        })
        .then((doc?: any) => {
          frappe.model.sync(doc)
          me.frm.refresh()
          me.frm.selected_workflow_action = null
          me.frm.script_manager.trigger('after_workflow_action')
        })
        .finally(() => {
          frappe.dom.unfreeze()
        })
    })
  }
  setup_btn(this: any, action_added?: any) {
    if (action_added) {
      this.frm.page.btn_primary.addClass('hide')
      this.frm.page.btn_secondary.addClass('hide')
      this.frm.toolbar.current_status = ''
      this.setup_help()
    }
  }
  set_default_state(this: any) {
    let default_state = frappe.workflow.get_default_state(this.frm.doctype, this.frm.doc.docstatus)
    if (default_state) {
      this.frm.set_value(this.state_fieldname, default_state)
    }
  }
  get_state(this: any) {
    if (!this.frm.doc[this.state_fieldname]) {
      this.set_default_state()
    }
    return this.frm.doc[this.state_fieldname]
  }
}

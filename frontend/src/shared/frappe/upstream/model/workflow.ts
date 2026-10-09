import { $, cint, frappe, locals } from '@/shared/frappe/runtime'
frappe.provide('frappe.workflow')
frappe.workflow = {
  state_fields: {},
  workflows: {},
  avoid_status_override: {},
  setup: function (doctype?: any) {
    let wf = frappe.get_list('Workflow', { document_type: doctype })
    if (wf.length) {
      frappe.workflow.workflows[doctype] = wf[0]
      frappe.workflow.state_fields[doctype] = wf[0].workflow_state_field
      frappe.workflow.avoid_status_override[doctype] = wf[0].states
        .filter((row?: any) => row.avoid_status_override)
        .map((d?: any) => d.state)
    } else {
      frappe.workflow.state_fields[doctype] = null
    }
  },
  get_state_fieldname: function (doctype?: any) {
    if (frappe.workflow.state_fields[doctype] === undefined) {
      frappe.workflow.setup(doctype)
    }
    return frappe.workflow.state_fields[doctype]
  },
  get_default_state: function (doctype?: any, docstatus?: any) {
    frappe.workflow.setup(doctype)
    let value = null
    $.each(frappe.workflow.workflows[doctype].states, function (_i?: any, workflow_state?: any) {
      if (cint(workflow_state.doc_status) === cint(docstatus)) {
        value = workflow_state.state
        return false
      }
    })
    return value
  },
  get_transitions: function (doc?: any) {
    frappe.workflow.setup(doc.doctype)
    return frappe.xcall('frappe.model.workflow.get_transitions', { doc: doc })
  },
  get_document_state_roles: function (doctype?: any, state?: any) {
    frappe.workflow.setup(doctype)
    let workflow_states = frappe.get_children(frappe.workflow.workflows[doctype], 'states', { state: state }) || []
    return workflow_states.map((d?: any) => d.allow_edit)
  },
  is_self_approval_enabled: function (doctype?: any) {
    return frappe.workflow.workflows[doctype].allow_self_approval
  },
  is_read_only: function (doctype?: any, name?: any) {
    let doc: any, state: any
    let state_fieldname = frappe.workflow.get_state_fieldname(doctype)
    if (state_fieldname) {
      doc = locals[doctype][name]
      if (!doc) return false
      if (doc.__islocal) return false
      state = doc[state_fieldname] || frappe.workflow.get_default_state(doctype, doc.docstatus)
      if (!state) return false
      let allow_edit_roles = frappe.workflow.get_document_state_roles(doctype, state)
      let has_common_role = frappe.user_roles.some((role?: any) => allow_edit_roles.includes(role))
      return !has_common_role
    }
    return false
  },
  get_update_fields: function (doctype?: any) {
    let update_fields = $.unique(
      $.map(frappe.workflow.workflows[doctype].states || [], function (d?: any) {
        return d.update_field
      }),
    )
    return update_fields
  },
  get_state(this: any, doc?: any) {
    const state_field = this.get_state_fieldname(doc.doctype)
    let state = doc[state_field]
    if (!state) {
      state = this.get_default_state(doc.doctype, doc.docstatus)
    }
    return state
  },
  get_all_transitions(doctype?: any) {
    return frappe.workflow.workflows[doctype].transitions || []
  },
  get_all_transition_actions(this: any, doctype?: any) {
    const transitions = this.get_all_transitions(doctype)
    return transitions.map((transition?: any) => {
      return transition.action
    })
  },
}

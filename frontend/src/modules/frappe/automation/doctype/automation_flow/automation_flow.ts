import { $, __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Automation Flow', {
  refresh: (frm?: any) => frappe.automation_flow.setup_conditions(frm),
  document_type: (frm?: any) => frappe.automation_flow.setup_conditions(frm),
})
frappe.provide('frappe.automation_flow')
Object.assign(frappe.automation_flow, {
  setup_conditions(this: any, frm?: any) {
    const parent = frm.get_field('filters_editor').$wrapper.empty()
    this.render_conditions_intro(parent, frm.doc.document_type)
    if (!frm.doc.document_type) return
    frappe.model.with_doctype(frm.doc.document_type, () => this.make_filter_group(frm, parent))
  },
  render_conditions_intro(parent?: any, document_type?: any) {
    const guidance = document_type
      ? __('Add field rules below, every rule must match before the flow can run')
      : __('Select a Document Type to add field rules.')
    $(`<div class="mb-3">
			<label class="control-label">${__('Match Fields')}</label>
			<p class="text-muted small">${guidance}</p>
		</div>`).appendTo(parent)
  },
  make_filter_group(this: any, frm?: any, parent?: any) {
    const filter_group = new frappe.ui.FilterGroup({
      parent,
      doctype: frm.doc.document_type,
      on_change: () => this.store_filters(frm, filter_group),
    })
    frm.automation_filter_group = filter_group
    filter_group.add_filters_to_filter_group(this.get_filters(frm))
  },
  store_filters(frm?: any, filter_group?: any) {
    frm.set_value('filters', JSON.stringify(filter_group.get_filters()))
  },
  get_filters(this: any, frm?: any) {
    if (!frm.doc.filters) return []
    try {
      return this.normalize_filters(JSON.parse(frm.doc.filters), frm.doc.document_type)
    } catch (error: any) {
      console.error('Unable to load Automation Flow filters', error)
      frappe.show_alert({
        message: __('Could not load the saved field rules'),
        indicator: 'red',
      })
      return []
    }
  },
  normalize_filters(this: any, filters?: any, doctype?: any) {
    if (Array.isArray(filters)) return this.normalize_filter_list(filters, doctype)
    return Object.entries(filters).map(([fieldname, value]: any) => this.normalize_filter(doctype, fieldname, value))
  },
  normalize_filter_list(filters?: any, doctype?: any) {
    const filter_list = typeof filters[0] === 'string' ? [filters] : filters
    return filter_list.map((filter?: any) => {
      if (filter.length === 2) return [doctype, filter[0], '=', filter[1]]
      if (filter.length === 3) return [doctype, ...filter]
      return filter
    })
  },
  normalize_filter(doctype?: any, fieldname?: any, value?: any) {
    if (Array.isArray(value) && value.length === 2) {
      return [doctype, fieldname, value[0], value[1]]
    }
    return [doctype, fieldname, '=', value]
  },
})
frappe.ui.form.on('Automation Flow', {
  refresh(frm?: any) {
    if (frm.is_new()) return
    frm.add_custom_button(__('Test Run'), () => frappe.automation_flow.trial_run(frm))
  },
})
Object.assign(frappe.automation_flow, {
  trial_run(this: any, frm?: any) {
    if (!frm.doc.document_type) return this.run_trial(frm, null)
    const dialog = new frappe.ui.Dialog({
      title: __('Test Run'),
      fields: [
        {
          fieldname: 'docname',
          label: __('Run against'),
          fieldtype: 'Link',
          options: frm.doc.document_type,
          reqd: 1,
          description: __('The flow runs for real against this document, then everything it did is rolled back.'),
        },
      ],
      primary_action_label: __('Run'),
      primary_action: ({ docname }: any) => {
        dialog.hide()
        this.run_trial(frm, docname)
      },
    })
    dialog.show()
  },
  run_trial(this: any, frm?: any, docname?: any) {
    frappe.call({
      method: 'frappe.automation_engine.api.trial_run',
      args: { automation: frm.doc.name, docname },
      freeze: true,
      freeze_message: __('Running…'),
      callback: ({ message }: any) => this.show_trial_result(message),
    })
  },
  show_trial_result(this: any, result?: any) {
    const steps = (result.steps || []).map((step?: any) => this.render_step(step)).join('')
    frappe.msgprint({
      title: __('Test Run: {0}', [__(result.status)]),
      indicator: result.status === 'Failed' ? 'red' : 'green',
      message: steps || __('This flow has no steps to run.'),
    })
  },
  render_step(this: any, step?: any) {
    const colors: any = { Success: 'green', Skipped: 'gray', Failed: 'red', Waiting: 'blue' }
    const lines: any = [
      `<b>${frappe.utils.escape_html(step.action_type)}</b>
			 <span class="indicator-pill ${colors[step.status] || 'gray'}">${__(step.status)}</span>`,
    ]
    if (step.message) lines.push(`<div>${frappe.utils.escape_html(step.message)}</div>`)
    if (step.condition) lines.push(this.render_condition(step))
    return `<div class="mb-3">${lines.join('')}</div>`
  },
  render_condition(step?: any) {
    const values = Object.entries(step.condition_values || {})
      .map(([name, value]: any) => `${name} = ${JSON.stringify(value)}`)
      .join(', ')
    const read = values ? `<div class="text-muted small">${frappe.utils.escape_html(values)}</div>` : ''
    return `<div class="text-muted small"><code>${frappe.utils.escape_html(step.condition)}</code></div>${read}`
  },
})

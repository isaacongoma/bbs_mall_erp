import { __, cur_list, frappe } from '@/shared/frappe'
frappe.listview_settings['Print Format'] = {
  add_fields: ['print_format_builder_beta', 'custom_format', 'print_format_for', 'standard'],
  get_form_link(doc?: any) {
    if (
      doc.print_format_builder_beta &&
      !doc.custom_format &&
      doc.print_format_for !== 'Report' &&
      (doc.standard !== 'Yes' || frappe.boot.developer_mode)
    ) {
      return `/desk/print-format-builder/${encodeURIComponent(doc.name)}`
    }
    return `/desk/print-format/${encodeURIComponent(doc.name)}`
  },
  primary_action() {
    const dev = !!frappe.boot.developer_mode
    const active = Object.fromEntries(
      (cur_list?.filter_area?.get() || [])
        .filter((f?: any) => ['doc_type', 'report'].includes(f[1]) && f[2] === '=')
        .map((f?: any) => [f[1], f[3]]),
    )
    const fields: any = [
      {
        label: __('Print Format For'),
        fieldname: 'print_format_for',
        fieldtype: 'Select',
        options: 'DocType\nReport',
        default: active.report ? 'Report' : 'DocType',
        reqd: 1,
      },
      {
        label: __('DocType'),
        fieldname: 'doc_type',
        fieldtype: 'Link',
        options: 'DocType',
        default: active.doc_type || '',
        depends_on: 'eval:doc.print_format_for !== "Report"',
        mandatory_depends_on: 'eval:doc.print_format_for !== "Report"',
      },
      {
        label: __('Report'),
        fieldname: 'report',
        fieldtype: 'Link',
        options: 'Report',
        default: active.report || '',
        depends_on: 'eval:doc.print_format_for === "Report"',
        mandatory_depends_on: 'eval:doc.print_format_for === "Report"',
      },
      {
        label: __('Name'),
        fieldname: 'print_format_name',
        fieldtype: 'Data',
        reqd: 1,
      },
      {
        label: __('Start with'),
        fieldname: 'start_with',
        fieldtype: 'Select',
        options: 'Builder\nHTML',
        default: 'Builder',
        depends_on: 'eval:doc.print_format_for !== "Report"',
        description: __('Builder is visual. HTML is hand-written.'),
      },
    ]
    if (dev) {
      fields.push(
        {
          label: __('Standard'),
          fieldname: 'standard',
          fieldtype: 'Check',
          default: 0,
          description: __('Ship as files in an app, tracked in git.'),
        },
        {
          label: __('Module'),
          fieldname: 'module',
          fieldtype: 'Link',
          options: 'Module Def',
          depends_on: 'standard',
          mandatory_depends_on: 'standard',
        },
      )
    }
    const dialog = new frappe.ui.Dialog({
      title: __('New Print Format'),
      fields,
      primary_action_label: __('Create'),
      primary_action(values?: any) {
        const for_report = values.print_format_for === 'Report'
        const use_html = for_report || values.start_with === 'HTML'
        const doc: any = { doctype: 'Print Format', name: values.print_format_name }
        if (for_report) {
          doc.print_format_for = 'Report'
          doc.report = values.report
        } else {
          doc.doc_type = values.doc_type
        }
        if (use_html) {
          doc.custom_format = 1
          if (for_report) doc.print_format_type = 'JS'
          doc.html = `<div class="print-format">\n\t<h3>${frappe.utils.escape_html(values.print_format_name)}</h3>\n</div>`
        } else {
          doc.print_format_builder_beta = 1
        }
        if (values.standard) {
          doc.standard = 'Yes'
          if (values.module) doc.module = values.module
        }
        return frappe.db.insert(doc).then((saved?: any) => {
          dialog.hide()
          if (doc.print_format_builder_beta) {
            frappe.set_route('print-format-builder', saved.name)
          } else {
            frappe.set_route('Form', 'Print Format', saved.name)
          }
        })
      },
    })
    dialog.show()
  },
}

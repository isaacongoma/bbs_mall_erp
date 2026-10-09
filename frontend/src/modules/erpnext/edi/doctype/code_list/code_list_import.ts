import { __, erpnext, frappe } from '@/shared/frappe'
frappe.provide('erpnext.edi')
erpnext.edi.import_genericode = function (listview_or_form?: any) {
  const doctype = 'Code List'
  let docname = undefined
  if (listview_or_form.doc !== undefined) {
    docname = listview_or_form.doc.name
  }
  new frappe.ui.FileUploader({
    method: 'erpnext.edi.doctype.code_list.code_list_import.import_genericode',
    doctype: doctype,
    docname: docname,
    allow_web_link: false,
    allow_toggle_private: false,
    allow_take_photo: false,
    on_success: function (_file_doc?: any, r?: any) {
      listview_or_form.refresh()
      show_column_selection_dialog(r.message)
    },
  })
}
function show_column_selection_dialog(context?: any) {
  const title_description = __('If there is no title column, use the code column for the title.')
  const default_title = get_default(context.columns, ['name', 'Name', 'code-name', 'scheme-name'])
  const fields: any = [
    {
      fieldtype: 'HTML',
      fieldname: 'code_list_info',
      options: `<div class="text-muted">${__('You are importing data for the code list:')} ${frappe.utils.get_form_link('Code List', context.code_list, true, context.code_list_title)}</div>`,
    },
    {
      fieldtype: 'Section Break',
    },
    {
      fieldname: 'import_column',
      label: __('Import'),
      fieldtype: 'Column Break',
    },
    {
      fieldname: 'title_column',
      label: __('as Title'),
      fieldtype: 'Select',
      reqd: 1,
      options: context.columns,
      default: default_title,
      description: default_title ? null : title_description,
    },
    {
      fieldname: 'code_column',
      label: __('as Code'),
      fieldtype: 'Select',
      options: context.columns,
      reqd: 1,
      default: get_default(context.columns, ['code', 'Code', 'value']),
    },
    {
      fieldname: 'filters_column',
      label: __('Filter'),
      fieldtype: 'Column Break',
    },
  ]
  if (context.columns.length > 2) {
    fields.splice(5, 0, {
      fieldname: 'description_column',
      label: __('as Description'),
      fieldtype: 'Select',
      options: [null].concat(context.columns),
      default: get_default(context.columns, [
        'description',
        'Description',
        'remark',
        __('description'),
        __('Description'),
      ]),
    })
  }
  for (const column in context.filterable_columns) {
    fields.push({
      fieldname: `filter_${column}`,
      label: __('by {}', [column]),
      fieldtype: 'Select',
      options: [null].concat(context.filterable_columns[column]),
    })
  }
  fields.push(
    {
      fieldname: 'preview_section',
      label: __('Preview'),
      fieldtype: 'Section Break',
    },
    {
      fieldname: 'preview_html',
      fieldtype: 'HTML',
    },
  )
  const d = new frappe.ui.Dialog({
    title: __('Select Columns and Filters'),
    fields: fields,
    primary_action_label: __('Import'),
    size: 'large',
    primary_action(values?: any) {
      const filters: any = {}
      for (const field in values) {
        if (field.startsWith('filter_') && values[field]) {
          filters[field.replace('filter_', '')] = values[field]
        }
      }
      frappe
        .xcall('erpnext.edi.doctype.code_list.code_list_import.process_genericode_import', {
          code_list_name: context.code_list,
          file_name: context.file,
          code_column: values.code_column,
          title_column: values.title_column,
          description_column: values.description_column,
          filters: filters,
        })
        .then((count?: any) => {
          frappe.msgprint(__('Import completed. {0} common codes created.', [count]))
        })
      d.hide()
    },
  })
  d.fields_dict.code_column.df.onchange = () => update_preview(d, context)
  d.fields_dict.title_column.df.onchange = (e?: any) => {
    const field = d.fields_dict.title_column
    if (!e.target.value) {
      field.df.description = title_description
      field.refresh()
    } else {
      field.df.description = null
      field.refresh()
    }
    update_preview(d, context)
  }
  for (const column in context.filterable_columns) {
    d.fields_dict[`filter_${column}`].df.onchange = () => update_preview(d, context)
  }
  d.show()
  update_preview(d, context)
}
function get_default(columns?: any, keys?: any) {
  return keys.find((key?: any) => columns.includes(key))
}
function update_preview(dialog?: any, context?: any) {
  const code_column = dialog.get_value('code_column')
  const title_column = dialog.get_value('title_column')
  const description_column = dialog.get_value('description_column')
  let html = '<table class="table table-bordered"><thead><tr>'
  if (title_column) html += `<th>${__('Title')}</th>`
  if (code_column) html += `<th>${__('Code')}</th>`
  if (description_column) html += `<th>${__('Description')}</th>`
  for (const column in context.filterable_columns) {
    if (dialog.get_value(`filter_${column}`)) {
      html += `<th>${__(column)}</th>`
    }
  }
  html += '</tr></thead><tbody>'
  for (let i = 0; i < 3; i++) {
    html += '<tr>'
    if (title_column) {
      const title = context.example_values[title_column][i] || ''
      html += `<td title="${title}">${truncate(title)}</td>`
    }
    if (code_column) {
      const code = context.example_values[code_column][i] || ''
      html += `<td title="${code}">${truncate(code)}</td>`
    }
    if (description_column) {
      const description = context.example_values[description_column][i] || ''
      html += `<td title="${description}">${truncate(description)}</td>`
    }
    for (const column in context.filterable_columns) {
      if (dialog.get_value(`filter_${column}`)) {
        const value = context.example_values[column][i] || ''
        html += `<td title="${value}">${truncate(value)}</td>`
      }
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  dialog.fields_dict.preview_html.$wrapper.html(html)
}
function truncate(value?: any, maxLength: any = 40) {
  if (typeof value !== 'string') return ''
  return value.length > maxLength ? value.substring(0, maxLength - 3) + '...' : value
}

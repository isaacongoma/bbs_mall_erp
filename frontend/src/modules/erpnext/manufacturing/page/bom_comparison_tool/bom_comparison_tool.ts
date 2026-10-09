import { $, __, cstr, erpnext, frappe } from '@/shared/frappe'
frappe.pages['bom-comparison-tool'].on_page_load = function (wrapper?: any) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __('BOM Comparison Tool'),
    single_column: true,
  })
  new erpnext.BOMComparisonTool(page)
}
erpnext.BOMComparisonTool = class BOMComparisonTool {
  [key: string]: any
  constructor(page?: any) {
    this.page = page
    this.make_form()
  }
  make_form(this: any) {
    this.form = new frappe.ui.FieldGroup({
      fields: [
        {
          label: __('BOM 1'),
          fieldname: 'name1',
          fieldtype: 'Link',
          options: 'BOM',
          change: () => this.fetch_and_render(),
          get_query: () => {
            return {
              filters: {
                name: ['not in', [this.form.get_value('name2') || '']],
              },
            }
          },
        },
        {
          fieldtype: 'Column Break',
        },
        {
          label: __('BOM 2'),
          fieldname: 'name2',
          fieldtype: 'Link',
          options: 'BOM',
          change: () => this.fetch_and_render(),
          get_query: () => {
            return {
              filters: {
                name: ['not in', [this.form.get_value('name1') || '']],
              },
            }
          },
        },
        {
          fieldtype: 'Section Break',
        },
        {
          fieldtype: 'HTML',
          fieldname: 'preview',
        },
      ],
      body: this.page.body,
    })
    this.form.make()
  }
  fetch_and_render(this: any) {
    let { name1, name2 } = this.form.get_values()
    if (!(name1 && name2)) {
      this.form.get_field('preview').html('')
      return
    }
    this.form.get_field('preview').html(`
			<div class="text-muted margin-top">
				${__('Fetching...')}
			</div>
		`)
    frappe
      .call('erpnext.manufacturing.doctype.bom.bom.get_bom_diff', {
        bom1: name1,
        bom2: name2,
      })
      .then((r?: any) => {
        let diff = r.message
        frappe.model.with_doctype('BOM', () => {
          this.render('BOM', name1, name2, diff)
        })
      })
  }
  render(this: any, doctype?: any, name1?: any, name2?: any, diff?: any) {
    let change_html = (title?: any, doctype?: any, changed?: any) => {
      let values_changed = this.get_changed_values(doctype, changed)
        .map((change?: any) => {
          let [fieldname, value1, value2] = change
          return `
						<tr>
							<td>${frappe.meta.get_translated_label(doctype, fieldname)}</td>
							<td>${frappe.utils.escape_html(cstr(value1))}</td>
							<td>${frappe.utils.escape_html(cstr(value2))}</td>
						</tr>
					`
        })
        .join('')
      return `
				<h4 class="margin-top">${title}</h4>
				<div>
					<table class="table table-bordered">
						<tr>
							<th width="33%">${__('Field')}</th>
							<th width="33%">${name1}</th>
							<th width="33%">${name2}</th>
						</tr>
						${values_changed}
					</table>
				</div>
			`
    }
    let value_changes = change_html(__('Values Changed'), doctype, diff.changed)
    let row_changes_by_fieldname = group_items(diff.row_changed, (change?: any) => change[0])
    let table_changes = Object.keys(row_changes_by_fieldname)
      .map((fieldname?: any) => {
        let changes = row_changes_by_fieldname[fieldname]
        let df = frappe.meta.get_docfield(doctype, fieldname)
        let html = changes
          .map((change?: any) => {
            let [fieldname, , item_code, changes] = change
            let df = frappe.meta.get_docfield(doctype, fieldname)
            let child_doctype = df.options
            let values_changed = this.get_changed_values(child_doctype, changes)
            return values_changed
              .map((change?: any, i?: any) => {
                let [fieldname, value1, value2] = change
                let th =
                  i === 0
                    ? `<th rowspan="${values_changed.length}">${frappe.utils.escape_html(cstr(item_code))}</th>`
                    : ''
                return `
						<tr>
							${th}
							<td>${frappe.meta.get_translated_label(child_doctype, fieldname)}</td>
							<td>${frappe.utils.escape_html(cstr(value1))}</td>
							<td>${frappe.utils.escape_html(cstr(value2))}</td>
						</tr>
					`
              })
              .join('')
          })
          .join('')
        return `
				<h4 class="margin-top">${__('Changes in {0}', [df.label])}</h4>
				<table class="table table-bordered">
					<tr>
						<th width="25%">${__('Item Code')}</th>
						<th width="25%">${__('Field')}</th>
						<th width="25%">${name1}</th>
						<th width="25%">${name2}</th>
					</tr>
					${html}
				</table>
			`
      })
      .join('')
    let get_added_removed_html = (title?: any, grouped_items?: any) => {
      return Object.keys(grouped_items)
        .map((fieldname?: any) => {
          let rows = grouped_items[fieldname]
          let df = frappe.meta.get_docfield(doctype, fieldname)
          let fields = frappe.meta.get_docfields(df.options).filter((df?: any) => df.in_list_view)
          let html = rows
            .map((row?: any) => {
              let [, doc] = row
              let cells = fields
                .map((df?: any) => `<td>${frappe.utils.escape_html(cstr(doc[df.fieldname]))}</td>`)
                .join('')
              return `<tr>${cells}</tr>`
            })
            .join('')
          let header = fields.map((df?: any) => `<th>${df.label}</th>`).join('')
          return `
					<h4 class="margin-top">${$.format(title, [df.label])}</h4>
					<table class="table table-bordered">
						<tr>${header}</tr>
						${html}
					</table>
				`
        })
        .join('')
    }
    let added_by_fieldname = group_items(diff.added, (change?: any) => change[0])
    let removed_by_fieldname = group_items(diff.removed, (change?: any) => change[0])
    let added_html = get_added_removed_html(__('Rows Added in {0}'), added_by_fieldname)
    let removed_html = get_added_removed_html(__('Rows Removed in {0}'), removed_by_fieldname)
    let html = `
			${value_changes}
			${table_changes}
			${added_html}
			${removed_html}
		`
    this.form.get_field('preview').html(html)
  }
  get_changed_values(doctype?: any, changed?: any) {
    return changed.filter((change?: any) => {
      let [fieldname, value1, value2] = change
      if (!value1) value1 = ''
      if (!value2) value2 = ''
      if (value1 === value2) return false
      let df = frappe.meta.get_docfield(doctype, fieldname)
      if (!df) return false
      if (df.hidden) return false
      return true
    })
  }
}
function group_items(array?: any, fn?: any) {
  return array.reduce((acc?: any, item?: any) => {
    let key = fn(item)
    acc[key] = acc[key] || []
    acc[key].push(item)
    return acc
  }, {})
}

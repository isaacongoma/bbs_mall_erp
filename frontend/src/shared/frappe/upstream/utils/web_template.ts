import { __, frappe } from '@/shared/frappe/runtime'
export function open_web_template_values_editor(template?: any, current_values: any = {}) {
  return new Promise((resolve?: any) => {
    frappe.model.with_doc('Web Template', template).then((doc?: any) => {
      let d = new frappe.ui.Dialog({
        title: __('Edit Values'),
        fields: get_fields(doc),
        primary_action(values?: any) {
          d.hide()
          resolve(values)
        },
      })
      d.set_values(current_values)
      d.show()
      d.sections.forEach((sect?: any) => {
        let fields_with_value = sect.fields_list.filter((field?: any) => current_values[field.df.fieldname])
        if (fields_with_value.length) {
          sect.collapse(false)
        }
      })
    })
  })
  function get_fields(doc?: any) {
    let normal_fields: any = []
    let table_fields: any = []
    let current_table = null
    for (let df of doc.fields) {
      if (current_table) {
        if (df.fieldtype != 'Table Break') {
          current_table.fields.push(df)
        } else {
          table_fields.push(df)
          current_table = df
        }
      } else if (df.fieldtype != 'Table Break') {
        normal_fields.push(df)
      } else {
        table_fields.push(df)
        current_table = df
        current_table.fields = []
      }
    }
    return [
      ...normal_fields,
      ...table_fields.map((tf?: any) => {
        let data = current_values[tf.fieldname] || []
        return {
          label: tf.label,
          fieldname: tf.fieldname,
          fieldtype: 'Table',
          fields: tf.fields.map((df?: any, i?: any) => ({
            ...df,
            in_list_view: i <= 1,
            columns: tf.fields.length == 1 ? 10 : 5,
          })),
          data,
          get_data: () => data,
        }
      }),
    ]
  }
}

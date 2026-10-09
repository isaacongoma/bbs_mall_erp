import { __, cint, cur_list, frappe } from '@/shared/frappe/runtime'

frappe.provide('frappe.report_utils')
frappe.report_utils = {
  make_chart_options: function (columns: any, raw_data: any, { y_fields, x_field, chart_type, colors, height }: any) {
    const type = chart_type.toLowerCase()
    let rows = raw_data.result.filter((value: any) => Object.keys(value).length)
    let labels = get_column_values(x_field)
    let datasets = y_fields.map((y_field: any) => ({
      name: get_translated_column_label(y_field),
      values: get_column_values(y_field).map((d: any) => Number(d)),
    }))
    if (raw_data.add_total_row) {
      labels = labels.slice(0, -1)
      datasets.forEach((dataset: any) => {
        dataset.values = dataset.values.slice(0, -1)
      })
    }
    return {
      data: {
        labels: labels.length ? labels : null,
        datasets: datasets,
      },
      truncateLegends: 1,
      type: type,
      height: height ? height : 280,
      colors: colors,
      axisOptions: {
        shortenYAxisNumbers: 1,
        xAxisMode: 'tick',
        numberFormatter: frappe.utils.format_chart_axis_number,
      },
    }
    function get_column_values(column_name: any) {
      if (Array.isArray(rows[0])) {
        let column_index = columns.findIndex((column: any) => column.fieldname == column_name)
        return rows.map((row: any) => row[column_index])
      } else {
        return rows.map((row: any) => row[column_name])
      }
    }
    function get_translated_column_label(fieldname: any) {
      let column = columns.find((column: any) => column.fieldname === fieldname)
      return column?.label ?? __(frappe.model.unscrub(fieldname))
    }
  },
  get_field_options_from_report: function (columns: any, data: any) {
    const rows = data.result.filter((value: any) => Object.keys(value).length)
    const first_row = Array.isArray(rows[0]) ? rows[0] : columns.map((col: any) => rows[0][col.fieldname])
    const indices = first_row.reduce((accumulator: any, current_value: any, current_index: any) => {
      if (Number.isFinite(current_value)) {
        accumulator.push(current_index)
      }
      return accumulator
    }, [])
    function get_options(fields: any) {
      return fields.map((field: any) => {
        if (field.fieldname) {
          return { label: field.label, value: field.fieldname }
        } else {
          field = frappe.report_utils.prepare_field_from_column(field)
          return { label: field.label, value: field.fieldname }
        }
      })
    }
    const numeric_fields = columns.filter((_col: any, i: any) => indices.includes(i))
    const non_numeric_fields = columns.filter((_col: any, i: any) => !indices.includes(i))
    let numeric_field_options = get_options(numeric_fields)
    let non_numeric_field_options = get_options(non_numeric_fields)
    return {
      numeric_fields: numeric_field_options,
      non_numeric_fields: non_numeric_field_options,
    }
  },
  prepare_field_from_column: function (column: any) {
    if (typeof column === 'string') {
      if (column.includes(':')) {
        let [label, fieldtype = '', width] = column.split(':')
        let options: any
        if (fieldtype.includes('/')) {
          ;[fieldtype, options] = fieldtype.split('/') as [string, string]
        }
        column = {
          label,
          fieldname: label,
          fieldtype,
          width,
          options,
        }
      } else {
        column = {
          label: column,
          fieldname: column,
          fieldtype: 'Data',
        }
      }
    }
    return column
  },
  get_report_filters: function (report_name: any) {
    if (frappe.query_reports[report_name]) {
      let filters = frappe.query_reports[report_name].filters
      return Promise.resolve(filters)
    }
    return frappe
      .xcall('frappe.desk.query_report.get_script', {
        report_name: report_name,
      })
      .then((r: any) => {
        frappe.dom.eval(r.script)
        return frappe.after_ajax(() => {
          if (frappe.query_reports[report_name] && !frappe.query_reports[report_name].filters && r.filters) {
            return (frappe.query_reports[report_name].filters = r.filters)
          }
          return frappe.query_reports[report_name] && frappe.query_reports[report_name].filters
        })
      })
  },
  get_filter_values(filters: any) {
    return filters
      .map((f: any) => {
        let v = f.default
        return {
          [f.fieldname]: v,
        }
      })
      .reduce((acc: any, f: any) => {
        Object.assign(acc, f)
        return acc
      }, {})
  },
  get_link_sort_value(df: any) {
    if (df.fieldtype !== 'Link') return null
    return (cell: any) => frappe.format(cell.content, df, { only_value: true })
  },
  get_result_of_fn(fn: any, values: any) {
    const get_result: any = {
      Minimum: (values: any) => values.reduce((min: any, val: any) => Math.min(min, val), values[0]),
      Maximum: (values: any) => values.reduce((min: any, val: any) => Math.max(min, val), values[0]),
      Average: (values: any) => values.reduce((a: any, b: any) => a + b, 0) / values.length,
      Sum: (values: any) => values.reduce((a: any, b: any) => a + b, 0),
    }
    return get_result[fn](values)
  },
  get_export_dialog(report_name: any, extra_fields: any, callback: any) {
    const fields: any = [
      {
        label: 'File Format',
        fieldname: 'file_format',
        fieldtype: 'Select',
        options: ['Excel', 'CSV'],
        default: 'Excel',
        reqd: 1,
      },
      {
        label: __('Export in Background'),
        fieldname: 'export_in_background',
        fieldtype: 'Check',
      },
      {
        fieldtype: 'Section Break',
        fieldname: 'csv_settings',
        label: 'Settings',
        collapsible: 1,
        depends_on: "eval:doc.file_format=='CSV'",
      },
      {
        fieldtype: 'Data',
        label: 'CSV Delimiter',
        fieldname: 'csv_delimiter',
        default: ',',
        length: 1,
        depends_on: "eval:doc.file_format=='CSV'",
      },
      {
        fieldtype: 'Select',
        label: 'CSV Quoting',
        fieldname: 'csv_quoting',
        options: [
          { value: 0, label: 'Minimal' },
          { value: 1, label: 'All' },
          { value: 2, label: 'Non-numeric' },
          { value: 3, label: 'None' },
        ],
        default: 2,
        depends_on: "eval:doc.file_format=='CSV'",
      },
      {
        fieldtype: 'Data',
        label: 'CSV Decimal Separator',
        fieldname: 'csv_decimal_sep',
        default: '.',
        length: 1,
        depends_on: "eval:doc.file_format=='CSV' && doc.csv_quoting != 2",
      },
      {
        fieldtype: 'Small Text',
        label: 'CSV Preview',
        fieldname: 'csv_preview',
        read_only: 1,
        depends_on: "eval:doc.file_format=='CSV'",
      },
    ]
    if (extra_fields) {
      fields.push(
        {
          fieldtype: 'Section Break',
          fieldname: 'extra_fields',
          collapsible: 0,
        },
        ...extra_fields,
      )
    }
    const dialog = new frappe.ui.Dialog({
      title: __('Export Report: {0}', [report_name], 'Export report'),
      fields: fields,
      primary_action_label: __('Download', null, 'Export report'),
      primary_action: callback,
    })
    function update_csv_preview(dialog: any) {
      const is_query_report = frappe.get_route()[0] === 'query-report'
      const report = is_query_report ? frappe.query_report : cur_list
      const columns = report.columns.filter((col: any) => col.hidden !== 1)
      let PREVIEW_DATA: any = [
        columns.map((col: any) => __(is_query_report ? col.label : col.name)),
        ...report.data
          .slice(0, 3)
          .map((row: any) => columns.map((col: any) => row[is_query_report ? col.fieldname : col.field])),
      ]
      dialog.set_value(
        'csv_preview',
        frappe.report_utils.get_csv_preview(
          PREVIEW_DATA,
          dialog.get_value('csv_quoting'),
          dialog.get_value('csv_delimiter'),
          dialog.get_value('csv_decimal_sep'),
        ),
      )
    }
    dialog.fields_dict['file_format'].df.onchange = () => update_csv_preview(dialog)
    dialog.fields_dict['csv_quoting'].df.onchange = () => update_csv_preview(dialog)
    dialog.fields_dict['csv_delimiter'].df.onchange = () => {
      if (!dialog.get_value('csv_delimiter')) {
        dialog.set_value('csv_delimiter', ',')
      }
      update_csv_preview(dialog)
    }
    dialog.fields_dict['csv_decimal_sep'].df.onchange = () => {
      if (!dialog.get_value('csv_decimal_sep')) {
        dialog.set_value('csv_decimal_sep', '.')
      }
      update_csv_preview(dialog)
    }
    return dialog
  },
  get_csv_preview(data: any, quoting: any, delimiter: any, decimal_sep: any) {
    quoting = cint(quoting)
    const QUOTING: any = {
      Minimal: 0,
      All: 1,
      NonNumeric: 2,
      None: 3,
    }
    if (delimiter.length > 1) {
      frappe.throw(__('Delimiter must be a single character'))
    }
    if (decimal_sep.length > 1) {
      frappe.throw(__('Decimal Separator must be a single character'))
    }
    if (0 > quoting || quoting > 3) {
      frappe.throw(__('Quoting must be between 0 and 3'))
    }
    if (decimal_sep !== '.' && quoting === QUOTING.NonNumeric) {
      frappe.throw(__("Decimal Separator must be '.' when Quoting is set to Non-numeric"))
    }
    return data
      .map((row: any) => {
        return row
          .map((col: any) => {
            if (col === null) {
              return ''
            }
            if (typeof col == 'string' && col.includes('"')) {
              col = col.replace(/"/g, '""')
            }
            if (typeof col == 'number' && decimal_sep !== '.') {
              col = col.toString().replace('.', decimal_sep)
            }
            switch (quoting) {
              case QUOTING.Minimal:
                return typeof col === 'string' && col.includes(delimiter) ? `"${col}"` : `${col}`
              case QUOTING.All:
                return `"${col}"`
              case QUOTING.NonNumeric:
                return isNaN(col) ? `"${col}"` : `${col}`
              case QUOTING.None:
                return `${col}`
            }
          })
          .join(delimiter)
      })
      .join('\n')
  },
}

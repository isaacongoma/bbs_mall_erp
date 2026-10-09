import { $, __, frappe, locals } from '@/shared/frappe/runtime'
frappe.ui.get_print_settings = function (
  _pdf?: any,
  callback?: any,
  letter_head?: any,
  pick_columns?: any,
  is_query_report: any = false,
  title: any = null,
  default_print_format: any = null,
) {
  let print_settings = locals[':Print Settings']['Print Settings']
  let company = frappe.defaults.get_default('company')
  let default_letter_head = ''
  if (locals[':Company'] && locals[':Company'][company]) {
    default_letter_head =
      locals[':Company'][company]['default_letter_head_report'] ||
      frappe.defaults.get_default('letter_head_report') ||
      ''
  }
  let columns: any = [
    {
      fieldtype: 'Select',
      fieldname: 'orientation',
      label: __('Orientation'),
      options: [
        { value: 'Landscape', label: __('Landscape') },
        { value: 'Portrait', label: __('Portrait') },
      ],
      default: 'Landscape',
    },
    {
      fieldtype: 'Check',
      fieldname: 'with_letter_head',
      label: __('With Letter Head'),
      default: 1,
    },
    {
      fieldtype: 'Link',
      fieldname: 'letter_head',
      label: __('Letter Head'),
      depends_on: 'with_letter_head',
      options: 'Letter Head',
      default: letter_head || default_letter_head,
      get_query: () => {
        return {
          filters: {
            letter_head_for: 'Report',
            disabled: 0,
          },
        }
      },
    },
  ]
  if (is_query_report) {
    columns.splice(1, 0, {
      fieldtype: 'Link',
      fieldname: 'print_format',
      label: __('Print Format'),
      options: 'Print Format',
      default: default_print_format,
      description: __('If no Print Format is selected, the default template for this report will be used.'),
      get_query: () => ({
        filters: {
          print_format_for: 'Report',
          print_format_type: 'JS',
          report: frappe.query_report ? frappe.query_report.report_name : '',
          disabled: 0,
        },
      }),
      onchange: function (this: any) {
        dialog.set_value('include_filters', this.get_value() ? 0 : 1)
        dialog.set_value('pick_columns', 0)
        dialog.fields_dict.columns?.select_all(true)
      },
    })
  }
  if (is_query_report) {
    columns.push({
      label: __('Include filters'),
      fieldtype: 'Check',
      fieldname: 'include_filters',
      depends_on: 'eval: !doc.print_format',
      default: 1,
    })
  }
  if (pick_columns) {
    columns.push(
      {
        label: __('Pick Columns'),
        fieldtype: 'Check',
        fieldname: 'pick_columns',
        depends_on: 'eval: !doc.print_format',
      },
      {
        label: __('Select Columns'),
        fieldtype: 'MultiCheck',
        fieldname: 'columns',
        depends_on: 'eval: doc.pick_columns && !doc.print_format',
        columns: 2,
        select_all: true,
        options: pick_columns.map((df?: any) => ({
          label: __(df.label, null, df.parent),
          value: df.fieldname,
        })),
      },
    )
  }
  const dialog = frappe.prompt(
    columns,
    function (settings?: any) {
      settings = $.extend(print_settings, settings)
      if (!settings.with_letter_head) {
        settings.letter_head = null
        settings.letter_head_name = null
      } else {
        const letter_head_name = settings.letter_head || settings.letter_head_name || print_settings.letter_head
        if (letter_head_name) {
          settings.letter_head_name = letter_head_name
          settings.letter_head = frappe.boot.letter_heads[letter_head_name]
        }
      }
      if (settings.print_format) {
        settings.pick_columns = 0
        settings.include_filters = 0
      }
      if (!settings.pick_columns) {
        settings.columns = null
      }
      callback(settings)
      if (settings.print_format) {
        settings.print_format = null
      }
    },
    title ? __(title) : __('Print Settings'),
  )
  return dialog
}
frappe.ui.form.qz_connect = function () {
  return new Promise(function (resolve?: any, reject?: any) {
    frappe.ui.form.qz_init().then(() => {
      if (qz.websocket.isActive()) {
        resolve()
      } else {
        frappe.show_alert({
          message: __('Attempting Connection to QZ Tray...'),
          indicator: 'blue',
        })
        qz.websocket.connect().then(
          () => {
            frappe.show_alert({
              message: __('Connected to QZ Tray!'),
              indicator: 'green',
            })
            resolve()
          },
          function retry(err?: any) {
            if (err.message === 'Unable to establish connection with QZ') {
              frappe.show_alert(
                {
                  message: __('Attempting to launch QZ Tray...'),
                  indicator: 'blue',
                },
                14,
              )
              window.location.assign('qz:launch')
              qz.websocket
                .connect({
                  retries: 3,
                  delay: 1,
                })
                .then(
                  () => {
                    frappe.show_alert({
                      message: __('Connected to QZ Tray!'),
                      indicator: 'green',
                    })
                    resolve()
                  },
                  () => {
                    frappe.throw(
                      __(
                        'Error connecting to QZ Tray Application...<br><br> You need to have QZ Tray application installed and running, to use the Raw Print feature.<br><br><a target="_blank" href="https://qz.io/download/">Click here to Download and install QZ Tray</a>.<br> <a target="_blank" href="https://erpnext.com/docs/user/manual/en/setting-up/print/raw-printing">Click here to learn more about Raw Printing</a>.',
                      ),
                    )
                    reject()
                  },
                )
            } else {
              frappe.show_alert(
                {
                  message: 'QZ Tray ' + err.toString(),
                  indicator: 'red',
                },
                14,
              )
              reject()
            }
          },
        )
      }
    })
  })
}
frappe.ui.form.qz_init = function () {
  return new Promise((resolve?: any) => {
    if (typeof qz === 'object' && typeof qz.version === 'string') {
      resolve()
    } else {
      let qz_required_assets: any = [
        '/assets/frappe/node_modules/js-sha256/build/sha256.min.js',
        '/assets/frappe/node_modules/qz-tray/qz-tray.js',
      ]
      frappe.require(qz_required_assets, () => {
        qz.api.setPromiseType(function promise(resolver?: any) {
          return new Promise(resolver)
        })
        qz.api.setSha256Type(function (data?: any) {
          return sha256(data)
        })
        resolve()
      })
    }
  })
}
frappe.ui.form.qz_get_printer_list = function () {
  return frappe.ui.form
    .qz_connect()
    .then(function () {
      return qz.printers.find()
    })
    .then((data?: any) => {
      return data
    })
    .catch((err?: any) => {
      frappe.ui.form.qz_fail(err)
    })
}
frappe.ui.form.qz_success = function () {
  frappe.show_alert({
    message: __('Print Sent to the printer!'),
    indicator: 'green',
  })
}
frappe.ui.form.qz_fail = function (e?: any) {
  frappe.show_alert(
    {
      message: __('QZ Tray Failed:') + ' ' + e.toString(),
      indicator: 'red',
    },
    20,
  )
}

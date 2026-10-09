import { __, frappe } from '@/shared/frappe'
let imports_in_progress: any = []
frappe.listview_settings['Data Import'] = {
  onload(listview?: any) {
    frappe.realtime.on('data_import_progress', (data?: any) => {
      if (!imports_in_progress.includes(data.data_import)) {
        imports_in_progress.push(data.data_import)
      }
    })
    frappe.realtime.on('data_import_refresh', (data?: any) => {
      imports_in_progress = imports_in_progress.filter((d?: any) => d !== data.data_import)
      listview.refresh()
    })
  },
  get_indicator: function (doc?: any) {
    let colors: any = {
      Pending: 'amber',
      'Partial Success': 'amber',
      Success: 'green',
      'In Progress': 'amber',
      Error: 'red',
      'Timed Out': 'amber',
    }
    let status = doc.status
    if (imports_in_progress.includes(doc.name)) {
      status = 'In Progress'
    }
    return [__(status), colors[status], 'status,=,' + doc.status]
  },
  formatters: {
    import_type(value?: any) {
      return (
        {
          'Insert New Records': __('Insert'),
          'Update Existing Records': __('Update'),
          'Insert or Update Records': __('Upsert'),
        } as any
      )[value]
    },
  },
  hide_name_column: true,
}

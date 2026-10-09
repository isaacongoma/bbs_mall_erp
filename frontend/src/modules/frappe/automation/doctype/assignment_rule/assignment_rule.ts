import { $, __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Assignment Rule', {
  refresh: function (frm?: any) {
    frm.trigger('setup_assignment_days_buttons')
    frm.trigger('set_options')
    frm.events.rule(frm)
  },
  setup: function (frm?: any) {
    frm.set_query('document_type', () => {
      return {
        filters: {
          name: ['!=', 'ToDo'],
        },
      }
    })
  },
  document_type: function (frm?: any) {
    frm.trigger('set_options')
  },
  setup_assignment_days_buttons: function (frm?: any) {
    const labels: any = ['Weekends', 'Weekdays', 'All Days']
    let get_days = (label?: any) => {
      const weekdays: any = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      const weekends: any = ['Saturday', 'Sunday']
      return (
        {
          'All Days': weekdays.concat(weekends),
          Weekdays: weekdays,
          Weekends: weekends,
        } as any
      )[label]
    }
    let set_days = (e?: any) => {
      frm.clear_table('assignment_days')
      const label = $(e.currentTarget).text().trim()
      get_days(label).forEach((day?: any) => frm.add_child('assignment_days', { day: day }))
      frm.refresh_field('assignment_days')
    }
    labels.forEach((label?: any) => frm.fields_dict['assignment_days'].grid.add_custom_button(label, set_days, 'top'))
  },
  rule: function (frm?: any) {
    const description_map: any = {
      'Round Robin': __('Assign one by one, in sequence'),
      'Load Balancing': __('Assign to the one who has the least assignments'),
      'Based on Field': __('Assign to the user set in this field'),
    }
    frm.get_field('rule').set_description(description_map[frm.doc.rule])
  },
  set_options(frm?: any) {
    const doctype = frm.doc.document_type
    frm.set_fields_as_options(
      'field',
      doctype,
      (df?: any) => ['Dynamic Link', 'Data'].includes(df.fieldtype) || (df.fieldtype == 'Link' && df.options == 'User'),
      [{ label: 'Owner', value: 'owner' }],
    )
    if (doctype) {
      frm
        .set_fields_as_options(
          'due_date_based_on',
          doctype,
          (df?: any) => ['Date', 'Datetime'].includes(df.fieldtype),
          [{ value: ' ', label: ' ' }],
        )
        .then((options?: any) => frm.set_df_property('due_date_based_on', 'hidden', !options.length))
    }
  },
})

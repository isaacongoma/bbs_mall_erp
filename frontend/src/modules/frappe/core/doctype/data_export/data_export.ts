import { $, __, frappe, open_url_post } from '@/shared/frappe'
frappe.ui.form.on('Data Export', {
  refresh: (frm?: any) => {
    frm.disable_save()
    frm.page.set_primary_action('Export', () => {
      can_export(frm) ? export_data(frm) : null
    })
  },
  onload: (frm?: any) => {
    frm.set_query('reference_doctype', () => {
      return {
        filters: {
          issingle: 0,
          istable: 0,
          name: ['in', frappe.boot.user.can_export],
        },
      }
    })
  },
  reference_doctype: (frm?: any) => {
    const doctype = frm.doc.reference_doctype
    if (doctype) {
      frappe.model.with_doctype(doctype, () => set_field_options(frm))
    } else {
      reset_filter_and_field(frm)
    }
  },
  export_without_main_header: (frm?: any) => {
    frm.refresh()
  },
})
const can_export = (frm?: any) => {
  const doctype = frm.doc.reference_doctype
  const parent_multicheck_options = frm.fields_multicheck[doctype]
    ? frm.fields_multicheck[doctype].get_checked_options()
    : []
  let is_valid_form = false
  if (!doctype) {
    frappe.msgprint(__('Please select the Document Type.'))
  } else if (!parent_multicheck_options.length) {
    frappe.msgprint(__('At least one field of Parent Document Type is mandatory'))
  } else {
    is_valid_form = true
  }
  return is_valid_form
}
const export_data = (frm?: any) => {
  let get_template_url = '/api/method/frappe.core.doctype.data_export.exporter.export_data'
  let export_params = () => {
    let columns: any = {}
    Object.keys(frm.fields_multicheck).forEach((dt?: any) => {
      const options = frm.fields_multicheck[dt].get_checked_options()
      columns[dt] = options
    })
    return {
      doctype: frm.doc.reference_doctype,
      select_columns: JSON.stringify(columns),
      filters: frm.filter_list.get_filters().map((filter?: any) => filter.slice(1, 4)),
      file_type: frm.doc.file_type,
      template: !frm.doc.export_without_main_header,
      with_data: 1,
      export_without_column_meta: frm.doc.export_without_main_header ? true : false,
    }
  }
  open_url_post(get_template_url, export_params())
}
const reset_filter_and_field = (frm?: any) => {
  const parent_wrapper = frm.fields_dict.fields_multicheck.$wrapper
  const filter_wrapper = frm.fields_dict.filter_list.$wrapper
  parent_wrapper.empty()
  filter_wrapper.empty()
  frm.filter_list = []
  frm.fields_multicheck = {}
}
const set_field_options = (frm?: any) => {
  const parent_wrapper = frm.fields_dict.fields_multicheck.$wrapper
  const filter_wrapper = frm.fields_dict.filter_list.$wrapper
  const doctype = frm.doc.reference_doctype
  const related_doctypes = get_doctypes(doctype)
  parent_wrapper.empty()
  filter_wrapper.empty()
  frm.filter_list = new frappe.ui.FilterGroup({
    parent: filter_wrapper,
    doctype: doctype,
    on_change: () => {},
  })
  make_multiselect_buttons(parent_wrapper)
  frm.fields_multicheck = {}
  related_doctypes.forEach((dt?: any) => {
    frm.fields_multicheck[dt] = add_doctype_field_multicheck_control(dt, parent_wrapper)
  })
  frm.refresh()
}
const make_multiselect_buttons = (parent_wrapper?: any) => {
  const button_container = $(parent_wrapper).append('<div class="flex"></div>').find('.flex')
  ;['Select All', 'Unselect All'].map((d?: any) => {
    frappe.ui.form.make_control({
      parent: $(button_container),
      df: {
        label: __(d),
        fieldname: frappe.scrub(d),
        fieldtype: 'Button',
        click: () => {
          checkbox_toggle(d !== 'Select All')
        },
      },
      render_input: true,
    })
  })
  $(button_container)
    .find('.frappe-control')
    .map((_index?: any, button?: any) => {
      $(button).css({ 'margin-right': '1em' })
    })
  function checkbox_toggle(checked?: any) {
    $(parent_wrapper)
      .find('[data-fieldtype="MultiCheck"]')
      .map((_index?: any, element?: any) => {
        $(element).find(`:checkbox`).prop('checked', checked).trigger('click')
      })
  }
}
const get_doctypes = (parentdt?: any) => {
  return [parentdt].concat(frappe.meta.get_table_fields(parentdt).map((df?: any) => df.options))
}
const add_doctype_field_multicheck_control = (doctype?: any, parent_wrapper?: any) => {
  const fields = get_fields(doctype)
  frappe.model.std_fields
    .filter((df?: any) => ['owner', 'creation'].includes(df.fieldname))
    .forEach((df?: any) => {
      fields.push(df)
    })
  const options = fields.map((df?: any) => {
    return {
      label: __(df.label, null, df.parent),
      value: df.fieldname,
      danger: df.reqd,
      checked: 1,
    }
  })
  const multicheck_control = frappe.ui.form.make_control({
    parent: parent_wrapper,
    df: {
      label: __(doctype),
      fieldname: doctype + '_fields',
      fieldtype: 'MultiCheck',
      options: options,
      columns: 3,
    },
    render_input: true,
  })
  multicheck_control.refresh_input()
  return multicheck_control
}
const filter_fields = (df?: any) => frappe.model.is_value_type(df) && !df.hidden
const get_fields = (dt?: any) => frappe.meta.get_docfields(dt).filter(filter_fields)

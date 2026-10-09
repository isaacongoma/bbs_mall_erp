import { $, __, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Kanban Board', {
  onload: function (frm?: any) {
    if (frm.is_new()) frm.set_value('use_kanban_v2', 1)
    frm.trigger('reference_doctype')
  },
  after_save: function (frm?: any) {
    if (frappe.views._kanban_engine_cache) {
      delete frappe.views._kanban_engine_cache[frm.doc.name]
    }
  },
  refresh: function (frm?: any) {
    if (frm.doc.reference_doctype) {
      frappe.model.with_doctype(frm.doc.reference_doctype, () => {
        set_card_field_options(frm)
        set_group_by_field_options(frm)
        set_title_image_field_options(frm)
      })
    }
    if (frm.is_new()) return
    frm.add_custom_button(__('Show Board'), function () {
      frappe.set_route('List', frm.doc.reference_doctype, 'Kanban', frm.doc.name)
    })
  },
  reference_doctype: function (frm?: any) {
    if (!frm.doc.reference_doctype) return
    frappe.model.with_doctype(frm.doc.reference_doctype, function () {
      let options = $.map(frappe.get_meta(frm.doc.reference_doctype).fields, function (d?: any) {
        if (d.fieldname && d.fieldtype === 'Select' && !frappe.model.no_value_type.includes(d.fieldtype)) {
          return d.fieldname
        }
        return null
      })
      frm.set_df_property('field_name', 'options', options)
      frm.get_field('field_name').refresh()
      set_card_field_options(frm)
      set_group_by_field_options(frm)
      set_title_image_field_options(frm)
      if (frm.is_new()) {
        seed_title_and_image_fields(frm)
      }
    })
  },
  field_name: function (frm?: any) {
    let field = frappe.meta.get_field(frm.doc.reference_doctype, frm.doc.field_name)
    frm.doc.columns = []
    field.options &&
      field.options.split('\n').forEach(function (o?: any) {
        o = o.trim()
        if (!o) return
        let d = frm.add_child('columns')
        d.column_name = o
      })
    frm.refresh()
  },
})
function autofill_field_label(frm?: any, cdt?: any, cdn?: any) {
  let row = locals[cdt][cdn]
  if (!row.fieldname || !frm.doc.reference_doctype) return
  let df = frappe.meta.get_docfield(frm.doc.reference_doctype, row.fieldname)
  frappe.model.set_value(cdt, cdn, 'label', df ? df.label : row.fieldname)
}
frappe.ui.form.on('Kanban Board Field', { fieldname: autofill_field_label })
frappe.ui.form.on('Kanban Board Group Field', { fieldname: autofill_field_label })
function set_card_field_options(frm?: any) {
  if (!frm.doc.reference_doctype) return
  let options = frappe
    .get_meta(frm.doc.reference_doctype)
    .fields.filter(function (df?: any) {
      return df.fieldname && frappe.model.is_value_type(df.fieldtype) && !df.hidden && df.fieldtype !== 'Password'
    })
    .map(function (df?: any) {
      return {
        value: df.fieldname,
        label: __(df.label) || df.fieldname,
        description: df.fieldname,
      }
    })
  ;['card_fields', 'preview_fields'].forEach(function (tablefield?: any) {
    let grid = frm.fields_dict[tablefield] && frm.fields_dict[tablefield].grid
    if (!grid || !grid.docfields) return
    grid.update_docfield_property('fieldname', 'options', options)
    grid.refresh()
  })
}
function set_group_by_field_options(frm?: any) {
  if (!frm.doc.reference_doctype) return
  let options = frappe
    .get_meta(frm.doc.reference_doctype)
    .fields.filter(function (df?: any) {
      return df.fieldname && (df.fieldtype === 'Select' || df.fieldtype === 'Link') && !df.hidden
    })
    .map(function (df?: any) {
      return {
        value: df.fieldname,
        label: __(df.label) || df.fieldname,
        description: df.fieldname,
      }
    })
  let grid = frm.fields_dict.group_by_fields && frm.fields_dict.group_by_fields.grid
  if (!grid || !grid.docfields) return
  grid.update_docfield_property('fieldname', 'options', options)
  grid.refresh()
}
function set_title_image_field_options(frm?: any) {
  if (!frm.doc.reference_doctype) return
  let meta = frappe.get_meta(frm.doc.reference_doctype)
  let to_option = function (df?: any) {
    return {
      value: df.fieldname,
      label: __(df.label) || df.fieldname,
      description: df.fieldname,
    }
  }
  let title_options = [
    {
      value: 'name',
      label: __('ID'),
      description: 'name',
    },
  ].concat(
    meta.fields
      .filter(function (df?: any) {
        return (
          df.fieldname &&
          ['Data', 'Text', 'Small Text', 'Text Editor'].includes(df.fieldtype) &&
          (!df.hidden || df.fieldname === meta.title_field)
        )
      })
      .map(to_option),
  )
  let image_options = meta.fields
    .filter(function (df?: any) {
      return df.fieldname && df.fieldtype === 'Attach Image'
    })
    .map(to_option)
  frm.set_df_property('title_field', 'options', title_options)
  frm.set_df_property('image_field', 'options', image_options)
  frm.get_field('title_field') && frm.get_field('title_field').set_data(title_options)
  frm.get_field('image_field') && frm.get_field('image_field').set_data(image_options)
}
function seed_title_and_image_fields(frm?: any) {
  let title: any, tdf: any, data: any, image: any
  let meta = frappe.get_meta(frm.doc.reference_doctype)
  if (!frm.doc.title_field) {
    title = null
    if (meta.title_field) {
      tdf = meta.fields.find(function (df?: any) {
        return df.fieldname === meta.title_field
      })
      if (tdf && ['Data', 'Text', 'Small Text', 'Text Editor'].includes(tdf.fieldtype)) title = meta.title_field
    }
    if (!title) {
      data = meta.fields.find(function (df?: any) {
        return ['Data', 'Text', 'Small Text', 'Text Editor'].includes(df.fieldtype) && df.fieldname && !df.hidden
      })
      title = data ? data.fieldname : 'name'
    }
    frm.set_value('title_field', title)
  }
  if (!frm.doc.image_field) {
    image =
      meta.image_field ||
      (
        meta.fields.find(function (df?: any) {
          return df.fieldtype === 'Attach Image' && df.fieldname
        }) || {}
      ).fieldname ||
      ''
    if (image) frm.set_value('image_field', image)
  }
}

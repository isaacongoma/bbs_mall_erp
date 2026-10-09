import { $, Awesomplete, __, cint, copy_dict, frappe, repl } from '@/shared/frappe/runtime'

frappe.ui.FieldSelect = class FieldSelect {
  [key: string]: any
  constructor(opts: any) {
    let me = this
    $.extend(this, opts)
    this.fields_by_name = {}
    this.options = []
    this.$input = $('<input class="form-control">')
      .appendTo(this.parent)
      .on('click', function (this: any) {
        $(this).select()
      })
    this.input_class && this.$input.addClass(this.input_class)
    this.select_input = this.$input.get(0)
    this.awesomplete = new Awesomplete(this.select_input, {
      tabSelect: true,
      minChars: 0,
      maxItems: 99,
      autoFirst: true,
      list: me.options,
      item(item: any) {
        return $(repl('<li class="filter-field-select"><p>%(label)s</p></li>', item))
          .data('item.autocomplete', item)
          .get(0)
      },
    } as any)
    this.$input.on('awesomplete-select', function (e: any) {
      let o = e.originalEvent
      let value = o.text.value
      let item = me.awesomplete.get_item(value)
      me.selected_doctype = item.doctype
      me.selected_fieldname = item.fieldname
      if (me.select) me.select(item.doctype, item.fieldname)
    })
    this.$input.on('awesomplete-selectcomplete', function (e: any) {
      let o = e.originalEvent
      let value = o.text.value
      let item = me.awesomplete.get_item(value)
      me.$input.val(item.label)
    })
    if (this.filter_fields) {
      for (let i in this.filter_fields) this.add_field_option(this.filter_fields[i])
    } else {
      this.build_options()
    }
    this.set_value(this.doctype, 'name')
  }
  get_value(this: any) {
    return this.selected_doctype ? this.selected_doctype + '.' + this.selected_fieldname : null
  }
  val(this: any, value: any) {
    if (value === undefined) {
      return this.get_value()
    } else {
      this.set_value(value)
    }
  }
  clear(this: any) {
    this.selected_doctype = null
    this.selected_fieldname = null
    this.$input.val('')
  }
  set_value(this: any, doctype: any, fieldname: any) {
    let parts: any
    let me = this
    this.clear()
    if (!doctype) return
    if (doctype.indexOf('.') !== -1) {
      parts = doctype.split('.')
      doctype = parts[0]
      fieldname = parts[1]
    }
    $.each(this.options, function (_i: any, v: any) {
      if (v.doctype === doctype && v.fieldname === fieldname) {
        me.selected_doctype = doctype
        me.selected_fieldname = fieldname
        me.$input.val(v.label)
        return false
      }
    })
  }
  build_options(this: any) {
    let me = this
    me.table_fields = []
    let std_filters = $.map(frappe.model.std_fields, function (d: any) {
      let opts: any = { parent: me.doctype }
      if (d.fieldname == 'name') opts.options = me.doctype
      return $.extend(copy_dict(d), opts)
    })
    let doctype_obj = frappe.get_meta(me.doctype)
    if (doctype_obj && cint(doctype_obj.istable)) {
      std_filters = std_filters.concat([
        {
          fieldname: 'parent',
          fieldtype: 'Data',
          label: 'Parent',
          parent: me.doctype,
        },
      ])
    }
    if (this.with_blank) {
      this.options.push({
        label: '',
        value: '',
      })
    }
    let main_table_fields = std_filters.concat(frappe.meta.docfield_list[me.doctype])
    $.each(frappe.utils.sort(main_table_fields, 'label', 'string'), function (_i: any, df: any) {
      if (df.is_virtual) {
        return
      }
      let doctype = frappe.get_meta(me.doctype).istable && me.parent_doctype ? me.parent_doctype : me.doctype
      if (frappe.perm.has_perm(doctype, df.permlevel, 'read')) me.add_field_option(df)
    })
    $.each(me.table_fields, function (_i: any, table_df: any) {
      if (table_df.options && !table_df.is_virtual) {
        let child_table_fields: any[] = ([] as any[]).concat(frappe.meta.docfield_list[table_df.options])
        if (table_df.fieldtype === 'Table MultiSelect') {
          const link_field = frappe.meta.get_docfields(table_df.options).find((df: any) => df.fieldtype === 'Link')
          child_table_fields = link_field ? [link_field] : []
        }
        $.each(frappe.utils.sort(child_table_fields, 'label', 'string'), function (_i: any, df: any) {
          let doctype = frappe.get_meta(me.doctype).istable && me.parent_doctype ? me.parent_doctype : me.doctype
          if (frappe.perm.has_perm(doctype, df.permlevel, 'read')) me.add_field_option(df, table_df)
        })
      }
    })
  }
  add_field_option(this: any, df: any, table_df?: any) {
    let me = this
    if (df.fieldname == 'docstatus' && !frappe.model.is_submittable(me.doctype)) return
    if (frappe.model.table_fields.includes(df.fieldtype)) {
      me.table_fields.push(df)
      return
    }
    let label = null
    let table = null
    if (me.doctype && df.parent == me.doctype) {
      label = __(df.label, null, df.parent)
      table = me.doctype
    } else {
      const suffix = table_df && table_df.label ? __(table_df.label) : __(df.parent)
      label = __(df.label, null, df.parent) + ' (' + suffix + ')'
      table = df.parent
    }
    if (
      frappe.model.no_value_type.indexOf(df.fieldtype) == -1 &&
      !(me.fields_by_name[df.parent] && me.fields_by_name[df.parent][df.fieldname])
    ) {
      this.options.push({
        label: label,
        value: table + '.' + df.fieldname,
        fieldname: df.fieldname,
        doctype: df.parent,
      })
      if (!me.fields_by_name[df.parent]) me.fields_by_name[df.parent] = {}
      me.fields_by_name[df.parent][df.fieldname] = df
    }
  }
}

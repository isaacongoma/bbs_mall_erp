import { $, __, cur_frm, frappe, is_null } from '@/shared/frappe/runtime'
frappe.provide('frappe.ui.form')
frappe.quick_edit = function (doctype?: any, name?: any) {
  if (!name) name = doctype
  frappe.db.get_doc(doctype, name).then((doc?: any) => {
    frappe.ui.form.make_quick_entry(doctype, null, null, doc)
  })
}
frappe.ui.form.make_quick_entry = (
  doctype?: any,
  after_insert?: any,
  init_callback?: any,
  doc?: any,
  force?: any,
  skip_insert?: any,
) => {
  let trimmed_doctype = doctype.replace(/ /g, '')
  let controller_name = 'QuickEntryForm'
  if (frappe.ui.form[trimmed_doctype + 'QuickEntryForm']) {
    controller_name = trimmed_doctype + 'QuickEntryForm'
  }
  frappe.quick_entry = new frappe.ui.form[controller_name](
    doctype,
    after_insert,
    init_callback,
    doc,
    force,
    skip_insert,
  )
  return frappe.quick_entry.setup()
}
frappe.ui.form.QuickEntryForm = class QuickEntryForm extends frappe.ui.Dialog {
  [key: string]: any
  constructor(doctype?: any, after_insert?: any, init_callback?: any, doc?: any, force?: any, skip_insert?: any) {
    super({
      auto_make: false,
    })
    this.doctype = doctype
    this.after_insert = after_insert
    this.init_callback = init_callback
    this.doc = doc
    this.force = force ? force : false
    this.skip_insert = skip_insert ? skip_insert : false
    this.dialog = this
    this.layout = this
  }
  setup(this: any) {
    return new Promise((resolve?: any) => {
      frappe.model.with_doctype(this.doctype, () => {
        this.check_quick_entry_doc()
        this.set_meta_and_mandatory_fields()
        if (this.is_quick_entry() || this.force) {
          this.render_dialog()
          resolve(this)
        } else {
          frappe.quick_entry = null
          frappe.set_route('Form', this.doctype, this.doc.name).then(() => resolve(this))
          if (this.init_callback) {
            this.init_callback(this.doc)
          }
        }
      })
    })
  }
  set_meta_and_mandatory_fields(this: any) {
    this.meta = frappe.get_meta(this.doctype)
    let fields = this.meta.fields
    this.docfields = fields.filter((df?: any) => {
      return (df.reqd || df.allow_in_quick_entry) && !df.read_only && !df.is_virtual && df.fieldtype !== 'Tab Break'
    })
  }
  check_quick_entry_doc(this: any) {
    if (!this.doc) {
      this.doc = frappe.model.get_new_doc(this.doctype, null, null, true)
    }
  }
  is_quick_entry(this: any) {
    if (this.meta.quick_entry != 1) {
      return false
    }
    this.validate_for_prompt_autoname()
    if (this.has_child_table() || !this.docfields.length) {
      return false
    }
    return true
  }
  too_many_mandatory_fields(this: any) {
    if (this.docfields.length > 7) {
      return true
    }
    return false
  }
  has_child_table(this: any) {
    if (
      $.map(this.docfields, function (d?: any) {
        return d.fieldtype === 'Table' ? d : null
      }).length
    ) {
      return true
    }
    return false
  }
  validate_for_prompt_autoname(this: any) {
    if (this.meta.autoname && this.meta.autoname.toLowerCase() === 'prompt') {
      this.docfields = [
        {
          fieldname: '__newname',
          label: __('{0} Name', [__(this.meta.name)]),
          reqd: 1,
          fieldtype: 'Data',
        },
      ].concat(this.docfields)
    }
  }
  get mandatory() {
    console.warn('QuickEntryForm: .mandatory is deprecated, use .docfields instead')
    return this.docfields
  }
  set mandatory(value: any) {
    console.warn('QuickEntryForm: .mandatory is deprecated, use .docfields instead')
    this.docfields = value
  }
  render_dialog(this: any) {
    this.fields = this.docfields
    this.title = this.get_title()
    super.make()
    this.register_primary_action()
    this.render_edit_in_full_page_link()
    this.setup_cmd_enter_for_save()
    this.onhide = () => (frappe.quick_entry = null)
    this.show()
    this.refresh_dependency()
    this.set_defaults()
    if (this.init_callback) {
      this.init_callback(this)
    }
  }
  get_title(this: any) {
    if (this.title) {
      return this.title
    } else if (this.meta.issingle) {
      return __(this.doctype)
    } else {
      return __('New {0}', [__(this.doctype)])
    }
  }
  register_primary_action(this: any) {
    let me = this
    this.set_primary_action(__('Save'), function () {
      if (me.dialog.working) {
        return
      }
      let data = me.dialog.get_values()
      if (data) {
        me.dialog.working = true
        if (me.skip_insert) {
          me.update_doc()
          me.dialog.animation_speed = 'slow'
          me.dialog.hide()
          me.handle_after_callbacks()
        } else {
          me.insert().then(() => {
            let messagetxt = __('{1} saved', [__(me.doctype), me.doc.name.bold()])
            me.dialog.animation_speed = 'slow'
            me.dialog.hide()
            if (frappe.route_hooks.after_save) {
              let route_callback = frappe.route_hooks.after_save
              delete frappe.route_hooks.after_save
              route_callback(me)
            }
            setTimeout(function () {
              frappe.show_alert(
                {
                  message: messagetxt,
                  indicator: 'green',
                },
                3,
              )
            }, 500)
          })
        }
      }
    })
  }
  handle_after_callbacks(this: any) {
    if (frappe._from_link) {
      frappe.ui.form.update_calling_link(this.doc)
    } else if (this.after_insert) {
      this.after_insert(this.doc)
    }
  }
  insert(this: any) {
    let me = this
    return new Promise((resolve?: any) => {
      me.update_doc()
      frappe.call({
        method: 'frappe.client.save',
        args: {
          doc: me.dialog.doc,
        },
        callback: function (r?: any) {
          if (
            r?.message?.docstatus === 0 &&
            frappe.model.can_submit(me.doctype) &&
            !frappe.model.has_workflow(me.doctype)
          ) {
            frappe.run_serially([
              () => (me.dialog.working = true),
              () => {
                me.dialog.set_primary_action(__('Submit'), function () {
                  me.submit(r.message)
                })
              },
            ])
          } else {
            me.process_after_insert(r)
          }
          resolve(me.dialog.doc)
        },
        error: function () {
          if (!me.skip_redirect_on_error) {
            me.open_doc(true)
          }
        },
        always: function () {
          me.dialog.working = false
        },
      })
    })
  }
  submit(this: any, doc?: any) {
    let me = this
    frappe.call({
      method: 'frappe.client.submit',
      args: {
        doc: doc,
      },
      callback: function (r?: any) {
        me.process_after_insert(r)
        cur_frm && cur_frm.reload_doc()
      },
    })
  }
  process_after_insert(this: any, r?: any) {
    frappe.model.clear_doc(this.doc.doctype, this.doc.name)
    this.doc = r.message
    if (frappe._from_link) {
      frappe.ui.form.update_calling_link(this.doc)
    } else if (this.after_insert) {
      this.after_insert(this.doc)
    } else {
      this.open_form_if_not_list()
    }
  }
  setup_cmd_enter_for_save(this: any) {
    let me = this
    this.wrapper.keydown(function (e?: any) {
      if ((e.ctrlKey || e.metaKey) && e.which == 13) {
        if (!frappe.request.ajax_count) {
          me.dialog.get_primary_btn().trigger('click')
          e.preventDefault()
          return false
        }
      }
    })
  }
  open_form_if_not_list(this: any) {
    if (this.meta.issingle) return
    let route = frappe.get_route()
    let doc = this.doc
    if (route && !(route[0] === 'List' && route[1] === doc.doctype)) {
      frappe.run_serially([() => frappe.set_route('Form', doc.doctype, doc.name)])
    }
  }
  update_doc(this: any) {
    let me = this
    let data = this.get_values(true)
    $.each(data, function (key?: any, value?: any) {
      if (!is_null(value)) {
        me.dialog.doc[key] = value
      }
    })
    return this.doc
  }
  open_doc(this: any, set_hooks?: any) {
    this.hide()
    this.update_doc()
    if (set_hooks && this.after_insert) {
      frappe.route_options = frappe.route_options || {}
      frappe.route_options.after_save = (frm?: any) => {
        this.after_insert(frm)
      }
    }
    this.doc.__run_link_triggers = false
    frappe.set_route('Form', this.doctype, this.doc.name)
  }
  render_edit_in_full_page_link(this: any) {
    if (this.force || this.hide_full_form_button) return
    this.add_custom_action(__('Edit Full Form'), () => this.open_doc(true))
  }
  set_intro(this: any, txt?: any, color?: any) {
    if (txt) {
      this.set_alert(txt, color || 'info')
    } else {
      this.clear_alert()
    }
  }
  set_df_property(this: any, fieldname?: any, prop?: any, value?: any) {
    const field = this.fields_dict?.[fieldname]
    if (!field) return
    field.df[prop] = value
    field.refresh?.()
  }
  toggle_display(this: any, fnames?: any, show?: any) {
    this._apply_on_fields(fnames, (field?: any) => {
      field.df.hidden = show ? 0 : 1
      field.refresh?.()
    })
  }
  toggle_enable(this: any, fnames?: any, enable?: any) {
    this._apply_on_fields(fnames, (field?: any) => {
      field.df.read_only = enable ? 0 : 1
      field.refresh?.()
    })
  }
  toggle_reqd(this: any, fnames?: any, mandatory?: any) {
    this._apply_on_fields(fnames, (field?: any) => {
      field.df.reqd = mandatory ? 1 : 0
      field.refresh?.()
    })
  }
  _apply_on_fields(this: any, fnames?: any, fn?: any) {
    if (!fnames) return
    const names = Array.isArray(fnames) ? fnames : [fnames]
    names.forEach((fname?: any) => {
      const field = this.fields_dict?.[fname]
      if (field) fn(field)
    })
  }
  set_defaults(this: any) {
    let me = this
    $.each(this.fields_dict, function (fieldname?: any, field?: any) {
      field.doctype = me.doc.doctype
      field.docname = me.doc.name
      if (!is_null(me.doc[fieldname])) {
        field.set_input(me.doc[fieldname])
      }
    })
  }
}

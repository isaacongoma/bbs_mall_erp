import { $, __, frappe, refresh_field } from '@/shared/frappe'
frappe.ui.form.on('Role Permission for Page and Report', {
  setup: function (frm?: any) {
    frm.trigger('set_queries')
  },
  refresh: function (frm?: any) {
    frm.disable_save()
    frm.role_area.hide()
    frm.events.setup_buttons(frm)
  },
  setup_buttons: function (frm?: any) {
    frm.clear_custom_buttons()
    frm.page.clear_actions()
    if (frm.doc.set_role_for && frm.doc[frappe.model.scrub(frm.doc.set_role_for)]) {
      frm.add_custom_button(__('Reset to defaults'), function () {
        frm.trigger('reset_roles')
      })
      frm.page.set_primary_action(__('Update'), () => {
        frm.trigger('update_report_page_data')
      })
    }
  },
  onload: function (frm?: any) {
    if (!frm.roles_editor) {
      frm.role_area = $(frm.fields_dict.roles_html.wrapper)
      frm.roles_editor = new frappe.RoleEditor(frm.role_area, frm)
    }
  },
  set_queries: function (frm?: any) {
    frm.set_query('page', function () {
      return {
        filters: {
          system_page: 0,
        },
      }
    })
  },
  set_role_for: function (frm?: any) {
    frm.trigger('clear_fields')
    frm.toggle_display('roles_html', false)
  },
  clear_fields: function (frm?: any) {
    let field = frm.doc.set_role_for == 'Report' ? 'page' : 'report'
    frm.set_value(field, '')
  },
  page: function (frm?: any) {
    frm.events.setup_buttons(frm)
    if (frm.doc.page) {
      frm.trigger('set_report_page_data')
    } else {
      frm.trigger('set_role_for')
    }
  },
  report: function (frm?: any) {
    frm.events.setup_buttons(frm)
    if (frm.doc.report) {
      frm.trigger('set_report_page_data')
    } else {
      frm.trigger('set_role_for')
    }
  },
  set_report_page_data: function (frm?: any) {
    frm.toggle_display('roles_html', true)
    frm.role_area.show()
    return frm.call({
      method: 'set_report_page_data',
      doc: frm.doc,
      callback: function () {
        refresh_field('roles')
        frm.roles_editor.show()
      },
    })
  },
  update_report_page_data: function (frm?: any) {
    frm.trigger('validate_mandatory_fields')
    if (frm.roles_editor) {
      frm.roles_editor.set_roles_in_table()
    }
    return frm.call({
      method: 'update_report_page_data',
      doc: frm.doc,
      callback: function () {
        refresh_field('roles')
        frm.roles_editor.show()
        frappe.msgprint(__('Successfully Updated'))
      },
    })
  },
  reset_roles: function (frm?: any) {
    frm.trigger('validate_mandatory_fields')
    return frm.call({
      method: 'reset_roles',
      doc: frm.doc,
      callback: function () {
        refresh_field('roles')
        frm.roles_editor.show()
        frappe.msgprint(__('Successfully Updated'))
      },
    })
  },
  validate_mandatory_fields: function (frm?: any) {
    if (!frm.doc.set_role_for) {
      frappe.throw(__('Mandatory field: set role for'))
    }
    if (frm.doc.set_role_for && !frm.doc[frm.doc.set_role_for.toLocaleLowerCase()]) {
      frappe.throw(__('Mandatory field: {0}', [frm.doc.set_role_for]))
    }
  },
})

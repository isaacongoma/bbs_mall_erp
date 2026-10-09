import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Workspace', {
  setup: function () {
    frappe.meta.get_field('Workspace Link', 'only_for').no_default = true
  },
  refresh: function (frm?: any) {
    frm.enable_save()
    frm.trigger('add_to_desktop')
    let url = `/desk/${frm.doc.public ? frappe.router.slug(frm.doc.name) : 'private/' + frappe.router.slug(frm.doc.name)}`
    frm.sidebar.add_user_action(__('Go to Workspace')).attr('href', url).attr('target', '_blank')
    frm.layout.message.empty()
    let message = __('Please {0}, click on the three dots (⋯) and select Manage to configure it.', [
      `<a href="${url}">${__('visit the workspace')}</a>`,
    ])
    if (
      (frm.doc.for_user && frm.doc.for_user !== frappe.session.user) ||
      (frm.doc.public && !frappe.user.has_role('Workspace Manager'))
    ) {
      frm.trigger('disable_form')
      if (frm.doc.public) {
        message = __('Only Workspace Manager can edit public workspaces')
      } else {
        message = __('We do not allow editing of this document.')
      }
    }
    if (frappe.boot.developer_mode) {
      frm.set_df_property('module', 'read_only', 0)
    }
    frm.layout.show_message(message)
  },
  disable_form: function (frm?: any) {
    frm.fields
      .filter((field?: any) => field.has_input)
      .forEach((field?: any) => {
        frm.set_df_property(field.df.fieldname, 'read_only', '1')
      })
    frm.disable_save()
  },
})

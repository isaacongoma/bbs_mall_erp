import { open_web_template_values_editor } from '@/shared/frappe/upstream/utils/web_template'
import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Website Settings', {
  setup(frm?: any) {
    frm.set_query('navbar_template', () => ({
      filters: {
        type: 'Navbar',
      },
    }))
    frm.set_query('footer_template', () => ({
      filters: {
        type: 'Footer',
      },
    }))
  },
  refresh: function (frm?: any) {
    frm.add_custom_button(__('View Website'), () => {
      window.open('/', '_blank')
    })
    frm.events.check_template_has_fields(frm, 'navbar_template')
    frm.events.check_template_has_fields(frm, 'footer_template')
  },
  set_banner_from_image: function (frm?: any) {
    if (!frm.doc.banner_image) {
      frappe.msgprint(__('Select a Brand Image first.'))
    }
    frm.set_value('brand_html', "<img src='" + frm.doc.banner_image + "'>")
  },
  onload_post_render: function (frm?: any) {
    frm.trigger('set_parent_label_options')
    frm.trigger('set_parent_label_options_footer')
  },
  set_parent_label_options: function (frm?: any) {
    frm.fields_dict.top_bar_items.grid.update_docfield_property(
      'parent_label',
      'options',
      frm.events.get_parent_options(frm, 'top_bar_items'),
    )
  },
  set_parent_label_options_footer: function (frm?: any) {
    frm.fields_dict.footer_items.grid.update_docfield_property(
      'parent_label',
      'options',
      frm.events.get_parent_options(frm, 'footer_items'),
    )
  },
  authorize_api_indexing_access: function (frm?: any) {
    frappe.call({
      method: 'frappe.website.doctype.website_settings.google_indexing.authorize_access',
      args: {
        reauthorize: frm.doc.indexing_authorization_code ? 1 : 0,
      },
      callback: function (r?: any) {
        if (!r.exc) {
          frm.save()
          window.open(r.message.url)
        }
      },
    })
  },
  enable_view_tracking: function (frm?: any) {
    frappe.boot.website_tracking_enabled = frm.doc.enable_view_tracking
  },
  set_parent_options: function (frm?: any, doctype?: any, name?: any) {
    let item = frappe.get_doc(doctype, name)
    if (item.parentfield === 'top_bar_items') {
      frm.trigger('set_parent_label_options')
    } else if (item.parentfield === 'footer_items') {
      frm.trigger('set_parent_label_options_footer')
    }
  },
  get_parent_options: function (frm?: any, table_field?: any) {
    let d: any
    let items = frm.doc[table_field] || []
    let main_items: any = ['']
    for (let i in items) {
      d = items[i]
      if (!d.url && d.label) {
        main_items.push(d.label)
      }
    }
    return main_items.join('\n')
  },
  edit_navbar_template_values(frm?: any) {
    frm.events.edit_template_values(frm, 'navbar_template')
  },
  edit_footer_template_values(frm?: any) {
    frm.events.edit_template_values(frm, 'footer_template')
  },
  edit_template_values(frm?: any, template_field?: any) {
    let values_field = template_field + '_values'
    let template = frm.doc[template_field]
    if (!template) {
      frappe.show_alert(__('Please select {0}', [frm.get_docfield(template_field).label]))
      return
    }
    let values = JSON.parse(frm.doc[values_field] || '{}')
    open_web_template_values_editor(template, values).then((new_values?: any) => {
      frm.set_value(values_field, JSON.stringify(new_values))
    })
  },
  check_template_has_fields(frm?: any, template_field?: any) {
    let template = frm.doc[template_field]
    let button_field = 'edit_' + template_field + '_values'
    if (!template || template === 'Standard Navbar' || template === 'Standard Footer') {
      frm.toggle_display(button_field, false)
      return
    }
    frappe.model.with_doc('Web Template', template, () => {
      let doc = frappe.model.get_doc('Web Template', template)
      let has_fields = doc.fields && doc.fields.length > 0
      frm.toggle_display(button_field, has_fields)
    })
  },
  navbar_template(frm?: any) {
    frm.events.check_template_has_fields(frm, 'navbar_template')
  },
  footer_template(frm?: any) {
    frm.events.check_template_has_fields(frm, 'footer_template')
  },
})
frappe.ui.form.on('Top Bar Item', {
  top_bar_items_delete(frm?: any) {
    frm.events.set_parent_label_options(frm)
  },
  footer_items_add(_frm?: any, cdt?: any, cdn?: any) {
    frappe.model.set_value(cdt, cdn, 'right', 0)
  },
  footer_items_delete(frm?: any) {
    frm.events.set_parent_label_options_footer(frm)
  },
  parent_label: function (frm?: any, doctype?: any, name?: any) {
    frm.events.set_parent_options(frm, doctype, name)
  },
  url: function (frm?: any, doctype?: any, name?: any) {
    frm.events.set_parent_options(frm, doctype, name)
  },
  label: function (frm?: any, doctype?: any, name?: any) {
    frm.events.set_parent_options(frm, doctype, name)
  },
})
frappe.tour['Website Settings'] = [
  {
    fieldname: 'enable_view_tracking',
    title: __('Enable Tracking Page Views'),
    description: __('Checking this will enable tracking page views for blogs, web pages, etc.'),
  },
  {
    fieldname: 'disable_signup',
    title: __('Disable Signup for your site'),
    description: __(
      "Check this if you don't want users to sign up for an account on your site. Users won't get desk access unless you explicitly provide it.",
    ),
  },
]

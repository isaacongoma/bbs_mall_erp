import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['User'] = {
  add_fields: ['enabled', 'user_type', 'user_image'],
  filters: [['enabled', '=', 1]],
  onload(this: any, listview?: any) {
    this.set_default_app_options(listview)
  },
  prepare_data: function (data?: any) {
    data['user_for_avatar'] = data['name']
  },
  get_indicator: function (doc?: any) {
    if (doc.enabled) {
      return [__('Active'), 'green', 'enabled,=,1']
    } else {
      return [__('Disabled'), 'gray', 'enabled,=,0']
    }
  },
  set_default_app_options() {
    const default_app_field = frappe.meta.get_docfield('User', 'default_app')
    if (!default_app_field) return
    frappe.xcall('frappe.apps.get_apps').then((r?: any) => {
      let apps = r?.map((r?: any) => r.name) || []
      default_app_field.options = ['', ...apps].join('\n')
    })
  },
}
frappe.help.youtube_id['User'] = '8Slw1hsTmUI'

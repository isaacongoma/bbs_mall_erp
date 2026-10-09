import { __, frappe, open_url_post } from '@/shared/frappe'
frappe.listview_settings['Contact'] = {
  add_fields: ['image'],
  onload: function (listview?: any) {
    listview.page.add_action_item(__('Download vCards'), function () {
      const contacts = listview.get_checked_items()
      open_url_post('/api/method/frappe.contacts.doctype.contact.contact.download_vcards', {
        contacts: contacts.map((c?: any) => c.name),
      })
    })
  },
}

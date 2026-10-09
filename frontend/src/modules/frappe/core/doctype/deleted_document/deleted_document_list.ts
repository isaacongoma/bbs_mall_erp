import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Deleted Document'] = {
  onload: function (doclist?: any) {
    const action = () => {
      const selected_docs = doclist.get_checked_items()
      if (selected_docs.length > 0) {
        let docnames = selected_docs.map((doc?: any) => doc.name)
        frappe.call({
          method: 'frappe.core.doctype.deleted_document.deleted_document.bulk_restore',
          args: { docnames },
          callback: function (r?: any) {
            if (r.message) {
              let body = (docnames?: any) => {
                const html = docnames.map((docname?: any) => {
                  return `<li><a href='/desk/deleted-document/${docname}'>${docname}</a></li>`
                })
                return '<br><ul>' + html.join('')
              }
              let message = (title?: any, docnames?: any) => {
                return docnames.length > 0 ? title + body(docnames) + '</ul>' : ''
              }
              const { restored, invalid, failed } = r.message
              const restored_summary = message(__('Documents restored successfully'), restored)
              const invalid_summary = message(__('Documents that were already restored'), invalid)
              const failed_summary = message(__('Documents that failed to restore'), failed)
              const summary = restored_summary + invalid_summary + failed_summary
              frappe.msgprint(summary, __('Document Restoration Summary'), true)
              if (restored.length > 0) {
                doclist.refresh()
              }
            }
          },
        })
      }
    }
    doclist.page.add_actions_menu_item(__('Restore'), action, false)
  },
}

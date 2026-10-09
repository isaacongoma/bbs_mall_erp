import { frappe } from '@/shared/frappe/runtime'
frappe.preview_email = function (
  template?: any,
  args?: any,
  header?: any,
  with_container: any = false,
  only_html: any = false,
) {
  return frappe
    .call({
      method: 'frappe.email.email_body.get_email_html',
      args: {
        subject: 'Test',
        template,
        args,
        header,
        with_container,
      },
    })
    .then((r?: any) => {
      let html = r.message
      html = html.replace(/embed=/, 'src=')
      if (only_html) {
        return html
      }
      let d = frappe.msgprint({
        message: '<iframe width="100%" height="600px" style="border: none;"></iframe>',
        wide: true,
      })
      setTimeout(() => {
        d.$wrapper.find('iframe').contents().find('html').html(html)
        d.$wrapper.find('.modal-dialog').css('width', '70%')
      }, 1000)
    })
}

import { $, erpnext, frappe } from '@/shared/frappe'
erpnext.SMSManager = function SMSManager(this: any, doc?: any) {
  let me = this
  this.setup = function (this: any) {
    let default_msg: any = {
      Lead: '',
      Opportunity: 'Your enquiry has been logged into the system. Ref No: ' + doc.name,
      Quotation: 'Quotation ' + doc.name + ' has been sent via email. Thanks!',
      'Sales Order':
        'Sales Order ' +
        doc.name +
        ' has been created against ' +
        (doc.quotation_no ? 'Quote No:' + doc.quotation_no : '') +
        (doc.po_no ? ' for your PO: ' + doc.po_no : ''),
      'Delivery Note':
        'Items has been delivered against delivery note: ' + doc.name + (doc.po_no ? ' for your PO: ' + doc.po_no : ''),
      'Sales Invoice':
        'Invoice ' + doc.name + ' has been sent via email ' + (doc.po_no ? ' for your PO: ' + doc.po_no : ''),
      'Material Request': 'Material Request ' + doc.name + ' has been raised in the system',
      'Purchase Order': 'Purchase Order ' + doc.name + ' has been sent via email',
      'Purchase Receipt': 'Items has been received against purchase receipt: ' + doc.name,
    }
    if (['Sales Order', 'Delivery Note', 'Sales Invoice'].includes(doc.doctype))
      this.show(doc.contact_person, 'Customer', doc.customer, '', default_msg[doc.doctype])
    else if (doc.doctype === 'Quotation')
      this.show(doc.contact_person, 'Customer', doc.party_name, '', default_msg[doc.doctype])
    else if (['Purchase Order', 'Purchase Receipt'].includes(doc.doctype))
      this.show(doc.contact_person, 'Supplier', doc.supplier, '', default_msg[doc.doctype])
    else if (doc.doctype == 'Lead') this.show('', '', '', doc.mobile_no, default_msg[doc.doctype])
    else if (doc.doctype == 'Opportunity') this.show('', '', '', doc.contact_no, default_msg[doc.doctype])
    else if (doc.doctype == 'Material Request') this.show('', '', '', '', default_msg[doc.doctype])
  }
  this.get_contact_number = function (contact?: any, ref_doctype?: any, ref_name?: any) {
    frappe.call({
      method: 'frappe.core.doctype.sms_settings.sms_settings.get_contact_number',
      args: {
        contact_name: contact,
        ref_doctype: ref_doctype,
        ref_name: ref_name,
      },
      callback: function (r?: any) {
        if (r.exc) {
          frappe.msgprint(r.exc)
          return
        }
        me.number = r.message
        me.show_dialog()
      },
    })
  }
  this.show = function (this: any, contact?: any, ref_doctype?: any, ref_name?: any, mobile_nos?: any, message?: any) {
    this.message = message
    if (mobile_nos) {
      me.number = mobile_nos
      me.show_dialog()
    } else if (contact) {
      this.get_contact_number(contact, ref_doctype, ref_name)
    } else {
      me.show_dialog()
    }
  }
  this.show_dialog = function () {
    if (!me.dialog) me.make_dialog()
    me.dialog.set_values({
      message: me.message,
      number: me.number,
    })
    me.dialog.show()
  }
  this.make_dialog = function (this: any) {
    let d = new frappe.ui.Dialog({
      title: 'Send SMS',
      width: 400,
      fields: [
        { fieldname: 'number', fieldtype: 'Data', label: 'Mobile Number', reqd: 1 },
        { fieldname: 'message', fieldtype: 'Text', label: 'Message', reqd: 1 },
        { fieldname: 'send', fieldtype: 'Button', label: 'Send' },
      ],
    })
    d.fields_dict.send.input.onclick = function () {
      let btn = d.fields_dict.send.input
      let v = me.dialog.get_values()
      if (v) {
        $(btn).set_working()
        frappe.call({
          method: 'frappe.core.doctype.sms_settings.sms_settings.send_sms',
          args: {
            receiver_list: [v.number],
            msg: v.message,
          },
          callback: function (r?: any) {
            $(btn).done_working()
            if (r.exc) {
              frappe.msgprint(r.exc)
              return
            }
            me.dialog.hide()
          },
        })
      }
    }
    this.dialog = d
  }
  this.setup()
}

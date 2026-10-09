import { __, frappe } from '@/shared/frappe'
frappe.provide('frappe.ui.form')
frappe.ui.form.ContactAddressQuickEntryForm = class ContactAddressQuickEntryForm extends frappe.ui.form.QuickEntryForm {
  [key: string]: any
  constructor(doctype?: any, after_insert?: any, init_callback?: any, doc?: any, force?: any) {
    super(doctype, after_insert, init_callback, doc, force)
    this.skip_redirect_on_error = true
  }
  render_dialog(this: any) {
    this.mandatory = this.mandatory.concat(this.get_variant_fields())
    super.render_dialog()
  }
  insert(this: any) {
    const map_field_names: any = {
      email_address: 'email_id',
      mobile_number: 'mobile_no',
      map_to_first_name: 'first_name',
      map_to_last_name: 'last_name',
      country_address: 'country',
    }
    Object.entries(map_field_names).forEach(([fieldname, new_fieldname]: any) => {
      this.dialog.doc[new_fieldname] = this.dialog.doc[fieldname]
      delete this.dialog.doc[fieldname]
    })
    return super.insert()
  }
  get_variant_fields() {
    let variant_fields: any = [
      {
        fieldtype: 'Section Break',
        label: __('Primary Contact Details'),
        collapsible: 0,
      },
      {
        label: __('First Name'),
        fieldname: 'map_to_first_name',
        fieldtype: 'Data',
        depends_on: "eval:doc.customer_type=='Company' || doc.supplier_type=='Company'",
      },
      {
        label: __('Last Name'),
        fieldname: 'map_to_last_name',
        fieldtype: 'Data',
        depends_on: "eval:doc.customer_type=='Company' || doc.supplier_type=='Company'",
      },
      {
        fieldtype: 'Column Break',
      },
      {
        label: __('Email Id'),
        fieldname: 'email_address',
        fieldtype: 'Data',
        options: 'Email',
      },
      {
        label: __('Mobile Number'),
        fieldname: 'mobile_number',
        fieldtype: 'Data',
      },
      {
        fieldtype: 'Section Break',
        label: __('Primary Address Details'),
        collapsible: 0,
      },
      {
        label: __('Address Line 1'),
        fieldname: 'address_line1',
        fieldtype: 'Data',
        mandatory_depends_on: 'eval:doc.city || doc.country_address',
      },
      {
        label: __('Address Line 2'),
        fieldname: 'address_line2',
        fieldtype: 'Data',
      },
      {
        label: __('ZIP Code'),
        fieldname: 'pincode',
        fieldtype: 'Data',
      },
      {
        fieldtype: 'Column Break',
      },
      {
        label: __('City'),
        fieldname: 'city',
        fieldtype: 'Data',
        mandatory_depends_on: 'eval:doc.country_address || doc.address_line1',
      },
      {
        label: __('State/Province'),
        fieldname: 'state',
        fieldtype: 'Data',
      },
      {
        label: __('Country'),
        fieldname: 'country_address',
        fieldtype: 'Link',
        options: 'Country',
        mandatory_depends_on: 'eval:doc.city || doc.address_line1',
      },
    ]
    return variant_fields
  }
}

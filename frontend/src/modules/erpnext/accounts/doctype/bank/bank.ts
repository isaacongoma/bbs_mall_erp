import { Plaid, __, erpnext, frappe } from '@/shared/frappe'
frappe.provide('erpnext.integrations')
frappe.ui.form.on('Bank', {
  refresh: function (frm?: any) {
    add_fields_to_mapping_table(frm)
    frm.toggle_display(['address_html', 'contact_html'], !frm.doc.__islocal)
    if (frm.doc.__islocal) {
      frm.set_df_property('address_and_contact', 'hidden', 1)
      frappe.contacts.clear_address_and_contact(frm)
    } else {
      frm.set_df_property('address_and_contact', 'hidden', 0)
      frappe.contacts.render_address_and_contact(frm)
    }
    if (frm.doc.plaid_access_token) {
      frm.add_custom_button(__('Refresh Plaid Link'), () => {
        new erpnext.integrations.refreshPlaidLink(frm.doc.plaid_access_token)
      })
    }
  },
})
const add_fields_to_mapping_table = function (frm?: any) {
  const options: any = []
  frappe.model.with_doctype('Bank Transaction', function () {
    const meta = frappe.get_meta('Bank Transaction')
    meta.fields.forEach((value?: any) => {
      if (!['Section Break', 'Column Break'].includes(value.fieldtype)) {
        options.push(value.fieldname)
      }
    })
  })
  const grid = frm.fields_dict.bank_transaction_mapping?.grid
  if (grid) {
    grid.update_docfield_property('bank_transaction_field', 'options', options)
  }
}
erpnext.integrations.refreshPlaidLink = class refreshPlaidLink {
  [key: string]: any
  constructor(access_token?: any) {
    this.access_token = access_token
    this.plaidUrl = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    this.init_config()
  }
  async init_config(this: any) {
    this.plaid_env = await frappe.db.get_single_value('Plaid Settings', 'plaid_env')
    this.token = await this.get_link_token_for_update()
    this.init_plaid()
  }
  async get_link_token_for_update(this: any) {
    const token = frappe.xcall(
      'erpnext.erpnext_integrations.doctype.plaid_settings.plaid_settings.get_link_token_for_update',
      { access_token: this.access_token },
    )
    if (!token) {
      frappe.throw(__('Cannot retrieve link token for update. Check Error Log for more information'))
    }
    return token
  }
  init_plaid(this: any) {
    const me = this
    me.loadScript(me.plaidUrl)
      .then(() => {
        me.onScriptLoaded(me)
      })
      .then(() => {
        if (me.linkHandler) {
          me.linkHandler.open()
        }
      })
      .catch((error?: any) => {
        me.onScriptError(error)
      })
  }
  loadScript(src?: any) {
    return new Promise(function (resolve?: any, reject?: any) {
      if (document.querySelector("script[src='" + src + "']")) {
        resolve()
        return
      }
      const el = document.createElement('script')
      el.type = 'text/javascript'
      el.async = true
      el.src = src
      el.addEventListener('load', resolve)
      el.addEventListener('error', reject)
      el.addEventListener('abort', reject)
      document.head.appendChild(el)
    })
  }
  onScriptLoaded(me?: any) {
    me.linkHandler = Plaid.create({
      env: me.plaid_env,
      token: me.token,
      onSuccess: me.plaid_success,
    })
  }
  onScriptError(error?: any) {
    frappe.msgprint(
      __("There was an issue connecting to Plaid's authentication server. Check browser console for more information"),
    )
    console.error(error)
  }
  plaid_success(_token?: any, response?: any) {
    frappe
      .xcall('erpnext.erpnext_integrations.doctype.plaid_settings.plaid_settings.update_bank_account_ids', {
        response: response,
      })
      .then(() => {
        frappe.show_alert({ message: __('Plaid Link Updated'), indicator: 'green' })
      })
  }
}

import { Plaid, __, erpnext, frappe } from '@/shared/frappe'
frappe.provide('erpnext.integrations')
frappe.ui.form.on('Plaid Settings', {
  enabled: function (frm?: any) {
    frm.toggle_reqd('plaid_client_id', frm.doc.enabled)
    frm.toggle_reqd('plaid_secret', frm.doc.enabled)
    frm.toggle_reqd('plaid_env', frm.doc.enabled)
  },
  refresh: function (frm?: any) {
    if (frm.doc.enabled) {
      frm.add_custom_button(__('Link a new bank account'), () => {
        new erpnext.integrations.plaidLink(frm)
      })
      frm.add_custom_button(__('Reset Plaid Link'), () => {
        new erpnext.integrations.plaidLink(frm)
      })
      frm
        .add_custom_button(__('Sync Now'), () => {
          frappe.call({
            method: 'erpnext.erpnext_integrations.doctype.plaid_settings.plaid_settings.enqueue_synchronization',
            freeze: true,
            callback: () => {
              const bank_transaction_link = frappe.utils.get_form_link(
                'Bank Transaction',
                '',
                true,
                __('Bank Transaction'),
              )
              frappe.msgprint({
                title: __('Sync Started'),
                message: __('The sync has started in the background, please check the {0} list for new records.', [
                  bank_transaction_link,
                ]),
                alert: 1,
              })
            },
          })
        })
        .addClass('btn-primary')
    }
  },
})
erpnext.integrations.plaidLink = class plaidLink {
  [key: string]: any
  constructor(parent?: any) {
    this.frm = parent
    this.plaidUrl = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    this.init_config()
  }
  async init_config(this: any) {
    this.product = ['transactions']
    this.plaid_env = this.frm.doc.plaid_env
    this.client_name = frappe.boot.sitename
    this.token = await this.get_link_token()
    this.init_plaid()
  }
  async get_link_token(this: any) {
    const token = await this.frm.call('get_link_token').then((resp?: any) => resp.message)
    if (!token) {
      frappe.throw(__('Cannot retrieve link token. Check Error Log for more information'))
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
      if (document.querySelector('script[src="' + src + '"]')) {
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
      clientName: me.client_name,
      product: me.product,
      env: me.plaid_env,
      token: me.token,
      onSuccess: me.plaid_success,
    })
  }
  onScriptError(error?: any) {
    frappe.msgprint(
      __("There was an issue connecting to Plaid's authentication server. Check browser console for more information"),
    )
    console.warn(error)
  }
  plaid_success(this: any, token?: any, response?: any) {
    const me = this
    frappe.prompt(
      {
        fieldtype: 'Link',
        options: 'Company',
        label: __('Company'),
        fieldname: 'company',
        reqd: 1,
      },
      (data?: any) => {
        me.company = data.company
        frappe
          .xcall('erpnext.erpnext_integrations.doctype.plaid_settings.plaid_settings.add_institution', {
            token: token,
            response: response,
          })
          .then((result?: any) => {
            frappe.xcall('erpnext.erpnext_integrations.doctype.plaid_settings.plaid_settings.add_bank_accounts', {
              response: response,
              bank: result,
              company: me.company,
            })
          })
          .then(() => {
            frappe.show_alert({ message: __('Bank accounts added'), indicator: 'green' })
          })
      },
      __('Select a company'),
      __('Continue'),
    )
  }
}

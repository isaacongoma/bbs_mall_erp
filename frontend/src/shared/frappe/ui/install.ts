import { frappe } from '../runtime'
import { installFacades } from './facades'
import { useMetaStore } from '../../stores/metaStore'
import { installModalPlugin } from './modal'

installModalPlugin()
frappe.utils.make_event_emitter(frappe.router)
installFacades()

const prototype = frappe.ui.Dialog.prototype
const make = prototype.make
prototype.make = function (this: { $wrapper: JQuery }) {
  make.call(this)
  this.$wrapper.data('frappe-dialog', this)
}

const metaSync = frappe.meta.sync
frappe.meta.sync = function (this: unknown, doc: Record<string, unknown>) {
  metaSync.call(this, doc)
  if (doc?.doctype === 'DocType' && typeof doc.name === 'string') {
    useMetaStore.getState().setMeta({ docs: [doc as never], user_settings: '{}' }, doc.name)
  }
}

frappe.request.is_session_expired = (response?: { session_expired?: unknown }) => Boolean(response?.session_expired)

frappe.utils.play_sound = () => undefined

import { useMetaStore } from '../stores/metaStore'
import { frappe } from './runtime'

type AnyRecord = Record<string, any>

export function registerMeta(docs: AnyRecord[], userSettings = '{}'): void {
  const definitions = docs.filter((doc) => doc.doctype === 'DocType')
  if (definitions.length) frappe.model.sync(definitions.map((doc) => ({ ...doc })))
  const primary = definitions[0]?.name as string | undefined
  if (primary) useMetaStore.getState().setMeta({ docs: docs as never, user_settings: userSettings }, primary)
}

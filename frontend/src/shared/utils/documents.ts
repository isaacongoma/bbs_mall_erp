import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { toast } from '@/design-system'
import { useUiStore } from '../stores/uiStore'

function getERPNextSetting(field: string) {
  return rpc({ url: 'frappe.client.get_single_value', params: { doctype: 'ERPNext CRM Settings', field } })
}

async function shouldCreateProductInERPNext(): Promise<boolean> {
  try {
    const [enabled, syncProducts] = await Promise.all([
      getERPNextSetting('enabled'),
      getERPNextSetting('sync_products'),
    ])
    return !!enabled && !!syncProducts
  } catch {
    return false
  }
}

export async function createDocument(
  doctype: string,
  data?: Record<string, any> | null,
  close?: () => void,
  callback?: ((...args: any[]) => void) | null,
): Promise<void> {
  if (!doctype) return
  if (doctype === 'CRM Product' && (await shouldCreateProductInERPNext())) {
    close?.()
    toast.info(__('Create products as Items in ERPNext'))
    window.open('/app/item/new', '_blank')
    return
  }
  close?.()
  useUiStore.getState().set({
    createDocumentDoctype: doctype,
    createDocumentData: data || {},
    createDocumentCallback: callback || null,
    showCreateDocumentModal: true,
  })
}

import { __, frappe } from '@/shared/frappe'
const LEAD_SYSTEM_STATUSES: any = ['Opportunity', 'Quotation', 'Lost Quotation', 'Converted']
frappe.kanban_v2.settings['Lead'] = {
  callbacks: {
    canMoveCard(card?: any, from?: any, to?: any) {
      if (card.status !== from) return
      const status = [to, from].find((s?: any) => LEAD_SYSTEM_STATUSES.includes(s))
      if (!status) return
      frappe.ui.toast({
        id: 'lead-kanban-system-status',
        message: __("{0} is set from the lead's linked documents", [__(status)]),
        type: 'warning',
      })
      return false
    },
  },
}

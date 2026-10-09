import { __, frappe } from '@/shared/frappe'
frappe.kanban_v2.settings['Task'] = {
  callbacks: {
    canMoveCard(card?: any, from?: any, to?: any) {
      if (card.status !== from || to !== 'Overdue') return
      frappe.ui.toast({
        id: 'task-kanban-overdue',
        message: __('A task becomes Overdue on its own once its Expected End Date passes'),
        type: 'warning',
      })
      return false
    },
  },
}

import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { capture } from '@/core/telemetry'
import { createDialog, toast } from '@/design-system'
import type { BulkAction, BulkActionContext } from '@/shared/hooks/useListBulkActions'
import type { ViewListResource } from '@/shared/types/view'

export function crmBulkActions(doctype: string, list: ViewListResource) {
  return ({ selections, unselectAll }: BulkActionContext): BulkAction[] => {
    if (doctype !== 'CRM Lead') return []
    return [
      {
        label: __('Convert to Deal'),
        onClick: () =>
          createDialog({
            title: __('Convert to Deal'),
            message: __('Are you sure you want to convert {0} lead(s) to deal(s)?', [selections.size]),
            actions: [
              {
                label: __('Convert'),
                variant: 'solid',
                onClick: ({ close }) => {
                  capture('bulk_convert_to_deal')
                  Array.from(selections).forEach((name) => {
                    void rpc({
                      url: 'crm.fcrm.doctype.crm_lead.crm_lead.convert_to_deal',
                      params: { lead: name },
                    }).then(() => {
                      toast.success(__('Converted Successfully'))
                      void list.reload().catch(() => undefined)
                      unselectAll()
                      close()
                    })
                  })
                },
              },
            ],
          }),
      },
    ]
  }
}

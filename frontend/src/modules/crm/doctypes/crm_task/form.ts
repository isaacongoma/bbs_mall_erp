import { __ } from '@/core/i18n'

export class CRMTask {
  [key: string]: any

  onRender() {
    if (this.doc.reference_doctype && this.doc.reference_docname) {
      const label = this.doc.reference_doctype.replace('CRM ', '')

      this.actions = [
        {
          name: 'Redirect Action',
          label: __('Open {0}', [label]),
          onClick: (close?: () => void) => {
            if (!this.doc.reference_docname) return
            const name = this.doc.reference_doctype === 'CRM Deal' ? 'Deal' : 'Lead'
            const params =
              name === 'Deal' ? { dealId: this.doc.reference_docname } : { leadId: this.doc.reference_docname }
            this.router.push({ name, params })
            close?.()
          },
        },
      ]
    }
  }
}

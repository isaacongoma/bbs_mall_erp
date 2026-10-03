import { __ } from '@/core/i18n'
import type { LinkedDocColumn } from '../components/ListViews/LinkedDocsListView'

export function linkedDocColumnLabels(): LinkedDocColumn[] {
  return [
    { label: __('Document'), key: 'title', width: '19rem' },
    { label: __('Master'), key: 'reference_doctype', width: '12rem' },
  ]
}

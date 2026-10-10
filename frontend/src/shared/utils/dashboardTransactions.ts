import { __ } from '@/core/i18n'

type AnyRecord = Record<string, any>

export function dashboardTransactions(
  meta: AnyRecord | null,
): Array<{ label: string; doctype: string; fieldname: string }> {
  const dashboard = meta?.__dashboard && typeof meta.__dashboard === 'object' ? (meta.__dashboard as AnyRecord) : {}
  const transactions = Array.isArray(dashboard.transactions) ? dashboard.transactions : []
  const nonStandard =
    dashboard.non_standard_fieldnames && typeof dashboard.non_standard_fieldnames === 'object'
      ? (dashboard.non_standard_fieldnames as Record<string, string>)
      : {}
  const fieldname = typeof dashboard.fieldname === 'string' ? dashboard.fieldname : ''
  const configured = transactions
    .flatMap((group) => {
      if (!group || typeof group !== 'object') return []
      const entry = group as AnyRecord
      const label = typeof entry.label === 'string' && entry.label ? entry.label : __('Related')
      return (Array.isArray(entry.items) ? entry.items : []).flatMap((item) => {
        if (typeof item !== 'string' || !item) return []
        return [{ label, doctype: item, fieldname: nonStandard[item] ?? fieldname }]
      })
    })
    .filter((item, index, all) => all.findIndex((candidate) => candidate.doctype === item.doctype) === index)
    .map((item) => ({
      ...item,
      fieldname: item.fieldname || `${item.doctype.toLowerCase().replaceAll(' ', '_')}`,
    }))
  if (configured.length) return configured
  const fallback = Array.isArray(meta?.fields)
    ? meta.fields.flatMap((field: AnyRecord) => {
        if (
          field.fieldtype !== 'Link' ||
          typeof field.options !== 'string' ||
          !field.options ||
          field.options === meta?.name
        )
          return []
        return [
          { label: __('Related'), doctype: field.options, fieldname: field.options.toLowerCase().replaceAll(' ', '_') },
        ]
      })
    : []
  return fallback.filter(
    (item, index, all) => all.findIndex((candidate) => candidate.doctype === item.doctype) === index,
  )
}

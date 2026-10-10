import { useEffect } from 'react'
import { frappe } from '@/shared/frappe'
import { useResource } from '@/core/resources'
import { unwrapDeskDocument, unwrapDeskResponse, type DeskWorkspace } from '../utils/deskWorkspace'

type AnyRecord = Record<string, any>

function parseFilterList(value: unknown): unknown[][] {
  try {
    const parsed = JSON.parse(String(value ?? '[]')) as unknown
    return Array.isArray(parsed) ? (parsed as unknown[][]) : []
  } catch {
    return []
  }
}

function cardFilters(card: AnyRecord): unknown[][] {
  const fixed = parseFilterList(card.filters_json)
  const dynamic = parseFilterList(card.dynamic_filters_json).map((entry) => {
    const expression = entry[3]
    if (typeof expression !== 'string' || !expression.startsWith('frappe.')) return entry
    try {
      const value = new Function('frappe', `return ${expression}`)(frappe)
      return [entry[0], entry[1], entry[2], value]
    } catch {
      return null
    }
  })
  return [
    ...fixed,
    ...dynamic.filter((entry): entry is unknown[] => Boolean(entry && entry[3] !== undefined && entry[3] !== null)),
  ]
}

export interface NumberCardValue {
  card: AnyRecord | null
  display: string
  loading: boolean
}

export function useNumberCardValue(item: DeskWorkspace): NumberCardValue {
  const card = useResource<AnyRecord>({
    url: 'frappe.client.get',
    params: { doctype: 'Number Card', name: item.number_card_name },
    cache: ['desk-number-card', item.number_card_name],
    auto: Boolean(item.number_card_name),
    initialData: null,
    transform: (value) => unwrapDeskDocument(value) as AnyRecord | null,
  })
  const result = useResource<number>({
    url: 'frappe.desk.doctype.number_card.number_card.get_result',
    params: { doc: card.data ?? {}, filters: {} },
    cache: ['desk-number-card-result', item.number_card_name],
    auto: Boolean(card.data?.name),
    initialData: 0,
    transform: (value) => Number(unwrapDeskResponse(value) ?? 0),
  })
  const cardDoc = card.data
  useEffect(() => {
    if (!cardDoc?.name) return
    result.update({ params: { doc: cardDoc, filters: JSON.stringify(cardFilters(cardDoc)) }, auto: true })
    void result.reload().catch(() => undefined)
  }, [cardDoc, result])
  const scope = window as unknown as Record<string, any>
  const isCount = String(cardDoc?.function ?? '') === 'Count'
  const display =
    !isCount && typeof scope.format_currency === 'function'
      ? String(scope.format_currency(result.data ?? 0))
      : String(result.data ?? 0)
  return { card: cardDoc, display, loading: result.loading && !result.fetched }
}

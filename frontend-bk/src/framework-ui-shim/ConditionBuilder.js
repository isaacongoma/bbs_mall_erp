// Compatibility shim for `@framework/ui/components/ConditionBuilder`'s
// tree-data helpers -- see ConditionBuilder.vue's header comment for why
// this exists (the real module is private to frappe-ui's unreleased
// monorepo and not obtainable). This defines the same data-shape contract
// WorkflowFilters.vue (the only consumer) relies on: an interleaved Frappe
// filter array `[[field, op, value], "and"|"or", [...], ...]`, nestable via
// a bracketed sub-array in a leaf's position, converted to/from a
// `{conditions: [...]}` tree where each item is either a leaf
// `{fieldname, operator, value, connector}` or a nested group
// `{conditions: [...], connector}`.
export { default as ConditionBuilder } from './ConditionBuilder.vue'

export function emptyTree() {
  return { conditions: [] }
}

export function fromFrappeConditions(rows) {
  if (!Array.isArray(rows) || !rows.length) return emptyTree()

  const conditions = []
  let pendingConnector

  for (const entry of rows) {
    if (entry === 'and' || entry === 'or') {
      pendingConnector = entry
      continue
    }
    if (Array.isArray(entry) && Array.isArray(entry[0])) {
      // Nested group: a bracketed list of the same interleaved shape.
      const group = fromFrappeConditions(entry)
      if (pendingConnector) group.connector = pendingConnector
      conditions.push(group)
    } else if (Array.isArray(entry)) {
      const [fieldname, operator, value] = entry
      const leaf = { fieldname, operator: operator || 'equals', value: value ?? '' }
      if (pendingConnector) leaf.connector = pendingConnector
      conditions.push(leaf)
    }
    pendingConnector = undefined
  }

  return { conditions }
}

export function toFrappeConditions(tree) {
  const rows = []
  const conditions = tree?.conditions || []

  conditions.forEach((item, index) => {
    if (index > 0) {
      rows.push(item.connector === 'or' ? 'or' : 'and')
    }
    if (Array.isArray(item.conditions)) {
      rows.push(toFrappeConditions(item))
    } else if (item.fieldname) {
      rows.push([item.fieldname, item.operator || 'equals', item.value ?? ''])
    }
  })

  return rows
}

import { useMemo, useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dialog, Select, TextInput } from '@/design-system'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { FieldLayout, type LayoutTab } from '@/shared/components/FieldLayout'
import { useMeta } from '@/shared/hooks/useMeta'
import { findMissingMandatory } from '@/shared/utils/fieldTransforms'
import type { DocField, DocRecord } from '@/shared/types/meta'
import { useAdvances } from '../stores/financeStore'
import { calculateExpenseClaimTotals } from '../utils/expense'

type ChildKind = 'expense' | 'tax' | 'advance'
type ChildRow = Record<string, unknown>

interface ExpenseClaimExtrasProps {
  data: DocRecord
  setField: (fieldname: string, value: unknown) => void
  readOnly: boolean
}

interface ActiveEditor {
  kind: ChildKind
  index: number | null
  row: ChildRow
}

const childDefinitions: Record<ChildKind, { field: string; doctype: string; title: string }> = {
  expense: { field: 'expenses', doctype: 'Expense Claim Detail', title: 'Expenses' },
  tax: { field: 'taxes', doctype: 'Expense Taxes and Charges', title: 'Taxes & Charges' },
  advance: { field: 'advances', doctype: 'Expense Claim Advance', title: 'Settle against Advances' },
}

function rows(value: unknown): ChildRow[] {
  return Array.isArray(value) ? value.filter((row): row is ChildRow => Boolean(row && typeof row === 'object')) : []
}

function numberValue(value: unknown): number {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function money(value: unknown, currency: unknown): string {
  const amount = numberValue(value)
  if (!currency) return amount.toFixed(2)
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: String(currency) }).format(amount)
}

function fieldsFor(meta: ReturnType<typeof useMeta>, excluded: string[] = []): DocField[] {
  return meta.getFields({ restrictNoValueFields: false }).filter((field) => !excluded.includes(field.fieldname))
}

function layoutFor(fields: DocField[], name: string): LayoutTab[] {
  return [
    {
      name,
      sections: [{ name: `${name}-section`, columns: [{ name: `${name}-column`, fields }] }],
    },
  ]
}

export function ExpenseClaimExtras({ data, setField, readOnly }: ExpenseClaimExtrasProps) {
  const expenseMeta = useMeta(childDefinitions.expense.doctype)
  const taxMeta = useMeta(childDefinitions.tax.doctype)
  const advanceMeta = useMeta(childDefinitions.advance.doctype)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState<ActiveEditor | null>(null)
  const [draft, setDraft] = useState<ChildRow | null>(null)
  const { advances, resource: advancesResource } = useAdvances()

  const expenseFields = useMemo(
    () => fieldsFor(expenseMeta, ['description_sb', 'amounts_sb', 'base_amount', 'base_sanctioned_amount']),
    [expenseMeta],
  )
  const taxFields = useMemo(() => fieldsFor(taxMeta, ['description_sb']), [taxMeta])
  const advanceFields = useMemo(() => fieldsFor(advanceMeta), [advanceMeta])
  const definition = active ? childDefinitions[active.kind] : null
  const editorFields = active?.kind === 'expense' ? expenseFields : active?.kind === 'tax' ? taxFields : advanceFields

  const expenseRows = rows(data.expenses)
  const taxRows = rows(data.taxes)
  const advanceRows = rows(data.advances)
  const availableAdvances = useMemo(() => {
    const currentAdvance = active?.kind === 'advance' ? String(draft?.employee_advance ?? '') : ''
    const usedNames = new Set(
      advanceRows
        .map((row) => String(row.employee_advance ?? ''))
        .filter((name) => name && name !== currentAdvance),
    )
    return advances.filter((advance) => {
      const name = String(advance.name ?? '')
      return name && (name === currentAdvance || (!usedNames.has(name) && numberValue(advance.balance_amount) > 0))
    })
  }, [active?.kind, advances, draft?.employee_advance, advanceRows])
  const filteredExpenses = expenseRows.filter((row) => {
    const query = search.trim().toLowerCase()
    return (
      !query ||
      String(row.expense_type ?? '')
        .toLowerCase()
        .includes(query)
    )
  })

  function updateTotals(nextExpenses: ChildRow[], nextTaxes: ChildRow[], nextAdvances: ChildRow[]) {
    const totals = calculateExpenseClaimTotals(nextExpenses, nextTaxes, nextAdvances)
    Object.entries(totals).forEach(([field, value]) => setField(field, value))
  }

  function openEditor(kind: ChildKind, index: number | null, row: ChildRow = {}) {
    setActive({ kind, index, row })
    setDraft({ ...row })
  }

  function closeEditor() {
    setActive(null)
    setDraft(null)
  }

  function updateDraft(field: string, value: unknown) {
    setDraft((current) => {
      if (!current) return current
      const next = { ...current, [field]: value }
      if (active?.kind === 'expense' && field === 'amount' && !active.index) next.sanctioned_amount = value
      if (active?.kind === 'tax' && (field === 'rate' || field === 'tax_amount')) {
        const taxAmount =
          field === 'rate' ? (numberValue(data.total_sanctioned_amount) * numberValue(value)) / 100 : numberValue(value)
        next.tax_amount = taxAmount
        next.total = numberValue(data.total_sanctioned_amount) + taxAmount
      }
      return next
    })
  }

  function selectAdvance(name: string) {
    const advance = advances.find((item) => String(item.name ?? '') === name)
    if (!advance) return
    const balance = numberValue(advance.balance_amount)
    const claimAmount = numberValue(data.total_claimed_amount) || numberValue(data.total_sanctioned_amount)
    setDraft((current) =>
      current
        ? {
            ...current,
            selected: true,
            employee_advance: advance.name,
            posting_date: advance.posting_date,
            advance_paid: (advance as unknown as Record<string, unknown>).paid_amount,
            unclaimed_amount: balance,
            allocated_amount: Math.min(balance, claimAmount || balance),
          }
        : current,
    )
  }

  function saveEditor() {
    if (!active || !draft) return
    const fields = editorFields
    const missing = findMissingMandatory(fields, draft, { doctypesMeta: {} })
    if (missing.length) return
    const currentRows = rows(data[definition!.field])
    const nextRow = {
      ...draft,
      ...(active.kind === 'advance' ? { selected: true } : {}),
      idx: active.index === null ? currentRows.length + 1 : draft.idx,
    }
    const nextRows =
      active.index === null
        ? [...currentRows, nextRow]
        : currentRows.map((row, index) => (index === active.index ? nextRow : row))
    setField(definition!.field, nextRows)
    if (active.kind === 'expense') updateTotals(nextRows, taxRows, advanceRows)
    if (active.kind === 'tax') updateTotals(expenseRows, nextRows, advanceRows)
    if (active.kind === 'advance') updateTotals(expenseRows, taxRows, nextRows)
    closeEditor()
  }

  function removeRow(kind: ChildKind, index: number) {
    const definition = childDefinitions[kind]
    const nextRows = rows(data[definition.field]).filter((_, rowIndex) => rowIndex !== index)
    setField(definition.field, nextRows)
    if (kind === 'expense') updateTotals(nextRows, taxRows, advanceRows)
    if (kind === 'tax') updateTotals(expenseRows, nextRows, advanceRows)
    if (kind === 'advance') updateTotals(expenseRows, taxRows, nextRows)
  }

  return (
    <div className="mt-6 flex flex-col gap-7 border-t border-outline-gray-2 pt-6">
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-gray-8">{__('Expenses')}</h2>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-ink-gray-8">
              {money(data.total_claimed_amount, data.currency)}
            </span>
            {!readOnly && (
              <Button
                icon="plus"
                variant="subtle"
                aria-label={__('Add Expense')}
                onClick={() => openEditor('expense', null)}
              />
            )}
          </div>
        </div>
        <TextInput
          className="mt-3"
          value={search}
          onChange={setSearch}
          placeholder={__('Search expenses')}
          aria-label={__('Search expenses')}
        />
        {filteredExpenses.length ? (
          <div className="mt-3 overflow-hidden rounded border border-outline-gray-2">
            {filteredExpenses.map((row) => {
              const index = expenseRows.indexOf(row)
              return (
                <button
                  key={`${String(row.name ?? index)}`}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 border-b border-outline-gray-1 p-3 text-left last:border-b-0 hover:bg-surface-gray-2"
                  onClick={() => openEditor('expense', index, row)}
                >
                  <span>
                    <span className="block text-sm text-ink-gray-8">{String(row.expense_type ?? __('Expense'))}</span>
                    <span className="text-xs text-ink-gray-5">
                      {__('Sanctioned')}: {money(row.sanctioned_amount, data.currency)}
                    </span>
                  </span>
                  <span className="text-sm text-ink-gray-8">{money(row.amount, data.currency)}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <EmptyState name="Expenses" />
        )}
      </section>
      <ChildSummarySection
        title="Taxes & Charges"
        total={money(data.total_taxes_and_charges, data.currency)}
        rows={taxRows}
        label={(row) => String(row.account_head ?? __('Tax'))}
        value={(row) => money(row.total, data.currency)}
        readOnly={readOnly}
        onAdd={() => openEditor('tax', null)}
        onEdit={(index) => openEditor('tax', index, taxRows[index])}
        onRemove={(index) => removeRow('tax', index)}
      />
      <ChildSummarySection
        title="Settle against Advances"
        total={money(data.total_advance_amount, data.currency)}
        rows={advanceRows}
        label={(row) => String(row.purpose ?? row.employee_advance ?? __('Advance'))}
        value={(row) => money(row.allocated_amount, data.currency)}
        readOnly={readOnly}
        onAdd={() => openEditor('advance', null)}
        onEdit={(index) => openEditor('advance', index, advanceRows[index])}
        onRemove={(index) => removeRow('advance', index)}
      />
      <div className="grid gap-3 rounded border border-outline-gray-2 bg-surface-gray-1 p-4 sm:grid-cols-4">
        {[
          ['Total Claimed', data.total_claimed_amount],
          ['Total Sanctioned', data.total_sanctioned_amount],
          ['Taxes & Charges', data.total_taxes_and_charges],
          ['Grand Total', data.grand_total],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <p className="text-xs text-ink-gray-5">{__(String(label))}</p>
            <p className="mt-1 font-semibold text-ink-gray-8">{money(value, data.currency)}</p>
          </div>
        ))}
      </div>
      <Dialog
        open={Boolean(active && draft)}
        onOpenChange={(open) => !open && closeEditor()}
        title={
          active ? __(active.index === null ? `New ${definition?.title ?? ''}` : `Edit ${definition?.title ?? ''}`) : ''
        }
        size="lg"
        actions={[{ label: __('Save'), variant: 'solid', onClick: () => saveEditor() }]}
      >
        {draft && definition && (
          <>
            {active?.kind === 'advance' && (
              <div className="mb-5 space-y-2">
                <Select
                  label={__('Available Employee Advance')}
                  value={String(draft.employee_advance ?? '') || null}
                  options={availableAdvances.map((advance) => ({
                    label: `${String(advance.name)} · ${String(advance.purpose ?? __('Employee Advance'))}`,
                    value: String(advance.name),
                    description: `${__('Available')}: ${String(advance.balance_amount ?? 0)} ${String(advance.currency ?? data.currency ?? '')}`,
                  }))}
                  placeholder={__('Select an available advance')}
                  onChange={(value) => selectAdvance(String(value ?? ''))}
                  disabled={advancesResource.loading && !availableAdvances.length}
                />
                {!availableAdvances.length && !advancesResource.loading && (
                  <p className="text-sm text-ink-gray-5">{__('No available employee advances found')}</p>
                )}
              </div>
            )}
            <FieldLayout
              tabs={layoutFor(editorFields, `${definition.doctype}-editor`)}
              data={draft}
              doctype={definition.doctype}
              context={{ onFieldChange: (field, value) => updateDraft(field, value) }}
            />
          </>
        )}
      </Dialog>
    </div>
  )
}

interface ChildSummarySectionProps {
  title: string
  total: string
  rows: ChildRow[]
  label: (row: ChildRow) => string
  value: (row: ChildRow) => string
  readOnly: boolean
  onAdd: () => void
  onEdit: (index: number) => void
  onRemove: (index: number) => void
}

function ChildSummarySection({
  title,
  total,
  rows,
  label,
  value,
  readOnly,
  onAdd,
  onEdit,
  onRemove,
}: ChildSummarySectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-gray-8">{__(title)}</h2>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-ink-gray-8">{total}</span>
          {!readOnly && <Button icon="plus" variant="subtle" aria-label={__('Add {0}', [title])} onClick={onAdd} />}
        </div>
      </div>
      {rows.length ? (
        <div className="mt-3 overflow-hidden rounded border border-outline-gray-2">
          {rows.map((row, index) => (
            <div
              key={`${title}-${String(row.name ?? index)}`}
              className="flex items-center justify-between gap-3 border-b border-outline-gray-1 p-3 last:border-b-0"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left hover:text-ink-blue-7"
                onClick={() => onEdit(index)}
              >
                <span className="block truncate text-sm text-ink-gray-8">{label(row)}</span>
                <span className="text-xs text-ink-gray-5">{value(row)}</span>
              </button>
              {!readOnly && (
                <Button
                  icon="trash-2"
                  variant="ghost"
                  theme="red"
                  aria-label={__('Delete')}
                  onClick={() => onRemove(index)}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState name={title} />
      )}
    </section>
  )
}

import { describe, expect, it } from 'vitest'
import { isFilterExpression, summarizeCondition, toExpression, toFilters } from '../utils/workflowConditions'
import { workflowEdges } from '../utils/workflowGraph'
import {
  EVENT_MATCHED,
  insertAfter,
  layoutSteps,
  newStep,
  removeStep,
  stepsBefore,
  toRows,
  toTree,
} from '../utils/workflowSteps'

describe('workflow conditions', () => {
  it('round-trips comparisons, membership, contains and presence', () => {
    const filters: any = [
      ['status', '=', 'Open'],
      'and',
      ['score', '>', 50],
      'or',
      ['source', 'in', ['Web', 'Ads']],
      'and',
      ['email', 'is', 'set'],
      'and',
      ['name', 'like', 'ann'],
    ]
    const expression = toExpression(filters)
    expect(expression).toBe(
      'doc.status == "Open" and doc.score > 50 or doc.source in ["Web", "Ads"] and (doc.email or "") != "" and "ann" in (doc.name or "").lower()',
    )
    expect(toFilters(expression)).toEqual(filters)
  })

  it('treats a plain list of rows as all-of and drops dangling conjunctions', () => {
    expect(
      toExpression([
        ['a', '=', 'x'],
        ['b', '=', 'y'],
      ] as any),
    ).toBe('doc.a == "x" and doc.b == "y"')
    expect(toExpression(['and', ['a', '=', 'x'], 'or'] as any)).toBe('doc.a == "x"')
  })

  it('parses groups and rejects expressions it cannot represent', () => {
    expect(toFilters('(doc.a == "x" or doc.b == "y") and doc.c == 1')).toEqual([
      [['a', '=', 'x'], 'or', ['b', '=', 'y']],
      'and',
      ['c', '=', 1],
    ])
    expect(isFilterExpression('len(doc.a) > 3')).toBe(false)
    expect(summarizeCondition('doc.status == "Open"')).toContain('Open')
  })
})

describe('workflow step tree', () => {
  it('flattens branches after their If and restores them', () => {
    const tree = [newStep({ step_type: 'If', step_condition: 'doc.a == 1' }), newStep({ action_type: 'SetFieldValue' })]
    const branch = tree[0]!
    branch.children.If.push(newStep({ action_type: 'SendNotification' }))
    branch.children.Else.push(newStep({ action_type: 'AssignToUser' }))

    const rows = toRows(tree)
    expect(rows.map((row) => [row.idx, row.parent_step, row.branch])).toEqual([
      [1, 0, ''],
      [2, 1, 'If'],
      [3, 1, 'Else'],
      [4, 0, ''],
    ])
    const restored = toTree(rows)
    expect(restored).toHaveLength(2)
    expect(restored[0]?.children.If).toHaveLength(1)
    expect(restored[0]?.children.Else).toHaveLength(1)
  })

  it('writes a wait-for-event as a wait plus an outcome If, and folds it back', () => {
    const wait = newStep({ step_type: 'WaitForEvent' })
    wait.children.If.push(newStep({ action_type: 'SendNotification' }))
    const rows = toRows([wait])
    expect(rows).toHaveLength(3)
    expect(rows[1]?.step_condition).toBe(EVENT_MATCHED)
    const tree = toTree(rows)
    expect(tree).toHaveLength(1)
    expect(tree[0]?.children.If).toHaveLength(1)
  })

  it('generates unique step keys', () => {
    const rows = toRows([newStep({ action_type: 'SetFieldValue' }), newStep({ action_type: 'SetFieldValue' })])
    expect(rows.map((row) => row.step_key)).toEqual(['set_field_value', 'set_field_value_2'])
  })

  it('inserts, removes and finds earlier steps', () => {
    const first = newStep()
    const second = newStep()
    const tree = [first]
    insertAfter(tree, first, second)
    expect(tree).toEqual([first, second])
    expect(stepsBefore(tree, second)).toEqual([first])
    expect(removeStep(tree, first)).toBe(true)
    expect(tree).toEqual([second])
    expect(stepsBefore(tree, first)).toEqual([])
  })

  it('lays arms out above and below their If and connects labelled edges', () => {
    const branch = newStep({ step_type: 'If', step_condition: 'doc.a == 1' })
    const yes = newStep()
    const no = newStep()
    branch.children.If.push(yes)
    branch.children.Else.push(no)
    const placed = layoutSteps([branch])
    const yesY = placed.find((entry) => entry.node === yes)?.position.y ?? 0
    const noY = placed.find((entry) => entry.node === no)?.position.y ?? 0
    expect(yesY).toBeLessThan(noY)
    const edges = workflowEdges([branch])
    expect(edges.map((edge) => edge.label)).toEqual([null, 'True', 'False'])
  })
})

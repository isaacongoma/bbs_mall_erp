import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldLayout, type LayoutTab } from '../components/FieldLayout'

vi.mock('../hooks/useUsers', () => ({
  useUsers: () => ({
    crmUsers: [],
    allUsers: [],
    getUser: () => ({ full_name: 'Tester', name: 'tester' }),
    isManager: () => false,
  }),
}))

const tabs: LayoutTab[] = [
  {
    name: 'tab_1',
    label: '',
    sections: [
      {
        name: 'section_1',
        label: '',
        columns: [
          {
            name: 'column_1',
            fields: [
              { fieldname: 'title', label: 'Title', fieldtype: 'Data', reqd: 1 },
              { fieldname: 'approved', label: 'Approved', fieldtype: 'Check' },
              { fieldname: 'notes', label: 'Notes', fieldtype: 'Data', depends_on: 'eval:doc.approved' },
              { fieldname: 'kind', label: 'Kind', fieldtype: 'Select', options: 'A\nB' },
            ],
          },
        ],
      },
    ],
  },
]

describe('FieldLayout', () => {
  it('renders fields, required markers and depends_on visibility', () => {
    render(<FieldLayout tabs={tabs} data={{ title: 'Hello', approved: 0 }} doctype="" context={{}} />)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument()
  })

  it('shows dependent fields once their condition holds', () => {
    render(<FieldLayout tabs={tabs} data={{ title: 'Hello', approved: 1 }} doctype="" context={{}} />)
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('commits text edits on blur through the standalone context', () => {
    const onFieldChange = vi.fn()
    render(<FieldLayout tabs={tabs} data={{ title: 'Hello' }} doctype="" context={{ onFieldChange }} />)
    const input = screen.getByDisplayValue('Hello')
    fireEvent.change(input, { target: { value: 'World' } })
    expect(onFieldChange).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(onFieldChange).toHaveBeenCalledWith('title', 'World', undefined)
  })

  it('mutates the data object and re-renders when no handler is supplied', () => {
    const data: Record<string, unknown> = { title: 'Hello' }
    render(<FieldLayout tabs={tabs} data={data} doctype="" context={{}} />)
    const input = screen.getByDisplayValue('Hello')
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.blur(input)
    expect(data.title).toBe('Changed')
    expect(screen.getByDisplayValue('Changed')).toBeInTheDocument()
  })
})

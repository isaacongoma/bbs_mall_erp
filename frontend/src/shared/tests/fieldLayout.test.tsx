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

const specialTabs: LayoutTab[] = [
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
              { fieldname: 'markdown', label: 'Markdown', fieldtype: 'Markdown' },
              { fieldname: 'payload', label: 'Payload', fieldtype: 'JSON' },
              { fieldname: 'barcode', label: 'Barcode', fieldtype: 'Barcode' },
              { fieldname: 'phone', label: 'Phone', fieldtype: 'Phone' },
              { fieldname: 'color', label: 'Color', fieldtype: 'Color' },
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

  it('renders special field controls and commits valid JSON and phone values', () => {
    const onFieldChange = vi.fn()
    render(
      <FieldLayout
        tabs={specialTabs}
        data={{ markdown: '# Heading', payload: '{"enabled":true}', barcode: '12345', phone: '+254700000000', color: '#112233' }}
        doctype=""
        context={{ onFieldChange }}
      />,
    )

    expect(screen.getByDisplayValue('# Heading')).toBeInTheDocument()
    expect(screen.getByDisplayValue('{"enabled":true}')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12345')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+254700000000')).toBeInTheDocument()
    expect(screen.getByText('#112233')).toBeInTheDocument()

    const json = screen.getByDisplayValue('{"enabled":true}')
    fireEvent.change(json, { target: { value: '{"enabled":false}' } })
    fireEvent.blur(json)
    expect(onFieldChange).toHaveBeenCalledWith('payload', '{"enabled":false}', undefined)
  })
})

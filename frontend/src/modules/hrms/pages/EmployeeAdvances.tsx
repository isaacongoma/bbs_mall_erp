import { DocumentListPage } from '../components/DocumentListPage'
import { useState } from 'react'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useHrmsDocumentList } from '../stores/listStore'

export default function EmployeeAdvances() {
  const [scope, setScope] = useState<'mine' | 'team'>('mine')
  const { documents, resource } = useHrmsDocumentList('Employee Advance', useHrmsEmployee(), {}, scope)
  return (
    <DocumentListPage
      title="Employee Advances"
      emptyName="Employee Advances"
      documents={documents}
      loading={resource.loading}
      error={resource.error}
      fields={['name', 'posting_date', 'purpose', 'advance_amount', 'paid_amount', 'status']}
      createPath="/hrms/employee-advances/new"
      filters={[
        {
          field: 'status',
          label: 'Status',
          options: ['Draft', 'Paid', 'Partially Paid', 'Unpaid', 'Claimed', 'Returned', 'Cancelled'],
        },
      ]}
      scope={scope}
      onScopeChange={setScope}
    />
  )
}

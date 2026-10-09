import { DocumentListPage } from '../components/DocumentListPage'
import { useState } from 'react'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useHrmsDocumentList } from '../stores/listStore'

export default function ClaimList() {
  const [scope, setScope] = useState<'mine' | 'team'>('mine')
  const { documents, resource } = useHrmsDocumentList('Expense Claim', useHrmsEmployee(), {}, scope)
  return (
    <DocumentListPage
      title="Claim History"
      emptyName="Expense Claims"
      documents={documents}
      loading={resource.loading}
      error={resource.error}
      fields={['name', 'posting_date', 'total_claimed_amount', 'approval_status', 'status']}
      createPath="/hrms/expense-claims/new"
      filters={[
        { field: 'approval_status', label: 'Approval Status', options: ['Draft', 'Approved', 'Rejected'] },
        { field: 'status', label: 'Status', options: ['Draft', 'Submitted', 'Paid', 'Cancelled'] },
      ]}
      scope={scope}
      onScopeChange={setScope}
    />
  )
}

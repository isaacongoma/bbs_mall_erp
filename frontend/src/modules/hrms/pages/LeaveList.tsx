import { DocumentListPage } from '../components/DocumentListPage'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useHrmsDocumentList } from '../stores/listStore'

export default function LeaveList() {
  const { documents, resource } = useHrmsDocumentList('Leave Application', useHrmsEmployee())
  return (
    <DocumentListPage
      title="Leave History"
      emptyName="Leaves"
      documents={documents}
      loading={resource.loading}
      error={resource.error}
      fields={['name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'status']}
      createPath="/hrms/leaves/new"
      filters={[{ field: 'status', label: 'Status', options: ['Open', 'Approved', 'Rejected', 'Cancelled'] }]}
    />
  )
}

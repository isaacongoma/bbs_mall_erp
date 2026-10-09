import { HrmsDocumentForm } from '../components/HrmsDocumentForm'
import { useHrmsEmployee } from '../stores/employeeStore'
import { dayjsLocal } from '@/core/datetime'
import { useParams } from 'react-router-dom'

export default function LeaveRequestForm() {
  const { id } = useParams()
  return (
    <HrmsDocumentForm
      doctype="Leave Application"
      title="Request a Leave"
      description="Submit a leave request for your employee profile."
      listPath="/hrms/leaves/list"
      employee={useHrmsEmployee()}
      docname={id}
      seed={{ posting_date: dayjsLocal().format('YYYY-MM-DD') }}
      excludedFields={[
        'naming_series',
        'employee',
        'employee_name',
        'department',
        'company',
        'posting_date',
        'status',
        'follow_via_email',
        'salary_slip',
        'letter_head',
        'sb_other_details',
      ]}
    />
  )
}

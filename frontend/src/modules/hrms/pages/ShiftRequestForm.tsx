import { HrmsDocumentForm } from '../components/HrmsDocumentForm'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useParams } from 'react-router-dom'

export default function ShiftRequestForm() {
  const { id } = useParams()
  return (
    <HrmsDocumentForm
      doctype="Shift Request"
      title="Request a Shift"
      description="Submit a shift request for your employee profile."
      listPath="/hrms/attendance/shift-requests"
      employee={useHrmsEmployee()}
      docname={id}
      excludedFields={['naming_series', 'employee', 'employee_name', 'department', 'company', 'posting_date', 'status']}
    />
  )
}

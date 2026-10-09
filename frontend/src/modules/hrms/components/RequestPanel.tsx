import { useMemo, useState } from 'react'
import { __ } from '@/core/i18n'
import { TabButtons } from '@/design-system'
import { RequestList } from './RequestList'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useAttendanceRequests, useShiftRequests } from '../stores/attendanceStore'
import { useLeaves } from '../stores/leaveStore'
import { useClaims } from '../stores/financeStore'
import type { HrmsRequest } from '../types'

export function RequestPanel() {
  const employee = useHrmsEmployee()
  const [activeTab, setActiveTab] = useState('My Requests')
  const team = activeTab === 'Team Requests'
  const leaves = useLeaves(employee, team)
  const claims = useClaims(employee, team)
  const shifts = useShiftRequests(employee, team)
  const attendance = useAttendanceRequests(employee, team)
  const requests = useMemo(
    () =>
      [...leaves.leaves, ...claims.claims, ...shifts.requests, ...attendance.requests]
        .sort((a, b) => String(b.creation ?? '').localeCompare(String(a.creation ?? '')))
        .slice(0, 10),
    [attendance.requests, claims.claims, leaves.leaves, shifts.requests],
  )
  const loading =
    leaves.resource.loading || claims.resource.loading || shifts.resource.loading || attendance.resource.loading
  const error = leaves.resource.error || claims.resource.error || shifts.resource.error || attendance.resource.error
  return (
    <section className="flex w-full flex-col gap-4">
      <TabButtons
        options={[
          { label: __('My Requests'), value: 'My Requests' },
          { label: __('Team Requests'), value: 'Team Requests' },
        ]}
        value={activeTab}
        onChange={(value) => setActiveTab(String(value))}
      />
      <RequestList
        items={requests as HrmsRequest[]}
        loading={loading}
        error={error}
        kind="leave"
        emptyName={team ? 'Team Requests' : 'Requests'}
      />
    </section>
  )
}

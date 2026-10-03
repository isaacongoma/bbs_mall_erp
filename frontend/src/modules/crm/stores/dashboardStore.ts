import { create } from 'zustand'
import { __ } from '@/core/i18n'
import { createResource } from '@/core/resources'
import { toast } from '@/design-system'

export interface ChartTypeOption {
  label: string
  value: string
}

interface DashboardState {
  chartTypes: ChartTypeOption[]
  chartOptionsByType: Record<string, any>
}

export const useDashboardStore = create<DashboardState>(() => ({ chartTypes: [], chartOptionsByType: {} }))

let errorNotified = false
let chartOptions: ReturnType<typeof createChartOptions> | null = null

function createChartOptions() {
  return createResource({
    url: 'crm.api.dashboard.get_chart_options',
    cache: 'crm-dashboard-chart-options',
    auto: true,
    onSuccess: (data: Record<string, any> = {}) => {
      const { chart_types = [], ...optionsByType } = data
      useDashboardStore.setState({ chartTypes: chart_types, chartOptionsByType: optionsByType })
      errorNotified = false
    },
    onError: () => {
      if (!errorNotified) {
        errorNotified = true
        toast.error(__('Could not load chart options'))
      }
      if (!useDashboardStore.getState().chartTypes.length) {
        useDashboardStore.setState({ chartTypes: [{ label: __('Spacer'), value: 'spacer' }] })
      }
    },
  })
}

export function ensureChartOptionsLoaded() {
  if (!chartOptions) chartOptions = createChartOptions()
  return chartOptions
}

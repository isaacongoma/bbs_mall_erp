import { __, frappe } from '@/shared/frappe/runtime'
import { Chart } from 'frappe-charts/dist/frappe-charts.esm'
frappe.provide('frappe.ui')
frappe.Chart = Chart
frappe.ui.RealtimeChart = class RealtimeChart extends frappe.Chart {
  [key: string]: any
  constructor(element?: any, socketEvent?: any, maxLabelPoints: any = 8, data?: any) {
    super(element, data)
    if (data.data.datasets[0].values.length > maxLabelPoints) {
      frappe.throw(__('Length of passed data array is greater than value of maximum allowed label points!'))
    }
    this.currentSize = data.data.datasets[0].values.length
    this.socketEvent = socketEvent
    this.maxLabelPoints = maxLabelPoints
    this.start_updating = function (this: any) {
      frappe.realtime.on(this.socketEvent, (data?: any) => {
        this.update_chart(data.label, data.points)
      })
    }
    this.stop_updating = function (this: any) {
      frappe.realtime.off(this.socketEvent)
    }
    this.update_chart = function (this: any, label?: any, data?: any) {
      if (this.currentSize >= this.maxLabelPoints) {
        this.removeDataPoint(0)
      } else {
        this.currentSize++
      }
      this.addDataPoint(__(label), data)
    }
  }
}

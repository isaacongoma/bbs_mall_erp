import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Item Lead Time', {
  refresh(frm?: any) {
    frm.trigger('setup_queries')
  },
  shift_time_in_hours(frm?: any) {
    frm.trigger('calculate_total_workstation_time')
  },
  no_of_workstations(frm?: any) {
    frm.trigger('calculate_total_workstation_time')
  },
  no_of_shift(frm?: any) {
    frm.trigger('calculate_total_workstation_time')
  },
  validate(frm?: any) {
    frm.trigger('calculate_total_workstation_time')
  },
  calculate_total_workstation_time(frm?: any) {
    const total_workstation_time = frm.doc.shift_time_in_hours * frm.doc.no_of_workstations * frm.doc.no_of_shift
    frm.set_value('total_workstation_time', total_workstation_time)
  },
  total_workstation_time(frm?: any) {
    frm.trigger('calculate_no_of_units_produced')
  },
  manufacturing_time_in_mins(frm?: any) {
    frm.trigger('calculate_no_of_units_produced')
  },
  calculate_no_of_units_produced(frm?: any) {
    const no_of_units_produced = (frm.doc.total_workstation_time / frm.doc.manufacturing_time_in_mins) * 60
    frm.set_value('no_of_units_produced', no_of_units_produced)
  },
  no_of_units_produced(frm?: any) {
    frm.trigger('calculate_capacity_per_day')
  },
  daily_yield(frm?: any) {
    frm.trigger('calculate_capacity_per_day')
  },
  calculate_capacity_per_day(frm?: any) {
    const capacity_per_day = (frm.doc.daily_yield * frm.doc.no_of_units_produced) / 100
    frm.set_value('capacity_per_day', Math.ceil(capacity_per_day))
  },
})

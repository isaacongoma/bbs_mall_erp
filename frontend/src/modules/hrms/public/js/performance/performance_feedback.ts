import { $, __, frappe, hrms } from '@/shared/frappe'

frappe.provide('hrms')
hrms.PerformanceFeedback = class PerformanceFeedback {
  [key: string]: any
  constructor({ frm, wrapper }: any) {
    this.frm = frm
    this.wrapper = wrapper
  }
  refresh(this: any) {
    this.prepare_dom()
    this.setup_feedback_view()
  }
  prepare_dom(this: any) {
    this.wrapper.find('.feedback-section').remove()
  }
  setup_feedback_view(this: any) {
    frappe.run_serially([
      () => this.get_feedback_history(),
      (data: any) => this.render_feedback_history(data),
      () => this.setup_actions(),
    ])
  }
  get_feedback_history(this: any) {
    let me = this
    return new Promise((resolve: any) => {
      frappe
        .call({
          method: 'hrms.hr.doctype.appraisal.appraisal.get_feedback_history',
          args: {
            employee: me.frm.doc.employee,
            appraisal: me.frm.doc.name,
          },
        })
        .then((r: any) => resolve(r.message))
    })
  }
  async render_feedback_history(this: any, data: any) {
    const { feedback_history, reviews_per_rating, avg_feedback_score } = data || {}
    const can_create = await this.can_create()
    const feedback_html = frappe.render_template('performance_feedback', {
      feedback_history: feedback_history,
      average_feedback_score: avg_feedback_score,
      reviews_per_rating: reviews_per_rating,
      can_create: can_create,
    })
    $(this.wrapper).empty()
    $(feedback_html).appendTo(this.wrapper)
  }
  setup_actions(this: any) {
    let me = this
    $('.new-feedback-btn').click(() => {
      me.add_feedback()
    })
  }
  add_feedback(this: any) {
    frappe.run_serially([
      () => this.get_feedback_criteria_data(),
      (criteria_data: any) => this.show_add_feedback_dialog(criteria_data),
    ])
  }
  get_feedback_criteria_data(this: any) {
    let me = this
    return new Promise((resolve: any) => {
      frappe.db.get_doc('Appraisal Template', me.frm.doc.appraisal_template).then(({ rating_criteria }: any) => {
        const criteria_list: any = []
        rating_criteria.forEach((entry: any) => {
          criteria_list.push({
            criteria: entry.criteria,
            per_weightage: entry.per_weightage,
          })
        })
        resolve(criteria_list)
      })
    })
  }
  show_add_feedback_dialog(this: any, criteria_data: any) {
    let me = this
    const dialog = new frappe.ui.Dialog({
      title: __('Add Feedback'),
      fields: me.get_feedback_dialog_fields(criteria_data),
      size: 'large',
      minimizable: true,
      primary_action_label: __('Submit'),
      primary_action: function () {
        const data = dialog.get_values()
        frappe.call({
          method: 'add_feedback',
          doc: me.frm.doc,
          args: {
            feedback: data.feedback,
            feedback_ratings: data.feedback_ratings,
          },
          freeze: true,
          callback: function (r: any) {
            if (!r.exc) {
              frappe.run_serially([() => me.frm.refresh_fields(), () => me.refresh()])
              frappe.show_alert({
                message: __('Feedback {0} added successfully', [r.message?.name?.bold()]),
                indicator: 'green',
              })
            }
            dialog.hide()
          },
        })
      },
    })
    dialog.show()
  }
  get_feedback_dialog_fields(criteria_data: any) {
    return [
      {
        label: 'Feedback',
        fieldname: 'feedback',
        fieldtype: 'Text Editor',
        reqd: 1,
        enable_mentions: true,
      },
      {
        label: 'Feedback Rating',
        fieldtype: 'Table',
        fieldname: 'feedback_ratings',
        cannot_add_rows: true,
        data: criteria_data,
        fields: [
          {
            fieldname: 'criteria',
            fieldtype: 'Link',
            in_list_view: 1,
            label: 'Criteria',
            options: 'Employee Feedback Criteria',
            reqd: 1,
          },
          {
            fieldname: 'per_weightage',
            fieldtype: 'Percent',
            in_list_view: 1,
            label: 'Weightage',
          },
          {
            fieldname: 'rating',
            fieldtype: 'Rating',
            in_list_view: 1,
            label: 'Rating',
          },
        ],
      },
    ]
  }
  async can_create() {
    const is_employee =
      (await frappe.db.get_value('Employee', { user_id: frappe.session.user }, 'name'))?.message?.name || false
    return is_employee && frappe.model.can_create('Employee Performance Feedback')
  }
}

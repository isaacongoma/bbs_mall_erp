import { $, __, cint, flt, frappe, hrms, refresh_field } from '@/shared/frappe'

frappe.ui.form.on('Appraisal', {
  refresh(frm: any) {
    if (!frm.doc.__islocal) {
      frm.trigger('add_custom_buttons')
      frm.trigger('show_feedback_history')
      frm.trigger('setup_chart')
    }
    frm.sidebar.image_wrapper.find('.sidebar-image-actions').addClass('hide')
  },
  appraisal_template(frm: any) {
    if (frm.doc.appraisal_template) {
      frm.call('set_kras_and_rating_criteria', () => {
        frm.refresh_field('appraisal_kra')
        frm.refresh_field('feedback_ratings')
      })
    }
  },
  appraisal_cycle(frm: any) {
    if (frm.doc.appraisal_cycle) {
      frappe.run_serially([
        () => {
          if (frm.doc.__islocal && frm.doc.appraisal_cycle) {
            frappe.db.get_value('Appraisal Cycle', frm.doc.appraisal_cycle, 'kra_evaluation_method', (r: any) => {
              if (r.kra_evaluation_method) {
                frm.set_value('rate_goals_manually', cint(r.kra_evaluation_method === 'Manual Rating'))
              }
            })
          }
        },
        () => {
          frm.call({
            method: 'set_appraisal_template',
            doc: frm.doc,
          })
        },
      ])
    }
  },
  add_custom_buttons(frm: any) {
    frm.add_custom_button(__('View Goals'), function () {
      frappe.route_options = {
        company: frm.doc.company,
        employee: frm.doc.employee,
        appraisal_cycle: frm.doc.appraisal_cycle,
      }
      frappe.set_route('Tree', 'Goal')
    })
  },
  show_feedback_history(frm: any) {
    frappe.require('performance.bundle.js', () => {
      const feedback_history = new hrms.PerformanceFeedback({
        frm: frm,
        wrapper: $(frm.fields_dict.feedback_html.wrapper),
      })
      feedback_history.refresh()
    })
  },
  setup_chart(frm: any) {
    const labels: any = []
    const maximum_scores: any = []
    const scores: any = []
    frm.doc.appraisal_kra.forEach((d: any) => {
      labels.push(d.kra)
      maximum_scores.push(d.per_weightage || 0)
      scores.push(d.goal_score || 0)
    })
    if (labels.length && maximum_scores.length && scores.length) {
      frm.dashboard.render_graph({
        data: {
          labels: labels,
          datasets: [
            {
              name: 'Maximum Score',
              chartType: 'bar',
              values: maximum_scores,
            },
            {
              name: 'Score Obtained',
              chartType: 'bar',
              values: scores,
            },
          ],
        },
        title: __('Scores'),
        height: 250,
        type: 'bar',
        barOptions: {
          spaceRatio: 0.7,
        },
        colors: ['blue', 'green'],
      })
    }
  },
  calculate_total(frm: any) {
    let total = 0
    frm.doc.goals.forEach((d: any) => {
      total += flt(d.score_earned)
    })
    frm.set_value('total_score', total)
  },
})
frappe.ui.form.on('Appraisal Goal', {
  score(frm: any, cdt: any, cdn: any) {
    let d = frappe.get_doc(cdt, cdn)
    if (flt(d.score) > 5) {
      frappe.msgprint(__('Score must be less than or equal to 5'))
      d.score = 0
      refresh_field('score', d.name, 'goals')
    } else {
      frm.trigger('set_score_earned', cdt, cdn)
    }
  },
  per_weightage(frm: any, cdt: any, cdn: any) {
    frm.trigger('set_score_earned', cdt, cdn)
  },
  goals_remove(frm: any, cdt: any, cdn: any) {
    frm.trigger('set_score_earned', cdt, cdn)
  },
  set_score_earned(frm: any, cdt: any, cdn: any) {
    let d = frappe.get_doc(cdt, cdn)
    let score_earned = (flt(d.score) * flt(d.per_weightage)) / 100
    frappe.model.set_value(cdt, cdn, 'score_earned', score_earned)
    frm.trigger('calculate_total')
  },
})

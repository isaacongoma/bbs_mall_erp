import { ref } from 'vue'
import { h } from 'vue'

export function useActivityTimeline(doctype, docname, visibleTypes) {
  const activities = ref([])
  const loading = ref(false)
  const paginate = () => {}
  const reload = () => {}

  return { activities, loading, paginate, reload }
}

export const ActivityTimeline = {
  props: ['activities', 'loading', 'paginate'],
  render() {
    return h('div', { class: 'activity-timeline-shim' }, [
      this.$slots.empty ? this.$slots.empty() : null
    ])
  }
}

export const TimelineContainer = {
  render() {
    return h('div', { class: 'timeline-container-shim' }, this.$slots.default ? this.$slots.default() : [])
  }
}

export const EmailItem = {
  props: ['email'],
  render() {
    return h('div', { class: 'email-item-shim' }, this.$slots.default ? this.$slots.default() : [])
  }
}

export const LogItem = {
  props: ['activity'],
  render() {
    return h('div', { class: 'log-item-shim' })
  }
}

<!--
  Compatibility shim for `@framework/ui/components/ConditionBuilder`.

  The real component lives only in frappe-ui's private/unreleased monorepo
  (the one frappe/crm's own vite config points `@framework/ui` at via a
  sibling checkout) -- it ships in NEITHER the published `frappe-ui` npm
  package this project installs NOR anywhere else publicly fetchable. It is
  not obtainable, full stop, so it cannot be vendored verbatim the way every
  other component in this port has been.

  This is a from-scratch, functionally-equivalent replacement -- same props
  (modelValue as a {conditions:[...]} tree, doctype, maxDepth, bordered),
  same emit (update:modelValue), same data-shape contract as emptyTree/
  fromFrappeConditions/toFrappeConditions below -- built from this app's own
  already-ported primitives (Combobox/FormControl/Link, the same field list
  Filter.vue already uses via crm.api.doc.get_filterable_fields). It does not
  attempt to reproduce the original's exact DOM structure or the `data-slot`
  CSS selectors WorkflowFilters.vue's <style> block targets, since that
  markup was never available to copy -- only the affected file is
  Settings/WorkflowAutomations/WorkflowFilters.vue (the Workflow Automation
  trigger/condition editor), a Settings sub-page explicitly deferred per the
  user's own "core pages first" sequencing decision.
-->
<template>
  <div data-slot="condition-builder" class="flex flex-col gap-2">
    <ConditionGroup
      :node="localTree"
      :depth="0"
      :max-depth="maxDepth"
      :doctype="doctype"
      :fields="fields"
      :is-root="true"
      @change="onChange"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { createResource } from 'frappe-ui'
import ConditionGroup from './ConditionGroupRow.vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  doctype: { type: String, default: '' },
  maxDepth: { type: Number, default: 2 },
  bordered: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const localTree = ref(cloneTree(props.modelValue))

watch(
  () => props.modelValue,
  (val) => {
    localTree.value = cloneTree(val)
  },
)

function cloneTree(tree) {
  return JSON.parse(JSON.stringify(tree || { conditions: [] }))
}

function onChange(next) {
  localTree.value = next
  emit('update:modelValue', next)
}

const fieldsResource = createResource({
  url: 'crm.api.doc.get_filterable_fields',
  cache: ['workflowConditionFields', props.doctype],
  params: { doctype: props.doctype },
  auto: !!props.doctype,
})

const fields = computed(() =>
  (fieldsResource.data || []).map((f) => ({ ...f, value: f.fieldname })),
)
</script>

<!-- Recursive row renderer for ConditionBuilder.vue -- see that file's header
     comment for why this shim exists. Renders one group's leaf conditions and
     nested groups, each leaf editable via the same field/operator/value
     pattern as this app's own Filter.vue. -->
<template>
  <ul data-slot="condition-group" class="flex flex-col gap-2">
    <li
      v-for="(item, index) in node.conditions"
      :key="index"
      class="flex items-start gap-2"
    >
      <span v-if="index > 0" class="pt-2 text-xs text-ink-gray-5 w-10 shrink-0">
        {{ item.connector === 'or' ? __('Or') : __('And') }}
      </span>
      <span v-else class="pt-2 text-xs text-ink-gray-5 w-10 shrink-0">
        {{ __('Where') }}
      </span>

      <ConditionGroupRow
        v-if="isGroup(item)"
        data-slot="condition-group-nested"
        class="flex-1 rounded border border-outline-gray-2 p-2"
        :node="item"
        :depth="depth + 1"
        :max-depth="maxDepth"
        :doctype="doctype"
        :fields="fields"
        @change="(g) => updateItem(index, g)"
      />
      <div
        v-else
        data-slot="condition-leaf"
        class="grid flex-1 grid-cols-3 gap-2"
      >
        <Combobox
          data-slot="condition-field"
          :model-value="item.fieldname"
          :options="fields"
          :placeholder="__('Field')"
          @update:selected-option="(f) => updateLeaf(index, { fieldname: f?.fieldname || '' })"
        />
        <FormControl
          type="select"
          :model-value="item.operator"
          :options="operatorOptions"
          @update:modelValue="(v) => updateLeaf(index, { operator: v })"
        />
        <FormControl
          data-slot="condition-value"
          type="text"
          :model-value="item.value"
          :placeholder="__('Value')"
          @update:modelValue="(v) => updateLeaf(index, { value: v })"
        />
      </div>

      <Button variant="ghost" icon="lucide-x" @click="removeItem(index)" />
    </li>
  </ul>
  <div class="flex gap-2">
    <Button variant="subtle" :label="__('Add Condition')" iconLeft="plus" @click="addLeaf" />
    <Button
      v-if="depth < maxDepth"
      variant="subtle"
      :label="__('Add Condition Group')"
      iconLeft="plus"
      @click="addGroup"
    />
  </div>
</template>

<script setup>
import { Combobox, FormControl, Button } from 'frappe-ui'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  maxDepth: { type: Number, default: 2 },
  doctype: { type: String, default: '' },
  fields: { type: Array, default: () => [] },
  isRoot: { type: Boolean, default: false },
})
const emit = defineEmits(['change'])

const operatorOptions = [
  { label: __('Equals'), value: 'equals' },
  { label: __('Not equals'), value: 'not equals' },
  { label: __('Like'), value: 'like' },
  { label: __('Not like'), value: 'not like' },
  { label: __('Is'), value: 'is' },
  { label: __('Is not'), value: 'is not' },
]

function isGroup(item) {
  return item && Array.isArray(item.conditions)
}

function emitNext(conditions) {
  emit('change', { ...props.node, conditions })
}

function updateItem(index, value) {
  const conditions = [...props.node.conditions]
  conditions[index] = value
  emitNext(conditions)
}

function updateLeaf(index, patch) {
  const conditions = [...props.node.conditions]
  conditions[index] = { ...conditions[index], ...patch }
  emitNext(conditions)
}

function removeItem(index) {
  const conditions = props.node.conditions.filter((_, i) => i !== index)
  emitNext(conditions)
}

function addLeaf() {
  const connector = props.node.conditions.length ? 'and' : undefined
  emitNext([
    ...props.node.conditions,
    { fieldname: '', operator: 'equals', value: '', connector },
  ])
}

function addGroup() {
  const connector = props.node.conditions.length ? 'and' : undefined
  emitNext([...props.node.conditions, { conditions: [], connector }])
}
</script>

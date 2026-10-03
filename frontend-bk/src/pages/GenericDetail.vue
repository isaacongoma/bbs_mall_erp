<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs :items="breadcrumbs">
        <template #prefix="{ item }">
          <Icon v-if="item.icon" :icon="item.icon" class="mr-2 h-4" />
        </template>
      </Breadcrumbs>
    </template>
    <template v-if="!errorTitle" #right-header>
      <CustomActions
        v-if="document._actions?.length"
        :actions="document._actions"
      />
      <CustomActions
        v-if="document.actions?.length"
        :actions="document.actions"
      />
    </template>
  </LayoutHeader>
  <div v-if="doc.name" class="flex h-full overflow-hidden p-5">
    <div class="flex flex-col w-full h-full max-w-4xl mx-auto gap-5">
      <div class="flex items-center justify-between border-b pb-5">
        <div class="flex flex-col gap-2.5">
          <div class="text-3xl-medium text-ink-gray-9">
            {{ title }}
          </div>
          <div class="text-lg text-ink-gray-5">
            {{ doctype }} &middot; {{ id }}
          </div>
        </div>
        <div class="flex gap-2">
           <Button
             v-if="canDelete"
             :tooltip="__('Delete')"
             variant="subtle"
             theme="red"
             icon="lucide-trash-2"
             @click="deleteDoc"
           />
        </div>
      </div>
      <div
        class="flex flex-col h-full overflow-y-auto"
      >
        <SidePanelLayout
          :sections="resolvedSections"
          :doctype="doctype"
          :docname="id"
          @reload="sections.reload"
        />
      </div>
    </div>
  </div>
  <ErrorPage
    v-else-if="errorTitle"
    :errorTitle="errorTitle"
    :errorMessage="errorMessage"
  />
  <DeleteLinkedDocModal
    v-if="showDeleteModal"
    v-model="showDeleteModal"
    :doctype="doctype"
    :docname="id"
    :title="title"
    :name="doctype"
  />
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import CustomActions from '@/components/CustomActions.vue'
import SidePanelLayout from '@/components/SidePanelLayout.vue'
import DeleteLinkedDocModal from '@/components/DeleteLinkedDocModal.vue'
import ErrorPage from '@/components/ErrorPage.vue'
import Icon from '@/components/Icon.vue'
import { Breadcrumbs, Button } from 'frappe-ui'
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDocument } from '@/data/document'
import { getMeta } from '@/stores/meta'
import { createResource } from 'frappe-ui'

const props = defineProps({
  id: { type: String, required: true },
})

const route = useRoute()
const doctype = computed(() => route.meta.doctype)

const { doctypeMeta } = getMeta(doctype.value)

const errorTitle = ref('')
const errorMessage = ref('')
const showDeleteModal = ref(false)

const {
  triggerOnRender,
  permissions,
  document,
  error,
} = useDocument(doctype.value, props.id)

const canDelete = computed(() => permissions.data?.permissions?.delete || false)
const doc = computed(() => document.doc || {})

onMounted(async () => {
  if (document.doc) await triggerOnRender()
})

watch(error, (err) => {
  if (err) {
    errorTitle.value = __(
      err.exc_type == 'DoesNotExistError'
        ? __('Document not found')
        : __('Error occurred'),
    )
    errorMessage.value = __(err.messages?.[0] || __('An error occurred'))
  } else {
    errorTitle.value = ''
    errorMessage.value = ''
  }
})

const title = computed(() => {
  return doc.value?.name || doc.value?.title || props.id
})

const breadcrumbs = computed(() => {
  let items = [{ label: doctype.value, route: { name: doctype.value + 's' } }]
  items.push({
    label: title.value,
    route: {
      name: doctype.value,
      params: { id: props.id },
      query: route.query,
    },
  })
  return items
})

const sections = createResource({
  url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_sidepanel_sections',
  cache: ['sidePanelSections', doctype.value],
  params: { doctype: doctype.value },
  auto: true,
})

const resolvedSections = computed(() => {
  if (sections.data?.length) return sections.data

  let fields = (doctypeMeta.value?.fields || [])
    .filter(f => f.in_list_view || f.reqd)
    .map(f => ({ ...f, visible: true }))
  
  return [{
    name: 'details',
    label: 'Details',
    columns: [{ fields }],
    visible: true,
    opened: true
  }]
})

function deleteDoc() {
  showDeleteModal.value = true
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-surface-gray-1">
    <LayoutHeader>
      <template #left-header>
        <div class="text-xl font-semibold text-ink-gray-9">Property Management</div>
      </template>
      <template #right-header>
        <Button
          :label="'Refresh'"
          iconLeft="refresh-ccw"
          @click="mallsResource.reload(); unitsResource.reload()"
        />
        <Button
          variant="solid"
          :label="'New Mall'"
          iconLeft="plus"
        />
      </template>
    </LayoutHeader>

    <div class="p-6 flex-1 overflow-y-auto">
      <!-- High Level Metrics -->
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Total Malls</div>
            <div class="text-2xl font-bold text-ink-gray-9 mt-1">{{ mallsResource.data?.length || 0 }}</div>
          </div>
          <div class="bg-surface-blue-2 p-3 rounded-md text-ink-blue-6">
            <LucideBuilding2 class="w-6 h-6" />
          </div>
        </div>
        
        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Total Units</div>
            <div class="text-2xl font-bold text-ink-gray-9 mt-1">{{ unitsResource.data?.length || 0 }}</div>
          </div>
          <div class="bg-surface-green-2 p-3 rounded-md text-ink-green-6">
            <LucideLayoutGrid class="w-6 h-6" />
          </div>
        </div>
        
        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Occupancy Rate</div>
            <div class="text-2xl font-bold text-ink-gray-9 mt-1">{{ occupancyRate }}%</div>
          </div>
          <div class="bg-surface-purple-2 p-3 rounded-md text-ink-purple-6">
            <LucidePieChart class="w-6 h-6" />
          </div>
        </div>

        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Vacant Units</div>
            <div class="text-2xl font-bold text-ink-gray-9 mt-1">{{ vacantUnits }}</div>
          </div>
          <div class="bg-surface-red-2 p-3 rounded-md text-ink-red-6">
            <LucideDoorOpen class="w-6 h-6" />
          </div>
        </div>
      </div>

      <!-- Main Datagrid / Table area -->
      <div class="bg-white border border-outline-gray-2 rounded-lg shadow-sm">
        <div class="px-5 py-4 border-b border-outline-gray-2 flex justify-between items-center">
          <h2 class="text-lg font-medium text-ink-gray-9">Units Directory</h2>
          <div class="w-64">
            <!-- Search placeholder -->
            <input type="text" class="w-full form-input bg-surface-gray-1 border-outline-gray-2 text-sm rounded-md px-3 py-1.5" placeholder="Search units...">
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-surface-gray-1 border-b border-outline-gray-2 text-ink-gray-5">
              <tr>
                <th class="px-5 py-3 font-medium">Unit Code</th>
                <th class="px-5 py-3 font-medium">Mall</th>
                <th class="px-5 py-3 font-medium">Floor</th>
                <th class="px-5 py-3 font-medium">Category</th>
                <th class="px-5 py-3 font-medium">Area (sq.m)</th>
                <th class="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-2">
              <tr v-if="unitsResource.loading">
                <td colspan="6" class="px-5 py-8 text-center text-ink-gray-5">Loading units...</td>
              </tr>
              <tr v-else-if="!unitsResource.data || unitsResource.data.length === 0">
                <td colspan="6" class="px-5 py-8 text-center text-ink-gray-5">No units found.</td>
              </tr>
              <tr v-for="unit in unitsResource.data" :key="unit.id" class="hover:bg-surface-gray-1">
                <td class="px-5 py-3 font-medium text-ink-gray-9">{{ unit.unit_code }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ unit.mall || 'N/A' }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ unit.floor || 'N/A' }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ unit.category }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ unit.rentable_area_sqm }}</td>
                <td class="px-5 py-3">
                  <span 
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="{
                      'bg-surface-green-2 text-ink-green-7': unit.status === 'Occupied',
                      'bg-surface-red-2 text-ink-red-7': unit.status === 'Vacant',
                      'bg-surface-yellow-2 text-ink-yellow-7': unit.status === 'Under Maintenance'
                    }"
                  >
                    {{ unit.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import { createResource, Button } from 'frappe-ui'
import LucideBuilding2 from '~icons/lucide/building-2'
import LucideLayoutGrid from '~icons/lucide/layout-grid'
import LucidePieChart from '~icons/lucide/pie-chart'
import LucideDoorOpen from '~icons/lucide/door-open'

const mallsResource = createResource({
  url: 'frappe.client.get_list',
  makeParams() {
    return { doctype: 'Mall' }
  },
  auto: true,
})

const unitsResource = createResource({
  url: 'frappe.client.get_list',
  makeParams() {
    return { doctype: 'Unit' }
  },
  auto: true,
})

const vacantUnits = computed(() => {
  if (!unitsResource.data) return 0
  return unitsResource.data.filter(u => u.status === 'Vacant').length
})

const occupancyRate = computed(() => {
  if (!unitsResource.data || unitsResource.data.length === 0) return 0
  const occupied = unitsResource.data.filter(u => u.status === 'Occupied').length
  return Math.round((occupied / unitsResource.data.length) * 100)
})

</script>

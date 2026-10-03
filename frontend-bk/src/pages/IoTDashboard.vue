<template>
  <div class="flex flex-col h-full overflow-hidden bg-surface-gray-1">
    <LayoutHeader>
      <template #left-header>
        <div class="text-xl font-semibold text-ink-gray-9">IoT & Security Command Center</div>
      </template>
      <template #right-header>
        <Button
          :label="'Refresh'"
          iconLeft="refresh-ccw"
          @click="parkingResource.reload(); securityResource.reload()"
        />
      </template>
    </LayoutHeader>

    <div class="p-6 flex-1 overflow-y-auto">
      <!-- High Level Metrics -->
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Active Parking Sessions</div>
            <div class="text-2xl font-bold text-ink-gray-9 mt-1">{{ activeSessions }}</div>
          </div>
          <div class="bg-surface-blue-2 p-3 rounded-md text-ink-blue-6">
            <LucideCar class="w-6 h-6" />
          </div>
        </div>
        
        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Unacknowledged Security Events</div>
            <div class="text-2xl font-bold text-ink-red-6 mt-1">{{ unacknowledgedEvents }}</div>
          </div>
          <div class="bg-surface-red-2 p-3 rounded-md text-ink-red-6">
            <LucideShieldAlert class="w-6 h-6" />
          </div>
        </div>
      </div>

      <!-- Main Datagrid / Table area -->
      <div class="grid grid-cols-2 gap-6">
        <div class="bg-white border border-outline-gray-2 rounded-lg shadow-sm">
          <div class="px-5 py-4 border-b border-outline-gray-2">
            <h2 class="text-lg font-medium text-ink-gray-9">Active Parking Sessions</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-surface-gray-1 border-b border-outline-gray-2 text-ink-gray-5">
                <tr>
                  <th class="px-5 py-3 font-medium">License Plate</th>
                  <th class="px-5 py-3 font-medium">Entry Time</th>
                  <th class="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-2">
                <tr v-if="parkingResource.loading">
                  <td colspan="3" class="px-5 py-8 text-center text-ink-gray-5">Loading parking sessions...</td>
                </tr>
                <tr v-else-if="!parkingResource.data || parkingResource.data.length === 0">
                  <td colspan="3" class="px-5 py-8 text-center text-ink-gray-5">No active sessions.</td>
                </tr>
                <tr v-for="session in parkingResource.data" :key="session.id" class="hover:bg-surface-gray-1">
                  <td class="px-5 py-3 font-medium text-ink-gray-9">{{ session.license_plate }}</td>
                  <td class="px-5 py-3 text-ink-gray-7">{{ session.entry_time }}</td>
                  <td class="px-5 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-surface-green-2 text-ink-green-7">
                      {{ session.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white border border-outline-gray-2 rounded-lg shadow-sm">
          <div class="px-5 py-4 border-b border-outline-gray-2">
            <h2 class="text-lg font-medium text-ink-gray-9">Recent Security Events</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-surface-gray-1 border-b border-outline-gray-2 text-ink-gray-5">
                <tr>
                  <th class="px-5 py-3 font-medium">Event Type</th>
                  <th class="px-5 py-3 font-medium">Severity</th>
                  <th class="px-5 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-2">
                <tr v-if="securityResource.loading">
                  <td colspan="3" class="px-5 py-8 text-center text-ink-gray-5">Loading security events...</td>
                </tr>
                <tr v-else-if="!securityResource.data || securityResource.data.length === 0">
                  <td colspan="3" class="px-5 py-8 text-center text-ink-gray-5">No security events found.</td>
                </tr>
                <tr v-for="event in securityResource.data" :key="event.id" class="hover:bg-surface-gray-1">
                  <td class="px-5 py-3 font-medium text-ink-gray-9">{{ event.event_type }}</td>
                  <td class="px-5 py-3">
                    <span 
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-surface-red-2 text-ink-red-7': event.severity === 'Critical',
                        'bg-surface-orange-2 text-ink-orange-7': event.severity === 'High',
                        'bg-surface-yellow-2 text-ink-yellow-7': event.severity === 'Medium',
                        'bg-surface-blue-2 text-ink-blue-7': event.severity === 'Low'
                      }"
                    >
                      {{ event.severity }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-ink-gray-7">{{ event.event_time }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import { createResource, Button } from 'frappe-ui'
import LucideCar from '~icons/lucide/car'
import LucideShieldAlert from '~icons/lucide/shield-alert'

const parkingResource = createResource({
  url: 'frappe.client.get_list',
  makeParams() {
    return { doctype: 'Parking Session' }
  },
  auto: true,
})

const securityResource = createResource({
  url: 'frappe.client.get_list',
  makeParams() {
    return { doctype: 'Security Event' }
  },
  auto: true,
})

const activeSessions = computed(() => {
  if (!parkingResource.data) return 0
  return parkingResource.data.filter(s => s.status === 'Active').length
})

const unacknowledgedEvents = computed(() => {
  if (!securityResource.data) return 0
  return securityResource.data.filter(e => !e.is_acknowledged).length
})

</script>

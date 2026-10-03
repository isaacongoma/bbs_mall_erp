<template>
  <div class="flex flex-col h-full overflow-hidden bg-surface-gray-1">
    <LayoutHeader>
      <template #left-header>
        <div class="text-xl font-semibold text-ink-gray-9">Leasing Management</div>
      </template>
      <template #right-header>
        <Button
          :label="'Refresh'"
          iconLeft="refresh-ccw"
          @click="tenantsResource.reload(); leasesResource.reload()"
        />
        <Button
          variant="solid"
          :label="'New Lease'"
          iconLeft="plus"
        />
      </template>
    </LayoutHeader>

    <div class="p-6 flex-1 overflow-y-auto">
      <!-- High Level Metrics -->
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Total Tenants</div>
            <div class="text-2xl font-bold text-ink-gray-9 mt-1">{{ tenantsResource.data?.length || 0 }}</div>
          </div>
          <div class="bg-surface-blue-2 p-3 rounded-md text-ink-blue-6">
            <LucideUsers class="w-6 h-6" />
          </div>
        </div>
        
        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Active Leases</div>
            <div class="text-2xl font-bold text-ink-gray-9 mt-1">{{ activeLeases }}</div>
          </div>
          <div class="bg-surface-green-2 p-3 rounded-md text-ink-green-6">
            <LucideFileSignature class="w-6 h-6" />
          </div>
        </div>
      </div>

      <!-- Main Datagrid / Table area -->
      <div class="bg-white border border-outline-gray-2 rounded-lg shadow-sm">
        <div class="px-5 py-4 border-b border-outline-gray-2 flex justify-between items-center">
          <h2 class="text-lg font-medium text-ink-gray-9">Leases Directory</h2>
          <div class="w-64">
            <!-- Search placeholder -->
            <input type="text" class="w-full form-input bg-surface-gray-1 border-outline-gray-2 text-sm rounded-md px-3 py-1.5" placeholder="Search leases...">
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-surface-gray-1 border-b border-outline-gray-2 text-ink-gray-5">
              <tr>
                <th class="px-5 py-3 font-medium">Lease Number</th>
                <th class="px-5 py-3 font-medium">Tenant</th>
                <th class="px-5 py-3 font-medium">Start Date</th>
                <th class="px-5 py-3 font-medium">End Date</th>
                <th class="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-2">
              <tr v-if="leasesResource.loading">
                <td colspan="5" class="px-5 py-8 text-center text-ink-gray-5">Loading leases...</td>
              </tr>
              <tr v-else-if="!leasesResource.data || leasesResource.data.length === 0">
                <td colspan="5" class="px-5 py-8 text-center text-ink-gray-5">No leases found.</td>
              </tr>
              <tr v-for="lease in leasesResource.data" :key="lease.id" class="hover:bg-surface-gray-1">
                <td class="px-5 py-3 font-medium text-ink-gray-9">{{ lease.lease_number }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ getTenantName(lease.tenant) }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ lease.start_date }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ lease.end_date }}</td>
                <td class="px-5 py-3">
                  <span 
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="{
                      'bg-surface-green-2 text-ink-green-7': lease.status === 'Active',
                      'bg-surface-gray-2 text-ink-gray-7': lease.status === 'Draft' || lease.status === 'Expired',
                      'bg-surface-red-2 text-ink-red-7': lease.status === 'Terminated'
                    }"
                  >
                    {{ lease.status }}
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
import LucideUsers from '~icons/lucide/users'
import LucideFileSignature from '~icons/lucide/file-signature'

const tenantsResource = createResource({
  url: 'frappe.client.get_list',
  makeParams() {
    return { doctype: 'Tenant' }
  },
  auto: true,
})

const leasesResource = createResource({
  url: 'frappe.client.get_list',
  makeParams() {
    return { doctype: 'Lease' }
  },
  auto: true,
})

const activeLeases = computed(() => {
  if (!leasesResource.data) return 0
  return leasesResource.data.filter(l => l.status === 'Active').length
})

function getTenantName(tenantId) {
  if (!tenantsResource.data) return tenantId
  const tenant = tenantsResource.data.find(t => t.id === tenantId)
  return tenant ? tenant.name : tenantId
}

</script>

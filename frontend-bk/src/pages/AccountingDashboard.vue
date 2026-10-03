<template>
  <div class="flex flex-col h-full overflow-hidden bg-surface-gray-1">
    <LayoutHeader>
      <template #left-header>
        <div class="text-xl font-semibold text-ink-gray-9">Accounting & Payments</div>
      </template>
      <template #right-header>
        <Button
          :label="'Refresh'"
          iconLeft="refresh-ccw"
          @click="invoicesResource.reload(); paymentsResource.reload()"
        />
        <Button
          variant="solid"
          :label="'New Invoice'"
          iconLeft="plus"
        />
      </template>
    </LayoutHeader>

    <div class="p-6 flex-1 overflow-y-auto">
      <!-- High Level Metrics -->
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Total Invoices</div>
            <div class="text-2xl font-bold text-ink-gray-9 mt-1">{{ invoicesResource.data?.length || 0 }}</div>
          </div>
          <div class="bg-surface-blue-2 p-3 rounded-md text-ink-blue-6">
            <LucideReceipt class="w-6 h-6" />
          </div>
        </div>
        
        <div class="bg-white p-5 rounded-lg border border-outline-gray-2 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-ink-gray-5">Total Payments</div>
            <div class="text-2xl font-bold text-ink-gray-9 mt-1">{{ paymentsResource.data?.length || 0 }}</div>
          </div>
          <div class="bg-surface-green-2 p-3 rounded-md text-ink-green-6">
            <LucideBanknote class="w-6 h-6" />
          </div>
        </div>
      </div>

      <!-- Main Datagrid / Table area -->
      <div class="bg-white border border-outline-gray-2 rounded-lg shadow-sm">
        <div class="px-5 py-4 border-b border-outline-gray-2 flex justify-between items-center">
          <h2 class="text-lg font-medium text-ink-gray-9">Sales Invoices</h2>
          <div class="w-64">
            <!-- Search placeholder -->
            <input type="text" class="w-full form-input bg-surface-gray-1 border-outline-gray-2 text-sm rounded-md px-3 py-1.5" placeholder="Search invoices...">
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-surface-gray-1 border-b border-outline-gray-2 text-ink-gray-5">
              <tr>
                <th class="px-5 py-3 font-medium">Invoice Number</th>
                <th class="px-5 py-3 font-medium">Posting Date</th>
                <th class="px-5 py-3 font-medium">Due Date</th>
                <th class="px-5 py-3 font-medium">Grand Total</th>
                <th class="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-2">
              <tr v-if="invoicesResource.loading">
                <td colspan="5" class="px-5 py-8 text-center text-ink-gray-5">Loading invoices...</td>
              </tr>
              <tr v-else-if="!invoicesResource.data || invoicesResource.data.length === 0">
                <td colspan="5" class="px-5 py-8 text-center text-ink-gray-5">No invoices found.</td>
              </tr>
              <tr v-for="invoice in invoicesResource.data" :key="invoice.id" class="hover:bg-surface-gray-1">
                <td class="px-5 py-3 font-medium text-ink-gray-9">{{ invoice.id }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ invoice.posting_date }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ invoice.due_date }}</td>
                <td class="px-5 py-3 text-ink-gray-7">{{ invoice.grand_total }}</td>
                <td class="px-5 py-3">
                  <span 
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="{
                      'bg-surface-gray-2 text-ink-gray-7': invoice.docstatus === 0,
                      'bg-surface-blue-2 text-ink-blue-7': invoice.docstatus === 1,
                      'bg-surface-red-2 text-ink-red-7': invoice.docstatus === 2
                    }"
                  >
                    {{ invoice.docstatus === 0 ? 'Draft' : invoice.docstatus === 1 ? 'Submitted' : 'Cancelled' }}
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
import LucideReceipt from '~icons/lucide/receipt'
import LucideBanknote from '~icons/lucide/banknote'

const invoicesResource = createResource({
  url: 'frappe.client.get_list',
  makeParams() {
    return { doctype: 'Sales Invoice' }
  },
  auto: true,
})

const paymentsResource = createResource({
  url: 'frappe.client.get_list',
  makeParams() {
    return { doctype: 'Payment Entry' }
  },
  auto: true,
})
</script>

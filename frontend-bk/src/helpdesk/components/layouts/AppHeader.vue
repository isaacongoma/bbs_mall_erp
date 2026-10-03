<template>
  <div class="flex border-b pe-5 rtl:pe-6">
    <div id="app-header" class="flex-1 w-full"></div>
    <div class="flex items-start justify-center">
      <CallUI :userEmail="user" />
    </div>
  </div>
</template>

<script setup>
import CallUI from "@/helpdesk/components/telephony/CallUI.vue";
import { useAuthStore } from "@/helpdesk/stores/auth";
import { useTelephonyStore } from "@/helpdesk/stores/telephony";
import { onMounted } from "vue";

const { user } = useAuthStore();

const telephonyStore = useTelephonyStore();

onMounted(() => {
  telephonyStore.fetchCallIntegrationStatus();
});
</script>

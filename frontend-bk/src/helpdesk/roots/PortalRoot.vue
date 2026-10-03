<template>
  <component :is="Root" />
</template>

<script setup lang="ts">
import { useAuthStore } from "@/helpdesk/stores/auth";
import { computed, defineAsyncComponent } from "vue";

const AgentPortalRoot = defineAsyncComponent(
  () => import("@/helpdesk/roots/AgentRoot.vue")
);
const CustomerPortalRoot = defineAsyncComponent(
  () => import("@/helpdesk/roots/CustomerPortalRoot.vue")
);

// The chrome follows the session, not the URL: an agent keeps the agent
// shell even on customer-portal pages.
const Root = computed(() => {
  const authStore = useAuthStore();
  if (authStore.hasDeskAccess && authStore.isAgent) {
    return AgentPortalRoot;
  } else {
    return CustomerPortalRoot;
  }
});
</script>

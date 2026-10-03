<template>
  <Layout class="isolate">
    <router-view class="flex flex-1 flex-col overflow-auto" />
  </Layout>
</template>

<script setup lang="ts">
import { useAgentStatusStore } from "@/helpdesk/stores/agentStatus";
import { useAuthStore } from "@/helpdesk/stores/auth";
import { computed, defineAsyncComponent, onBeforeMount } from "vue";
import { useRouter } from "vue-router";

import { useScreenSize } from "@/helpdesk/composables/screen";
const router = useRouter();
const authStore = useAuthStore();
// eager: subscribes the availability socket handler and runs the login
// greeting at boot instead of on first ticket open. Guarded because a
// customer can mount this root briefly before onBeforeMount redirects them.
if (authStore.hasDeskAccess) {
  useAgentStatusStore();
}

const { isMobileView } = useScreenSize();

const MobileLayout = defineAsyncComponent(
  () => import("@/helpdesk/components/layouts/MobileLayout.vue")
);
const DesktopLayout = defineAsyncComponent(
  () => import("@/helpdesk/components/layouts/DesktopLayout.vue")
);

const Layout = computed(() => {
  if (isMobileView.value) {
    return MobileLayout;
  } else {
    return DesktopLayout;
  }
});

onBeforeMount(() => {
  if (!authStore.hasDeskAccess) {
    router.replace({ name: "TicketsCustomer" });
  }
});
</script>

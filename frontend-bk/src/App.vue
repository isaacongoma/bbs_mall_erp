<template>
  <FrappeUIProvider>
    <NotPermitted v-if="$route.name === 'Not Permitted'" />
    <Login v-else-if="!session.isLoggedIn" />
    <Layout v-else class="isolate">
      <router-view :key="$route.fullPath" />
    </Layout>
    <Dialogs />
    <DoctypeModals />
  </FrappeUIProvider>
</template>

<script setup>
import NotPermitted from '@/pages/NotPermitted.vue'
import DoctypeModals from '@/components/Modals/DoctypeModals.vue'
import { Dialogs } from '@/utils/dialogs'
import Login from '@/pages/Login.vue'
import { sessionStore } from '@/stores/session'
import { FrappeUIProvider, setConfig, useTheme } from 'frappe-ui'
import { computed, defineAsyncComponent, provide } from 'vue'

const session = sessionStore()
provide('session', session)

const { setTheme } = useTheme()
if (!localStorage.getItem('theme')) {
  setTheme('light')
}

// window.timezone / window.translated_messages are copied from the boot
// response onto `window` in main.js (see apps/crm/boot_api.py's
// get_context_for_dev) before this component ever mounts.
setConfig('systemTimezone', window.timezone?.system || null)
setConfig('localTimezone', window.timezone?.user || null)
setConfig('translatedMessages', window.translated_messages || {})

const MobileLayout = defineAsyncComponent(
  () => import('./components/Layouts/MobileLayout.vue'),
)
const DesktopLayout = defineAsyncComponent(
  () => import('./components/Layouts/DesktopLayout.vue'),
)
const Layout = computed(() => {
  if (window.innerWidth < 640) {
    return MobileLayout
  } else {
    return DesktopLayout
  }
})
</script>

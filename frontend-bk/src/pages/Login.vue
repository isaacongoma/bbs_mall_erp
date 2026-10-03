<template>
  <div class="flex h-screen w-screen items-center justify-center bg-surface-gray-1">
    <form class="w-80 space-y-4 rounded-lg border bg-surface-white p-6 shadow-sm" @submit.prevent="submit">
      <div class="text-lg font-semibold text-ink-gray-9">Sign in to BBS-ERP</div>
      <FormControl label="Email" type="email" v-model="email" required />
      <FormControl label="Password" type="password" v-model="password" required />
      <ErrorMessage :message="error" />
      <Button variant="solid" class="w-full" :loading="loading" @click="submit">Sign in</Button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { authStore } from '@/stores/auth'

const auth = authStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<script setup lang="ts">
import { useAuthStore } from "@/helpdesk/stores/auth";
import { useConfigStore } from "@/helpdesk/stores/config";
import { useRouter } from "vue-router";

const router = useRouter();
const authStore = useAuthStore();
const configStore = useConfigStore();

function getTarget() {
  if (authStore.hasDeskAccess) return "TicketsAgent";
  else if (configStore.preferKnowledgeBase) return "CustomerKnowledgeBase";
  else return "TicketsCustomer";
}

router.push({ name: getTarget() });
</script>

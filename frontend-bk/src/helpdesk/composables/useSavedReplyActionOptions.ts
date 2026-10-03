import { type ActionOption } from "@/helpdesk/components/Settings/SavedReplies/components/actionTypes";
import { useTags, type Tag } from "@/helpdesk/composables/useTags";
import { useAgentStore } from "@/helpdesk/stores/agent";
import { useAuthStore } from "@/helpdesk/stores/auth";
import { useConfigStore } from "@/helpdesk/stores/config";
import { useTicketPriorityStore } from "@/helpdesk/stores/ticketPriority";
import { useTicketStatusStore } from "@/helpdesk/stores/ticketStatus";
import { SavedReplyActionType } from "@/helpdesk/types";
import { storeToRefs } from "pinia";
import { computed } from "vue";

let shared: ReturnType<typeof buildActionOptions> | undefined;

/**
 * The pickable values for each saved reply action type. Shared so the settings
 * editor and the reply composer offer the same list instead of each building
 * its own. Built once: every action chip calls this, and a resource per caller
 * means a list request per chip.
 */
export function useSavedReplyActionOptions() {
  return (shared ??= buildActionOptions());
}

function buildActionOptions() {
  const statusStore = useTicketStatusStore();
  const priorityStore = useTicketPriorityStore();
  const agentStore = useAgentStore();
  const { tagListResource } = useTags();
  const { teamRestrictionApplied } = storeToRefs(useConfigStore());
  const { userTeams, isAdmin } = storeToRefs(useAuthStore());

  /** Server-side filters for the link pickers, which search as you type. */
  function linkFilters(type: SavedReplyActionType): Record<string, unknown> {
    const filters: Record<string, unknown> = { disabled: 0 };
    // A restricted agent can only route to their own teams
    if (type === "Set Team" && !isAdmin.value && teamRestrictionApplied.value) {
      filters.name = ["in", userTeams.value || []];
    }
    return filters;
  }

  /** Tags as a plain list; callers filter it further if they need to. */
  function tagOptions(): ActionOption[] {
    return ((tagListResource.data || []) as Tag[]).map((tag) => ({
      label: tag.name,
      value: tag.name,
      color: tag.color,
    }));
  }

  function valueOptions(type: SavedReplyActionType): ActionOption[] {
    switch (type) {
      case "Set Status":
        return (statusStore.statuses.data || [])
          .filter((status) => status.enabled)
          .map((status) => ({
            label: status.label_agent,
            value: status.label_agent,
          }));
      case "Set Priority":
        return (priorityStore.priorities.data || [])
          .filter((priority) => !priority.disabled)
          .map((priority) => ({ label: priority.name, value: priority.name }));
      case "Assign Agent":
        return agentStore.dropdown || [];
      case "Add Tag":
      case "Remove Tag":
        return tagOptions();
      default:
        return [];
    }
  }

  if (!agentStore.agents.data) agentStore.agents.fetch();

  return { valueOptions, tagOptions, linkFilters };
}

from rest_framework import serializers

from apps.core.doctype.automation_flow.automation_flow import AutomationAction, AutomationFlow


class AutomationActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationAction
        fields = (
            "idx", "step_key", "step_type", "action_type", "target", "output_alias",
            "params", "step_condition", "related_condition", "parent_step", "branch",
        )


class AutomationFlowSerializer(serializers.ModelSerializer):
    actions = AutomationActionSerializer(source="action_rows", many=True, read_only=True)

    class Meta:
        model = AutomationFlow
        fields = (
            "name", "title", "document_type", "owner", "enabled", "disabled_reason",
            "trigger_type", "trigger_field", "from_value", "to_value", "custom_event",
            "date_field", "date_offset", "date_direction", "cron_expression", "next_run",
            "filters", "condition", "relationships", "revalidate_on_run",
            "run_as", "automation_user", "stop_on_error", "throttle_per_minute",
            "actions", "creation", "modified",
        )
        read_only_fields = ("name", "owner", "next_run", "creation", "modified")

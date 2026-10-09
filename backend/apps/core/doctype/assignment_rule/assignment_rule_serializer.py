from rest_framework import serializers

from apps.core import assignment_rules

RULE_FIELDS = (
    "name", "document_type", "due_date_based_on", "priority", "disabled", "description", "rule",
    "assign_condition", "unassign_condition", "close_condition", "assign_condition_json",
    "unassign_condition_json", "field", "current_index",
)


class AssignmentRuleSerializer(serializers.Serializer):
    def to_representation(self, instance):
        data = {field: getattr(instance, field, None) for field in RULE_FIELDS}
        for field in RULE_FIELDS:
            if data[field] is None and field not in ("priority", "current_index"):
                data[field] = ""
        data["priority"] = data["priority"] or 0
        data["current_index"] = data["current_index"] or 0
        data["disabled"] = bool(instance.disabled)
        data["last_user"] = instance.last_user or None
        for table in assignment_rules.USER_TABLES:
            data[table] = [
                {"user": row.user, "weight": row.weight if row.weight is not None else 1}
                for row in assignment_rules.user_rows(instance.name, table)
            ]
        data["assignment_days"] = [{"day": day} for day in assignment_rules.day_names(instance.name)]
        datetime_field = serializers.DateTimeField()
        data["creation"] = datetime_field.to_representation(instance.creation) if instance.creation else None
        data["modified"] = datetime_field.to_representation(instance.modified) if instance.modified else None
        return data

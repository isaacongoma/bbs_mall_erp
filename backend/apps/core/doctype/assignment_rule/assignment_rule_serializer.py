from rest_framework import serializers

from apps.core.doctype.assignment_rule.assignment_rule import AssignmentRule, AssignmentRuleDay, AssignmentRuleUser


class AssignmentRuleUserRowSerializer(serializers.ModelSerializer):
    user = serializers.SlugRelatedField(slug_field="email", read_only=True)

    class Meta:
        model = AssignmentRuleUser
        fields = ("user", "weight")


class AssignmentRuleDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentRuleDay
        fields = ("day",)


class AssignmentRuleSerializer(serializers.ModelSerializer):
    last_user = serializers.SlugRelatedField(slug_field="email", read_only=True)
    users = serializers.SerializerMethodField()
    weighted_users = serializers.SerializerMethodField()
    assignment_days = AssignmentRuleDaySerializer(source="day_rows", many=True, read_only=True)

    class Meta:
        model = AssignmentRule
        fields = (
            "name", "document_type", "due_date_based_on", "priority", "disabled", "description",
            "rule", "assign_condition", "unassign_condition", "close_condition",
            "assign_condition_json", "unassign_condition_json", "field",
            "last_user", "current_index", "users", "weighted_users", "assignment_days",
            "creation", "modified",
        )
        read_only_fields = ("last_user", "current_index", "creation", "modified")

    def get_users(self, obj):
        return AssignmentRuleUserRowSerializer(obj.user_rows.filter(table_field="users").order_by("idx"), many=True).data

    def get_weighted_users(self, obj):
        return AssignmentRuleUserRowSerializer(
            obj.user_rows.filter(table_field="weighted_users").order_by("idx"), many=True
        ).data

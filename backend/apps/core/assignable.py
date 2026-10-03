# Ported from frappe.desk.form.assign_to._add and the share_with_agent/assign_agent
# pair duplicated across crm_lead.py and crm_deal.py (frappe/crm, AGPL-3.0 /
# frappe/frappe, MIT). Both CRMLead and CRMDeal use this mixin so the logic
# lives in one place instead of twice.
from apps.core.middleware import get_current_user


class AssignableMixin:
    """Requires the including model to define `doctype_label` (e.g. "CRM Lead")."""

    def get_assigned_users(self):
        from apps.core.doctype.todo.todo import ToDo

        return list(
            ToDo.objects.filter(
                reference_type=self.doctype_label, reference_name=self.pk, status="Open"
            ).values_list("allocated_to", flat=True)
        )

    def assign_agent(self, agent):
        from apps.core.doctype.todo.todo import ToDo

        if not agent:
            return

        agent_id = getattr(agent, "pk", agent)
        if agent_id in self.get_assigned_users():
            return

        if ToDo.objects.filter(
            reference_type=self.doctype_label, reference_name=self.pk, allocated_to_id=agent_id, status="Open"
        ).exists():
            return

        user = get_current_user()
        ToDo.objects.create(
            allocated_to_id=agent_id,
            reference_type=self.doctype_label,
            reference_name=self.pk,
            description=f"Assignment for {self.doctype_label} {self.pk}",
            status="Open",
            assigned_by=user if user and getattr(user, "is_authenticated", False) else None,
        )

    def unassign_agent(self, agent):
        from apps.core.doctype.todo.todo import ToDo

        if not agent:
            return
        agent_id = getattr(agent, "pk", agent)
        ToDo.objects.filter(
            reference_type=self.doctype_label, reference_name=self.pk, allocated_to_id=agent_id, status="Open"
        ).update(status="Cancelled")

    def share_with_agent(self, agent):
        from apps.core.doctype.docshare.docshare import DocShare

        if not agent:
            return

        agent_id = getattr(agent, "pk", agent)
        existing = DocShare.objects.filter(share_doctype=self.doctype_label, share_name=self.pk)
        shared_with = {d.user_id for d in existing} | {agent_id}

        for user_id in shared_with:
            if user_id == agent_id:
                DocShare.objects.get_or_create(
                    user_id=agent_id,
                    share_doctype=self.doctype_label,
                    share_name=self.pk,
                    defaults={"read": True, "write": True},
                )
            else:
                DocShare.objects.filter(
                    user_id=user_id, share_doctype=self.doctype_label, share_name=self.pk
                ).delete()

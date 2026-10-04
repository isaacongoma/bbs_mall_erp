# Ported from frappe.desk.form.assign_to._add and the share_with_agent/assign_agent
# pair duplicated across crm_lead.py and crm_deal.py (frappe/crm, AGPL-3.0 /
# frappe/frappe, MIT). Both CRMLead and CRMDeal use this mixin so the logic
# lives in one place instead of twice.
from apps.core.middleware import get_current_user


class AssignableMixin:
    """Requires the including model to define `doctype_label` (e.g. "CRM Lead")."""

    def get_assigned_users(self):
        from apps.core.assignments import assigned_user_pks

        return assigned_user_pks(self.doctype_label, self.pk)

    def assign_agent(self, agent):
        from apps.core.assignments import create_assignment, has_open_assignment

        if not agent:
            return

        if has_open_assignment(self.doctype_label, self.pk, agent):
            return

        user = get_current_user()
        create_assignment(
            self.doctype_label,
            self.pk,
            agent,
            assigned_by=user if user and getattr(user, "is_authenticated", False) else None,
            description=f"Assignment for {self.doctype_label} {self.pk}",
        )

    def unassign_agent(self, agent):
        from apps.core.assignments import set_assignment_status

        if not agent:
            return
        set_assignment_status(self.doctype_label, self.pk, "Open", "Cancelled", users=[agent])

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

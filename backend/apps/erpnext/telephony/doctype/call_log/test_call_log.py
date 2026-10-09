import random
import string

import frappe

from erpnext.telephony.doctype.call_log.call_log import link_existing_conversations
from erpnext.tests.utils import ERPNextTestSuite


class TestCallLog(ERPNextTestSuite):
    def setUp(self):
        self.number = "98" + "".join(random.choices(string.digits, k=8))

        self.linked_log = self._make_call_log(to=f"+91{self.number}", type="Incoming")
        self.unlinked_log = self._make_call_log(**{"from": f"0{self.number}", "type": "Outgoing"})

        self.contact = frappe.get_doc(
            {
                "doctype": "Contact",
                "first_name": f"_Test Caller {self.number}",
                "phone_nos": [{"phone": self.number, "is_primary_phone": 1}],
            }
        )
        self.contact.flags.ignore_auto_link_call_log = True
        self.contact.insert(ignore_permissions=True)

        self._add_link(self.linked_log, "Contact", self.contact.name)

    def _make_call_log(self, **kwargs):
        doc = frappe.get_doc({"doctype": "Call Log", "id": frappe.generate_hash(length=10), **kwargs})
        doc.insert(ignore_permissions=True)
        return doc.name

    def _add_link(self, call_log, link_doctype, link_name):
        doc = frappe.get_doc("Call Log", call_log)
        doc.append("links", {"link_doctype": link_doctype, "link_name": link_name})
        doc.save(ignore_permissions=True)

    def _run_linker(self):
        self.contact.flags.ignore_auto_link_call_log = False
        link_existing_conversations(self.contact, "Open")

    def _contact_links_of(self, call_log):
        return frappe.get_all(
            "Dynamic Link",
            filters={"parenttype": "Call Log", "parent": call_log, "link_doctype": "Contact"},
            fields=["link_name"],
            pluck="link_name",
        )

    def test_links_previously_unlinked_log(self):
        """The converted query's HAVING == 0 returns the log NOT yet linked to the
        contact, so link_existing_conversations adds the Contact link to it."""
        self.assertEqual(self._contact_links_of(self.unlinked_log), [], "precondition")

        self._run_linker()

        self.assertEqual(
            self._contact_links_of(self.unlinked_log),
            [self.contact.name],
            "Previously-unlinked log matching the number must gain the Contact link",
        )

    def test_already_linked_log_is_not_relinked(self):
        """The HAVING SUM(CASE ...) == 0 must EXCLUDE the already-linked log from the returned set,
        so link_existing_conversations never re-saves it. Asserting only the link count is not enough
        (validate() -> deduplicate_dynamic_links strips a duplicate either way), so pin the HAVING by
        asserting the already-linked log was never touched: an excluded log is not in `logs`, so
        add_link()/save() never runs and its `modified` timestamp is unchanged."""
        self.assertEqual(self._contact_links_of(self.linked_log), [self.contact.name], "precondition")
        modified_before = frappe.db.get_value("Call Log", self.linked_log, "modified")

        self._run_linker()

        self.assertEqual(
            frappe.db.get_value("Call Log", self.linked_log, "modified"),
            modified_before,
            "Already-linked log must be excluded by HAVING and never re-saved",
        )
        self.assertEqual(self._contact_links_of(self.linked_log), [self.contact.name])

    def test_log_not_matching_number_is_untouched(self):
        """A log whose from/to does not contain the number is excluded by the
        from/to LIKE predicate and must stay unlinked."""
        other = self._make_call_log(**{"from": "+919999999999", "to": "+918888888888", "type": "Outgoing"})

        self._run_linker()

        self.assertEqual(self._contact_links_of(other), [], "Log not matching the number must stay unlinked")

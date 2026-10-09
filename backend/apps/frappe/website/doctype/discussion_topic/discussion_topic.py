
import frappe
from frappe.model.document import Document


class DiscussionTopic(Document):
    doctype = 'Discussion Topic'

    _DOCTYPE_NAME = "Discussion Topic"


    pass


@frappe.whitelist()
def submit_discussion(
    doctype: str,
    docname: str | int,
    reply: str,
    title: str,
    topic_name: str | None = None,
    reply_name: str | None = None,
):
    if reply_name:
        doc = frappe.get_doc("Discussion Reply", reply_name)
        if doc.owner != frappe.session.user:
            frappe.throw(frappe._("You can only edit your own replies."), frappe.PermissionError)
        doc.reply = reply
        doc.save(ignore_permissions=True)
        return

    if topic_name:
        save_message(reply, topic_name)
        return topic_name

    topic = frappe.get_doc(
        {
            "doctype": "Discussion Topic",
            "title": title,
            "reference_doctype": doctype,
            "reference_docname": docname,
        }
    )
    topic.save(ignore_permissions=True)
    save_message(reply, topic.name)
    return topic.name


def save_message(reply, topic):
    frappe.get_doc({"doctype": "Discussion Reply", "reply": reply, "topic": topic}).save(
        ignore_permissions=True
    )

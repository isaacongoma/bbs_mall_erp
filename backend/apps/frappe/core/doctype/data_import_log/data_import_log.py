from frappe.model.document import Document


class DataImportLog(Document):
    _DOCTYPE_NAME = "Data Import Log"


    no_feed_on_delete = True

    pass

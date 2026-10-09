from frappe.model.document import Document


class UserSessionDisplay(Document):
    doctype = 'User Session Display'

    _DOCTYPE_NAME = "User Session Display"


    def db_insert(self, *args, **kwargs):
        raise NotImplementedError

    def load_from_db(self, *args, **kwargs):
        raise NotImplementedError

    def db_update(self, *args, **kwargs):
        raise NotImplementedError

    def delete(self, *args, **kwargs):
        raise NotImplementedError

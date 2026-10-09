from frappe.model.document import Document


class RecorderQuery(Document):
    doctype = 'Recorder Query'

    _DOCTYPE_NAME = "Recorder Query"


    pass

    def db_insert(self, *args, **kwargs):
        pass

    def load_from_db(self):
        pass

    def db_update(self):
        pass

    @staticmethod
    def get_list():
        pass

    @staticmethod
    def get_count():
        pass

    @staticmethod
    def get_stats():
        pass

    def delete(self):
        pass

from frappe.model.document import Document


class RecorderSuggestedIndex(Document):
    doctype = 'Recorder Suggested Index'

    _DOCTYPE_NAME = "Recorder Suggested Index"


    def db_insert(self, *args, **kwargs):
        raise NotImplementedError

    def load_from_db(self):
        raise NotImplementedError

    def db_update(self):
        raise NotImplementedError

    def delete(self):
        raise NotImplementedError

    @staticmethod
    def get_list(filters=None, page_length=20, **kwargs):
        pass

    @staticmethod
    def get_count(filters=None, **kwargs):
        pass

    @staticmethod
    def get_stats(**kwargs):
        pass

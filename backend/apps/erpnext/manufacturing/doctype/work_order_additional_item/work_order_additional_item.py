from frappe.model.document import Document


class WorkOrderAdditionalItem(Document):


    doctype = 'Work Order Additional Item'

    @staticmethod
    def get_list(self, *args, **kwargs):
        pass

    @staticmethod
    def get_count(self, *args, **kwargs):
        pass

    @staticmethod
    def get_stats(self, *args, **kwargs):
        pass

    def db_insert(self, *args, **kwargs):
        pass

    def load_from_db(self, *args, **kwargs):
        pass

    def db_update(self, *args, **kwargs):
        pass

    def delete(self, *args, **kwargs):
        pass

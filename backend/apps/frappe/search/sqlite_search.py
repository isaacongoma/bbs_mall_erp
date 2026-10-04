class SQLiteSearch:
    INDEX_NAME = ""
    INDEX_SCHEMA = {}
    INDEXABLE_DOCTYPES = {}
    DEFAULT_SETTINGS = {}

    def __init__(self, *args, **kwargs):
        raise NotImplementedError("SQLite search is replaced by PostgreSQL full text search and is not implemented yet")


def update_doc_index(doc, method=None):
    return None


def delete_doc_index(doc, method=None):
    return None


class SQLiteSearchIndexMissingError(Exception):
    pass

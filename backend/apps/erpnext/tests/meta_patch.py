from apps.erpnext import registry

_real_get_meta = registry.get_meta


def meta_for(doctype, meta):
    def get_meta(name):
        return meta if name == doctype else _real_get_meta(name)

    return get_meta

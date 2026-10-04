def deprecated(func=None, *, message=None, category=None):
    if func is None:
        return lambda f: f
    return func

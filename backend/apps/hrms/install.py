def after_install():
    from hrms.setup import after_install as setup

    setup()
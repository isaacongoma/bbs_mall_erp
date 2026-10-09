from frappe import db, scrub

SEQUENCE_CACHE = 0

SQLITE_SEQUENCE_TABLE = "__frappe_sqlite_sequences"


def create_sequence(
    doctype_name: str,
    *,
    slug: str = "_id_seq",
    temporary: bool = False,
    check_not_exists: bool = False,
    cycle: bool = False,
    cache: int = SEQUENCE_CACHE,
    start_value: int = 0,
    increment_by: int = 0,
    min_value: int = 0,
    max_value: int = 0,
) -> str:
    sequence_name = scrub(doctype_name + slug)

    if db.db_type == "sqlite":
        increment = increment_by or 1
        minv = min_value or 1
        maxv = max_value or None
        start = start_value or minv
        current = start - increment
        db.sql(
            f"INSERT INTO `{SQLITE_SEQUENCE_TABLE}` "
            "(name, current, increment, min_value, max_value, cycle, declared) "
            "VALUES (%s, %s, %s, %s, %s, %s, 1) "
            "ON CONFLICT(name) DO UPDATE SET "
            "current = excluded.current, increment = excluded.increment, "
            "min_value = excluded.min_value, max_value = excluded.max_value, "
            "cycle = excluded.cycle, declared = 1 "
            "WHERE declared = 0",
            (sequence_name, current, increment, minv, maxv, 1 if cycle else 0),
        )
        return sequence_name

    query = "create sequence" if not temporary else "create temporary sequence"

    if check_not_exists:
        query += " if not exists"

    query += f" {sequence_name}"

    if increment_by:
        query += f" increment by {increment_by}"

    if min_value:
        query += f" minvalue {min_value}"

    if max_value:
        query += f" maxvalue {max_value}"

    if start_value:
        query += f" start {start_value}"

    if cache:
        query += f" cache {cache}"
    elif db.db_type == "mariadb":
        query += " nocache"

    if not cycle:
        if db.db_type == "mariadb":
            query += " nocycle"
    else:
        query += " cycle"

    db.sql_ddl(query)

    return sequence_name


def get_next_val(doctype_name: str, slug: str = "_id_seq") -> int:
    if db.db_type == "sqlite":
        return _sqlite_get_next_val(doctype_name, slug)

    sequence_name = scrub(f"{doctype_name}{slug}")

    if db.db_type == "postgres":
        sequence_name = f"'\"{sequence_name}\"'"
    elif db.db_type == "mariadb":
        sequence_name = f"`{sequence_name}`"

    try:
        return db.sql(f"SELECT nextval({sequence_name})")[0][0]
    except IndexError:
        raise db.SequenceGeneratorLimitExceeded


def set_next_val(
    doctype_name: str, next_val: int, *, slug: str = "_id_seq", is_val_used: bool = False
) -> None:
    if db.db_type == "sqlite":
        sequence_name = scrub(doctype_name + slug)
        db.sql(
            f"INSERT INTO `{SQLITE_SEQUENCE_TABLE}` (name, current) VALUES (%s, %s) "
            "ON CONFLICT(name) DO UPDATE SET current = %s - (CASE WHEN %s THEN 0 ELSE increment END)",
            (sequence_name, next_val if is_val_used else next_val - 1, next_val, 1 if is_val_used else 0),
        )
        return

    is_val_used = "false" if not is_val_used else "true"

    db.multisql(
        {
            "postgres": f"SELECT SETVAL('\"{scrub(doctype_name + slug)}\"', {next_val}, {is_val_used})",
            "mariadb": f"SELECT SETVAL(`{scrub(doctype_name + slug)}`, {next_val}, {is_val_used})",
        }
    )


def create_missing_sequences() -> list[str]:
    """Recreate sequences for autoincrement doctypes whose sequence object is missing."""
    import frappe
    from frappe.query_builder.functions import Max

    if db.db_type == "sqlite":
        return []

    doctypes = frappe.get_all(
        "DocType",
        filters={"autoname": "autoincrement", "issingle": 0, "is_virtual": 0},
        pluck="name",
    )
    if not doctypes:
        return []

    existing = _get_existing_sequences()
    created = []

    for doctype in doctypes:
        if scrub(f"{doctype}_id_seq") in existing:
            continue

        table = frappe.qb.DocType(doctype)
        max_name = frappe.qb.from_(table).select(Max(table["name"])).run()[0][0]
        create_sequence(doctype, check_not_exists=True, start_value=int(max_name) + 1 if max_name else 0)
        created.append(doctype)

    return created


def _sqlite_get_next_val(doctype_name: str, slug: str) -> int:
    sequence_name = scrub(f"{doctype_name}{slug}")

    row = db.sql(
        f"UPDATE `{SQLITE_SEQUENCE_TABLE}` SET current = current + increment "
        "WHERE name = %s AND max_value IS NULL RETURNING current",
        (sequence_name,),
    )
    if row:
        return row[0][0]

    existing = db.sql(
        f"SELECT max_value FROM `{SQLITE_SEQUENCE_TABLE}` WHERE name = %s",
        (sequence_name,),
    )
    if not existing:
        row = db.sql(
            f"INSERT INTO `{SQLITE_SEQUENCE_TABLE}` (name, current) VALUES (%s, %s) "
            "ON CONFLICT(name) DO UPDATE SET current = current + increment RETURNING current",
            (sequence_name, _sqlite_seed_value(doctype_name)),
        )
        return row[0][0]

    if existing[0][0] is None:
        return db.sql(
            f"UPDATE `{SQLITE_SEQUENCE_TABLE}` SET current = current + increment "
            "WHERE name = %s RETURNING current",
            (sequence_name,),
        )[0][0]

    row = db.sql(
        f"UPDATE `{SQLITE_SEQUENCE_TABLE}` SET current = "
        "CASE WHEN current + increment > max_value THEN min_value ELSE current + increment END "
        "WHERE name = %s AND (current + increment <= max_value OR cycle) RETURNING current",
        (sequence_name,),
    )
    if not row:
        raise db.SequenceGeneratorLimitExceeded
    return row[0][0]


def _sqlite_seed_value(doctype_name: str) -> int:
    import frappe
    from frappe.query_builder.functions import Cast_, Max

    table = frappe.qb.DocType(doctype_name)
    max_name = frappe.qb.from_(table).select(Max(Cast_(table.name, "integer"))).run()[0][0]
    return int(max_name or 0) + 1


def _get_existing_sequences() -> set[str]:
    if db.db_type == "postgres":
        rows = db.sql(
            """SELECT sequence_name FROM information_schema.sequences
            WHERE sequence_schema = 'public'"""
        )
    else:
        rows = db.sql(
            """SELECT TABLE_NAME FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'SEQUENCE'"""
        )
    return {r[0] for r in rows}

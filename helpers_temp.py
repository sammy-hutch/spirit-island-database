## temporary data

scripts = {
    "build": {
        "items": "CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, item_name text NOT NULL);",
        "objects": "CREATE TABLE IF NOT EXISTS objects (id INTEGER PRIMARY KEY, object_name text NOT NULL);",
        "things": "CREATE TABLE IF NOT EXISTS things (id INTEGER PRIMARY KEY, thing_name text NOT NULL)"
    },
    "drop": {
        "items": "DROP TABLE IF EXISTS items;",
        "objects": "DROP TABLE IF EXISTS objects;"
    }
}

process = "load"
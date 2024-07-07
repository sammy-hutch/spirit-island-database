## temporary data

scripts = {
    "build": {
        "items": "CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, item_name text NOT NULL);",
        "objects": "CREATE TABLE IF NOT EXISTS objects (id INTEGER PRIMARY KEY, object_name text NOT NULL);",
        "things": "CREATE TABLE IF NOT EXISTS things (id INTEGER PRIMARY KEY, thing_name text NOT NULL)"
    },
    "drop": {
        "adversaries_dim": "DROP TABLE IF EXISTS adversaries_dim",
        "aspects_dim": "DROP TABLE IF EXISTS aspects_dim",
        "events_fact": "DROP TABLE IF EXISTS events_fact",
        "games_fact": "DROP TABLE IF EXISTS games_fact",
        "scenarios_dim": "DROP TABLE IF EXISTS scenarios_dim",
        "spirits_dim": "DROP TABLE IF EXISTS spirits_dim"
    }
}

process = "load"
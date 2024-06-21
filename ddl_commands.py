# set of commands for interfacing with the database, e.g. to build tables

import sqlite3
import env_vars
from helpers import bcolors, ddl_function_tenses, accepted_processes

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

def ddl_runner(scripts, process):
    ## accepts 
    ##   scripts: a dictionary of table names (keys) and SQL DDL statements (values)
    ##   process: the type of scripts to be executed ("build","drop")
    ## iterates through each table in the dictionary and runs the associated DDL statement
    try:
        with sqlite3.connect(env_vars.database_directory) as conn:
            present_action = ddl_function_tenses[process]["present"]
            past_action = ddl_function_tenses[process]["past"]
            scripts = scripts[process]
            count = len(scripts)
            print(f"Tables to {process}: {count}")
            if process == "drop":
                response = input(f"{bcolors.WARNING}You are about to drop {count} tables - do you want to continue? [y/n] {bcolors.ENDC}")
                if response != "y":
                    print("Aborting...")
                    exit()
            cur = conn.cursor()
            for script in scripts:
                try:
                    cur.execute(scripts[script])
                    print(f"{bcolors.OKGREEN}Successfully {past_action} table {script}{bcolors.ENDC}")
                except sqlite3.Error as e:
                    print(f"{bcolors.FAIL}Error with {present_action} table {script}: {e}{bcolors.ENDC}")
                    count -= 1
            conn.commit()
            print(f"Finished {present_action} {count} tables")
    except sqlite3.Error as e:
        print(f"{bcolors.FAIL}Error with process: {e}{bcolors.ENDC}")


process = "drop"

if __name__ == "__main__":
    if process in accepted_processes:
        ddl_runner(scripts, process)
        exit()
    else:
        raise Exception(f"{bcolors.FAIL}No valid process defined. Accepted processes: build, drop.{bcolors.ENDC}")
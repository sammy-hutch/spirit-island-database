# set of functions for interfacing with the database, e.g. to build tables
# each function is designed to accept a dict/list of related DB processes to be performed
#   this way, each function only needs to be run once, 
#   so db connection only needs to be established (and closed) once

import sqlite3
from env_vars import database
from helpers.helpers import bcolors, ddl_function_tenses
from helpers.helpers_temp import process
from pandas import DataFrame

def ddl_runner(scripts, process):
    ## performs SQL scripts against db
    ## accepts 
    ##   scripts: a dictionary of table names (keys) and SQL DDL statements (values)
    ##   process: the type of scripts to be executed ("build","drop")
    ## iterates through each table in the dictionary and runs the associated DDL statement
    try:
        with sqlite3.connect(database) as conn:
            present_action = ddl_function_tenses[process]["present"]
            past_action = ddl_function_tenses[process]["past"]
            scripts = scripts[process]
            count = len(scripts)
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
        print(f"{bcolors.FAIL}Error with process ddl_runner: {e}{bcolors.ENDC}")

def df_to_sql_table(df_dict):
    ## writes data from pandas df to db
    ## accepts
    ##   df_dict: a dictionary of table names (keys) and dataframes of the table data (values)
    try:
        with sqlite3.connect(database) as conn:
            present_action = ddl_function_tenses[process]["present"]
            past_action = ddl_function_tenses[process]["past"]
            count = len(df_dict)
            for table in df_dict:
                df = DataFrame(df_dict[table])
                try:
                    df.to_sql(name=table, con=conn, if_exists='replace')
                    print(f"{bcolors.OKGREEN}Successfully {past_action} table {table}{bcolors.ENDC}")
                except sqlite3.Error as e:
                    print(f"{bcolors.FAIL}Error with {present_action} table {table}: {e}{bcolors.ENDC}")
                    count -= 1
            conn.commit()
            print(f"Finished {present_action} {count} tables")            
    except sqlite3.Error as e:
        print(f"{bcolors.FAIL}Error with process df_to_sql_table: {e}{bcolors.ENDC}")

def db_table_list():
    # queries db meta to return list of tables
    try:
        with sqlite3.connect(database) as conn:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_schema WHERE type = 'table';")
            result = cur.fetchall()
            tables = []
            for row in result:
                row = row[0]
                tables.append(row)
            conn.commit()
            return tables
    except sqlite3.Error as e:
        print(f"{bcolors.FAIL}Error with process db_table_list: {e}{bcolors.ENDC}")

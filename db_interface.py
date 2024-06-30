# set of commands for interfacing with the database, e.g. to build tables

import sqlite3
from env_vars import database
from helpers import bcolors, ddl_function_tenses
from helpers_temp import process
from pandas import DataFrame

def ddl_runner(scripts, process):
    ## for processing SQL scripts
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

def df_to_sql_table(df, table_name):
    ## for processing pandas dataframes
    ## accepts
    ##   df: a dataframe, to be loaded into a table
    ##   table_name: the name of the table to be made from the dataframe
    try:
        with sqlite3.connect(database) as conn:
            # present_action = ddl_function_tenses[process]["present"]
            past_action = ddl_function_tenses[process]["past"]
            df = DataFrame(df)
            df.to_sql(name=table_name, con=conn, if_exists='replace')
            print(f"{bcolors.OKGREEN}Successfully {past_action} table {table_name}{bcolors.ENDC}")
    except sqlite3.Error as e:
        print(f"{bcolors.FAIL}Error with process: {e}{bcolors.ENDC}")
    # TODO: add warning message if overwriting table, add warning if schema has changed, add counters for failures

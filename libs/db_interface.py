# set of functions for interfacing with the database, e.g. to build tables
# each function is designed to accept a dict/list of related DB processes to be performed
#   this way, each function only needs to be run once, 
#   so db connection only needs to be established (and closed) once

import sqlite3
import csv
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

def export_table_to_csv(db_path, table_name, csv_file_path):
    """
    Export a table from an SQLite database to a CSV file.

    Parameters:
    db_path (str): The path to the SQLite database file.
    table_name (str): The name of the table to be exported.
    csv_file_path (str): The path to the output CSV file.
    """
    # Connect to the SQLite database
    connection = sqlite3.connect(db_path)
    
    # Create cursor object to execute SQL queries
    cursor = connection.cursor()

    # Execute a query to select all data from the table
    cursor.execute(f"SELECT * FROM {table_name}")
    
    # Fetch all rows of the query result
    rows = cursor.fetchall()
    
    # Get column headers using cursor description
    column_headers = [description[0] for description in cursor.description]
    
    # Open the CSV file for writing
    with open(csv_file_path, 'w', newline='', encoding='utf-8') as csv_file:
        # Create a CSV writer object
        csv_writer = csv.writer(csv_file)
        
        # Write the column headers to the CSV file
        csv_writer.writerow(column_headers)
        
        # Write the rows of data to the CSV file
        for row in rows:
            csv_writer.writerow(row)
    
    # Close the cursor and the database connection
    cursor.close()
    connection.close()
    
    print(f"Table '{table_name}' has been exported to {csv_file_path}")

# Example usage:
# export_table_to_csv('database.sqlite', 'my_table', 'my_table.csv')


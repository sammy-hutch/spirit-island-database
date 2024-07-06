# utility functions

from helpers.helpers import bcolors, ddl_function_tenses
from libs.db_interface import db_table_list

def data_drop_check(new_data, process):
    # function to get confirmation from user when new data would overwrite current data
    subprocess = ddl_function_tenses[process]["subprocess"]
    drop_list = []
    old_data = db_table_list()
    for table in new_data:
        if table in old_data:
            drop_list.append(table)
    count = len(drop_list)
    if drop_list:
        response = input(f"{bcolors.WARNING}You are about to {subprocess} the following {count} tables: {drop_list} - do you want to continue? [y/n] {bcolors.ENDC}")
        if response != "y":
            print("Aborting...")
            return False
        else:
            return True
    else:
        if process == "drop":
            print("No tables to drop, exiting process")
            return False
# utility functions
from helpers import bcolors
from db_interface import db_table_list

def data_drop_check(new_data, process):
    # function to get confirmation from user if new data would overwrite current data
    drop_list = []
    old_data = db_table_list()
    for table in new_data:
        if table in old_data:
            drop_list.append(table)
    if drop_list:
        response = input(f"{bcolors.WARNING}You are about to {process} the following tables: {drop_list} - do you want to continue? [y/n] {bcolors.ENDC}")
        if response != "y":
            print("Aborting...")
            exit()
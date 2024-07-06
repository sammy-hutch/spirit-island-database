# handlers define processes, i.e. sequences of functions

from helpers.helpers import bcolors
from helpers.helpers_temp import scripts
from libs.db_interface import df_to_sql_table, ddl_runner
from libs.data_transfer import read_data_from_google_sheets
from libs.utils import data_drop_check

def load_data_from_gsheets(process):
    # reads data from google sheets and loads it into db
    try:
        # 1. pull data from gsheets
        df_dict = read_data_from_google_sheets()

        # 2. check if db data will be overwritten
        if not data_drop_check(df_dict, process):
            return False

        # TODO: add warning if schema has changed (create a check in utils file)

        # 3. write data to db
        df_to_sql_table(df_dict)
    except:
        print(f"{bcolors.FAIL}Error in handler 'load_data_from_gsheets'{bcolors.ENDC}")

def run_ddl_scripts(process):
    # runs ddl scripts against db
    try:
        # 1. check if db data will be overwritten
        # table_list = scripts[process]
        if not data_drop_check(scripts[process], process):
            return False

        # TODO: add warning if schema has changed

        # 2. run ddl scripts
        ddl_runner(scripts, process)
    except:
        print(f"{bcolors.FAIL}Error in handler 'run_ddl_scripts'{bcolors.ENDC}")

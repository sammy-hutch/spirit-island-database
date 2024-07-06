# handlers define processes, i.e. sequences of functions
from helpers import bcolors
from helpers_temp import scripts
from db_interface import df_to_sql_table, ddl_runner
from data_transfer import read_data_from_google_sheets
from utils import data_drop_check

def load_data_from_gsheets(process):
    # process to read data from google sheets and load it into db
    if process == 'load':
        subprocess = 'overwrite'

    # 1. pull data from gsheets
    df_dict = read_data_from_google_sheets()

    # 2. check if db data will be overwritten
    data_drop_check(df_dict, subprocess)

    # TODO: add warning if schema has changed (create a check in utils file)

    # 3. write data to db
    result = df_to_sql_table(df_dict)
    print(result)
        # TODO: add success message
        # TODO: add failure message (use return block to get a message to process here)

def run_ddl_scripts(process):
    # process to run ddl scripts against db

    # TODO: add try block
    ddl_runner(scripts, process)
    # TODO: move check block to here
    # TODO: add success message
    # TODO: add failure counter
    # TODO: add failure message (use return block to get a message to process here)

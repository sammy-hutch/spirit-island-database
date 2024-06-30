from env_vars import gsheets
from helpers import bcolors, accepted_processes
from helpers_temp import scripts, process
from db_interface import df_to_sql_table, ddl_runner
from data_transfer import load_data_from_google_sheet

def load_data_from_gsheets():
    for sheet in gsheets:
        # TODO: add try block
        url = gsheets[sheet]
        df = load_data_from_google_sheet(url)
        df_to_sql_table(df, sheet)
        # TODO: add success message, add failure counter, add failure message (use return block to get a message to process here)

def run_ddl_scripts():
    # TODO: add try block
    ddl_runner(scripts, process)
    # TODO: add success message, add failure counter, add failure message (use return block to get a message to process here)

if __name__ == "__main__":
    if process in accepted_processes:
        if process == "load":
            load_data_from_gsheets()
            exit()
        else:
            run_ddl_scripts()
            exit()
        # TODO: add success message, add failure counter, add failure message
    else:
        raise Exception(f"{bcolors.FAIL}No valid process defined. Accepted processes: {accepted_processes}.{bcolors.ENDC}")

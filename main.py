from helpers import bcolors, accepted_processes
from helpers_temp import process
from handlers import load_data_from_gsheets, run_ddl_scripts

if __name__ == "__main__":
    if process in accepted_processes:
        if process == "load":
            load_data_from_gsheets(process)
            exit()
        else:
            run_ddl_scripts(process)
            exit()
        # TODO: add success message, add failure counter, add failure message
    else:
        raise Exception(f"{bcolors.FAIL}No valid process defined. Accepted processes: {accepted_processes}.{bcolors.ENDC}")

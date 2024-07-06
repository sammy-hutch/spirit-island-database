## functions to transfer data to and from external sources

from env_vars import gsheets
from helpers.helpers import bcolors
import pandas as pd

def read_data_from_google_sheets():
    try:
        df_dict = {}
        for sheet in gsheets:
            # TODO: add try block & error handling
            url = gsheets[sheet]
            new_url = url.replace("/edit?gid=", "/export?format=csv&gid=")
            df = pd.read_csv(new_url)
            df_dict[sheet] = df
        return df_dict
    except:
        print(f"{bcolors.FAIL}Error in data_transfer process 'read_data_from_google_sheets'{bcolors.ENDC}")
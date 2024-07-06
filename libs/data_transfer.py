## functions to transfer data in and out of the database

from env_vars import gsheets
import pandas as pd

def read_data_from_google_sheets():
    df_dict = {}
    for sheet in gsheets:
        # TODO: add try block & error handling
        url = gsheets[sheet]
        new_url = url.replace("/edit?gid=", "/export?format=csv&gid=")
        df = pd.read_csv(new_url)
        df_dict[sheet] = df
    return df_dict
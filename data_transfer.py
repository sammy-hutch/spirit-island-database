## functions to transfer data in and out of the database

import pandas as pd

def load_data_from_google_sheet(url):
    new_url = url.replace("/edit?gid=", "/export?format=csv&gid=")
    df = pd.read_csv(new_url)
    return df
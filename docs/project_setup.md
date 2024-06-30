# Project Setup

## Create a Database
...

## env_vars
sensitive data is stored in env_vars.py file. You will need to create this file and populate it with the following variables:
- database_directory: string reference to where your local SQLite database is stored, e.g. ```"/home/[user]/my.db"```
- gsheets: a dictionary of URLs for the google sheets data. These URLS will be used to create the base tables which the rest of the models are built on. Create the following keys within the dictionary, then copy the urls for the matching sheets and paste as values:
    - ```"spirits_dim"```
    - ```"aspects_dim"```
    - ```"adversaries_dim"```
    - ```"scenarios_dim"```
    - ```"games_fact"```
    - ```"events_fact"```
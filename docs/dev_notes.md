sqlite via python tutorial: https://www.sqlitetutorial.net/sqlite-python/

needed components / infrastructure

want to be able to create SQL scripts in .sql files rather than in comment blocks in python. this way, it is easy to edit, keep track of & organise all the scripts.
to do this, i need a function that can take sql files and extract the text to populate python function with the sql scripts

components:
[X] function which runs DDL commands against database
[ ] set up jinja
[ ] files where SQL scripts are built
[ ] seed files to build static dimension tables & store 'data' (accolade dscriptions and calculations)
[X] process (API?) to pull data (at least fact tables) from google sheets
[ ] process to pull data from local excel sheet
[ ] function where user defines which scripts they want to process, and how they want to process them (build, drop, etc)
[ ] function to compile and order chosen SQL scripts, ready for input into DDL runner
[ ] tags for types of tables (e.g. source, seed, models) (and yaml file) so tables can be handled in batches

General TODO:
[ ] unit tests and data tests
[ ] docstrings



Accolades TODO
| done | nominee | name | accolade |
| ---- | ------- | ---- | -------- |
| | adversary&scenario | let's hope this never happens | lowest avg score for pairing of adv and sce |
| | adversary&scenario | cheat code | highest avg score for pairing of adv and sce |
| | adversary&spirit | we meet again | most common matchup of adversary with spirit |
| | scenario | groundhog day | most frequently played scenario |
| | scenario | edge of tomorrow | lowest avg score for scenario |
| | spirit pair | best of friends | most frequently paired together spirits |
| | spirit pair | what does that make us? | most frequently play with the same spirit, but not with each other |
| | spirit | the blight never bothered me anyway | highest score despite high blight ratio (possibly calculated with regression) |

sqlite via python tutorial: https://www.sqlitetutorial.net/sqlite-python/

needed components / infrastructure

want to be able to create SQL scripts in .sql files rather than in comment blocks in python. this way, it is easy to edit, keep track of & organise all the scripts.
to do this, i need a function that can take sql files and extract the text to populate python function with the sql scripts

components:
[X] function which runs DDL commands against database
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



Accolades
| nominee | name | accolade |
| ------- | ---- | -------- |
| adversary | not worth it | lowest avg score in wins |
| adversary | tough nut to crack | lowest win rate |
| adversary | intimidating | lowest avg difficulty |
| adversary&scenario | let's hope this never happens | lowest avg score for pairing of adv and sce |
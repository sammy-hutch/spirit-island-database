sqlite via python tutorial: https://www.sqlitetutorial.net/sqlite-python/

needed components / infrastructure

want to be able to create SQL scripts in .sql files rather than in comment blocks in python. this way, it is easy to edit, keep track of & organise all the scripts.
to do this, i need a function that can take sql files and extract the text to populate python function with the sql scripts

components:
[X] function which runs DDL commands against database
[ ] files where SQL scripts are built
[ ] seed files to build static dimension tables
[ ] process (API?) to pull data (at least fact tables) from google sheets
[ ] function where user defines which scripts they want to process, and how they want to process them (build, drop, etc)
[ ] function to compile and order chosen SQL scripts, ready for input into DDL runner



Accolades
| nominee | name | accolade |
| ------- | ---- | -------- |
| adversary | not worth it | lowest average score in wins |
| adversary | tough nut to crack | lowest win rate |
| adversary | intimidating | lowest average difficulty |
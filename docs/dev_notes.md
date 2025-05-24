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



Accolades
| nominee | name | accolade |
| ------- | ---- | -------- |
| adversary | not worth it | lowest avg score in wins |
| adversary | tough nut to crack | lowest win rate |
| adversary | intimidating | lowest avg difficulty |
| adversary&scenario | let's hope this never happens | lowest avg score for pairing of adv and sce |
| adversary&scenario | cheat code | highest avg score for pairing of adv and sce |
| adversary&spirit | we meet again | most common matchup of adversary with spirit |
| scenario | groundhog day | most frequently played scenario |
| scenario | edge of tomorrow | lowest avg score for scenario |
| spirit pair | best of friends | most frequently paired together spirits |
| spirit pair | what does that make us? | most frequently play with the same spirit, but not with each other |
| spirit | people person | highest avg dahan on island at endgame |
| spirit | antisocial | lowest avg dahan on island at endgame |
| spirit | messy eater | highest avg blight on island at endgame |
| spirit | clean freak | lowest avg blight on island at endgame |
| spirit | got places to be | highest average cards in deck at endgame (in wins) |
| spirit | no rush | lowest average cards in deck at endgame (in wins) | 
| spirit | it could have been glorious | highest average score in losses |
| spirit | i won.. but at what cost? | lowest average score in wins |
| spirit | mvp | highest avg score in wins |
| spirit | drama queen | lowest average score in losses |
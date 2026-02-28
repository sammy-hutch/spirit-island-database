# Spirit Island Game Tracker App

## Gallery
<img src="../docs/images/AddGameScreen.jpg" alt="Add Game Screen" width="30%">
<img src="../docs/images/ViewResultsScreen.jpg" alt="View Results Screen" width="30%">
<img src="../docs/images/SettingsScreen.jpg" alt="Settings Screen" width="30%">

## Functionality

The Spirit Island Game Tracker app allows for recording results of played spirit island games, then viewing the results and exporting them. The following info about a game can be recorded:
- Spirits played with (and their aspects if relevant)
- Adversaries played against
- Scenarios played
- Game score, calculated from difficulty, win/loss, invader cards, dahan/spirit, blight/spirit
- Terror level at game end
- Whether game was "mobile" (digital) or not
- Whether it was a playtest game
- The date it was played
- Any notes about the game

Currently, game results can be exported (e.g. copied to clipboard) and then manually uploaded to the google sheets that acts as the origin source of truth for the local database. Future work to add functionality that these results can be automatically added. In any case, the current process is quicker than manually typing them up

## Download

Latest version should be attached to the related release in git, otherwise find on [expo profile](https://expo.dev/accounts/sammy-hutch/projects/SpiritIslandTracker/builds)
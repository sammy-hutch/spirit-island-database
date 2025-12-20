function submitData() {
  
  ////// set env vars
  var myGoogleSheet = SpreadsheetApp.getActiveSpreadsheet(); 
  var entryForm = myGoogleSheet.getSheetByName("Entry_Form");
  var eventsDatasheet = myGoogleSheet.getSheetByName("events_fact");
  var gamesDatasheet = myGoogleSheet.getSheetByName("games_fact");

  ////// set ui vars
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert("Submit", 'Do you want to submit the data?', ui.ButtonSet.YES_NO);

  ////// run ui trigger
  if (response == ui.Button.NO)
   {return; 
  }

  ////// set row data and game vars
  var gamesBlankRow = gamesDatasheet.getLastRow()+1
  var gameLastRow = gamesDatasheet.getLastRow();
  var gameId = "00001"
  if (String(parseInt(gamesDatasheet.getRange(gameLastRow, [1]).getValue())) != "NaN") {
    gameId = String(parseInt(gamesDatasheet.getRange(gameLastRow, [1]).getValue()) + 1).padStart(5,0)
  }            // increment gameId by 1 from previously recorded gameId

  ////// set spirit vars
  var spiritsRange = SpreadsheetApp.getActive().getRange("Entry_Form!C10:C20").getValues();
  var spiritData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("spirits_dim").getRange('A2:B42').getValues();
  var spiritList = spiritData.map(x => x[1]);
  var aspectsRange = SpreadsheetApp.getActive().getRange("Entry_Form!D10:D20").getValues();
  var aspectData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("aspects_dim").getRange('A2:B32').getValues();
  var aspectList = aspectData.map(x => x[1]);

  ////// set adversary vars
  var adversariesRange = SpreadsheetApp.getActive().getRange("Entry_Form!H10:H12").getValues();
  var adversaryData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("adversaries_dim").getRange('A2:B9').getValues();
  var adversaryList = adversaryData.map(x => x[1]);
  var adversaryPresent = false
  for (var adversaryCounter = 0; adversaryCounter <= 2; adversaryCounter = adversaryCounter + 1) {
    if (adversariesRange[adversaryCounter][0].length != 0) {
      adversaryPresent = true
    }
  }            //identify if adversaries present
  if (adversaryPresent == false) {
    adversariesRange = [["None"], [""], [""]]
  }            // if no adversaries, still run one time
  var adversaryLevelRange = SpreadsheetApp.getActive().getRange("Entry_Form!I10:I12").getValues();

  ////// set scenario vars
  var scenariosRange = SpreadsheetApp.getActive().getRange("Entry_Form!H18:H20").getValues();    
  var scenarioData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("scenarios_dim").getRange('A2:B17').getValues();
  var scenarioList = scenarioData.map(x => x[1]);
  var scenarioPresent = false
  for (var scenarioCounter = 0; scenarioCounter <= 2; scenarioCounter = scenarioCounter + 1) {
    if (scenariosRange[scenarioCounter][0].length != 0) {
      scenarioPresent = true
    }
  }            // identify if scenarios present
  if (scenarioPresent == false) {
    scenariosRange = [["None"], [""], [""]]
  }            // if no scenarios, still run one time

  ////// check data quality before writing
  for (var scenarioCounter = 0; scenarioCounter <= 2; scenarioCounter = scenarioCounter + 1) {
    if (scenariosRange[scenarioCounter][0].length == 0 || scenariosRange[scenarioCounter][0] == "None") {
      continue;
    }            // skip scenario data quality check for blank fields
    var scenarioIndex = scenarioList.indexOf(scenariosRange[scenarioCounter][0]);
    if (scenarioIndex === -1) {
      throw new Error('Incorrect Scenario name!')
    }            // raise error if incorrect scenario name
  }
  for (var adversaryCounter = 0; adversaryCounter <= 2; adversaryCounter = adversaryCounter +1) {
    if (adversariesRange[adversaryCounter][0].length == 0 || adversariesRange[adversaryCounter][0] == "None") {
      continue;
    }            // skip adversary data quality check for blank fields
    var adversaryIndex = adversaryList.indexOf(adversariesRange[adversaryCounter][0]);
    if (adversaryIndex === -1) {
      throw new Error('Incorrect Adversary name!')
    }            // raise error if incorrect adversary name
  }
  for (var spiritCounter = 0; spiritCounter <= 10; spiritCounter = spiritCounter + 1 ) {
    if (spiritsRange[spiritCounter][0].length == 0) {
      continue;
    }            // skip spirit data quality check for blank fields
    var spiritIndex = spiritList.indexOf(spiritsRange[spiritCounter][0]);
    if (spiritIndex === -1) {
      throw new Error('Incorrect Spirit name!')
    }            // raise error if incorrect spirit name
  }
  for (var aspectCounter = 0; aspectCounter <= 10; aspectCounter = aspectCounter + 1) {
    if (aspectsRange[aspectCounter][0].length == 0) {
      continue;
    }            // skip aspect data quality check for blank fields
    var aspectIndex = aspectList.indexOf(aspectsRange[aspectCounter][0]);
    if (aspectIndex === -1) {
      throw new Error('Incorrect Aspect name!')
    }            // raise error if incorrect aspect name
  }

  ////// data writing content for games_fact
  gamesDatasheet.getRange(gamesBlankRow, 1).setValue(gameId);                               //game id
  gamesDatasheet.getRange(gamesBlankRow, 2).setValue(entryForm.getRange("N10").getValue()); //game difficulty
  gamesDatasheet.getRange(gamesBlankRow, 3).setValue(entryForm.getRange("N12").getValue()); //game win
  gamesDatasheet.getRange(gamesBlankRow, 4).setValue(entryForm.getRange("N14").getValue()); //game cards
  gamesDatasheet.getRange(gamesBlankRow, 5).setValue(entryForm.getRange("N16").getValue()); //game dahan
  gamesDatasheet.getRange(gamesBlankRow, 6).setValue(entryForm.getRange("N18").getValue()); //game blight
  gamesDatasheet.getRange(gamesBlankRow, 7).setValue(entryForm.getRange("N20").getValue()); //game score
  gamesDatasheet.getRange(gamesBlankRow, 8).setValue(entryForm.getRange("E23").getValue()); //game additional info

  ////// scenario loop start
  for (var scenarioCounter = 0; scenarioCounter <= 2; scenarioCounter = scenarioCounter + 1) {
    if (scenariosRange[scenarioCounter][0].length == 0) {
      continue;
    }            // skip running when no scenario present on current row of scenario data
    var scenarioIndex = scenarioList.indexOf(scenariosRange[scenarioCounter][0]);
    var scenarioID = ""
    if (scenariosRange[scenarioCounter][0] != "None") {
      scenarioID = scenarioData[scenarioIndex][0];
    }            // update scenarioId to match current scenario
    
    ////// adversary loop start
    for (var adversaryCounter = 0; adversaryCounter <= 2; adversaryCounter = adversaryCounter +1) {
      if (adversariesRange[adversaryCounter][0].length == 0) {
        continue;
      }            // skip running when no adversary present on current row of adversary data
      var adversaryIndex = adversaryList.indexOf(adversariesRange[adversaryCounter][0]);
      var adversaryId = ""
      if (adversariesRange[adversaryCounter][0] != "None") {
        adversaryId = adversaryData[adversaryIndex][0];
      }            // update adversaryId to match current adversary
      var adversaryLevel = adversaryLevelRange[adversaryCounter][0];
      
      ////// spirit loop start
      for (var spiritCounter = 0; spiritCounter <= 10; spiritCounter = spiritCounter + 1 ) {
        if (spiritsRange[spiritCounter][0].length == 0) {
          continue;
        }            // skip running when no spirit present on current row of spirit data
        var spiritIndex = spiritList.indexOf(spiritsRange[spiritCounter][0]);
        var spiritId = spiritData[spiritIndex][0];
        var aspectIndex = aspectList.indexOf(aspectsRange[spiritCounter][0]);
        var aspectId = "";
        if (aspectIndex != -1) {
          aspectId = aspectData[aspectIndex][0];
        }            // update aspectId to match current aspect

        ////// set event vars
        var eventsBlankRow = eventsDatasheet.getLastRow()+1
        var eventLastRow = eventsDatasheet.getLastRow();
        var eventId = "00001"
        if (String(parseInt(eventsDatasheet.getRange(eventLastRow, [1]).getValue())) != "NaN") {
          eventId = String(parseInt(eventsDatasheet.getRange(eventLastRow, [1]).getValue()) + 1).padStart(5,0)
        }            // increment eventId by one more than previous eventId

        ////// data writing content for events_fact
        eventsDatasheet.getRange(eventsBlankRow, 1).setValue(eventId);            //event id
        eventsDatasheet.getRange(eventsBlankRow, 2).setValue(gameId);             //game id
        eventsDatasheet.getRange(eventsBlankRow, 3).setValue(spiritId);           //spirit id
        eventsDatasheet.getRange(eventsBlankRow, 4).setValue(aspectId);           //aspect id
        eventsDatasheet.getRange(eventsBlankRow, 5).setValue(adversaryId);        //adversary id
        eventsDatasheet.getRange(eventsBlankRow, 6).setValue(adversaryLevel)      //adversary level
        eventsDatasheet.getRange(eventsBlankRow, 7).setValue(scenarioID);         //scenario id

      } // spirit loop end

    } // adversary loop end
  
  } // scenario loop end

  ui.alert(' "New Data Saved - Game #' + gameId + '"')

  ////// entry form cleaning content
  entryForm.getRange("C10:D20").clearContent();
  entryForm.getRange("H10:I12").clearContent();
  entryForm.getRange("H18:H20").clearContent();
  entryForm.getRange("N10:N18").clearContent();
  entryForm.getRange("E23").clearContent();


}



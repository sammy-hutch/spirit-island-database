// src/screens/ViewResultsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { db } from '../../App';

const GameItem = ({ game }) => (
  <View style={styles.gameItemContainer}>
    <Text style={styles.gameItemTitle}>Game ID: {game.game_id} - {new Date(game.game_date).toLocaleDateString()}</Text>
    <Text>Outcome: {game.game_win} | Difficulty: {game.game_difficulty} | Score: {game.game_score}</Text>
    {game.game_mobile ? <Text>Played on Mobile</Text> : null}
    {game.game_info ? <Text>Notes: {game.game_info}</Text> : null}

    {game.spirits && game.spirits.length > 0 && (
      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Spirits:</Text>
        {game.spirits.map((s, idx) => (
          <Text key={idx} style={styles.detailText}>
            • {s.spirit_name} {s.aspect_name ? `(${s.aspect_name})` : ''}
          </Text>
        ))}
      </View>
    )}

    {game.adversaries && game.adversaries.length > 0 && (
      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Adversaries:</Text>
        {game.adversaries.map((a, idx) => (
          <Text key={idx} style={styles.detailText}>
            • {a.adversary_name} (Level {a.adversary_level})
          </Text>
        ))}
      </View>
    )}

    {game.scenarios && game.scenarios.length > 0 && (
      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Scenarios:</Text>
        {game.scenarios.map((s, idx) => (
          <Text key={idx} style={styles.detailText}>
            • {s.scenario_name}
          </Text>
        ))}
      </View>
    )}

    <Text style={styles.scoreDetails}>
      Invader Cards: {game.game_cards}, Dahan Health: {game.game_dahan}, Blight: {game.game_blight}
    </Text>
  </View>
);

const generateCsvFromObjects = (dataArray) => {
  if (!dataArray || dataArray.length === 0) {
    return "";
  }

  const headers = Object.keys(dataArray[0]);

  const escapeCsvField = (field) => {
    if (field === null || field === undefined) return '';
    let str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCsvField).join(',');
  const dataRows = dataArray.map(obj =>
    headers.map(header => escapeCsvField(obj[header])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
};

function ViewResultsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [copyingRaw, setCopyingRaw] = useState(false);
  const [updatingMasterData, setUpdatingMasterData] = useState(false);

  const fetchGameData = useCallback(async () => {
    if (!db) {
      Alert.alert("Error", "Database not initialized. Please restart the app.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const games = await db.getAllAsync(
        `SELECT game_id, game_difficulty, game_win, game_cards, game_dahan, game_blight, game_score, game_info
        FROM games_fact ORDER BY game_id DESC;`
      );

      const combinedData = [];

      for (const game of games) {
        const spirits = await db.getAllAsync(
          `SELECT 
          sd.spirit_name, 
          ad.aspect_name
        FROM events_fact e
        LEFT JOIN spirits_dim sd ON e.spirit_id = sd.spirit_id
        LEFT JOIN aspects_dim ad ON e.aspect_id = ad.aspect_id
        WHERE e.game_id = ? AND e.spirit_id IS NOT NULL
        GROUP BY sd.spirit_name, ad.aspect_name;`,
          [game.game_id]
        );

        const adversaries = await db.getAllAsync(
          `SELECT
          ad.adversary_name,
          e.adversary_level -- Include the level from events_fact
        FROM events_fact e
        LEFT JOIN adversaries_dim ad ON e.adversary_id = ad.adversary_id
        WHERE e.game_id = ? AND e.adversary_id IS NOT NULL
        GROUP BY ad.adversary_name, e.adversary_level;`,
          [game.game_id]
        );

        const scenarios = await db.getAllAsync(
          `SELECT
          sd.scenario_name
        FROM events_fact e
        LEFT JOIN scenarios_dim sd ON e.scenario_id = sd.scenario_id
        WHERE e.game_id = ? AND e.scenario_id IS NOT NULL
        GROUP BY sd.scenario_name;`,
          [game.game_id]
        );

        combinedData.push({
          ...game,
          spirits,
          adversaries,
          scenarios,
        });
      }
      setGameData(combinedData);
    } catch (error) {
      console.error("Error fetching game data:", error);
      Alert.alert("Error", "Failed to load game results.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGameData();
      return () => { };
    }, [fetchGameData])
  );

  //TODO: complete refactor - just export reads from games_fact and events_fact directly
  const generateCombinedGameCSV = (data) => {
    const headers = [
      "ID", "Played At", "Mobile Game", "Notes", "Difficulty", "Win/Loss",
      "Invader Cards", "Dahan Health", "Blight on Boards", "Total Score",
      "Spirits (Aspects)", "Adversaries (Levels)", "Scenarios"
    ];

    const rows = data.map(game => {
      const spiritString = game.spirits
        .map(s => `${s.spirit_name}${s.aspect_name ? ` (${s.aspect_name})` : ''}`)
        .join('; ');

      const adversaryString = game.adversaries
        .map(a => `${a.adversary_name}${a.adversary_level !== null ? ` (L${a.adversary_level})` : ''}`)
        .join('; ');

      const scenarioString = game.scenarios
        .map(s => s.scenario_name)
        .join('; ');

      const escape = (field) => {
        if (field === null || field === undefined) return '';
        let str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        game.game_id,
        //new Date(game.game_date).toISOString(),
        //game.game_mobile ? "Yes" : "No",
        game.game_info,
        game.game_difficulty,
        game.game_win,
        game.game_cards,
        game.game_dahan,
        game.game_blight,
        game.game_score,
        spiritString,
        adversaryString,
        scenarioString,
      ].map(escape).join(',');
    });

    return [headers.map(escape).join(','), ...rows].join('\n');
  };

  const exportToCSV = async () => {
    if (gameData.length === 0) {
      Alert.alert("No Data", "There are no game results to export.");
      return;
    }
    setExporting(true);
    try {
      const csvString = generateCombinedGameCSV(gameData);
      const filename = `SpiritIslandResults_${Date.now()}.csv`;
      const fileUri = FileSystem.cacheDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing not available", "Sharing is not available on your device. You can still copy to clipboard.");
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Share Spirit Island Results CSV',
        UTI: 'public.comma-separated-values'
      });
      Alert.alert("Export Successful", "CSV file exported and shared.");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      Alert.alert("Export Failed", `Could not export CSV: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const copyCombinedToClipboard = async () => {
    if (gameData.length === 0) {
      Alert.alert("No Data", "There are no game results to copy.");
      return;
    }
    try {
      const csvString = generateCombinedGameCSV(gameData);
      await Clipboard.setStringAsync(csvString);
      Alert.alert("Copied to Clipboard", "Combined game results copied as CSV to clipboard.");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Alert.alert("Copy Failed", `Could not copy to clipboard: ${error.message}`);
    }
  };

  const copyGamesFactToClipboard = async () => {
    if (!db) { Alert.alert("Error", "Database not initialized."); return; }
    setCopyingRaw(true);
    try {
      const result = await db.getAllAsync(`SELECT game_id, game_difficulty, game_win, game_cards, game_dahan, game_blight, game_score, game_info FROM games_fact;`);
      if (result.length === 0) {
        Alert.alert("No Data", "No games found in games_fact to copy.");
        return;
      }
      const csvString = generateCsvFromObjects(result);
      await Clipboard.setStringAsync(csvString);
      Alert.alert("Copied", "Raw games_fact data copied to clipboard.");
    } catch (error) {
      console.error("Error copying games_fact:", error);
      Alert.alert("Error", `Failed to copy games_fact: ${error.message}`);
    } finally {
      setCopyingRaw(false);
    }
  };

  const copyEventsFactToClipboard = async () => {
    if (!db) { Alert.alert("Error", "Database not initialized."); return; }
    setCopyingRaw(true);
    try {
      const result = await db.getAllAsync(`SELECT event_id, game_id, spirit_id, aspect_id, adversary_id, adversary_level, scenario_id FROM events_fact;`);
      if (result.length === 0) {
        Alert.alert("No Data", "No events found in events_fact to copy.");
        return;
      }
      const csvString = generateCsvFromObjects(result);
      await Clipboard.setStringAsync(csvString);
      Alert.alert("Copied", "Raw events_fact data copied to clipboard.");
    } catch (error) {
      console.error("Error copying events_fact:", error);
      Alert.alert("Error", `Failed to copy events_fact: ${error.message}`);
    } finally {
      setCopyingRaw(false);
    }
  };

  // --- NEW: Google Sheet URLs (REPLACE WITH YOUR ACTUAL PUBLISHED CSV URLs) ---
  const googleSheetUrls = {
    spirit: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=1094958888&single=true&output=csv",
    adversary: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=610878563&single=true&output=csv",
    scenario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=1993883548&single=true&output=csv",
    aspect: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=101851110&single=true&output=csv",
  };
  // --- END NEW URLs ---

  // --- NEW: Function to update master data from Google Sheets ---
  const handleUpdateMasterData = async () => {
    if (!db) {
      Alert.alert("Error", "Database not initialized. Please restart the app.");
      return;
    }
    setUpdatingMasterData(true);
    try {
      await db.execAsync('BEGIN TRANSACTION;'); // Start SQLite transaction

      for (const type in googleSheetUrls) {
        const url = googleSheetUrls[type];

        let table = null;
        switch (type) {
          case "spirit":
            table = "spirits_dim";
            break;
          case "adversary":
            table = "adversaries_dim";
            break;
          case "scenario":
            table = "scenarios_dim";
            break;
          case "aspect":
            table = "aspects_dim";
            break;
        }

        console.log(`type: ${type}`)
        console.log(`table: ${table}`)

        if (!url) {
          console.warn(`Skipping update for type '${type}': URL is missing.`);
          continue; // Skip if URL is not set
        }

        console.log(`Fetching ${type} data from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for ${type} data.`);
        }
        const csvString = await response.text();
        const rows = csvString.split('\n').map(row => row.trim()).filter(Boolean);

        if (rows.length === 0) {
          console.warn(`No data found in CSV for ${type}`);
          continue;
        }

        // Assuming first row is header, and data starts from second row
        const headers = rows[0].split(',').map(h => h.trim());
        const dataRows = rows.slice(1);

        // Delete old data for this type
        const delete_statement = `DELETE FROM ${table};`; // Changed from WHERE 1=1
        await db.runAsync(delete_statement);
        console.log(`Deleted old '${type}' data.`);

        for (const row of dataRows) {
          const values = row.split(',').map(v => v.trim()); // Simple split, assumes no commas within fields

          if (values.length !== headers.length) {
            console.warn(`Skipping row due to column count mismatch for ${type}: "${row}"`);
            continue;
          }
          if (values.length === 0 || headers.length === 0) {
            console.warn(`Skipping empty row or headers for ${type}: "${row}"`);
            continue;
          }

          const placeholders = values.map(() => '?').join(', ');
          const columnNames = headers.join(', ');
          const insert_statement = `INSERT OR IGNORE INTO ${table} (${columnNames}) VALUES (${placeholders});`;

          await db.runAsync(insert_statement, values);
        }
        console.log(`Inserted ${dataRows.length} '${type}' records.`);
      }

      await db.execAsync('COMMIT;'); // Commit if all successful
      Alert.alert("Success", "Master data updated from Google Sheets!");
    } catch (error) {
      await db.execAsync('ROLLBACK;'); // Rollback on any error
      console.error("Error updating master data:", error);
      Alert.alert("Update Failed", `Failed to update master data: ${error.message}`);
    } finally {
      setUpdatingMasterData(false);
    }
  };
  // --- END NEW UPDATE FUNCTION ---

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading game results...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.buttonContainer}>
        <Button
          title={exporting ? "Exporting..." : "Export All Games CSV"}
          onPress={exportToCSV}
          disabled={exporting || gameData.length === 0}
        />
        <Button
          title="Copy All Games CSV"
          onPress={copyCombinedToClipboard}
          disabled={gameData.length === 0}
        />
        <Button
          title={copyingRaw ? "Copying..." : "Copy games_fact CSV"}
          onPress={copyGamesFactToClipboard}
          disabled={copyingRaw}
        />
        <Button
          title={copyingRaw ? "Copying..." : "Copy events_fact CSV"}
          onPress={copyEventsFactToClipboard}
          disabled={copyingRaw}
        />
        {/* --- NEW BUTTON: Update Master Data --- */}
        <Button
          title={updatingMasterData ? "Updating..." : "Update Master Data"}
          onPress={handleUpdateMasterData}
          disabled={updatingMasterData}
        />
        {/* --- END NEW BUTTON --- */}
        <Button
          title="Add New Game"
          onPress={() => navigation.navigate('AddGameTab')}
        />
      </View>

      {gameData.length === 0 ? (
        <View style={styles.centeredContainer}>
          <Text style={styles.noDataText}>No games recorded yet. Add a new game!</Text>
          <Button title="Add First Game" onPress={() => navigation.navigate('AddGameTab')} />
        </View>
      ) : (
        <FlatList
          data={gameData}
          keyExtractor={(item) => item.game_id.toString()}
          renderItem={({ item }) => <GameItem game={item} />}
          contentContainerStyle={styles.listContentContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f4f7',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  gameItemContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  gameItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#34495e',
  },
  detailSection: {
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
    paddingLeft: 10,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  scoreDetails: {
    fontSize: 13,
    color: '#777',
    marginTop: 10,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  }
});

export default ViewResultsScreen;
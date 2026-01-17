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

// ... (GameItem component - UNCHANGED)
const GameItem = ({ game }) => (
<View style={styles.gameItemContainer}>
  <Text style={styles.gameItemTitle}>Game ID: {game.game_id} - {new Date().toLocaleDateString()}</Text> {/* Removed game_date from database, so using current date for now */}
  <Text>Outcome: {game.game_win} | Difficulty: {game.game_difficulty} | Score: {game.game_score}</Text>
  {/* Removed game_mobile from database */}
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

// Removed generateCsvFromObjects - if needed elsewhere, make it a utility file
// For combined game data export, we'll keep generateCombinedGameCSV here
// as it relies on the specific structure of combined gameData.

function ViewResultsScreen({ navigation }) {
const [loading, setLoading] = useState(true);
const [gameData, setGameData] = useState([]);
const [exporting, setExporting] = useState(false);
// Removed copyingRaw and updatingMasterData state variables

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
            e.adversary_level
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

const generateCombinedGameCSV = (data) => {
  const headers = [
    "ID", "Difficulty", "Win/Loss", "Invader Cards", "Dahan Health", "Blight on Boards", "Total Score",
    "Notes", "Spirits (Aspects)", "Adversaries (Levels)", "Scenarios"
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
      game.game_difficulty,
      game.game_win,
      game.game_cards,
      game.game_dahan,
      game.game_blight,
      game.game_score,
      game.game_info, // Notes field
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

    const file = new FileSystem.File(fileUri);
    await file.writeAsStringAsync(csvString, { encoding: FileSystem.EncodingType.UTF8 });

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
      {/* Removed buttons for raw data export and master data update */}
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
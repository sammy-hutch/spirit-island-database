
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

// Helper component to render a single game item in the FlatList
const GameItem = ({ game }) => (
  <View style={styles.gameItemContainer}>
    <Text style={styles.gameItemTitle}>Game ID: {game.id} - {new Date(game.played_at).toLocaleDateString()}</Text>
    <Text>Outcome: {game.win_loss} | Difficulty: {game.difficulty} | Score: {game.total_score}</Text>
    {game.mobile_game ? <Text>Played on Mobile</Text> : null}
    {game.notes ? <Text>Notes: {game.notes}</Text> : null}

    {/* Display Spirits and Aspects */}
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

    {/* Display Adversaries and Levels */}
    {game.adversaries && game.adversaries.length > 0 && (
      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Adversaries:</Text>
        {game.adversaries.map((a, idx) => (
          <Text key={idx} style={styles.detailText}>
            • {a.name} (Level {a.level})
          </Text>
        ))}
      </View>
    )}

    {/* Display Scenarios */}
    {game.scenarios && game.scenarios.length > 0 && (
      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Scenarios:</Text>
        {game.scenarios.map((s, idx) => (
          <Text key={idx} style={styles.detailText}>
            • {s.name}
          </Text>
        ))}
      </View>
    )}

    {/* Display Game Score Data details */}
    <Text style={styles.scoreDetails}>
      Invader Cards: {game.invader_cards}, Dahan Health: {game.dahan_spirit}, Blight: {game.blight_spirit}
    </Text>
  </View>
);

function ViewResultsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState([]);
  const [exporting, setExporting] = useState(false); // State to disable export button during export

  // Function to fetch all game data from the database
  const fetchGameData = useCallback(async () => {
    if (!db) {
      Alert.alert("Error", "Database not initialized. Please restart the app.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch all games from games_dim
      const games = await db.getAllAsync(
        `SELECT id, played_at, mobile_game, notes, difficulty, win_loss,
              invader_cards, dahan_spirit, blight_spirit, total_score,
              adversary_1_name, adversary_1_level, adversary_2_name, adversary_2_level,
              scenario_1_name, scenario_2_name
       FROM games_dim ORDER BY played_at DESC;`
      );

      const combinedData = [];

      // 2. For each game, fetch its associated spirits from events_dim
      for (const game of games) {
        const spirits = await db.getAllAsync(
          `SELECT spirit_name, aspect_name FROM events_dim WHERE game_id = ?;`,
          [game.id]
        );

        // 3. Process adversaries and scenarios (these are stored directly in games_dim)
        const adversaries = [];
        if (game.adversary_1_name) {
          adversaries.push({ name: game.adversary_1_name, level: game.adversary_1_level });
        }
        if (game.adversary_2_name) {
          adversaries.push({ name: game.adversary_2_name, level: game.adversary_2_level });
        }

        const scenarios = [];
        if (game.scenario_1_name) {
          scenarios.push({ name: game.scenario_1_name });
        }
        if (game.scenario_2_name) {
          scenarios.push({ name: game.scenario_2_name });
        }

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
  }, []); // `db` is stable, so no need to add it to dependencies for useCallback

  // Use useFocusEffect to reload data whenever the screen comes into focus
  // This ensures data is fresh after adding a new game
  useFocusEffect(
    useCallback(() => {
      fetchGameData();
      // Optional: return a cleanup function if needed when the screen loses focus
      return () => { };
    }, [fetchGameData])
  );

  // Helper function to generate CSV string from game data
  const generateCSV = (data) => {
    // Define CSV headers
    const headers = [
      "ID", "Played At", "Mobile Game", "Notes", "Difficulty", "Win/Loss",
      "Invader Cards", "Dahan Health", "Blight on Boards", "Total Score",
      "Spirits (Aspects)", "Adversaries (Levels)", "Scenarios"
    ];

    // Map data to CSV rows
    const rows = data.map(game => {
      // Concatenate spirits and aspects for CSV cell
      const spiritString = game.spirits
        .map(s => `${s.spirit_name}${s.aspect_name ? ` (${s.aspect_name})` : ''}`)
        .join('; '); // Use semicolon to separate multiple spirits in one cell

      // Concatenate adversaries and levels for CSV cell
      const adversaryString = game.adversaries
        .map(a => `${a.name}${a.level !== null ? ` (L${a.level})` : ''}`)
        .join('; ');

      // Concatenate scenarios for CSV cell
      const scenarioString = game.scenarios
        .map(s => s.name)
        .join('; ');

      // Simple CSV escaping: wrap in quotes if field contains comma, quote, or newline.
      // Double internal quotes.
      const escapeCsvField = (field) => {
        if (field === null || field === undefined) return '';
        let str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        game.id,
        new Date(game.played_at).toISOString(), // Use ISO string for consistent date format
        game.mobile_game ? "Yes" : "No",
        game.notes,
        game.difficulty,
        game.win_loss,
        game.invader_cards,
        game.dahan_spirit,
        game.blight_spirit,
        game.total_score,
        spiritString,
        adversaryString,
        scenarioString,
      ].map(escapeCsvField).join(','); // Join fields with comma
    });

    return [headers.join(','), ...rows].join('\n'); // Join header and data rows with newline
  };

  // Function to export data as CSV file
  const exportToCSV = async () => {
    if (gameData.length === 0) {
      Alert.alert("No Data", "There are no game results to export.");
      return;
    }
    setExporting(true); // Disable button
    try {
      const csvString = generateCSV(gameData);
      const filename = `SpiritIslandResults_${Date.now()}.csv`;
      const fileUri = FileSystem.cacheDirectory + filename; // Store in app's cache directory

      // Write the CSV string to a file
      const file = new FileSystem.File(fileUri);
      await file.writeAsStringAsync(csvString, { encoding: FileSystem.EncodingType.UTF8 });

      // Check if sharing is available on the device
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing not available", "Sharing is not available on your device. You can still copy to clipboard.");
        return;
      }

      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Share Spirit Island Results CSV',
        UTI: 'public.comma-separated-values' // Recommended for iOS CSV files
      });
      Alert.alert("Export Successful", "CSV file exported and shared.");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      Alert.alert("Export Failed", `Could not export CSV: ${error.message}`);
    } finally {
      setExporting(false); // Re-enable button
    }
  };

  // Function to copy data as CSV to clipboard
  const copyToClipboard = async () => {
    if (gameData.length === 0) {
      Alert.alert("No Data", "There are no game results to copy.");
      return;
    }
    try {
      const csvString = generateCSV(gameData);
      await Clipboard.setStringAsync(csvString);
      Alert.alert("Copied to Clipboard", "Game results copied as CSV to clipboard.");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Alert.alert("Copy Failed", `Could not copy to clipboard: ${error.message}`);
    }
  };

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
      <Text style={styles.headerTitle}>My Spirit Island Results</Text>

      <View style={styles.buttonContainer}>
        <Button
          title={exporting ? "Exporting..." : "Export as CSV"}
          onPress={exportToCSV}
          disabled={exporting || gameData.length === 0} // Disable if exporting or no data
        />
        <Button
          title="Copy to Clipboard"
          onPress={copyToClipboard}
          disabled={gameData.length === 0} // Disable if no data
        />
      </View>

      {gameData.length === 0 ? (
        <View style={styles.centeredContainer}>
          <Text style={styles.noDataText}>No games recorded yet. Add a new game!</Text>
          <Button title="Add First Game" onPress={() => navigation.navigate('AddGame')} />
        </View>
      ) : (
        <FlatList
          data={gameData}
          keyExtractor={(item) => item.id.toString()} // Unique key for each item
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
    backgroundColor: '#f0f4f7', // Light background color
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#2c3e50', // Darker text for titles
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd', // Separator line
  },
  listContentContainer: {
    paddingBottom: 20, // Add some padding at the bottom of the scrollable list
  },
  gameItemContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Light border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3, // Android shadow
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
    borderLeftColor: '#3498db', // A distinct color for details
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
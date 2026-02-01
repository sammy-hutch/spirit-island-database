// src/screens/SettingsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system'; // Added for export
import * as Sharing from 'expo-sharing';       // Added for export
import { db } from '../../App';
import { updateAllMasterData } from '../utils/databaseUtils';

// Helper function to generate CSV string from any array of objects (original)
const generateCsvFromObjects = (dataArray) => {
  if (!dataArray || dataArray.length === 0) {
    return "";
  }

  const headers = Object.keys(dataArray[0]);

  const escapeCsvField = (field) => {
    if (field === null || field === undefined) return '';
    let str = String(field);
    // Escape double quotes and wrap in quotes if contains comma, double quote, or newline
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

// New function: Generates combined game CSV from the structured gameData
const generateCombinedGameCSV = (data) => {
  if (!data || data.length === 0) return "";

  const headers = [
    "ID", "Date Played", "Mobile Game", "Island Healthy", "Terror Level",
    "Difficulty", "Win/Loss", "Invader Cards", "Dahan Health", "Blight on Boards", "Total Score",
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
      game.game_date,
      game.game_mobile === 1 ? 'Yes' : 'No', // Format boolean
      game.island_healthy === 1 ? 'Yes' : 'No', // Format boolean
      game.terror_level,
      game.game_difficulty,
      game.game_win === 10 ? 'Win' : 'Loss', // Format win/loss
      game.game_cards,
      game.game_dahan,
      game.game_blight,
      game.game_score,
      game.game_info,
      spiritString,
      adversaryString,
      scenarioString,
    ].map(escape).join(',');
  });

  return [headers.map(escape).join(','), ...rows].join('\n');
};

function SettingsScreen() {
  const [updatingMasterData, setUpdatingMasterData] = useState(false);
  const [copyingRaw, setCopyingRaw] = useState(false);
  const [loadingCombinedExportData, setLoadingCombinedExportData] = useState(false); // New state
  const [exportingCombinedCSV, setExportingCombinedCSV] = useState(false); // New state

  // State to hold combined game data when fetched for export
  const [combinedGameData, setCombinedGameData] = useState([]);

  // Function to fetch combined game data for export
  const fetchCombinedGameDataForExport = async () => {
    if (!db) {
      Alert.alert("Error", "Database not initialized. Please restart the app.");
      return [];
    }
    setLoadingCombinedExportData(true);
    try {
      const games = await db.getAllAsync(
        `SELECT
        game_id,
        game_difficulty, game_win, game_cards, game_dahan, game_blight, game_score, 
        game_info, game_date, game_island_health, game_terror_level, game_mobile
      FROM games_fact ORDER BY game_id DESC;`
      );

      const data = [];
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

        data.push({
          ...game,
          spirits,
          adversaries,
          scenarios,
        });
      }
      setCombinedGameData(data); // Store the fetched data
      return data;
    } catch (error) {
      console.error("Error fetching combined game data for export:", error);
      Alert.alert("Error", "Failed to load combined game data for export.");
      return [];
    } finally {
      setLoadingCombinedExportData(false);
    }
  };

  const handleUpdateMasterData = async () => {
    if (!db) {
      Alert.alert("Error", "Database not initialized. Please restart the app.");
      return;
    }
    setUpdatingMasterData(true);
    try {
      await updateAllMasterData(db, true);
      Alert.alert("Success", "Master data updated from Google Sheets!");
    } catch (error) {
      console.error("Error updating master data:", error);
      Alert.alert("Update Failed", `Failed to update master data: ${error.message}`);
    } finally {
      setUpdatingMasterData(false);
    }
  };

  const copyGamesFactToClipboard = async () => {
    if (!db) { Alert.alert("Error", "Database not initialized."); return; }
    setCopyingRaw(true);
    try {
      // Updated query to include all new columns
      const result = await db.getAllAsync(`
      SELECT 
        game_id,
        game_difficulty, game_win, game_cards, game_dahan, game_blight, game_score, 
        game_info, game_date, game_island_health, game_terror_level, game_mobile
      FROM games_fact;`);
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

  const exportCombinedToCSV = async () => {
    setExportingCombinedCSV(true);
    let dataToExport = combinedGameData;
    if (dataToExport.length === 0) {
      dataToExport = await fetchCombinedGameDataForExport(); // Fetch if not already loaded
      if (dataToExport.length === 0) {
        Alert.alert("No Data", "There are no game results to export.");
        setExportingCombinedCSV(false);
        return;
      }
    }

    try {
      const csvString = generateCombinedGameCSV(dataToExport);
      const filename = `SpiritIslandResults_${Date.now()}.csv`;
      const fileUri = FileSystem.cacheDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing not available", "Sharing is not available on your device. You can still copy to clipboard.");
        setExportingCombinedCSV(false);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Share Spirit Island Results CSV',
        UTI: 'public.comma-separated-values'
      });
      Alert.alert("Export Successful", "CSV file exported and shared.");
    } catch (error) {
      console.error("Error exporting combined CSV:", error);
      Alert.alert("Export Failed", `Could not export combined CSV: ${error.message}`);
    } finally {
      setExportingCombinedCSV(false);
    }
  };

  const copyCombinedToClipboard = async () => {
    setLoadingCombinedExportData(true); // Indicate loading while fetching data
    let dataToCopy = combinedGameData;
    if (dataToCopy.length === 0) {
      dataToCopy = await fetchCombinedGameDataForExport(); // Fetch if not already loaded
      if (dataToCopy.length === 0) {
        Alert.alert("No Data", "There are no game results to copy.");
        setLoadingCombinedExportData(false);
        return;
      }
    }
    setLoadingCombinedExportData(false); // Done loading data
    try {
      const csvString = generateCombinedGameCSV(dataToCopy);
      await Clipboard.setStringAsync(csvString);
      Alert.alert("Copied to Clipboard", "Combined game results copied as CSV to clipboard.");
    } catch (error) {
      console.error("Error copying combined data to clipboard:", error);
      Alert.alert("Copy Failed", `Could not copy combined data to clipboard: ${error.message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings & Data Management</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Master Data Update</Text>
        <Text style={styles.sectionDescription}>
          Pull the latest Spirits, Aspects, Adversaries, and Scenarios from your Google Sheets.
        </Text>
        <Button
          title={updatingMasterData ? "Updating..." : "Update All Master Data"}
          onPress={handleUpdateMasterData}
          disabled={updatingMasterData || copyingRaw || loadingCombinedExportData || exportingCombinedCSV}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Game Data</Text>
        <Text style={styles.sectionDescription}>
          Export all recorded game results.
        </Text>
        <View style={styles.buttonGroup}>
          <Button
            title={exportingCombinedCSV ? "Exporting..." : "Export All Games CSV"}
            onPress={exportCombinedToCSV}
            disabled={exportingCombinedCSV || loadingCombinedExportData || updatingMasterData || copyingRaw}
          />
          <View style={{ height: 10 }} />
          <Button
            title={loadingCombinedExportData ? "Loading Data..." : "Copy All Games CSV"}
            onPress={copyCombinedToClipboard}
            disabled={loadingCombinedExportData || exportingCombinedCSV || updatingMasterData || copyingRaw}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Raw Table Data</Text>
        <Text style={styles.sectionDescription}>
          Copy raw table data (games_fact and events_fact) to your clipboard as CSV.
        </Text>
        <View style={styles.buttonGroup}>
          <Button
            title={copyingRaw ? "Copying..." : "Copy games_fact CSV"}
            onPress={copyGamesFactToClipboard}
            disabled={copyingRaw || updatingMasterData || loadingCombinedExportData || exportingCombinedCSV}
          />
          <View style={{ height: 10 }} />
          <Button
            title={copyingRaw ? "Copying..." : "Copy events_fact CSV"}
            onPress={copyEventsFactToClipboard}
            disabled={copyingRaw || updatingMasterData || loadingCombinedExportData || exportingCombinedCSV}
          />
        </View>
      </View>

      {(copyingRaw || updatingMasterData || loadingCombinedExportData || exportingCombinedCSV) && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.overlayText}>Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f0f4f7',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#2c3e50',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#34495e',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  buttonGroup: {
    flexDirection: 'column',
    marginTop: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  }
});

export default SettingsScreen;
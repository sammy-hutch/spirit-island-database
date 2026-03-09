// src/screens/SettingsScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
  ScrollView,
  ImageBackground,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { AppContext } from '../../App';
import Colors from '../constants/Colors';

// Helper function to generate CSV string from any array of objects
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

// Generates combined game CSV from the structured gameData
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
      game.game_mobile === 1 ? 'Yes' : 'No',
      game.game_island_health === 1 ? 'Yes' : 'No',
      game.game_terror_level,
      game.game_difficulty,
      game.game_win === 10 ? 'Win' : 'Loss',
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
  const { db, updateMasterData } = useContext(AppContext);

  const [updatingMasterData, setUpdatingMasterData] = useState(false);
  const [copyingRaw, setCopyingRaw] = useState(false);
  const [loadingCombinedExportData, setLoadingCombinedExportData] = useState(false);
  const [exportingCombinedCSV, setExportingCombinedCSV] = useState(false);

  // State to hold combined game data when fetched for export
  const [combinedGameData, setCombinedGameData] = useState([]);

  // Function to fetch combined game data for export
  const fetchCombinedGameDataForExport = async (localOnly = false) => {
    if (!db) {
      Alert.alert("Error", "Database not initialized. Please restart the app.");
      return [];
    }
    setLoadingCombinedExportData(true);
    try {
      const whereClause = localOnly ? "WHERE is_external = 0" : "";
      const games = await db.getAllAsync(
        `SELECT
       game_id,
       game_difficulty, game_win, game_cards, game_dahan, game_blight, game_score,
       game_info, game_date, game_island_health, game_terror_level, game_mobile
     FROM games_fact ${whereClause} ORDER BY game_id DESC;`
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
       WHERE e.game_id = ? AND e.spirit_id IS NOT NULL ${localOnly ? "AND e.is_external = 0" : ""}
       GROUP BY sd.spirit_name, ad.aspect_name;`,
          [game.game_id]
        );

        const adversaries = await db.getAllAsync(
          `SELECT
         ad.adversary_name,
         e.adversary_level
       FROM events_fact e
       LEFT JOIN adversaries_dim ad ON e.adversary_id = ad.adversary_id
       WHERE e.game_id = ? AND e.adversary_id IS NOT NULL ${localOnly ? "AND e.is_external = 0" : ""}
       GROUP BY ad.adversary_name, e.adversary_level;`,
          [game.game_id]
        );

        const scenarios = await db.getAllAsync(
          `SELECT
         sd.scenario_name
       FROM events_fact e
       LEFT JOIN scenarios_dim sd ON e.scenario_id = sd.scenario_id
       WHERE e.game_id = ? AND e.scenario_id IS NOT NULL ${localOnly ? "AND e.is_external = 0" : ""}
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
      setCombinedGameData(data);
      return data;
    } catch (error) {
      console.error("Error fetching combined game data for export:", error);
      Alert.alert("Error", "Failed to load combined game data for export.");
      return [];
    } finally {
      setLoadingCombinedExportData(false);
    }
  };

  const handleUpdatePress = () => {
    Alert.alert(
      "Confirm Master Data Update",
      "Updating master data will update all local data with external, overwriting saved games data. Are you sure you want to proceed?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => console.log("Master Data Update Cancelled")
        },
        {
          text: "Confirm",
          onPress: async () => {
            if (!db) {
              Alert.alert("Error", "Database not initialized. Please restart the app.");
              return;
            }
            setUpdatingMasterData(true);
            try {
              await updateMasterData();
            } finally {
              setUpdatingMasterData(false);
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const copyGamesFactToClipboard = async () => {
    if (!db) { Alert.alert("Error", "Database not initialized."); return; }
    setCopyingRaw(true);
    try {
      const result = await db.getAllAsync(`
     SELECT
       game_id,
       game_difficulty, game_win, game_cards, game_dahan, game_blight, game_score,
       game_info, game_date, game_island_health, game_terror_level, game_mobile, game_playtest
     FROM games_fact
     WHERE is_external = 0;`);
      if (result.length === 0) {
        Alert.alert("No Data", "No local games data found to copy.");
        return;
      }
      const csvString = generateCsvFromObjects(result);
      await Clipboard.setStringAsync(csvString);
      Alert.alert("Copied", "Local games data copied to clipboard.");
    } catch (error) {
      console.error("Error copying local games data:", error);
      Alert.alert("Error", `Failed to copy local games data: ${error.message}`);
    } finally {
      setCopyingRaw(false);
    }
  };

  const copyEventsFactToClipboard = async () => {
    if (!db) { Alert.alert("Error", "Database not initialized."); return; }
    setCopyingRaw(true);
    try {
      const result = await db.getAllAsync(`
     SELECT event_id, game_id, spirit_id, aspect_id, adversary_id, adversary_level, scenario_id
     FROM events_fact
     WHERE is_external = 0;`);
      if (result.length === 0) {
        Alert.alert("No Data", "No local events data found to copy.");
        return;
      }
      const csvString = generateCsvFromObjects(result);
      await Clipboard.setStringAsync(csvString);
      Alert.alert("Copied", "Local events data copied to clipboard.");
    } catch (error) {
      console.error("Error copying local events data:", error);
      Alert.alert("Error", `Failed to copy local events data: ${error.message}`);
    } finally {
      setCopyingRaw(false);
    }
  };

  const exportCombinedToCSV = async (localOnly = false) => {
    setExportingCombinedCSV(true);
    let dataToExport = combinedGameData;

    if (localOnly || dataToExport.length === 0) {
      dataToExport = await fetchCombinedGameDataForExport(localOnly);
      if (dataToExport.length === 0) {
        Alert.alert("No Data", `There are no ${localOnly ? "local" : "all"} game results to export.`);
        setExportingCombinedCSV(false);
        return;
      }
    }

    try {
      const csvString = generateCombinedGameCSV(dataToExport);
      const filename = `SpiritIslandResults_${localOnly ? "Local_" : ""}${Date.now()}.csv`;
      const fileUri = FileSystem.cacheDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing not available", "Sharing is not available on your device. You can still copy to clipboard.");
        setExportingCombinedCSV(false);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Share Spirit Island ${localOnly ? "Local " : ""}Results CSV`,
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

  const copyCombinedToClipboard = async (localOnly = false) => {
    setLoadingCombinedExportData(true);
    let dataToCopy = combinedGameData;

    if (localOnly || dataToCopy.length === 0) {
      dataToCopy = await fetchCombinedGameDataForExport(localOnly);
      if (dataToCopy.length === 0) {
        Alert.alert("No Data", `There are no ${localOnly ? "local" : "all"} game results to copy.`);
        setLoadingCombinedExportData(false);
        return;
      }
    }
    setLoadingCombinedExportData(false);
    try {
      const csvString = generateCombinedGameCSV(dataToCopy);
      await Clipboard.setStringAsync(csvString);
      Alert.alert("Copied to Clipboard", `Combined ${localOnly ? "local " : ""}game results copied as CSV to clipboard.`);
    } catch (error) {
      console.error("Error copying combined data to clipboard:", error);
      Alert.alert("Copy Failed", `Could not copy combined data to clipboard: ${error.message}`);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/backgrounds/mountains.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings & Data Management</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Master Data Update</Text>
          <Text style={styles.sectionDescription}>
            Pull data from your Google Sheets.
          </Text>
          <View style={styles.buttonWrapper}>
            <Button
              title={updatingMasterData ? "Updating..." : "Update All Master Data"}
              onPress={handleUpdatePress}
              disabled={updatingMasterData || copyingRaw || loadingCombinedExportData || exportingCombinedCSV}
              color={Colors.accentBrown}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Raw Local Table Data</Text>
          <Text style={styles.sectionDescription}>
            Copy raw local table data (games and events) to your clipboard as CSV.
          </Text>
          <View style={styles.buttonGroup}>
            <View style={styles.buttonWrapper}>
              <Button
                title={copyingRaw ? "Copying..." : "Copy local games_fact CSV"}
                onPress={copyGamesFactToClipboard}
                disabled={copyingRaw || updatingMasterData || loadingCombinedExportData || exportingCombinedCSV}
                color={Colors.borderColorDark}
              />
            </View>
            <View style={{ height: 10 }} />
            <View style={styles.buttonWrapper}>
              <Button
                title={copyingRaw ? "Copying..." : "Copy local events_fact CSV"}
                onPress={copyEventsFactToClipboard}
                disabled={copyingRaw || updatingMasterData || loadingCombinedExportData || exportingCombinedCSV}
                color={Colors.borderColorDark}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export All Game Data</Text>
          <Text style={styles.sectionDescription}>
            Export all recorded game results (local and external).
          </Text>
          <View style={styles.buttonGroup}>
            <View style={styles.buttonWrapper}>
              <Button
                title={exportingCombinedCSV ? "Exporting All..." : "Export All Games CSV"}
                onPress={() => exportCombinedToCSV(false)}
                disabled={exportingCombinedCSV || loadingCombinedExportData || updatingMasterData || copyingRaw}
                color={Colors.accentGreen}
              />
            </View>
            <View style={{ height: 10 }} />
            <View style={styles.buttonWrapper}>
              <Button
                title={loadingCombinedExportData ? "Loading All Data..." : "Copy All Games CSV"}
                onPress={() => copyCombinedToClipboard(false)}
                disabled={loadingCombinedExportData || exportingCombinedCSV || updatingMasterData || copyingRaw}
                color={Colors.accentGreen}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Local-Only Game Data</Text>
          <Text style={styles.sectionDescription}>
            Export only the game results you have added locally within this app.
          </Text>
          <View style={styles.buttonGroup}>
            <View style={styles.buttonWrapper}>
              <Button
                title={exportingCombinedCSV ? "Exporting Local..." : "Export Local Games CSV"}
                onPress={() => exportCombinedToCSV(true)}
                disabled={exportingCombinedCSV || loadingCombinedExportData || updatingMasterData || copyingRaw}
                color={Colors.accentBlue}
              />
            </View>
            <View style={{ height: 10 }} />
            <View style={styles.buttonWrapper}>
              <Button
                title={loadingCombinedExportData ? "Loading Local Data..." : "Copy Local Games CSV"}
                onPress={() => copyCombinedToClipboard(true)}
                disabled={loadingCombinedExportData || exportingCombinedCSV || updatingMasterData || copyingRaw}
                color={Colors.accentBlue}
              />
            </View>
          </View>
        </View>

        {(copyingRaw || updatingMasterData || loadingCombinedExportData || exportingCombinedCSV) && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Colors.accentBrown} />
            <Text style={styles.overlayText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 15,
    margin: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: Colors.primaryText,
    fontFamily: Platform.OS === 'ios' ? 'Gill Sans' : 'serif',
  },
  section: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderColorLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.primaryText,
    fontFamily: Platform.OS === 'ios' ? 'Gill Sans' : 'serif',
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginBottom: 15,
  },
  buttonGroup: {
    flexDirection: 'column',
    marginTop: 10,
  },
  buttonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 15,
  },
  overlayText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.primaryText,
  }
});

export default SettingsScreen;
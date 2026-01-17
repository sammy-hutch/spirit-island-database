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
import { db } from '../../App'; // Assuming db is exported from App.js
import { updateAllMasterData } from '../utils/databaseUtils'; // <--- NEW IMPORT

// Helper function to generate CSV string from any array of objects
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

function SettingsScreen() {
const [updatingMasterData, setUpdatingMasterData] = useState(false);
const [copyingRaw, setCopyingRaw] = useState(false);

// googleSheetUrls removed as it's now in databaseUtils.js

const handleUpdateMasterData = async () => {
  if (!db) {
    Alert.alert("Error", "Database not initialized. Please restart the app.");
    return;
  }
  setUpdatingMasterData(true);
  try {
    await updateAllMasterData(db); // <--- CALL THE UTILITY FUNCTION
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

return (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Settings & Data Management</Text>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Master Data Update</Text>
      <Text style={styles.sectionDescription}>
        Pull the latest Spirits, Aspects, Adversaries, and Scenarios from your Google Sheets.
        This happens automatically when the app starts, but you can update manually here.
      </Text>
      <Button
        title={updatingMasterData ? "Updating..." : "Update All Master Data"}
        onPress={handleUpdateMasterData}
        disabled={updatingMasterData}
      />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Export Raw Data</Text>
      <Text style={styles.sectionDescription}>
        Copy raw table data to your clipboard as CSV.
      </Text>
      <View style={styles.buttonGroup}>
        <Button
          title={copyingRaw ? "Copying..." : "Copy games_fact CSV"}
          onPress={copyGamesFactToClipboard}
          disabled={copyingRaw}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title={copyingRaw ? "Copying..." : "Copy events_fact CSV"}
          onPress={copyEventsFactToClipboard}
          disabled={copyingRaw}
        />
      </View>
    </View>

    {/* Add other settings here */}

    {(copyingRaw || updatingMasterData) && ( // Use && instead of ? : for cleaner conditional rendering
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
  flexGrow: 1, // Allows ScrollView to grow
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
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 10,
},
buttonSpacer: {
  width: 10, // Space between buttons
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
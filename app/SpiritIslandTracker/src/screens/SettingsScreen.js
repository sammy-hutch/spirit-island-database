// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react'; // <--- Import useEffect
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
import { db } from '../../App';
import { updateAllMasterData } from '../utils/databaseUtils';
import { getGoogleSheetsAccessToken, logoutGoogleSheets } from '../utils/googleSheetsAuth'; // <--- NEW IMPORT

// Helper function to generate CSV string from any array of objects (UNCHANGED)
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
  const [isSheetsAuthenticated, setIsSheetsAuthenticated] = useState(false); // <--- NEW STATE

  // Check Google Sheets authentication status on component mount and focus
  useEffect(() => {
    const checkAuthStatus = async () => {
      // getGoogleSheetsAccessToken will attempt to refresh if needed
      const token = await getGoogleSheetsAccessToken();
      setIsSheetsAuthenticated(!!token); // !!token converts truthy/falsy to boolean
    };
    checkAuthStatus();
  }, []);

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

  // <--- NEW FUNCTIONS FOR GOOGLE SHEETS AUTHENTICATION ---
  const handleGoogleSheetsAuth = async () => {
    // This function triggers the full OAuth flow (login or refresh)
    const token = await getGoogleSheetsAccessToken();
    setIsSheetsAuthenticated(!!token);
    if (token) {
      Alert.alert("Success", "Successfully connected to Google Sheets.");
    }
  };

  const handleGoogleSheetsLogout = async () => {
    await logoutGoogleSheets(); // This clears tokens and sets accessToken/refreshToken to null
    setIsSheetsAuthenticated(false);
  };
  // --- END NEW FUNCTIONS ---

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
          This happens automatically on first app launch (if tables are empty), but you can force an update here.
        </Text>
        <Button
          title={updatingMasterData ? "Updating..." : "Update All Master Data"}
          onPress={handleUpdateMasterData}
          disabled={updatingMasterData}
        />
      </View>

      {/* <--- NEW SECTION FOR GOOGLE SHEETS INTEGRATION --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Sheets Integration</Text>
        <Text style={styles.sectionDescription}>
          Connect your Google account to automatically write game results to a Google Sheet.
          Ensure the sheet is owned by or shared with this Google account and has the correct headers.
        </Text>
        {isSheetsAuthenticated ? (
          <Button
            title="Disconnect from Google Sheets"
            onPress={handleGoogleSheetsLogout}
            color="#FF6347" // Red for disconnect
          />
        ) : (
          <Button
            title="Connect to Google Sheets"
            onPress={handleGoogleSheetsAuth}
          />
        )}
      </View>
      {/* --- END NEW SECTION --- */}

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
          <View style={{ height: 10 }} />
          <Button
            title={copyingRaw ? "Copying..." : "Copy events_fact CSV"}
            onPress={copyEventsFactToClipboard}
            disabled={copyingRaw}
          />
        </View>
      </View>

      {(copyingRaw || updatingMasterData) && (
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
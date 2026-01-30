// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
  ScrollView,
  Image, // Added for user profile picture
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser'; // Required by expo-auth-session
import * as Google from 'expo-auth-session/providers/google'; // Google provider
import * as SecureStore from 'expo-secure-store'; // For secure local storage
import { makeRedirectUri } from 'expo-auth-session';

import { db } from '../../App';
import { updateAllMasterData } from '../utils/databaseUtils';

// Ensure WebBrowser is ready
WebBrowser.maybeCompleteAuthSession();

// --- Secure Store Keys ---
const ACCESS_TOKEN_KEY = 'googleAccessToken';
const USER_INFO_KEY = 'googleUserInfo';

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

  // --- Google Sign-In State and Hooks ---
  const [userInfo, setUserInfo] = useState(null); // Stores user's name, email, photo
  const [accessToken, setAccessToken] = useState(null); // Stores Google access token
  const [loadingAuth, setLoadingAuth] = useState(true); // Loading state for auth check
  
  const appScheme = 'SpiritIslandTracker'; // This should match your app.json scheme

  // Construct the redirect URI that expo-auth-session will use for Android
  const androidRedirectUri = makeRedirectUri({
    scheme: appScheme,
    path: 'oauthredirect', // This is expo-auth-session's default path for custom schemes
    // useProxy: false, // For standalone builds, useProxy should effectively be false
  });

  console.log("GOOGLE AUTH REDIRECT URI FOR ANDROID:", androidRedirectUri); // <--- ADD THIS LINE FOR DEBUGGING
  // Configure Google OAuth request
  // REPLACE THESE WITH YOUR ACTUAL CLIENT IDs FROM GOOGLE CLOUD CONSOLE
  // For Expo Go development, webClientId is often enough.
  // For standalone apps, you'll need iOS and Android client IDs.
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '482619125423-tn9p45ul26oibp73ebda9ua5lisrc2kp.apps.googleusercontent.com', // Replace with your Web client ID
    iosClientId: 'YOUR_IOS_CLIENT_ID_HERE', // Replace with your iOS client ID (for standalone)
    androidClientId: '482619125423-tgkfsahpdlhhf24ctmfasfopg3esgnje.apps.googleusercontent.com', // Replace with your Android client ID (for standalone)
    scopes: ['profile', 'email'], // Request access to user's profile and email
  });

  // Function to save credentials securely
  const saveAuthInfo = async (token, user) => {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
      setAccessToken(token);
      setUserInfo(user);
    } catch (error) {
      console.error("Error saving auth info to SecureStore:", error);
      Alert.alert("Error", "Could not save login information securely.");
    }
  };

  // Function to load credentials securely
  const loadAuthInfo = async () => {
    setLoadingAuth(true);
    try {
      const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const storedUserInfo = await SecureStore.getItemAsync(USER_INFO_KEY);

      if (storedToken && storedUserInfo) {
        setAccessToken(storedToken);
        setUserInfo(JSON.parse(storedUserInfo));
        console.log("Loaded stored Google auth info.");
      }
    } catch (error) {
      console.error("Error loading auth info from SecureStore:", error);
    } finally {
      setLoadingAuth(false);
    }
  };

  // Function to clear credentials securely
  const clearAuthInfo = async () => {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_INFO_KEY);
      setAccessToken(null);
      setUserInfo(null);
      Alert.alert("Logged Out", "You have been successfully logged out.");
    } catch (error) {
      console.error("Error clearing auth info from SecureStore:", error);
      Alert.alert("Error", "Could not clear login information securely.");
    }
  };

  // Effect to load stored info on component mount
  useEffect(() => {
    loadAuthInfo();
  }, []);

  // Effect to handle the Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        console.log("Google Sign-In successful. Access Token:", authentication.accessToken);
        fetchUserInfo(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      console.error("Google Sign-In Error:", response.error);
      Alert.alert("Sign-In Failed", "Failed to sign in with Google. Please try again.");
    }
  }, [response]); // eslint-disable-line react-hooks/exhaustive-deps

  // Function to fetch user info using the access token
  const fetchUserInfo = async (token) => {
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      console.log("Fetched User Info:", user);
      if (user?.id) { // Check if user data is valid
        await saveAuthInfo(token, user);
        Alert.alert("Signed In", `Welcome, ${user.name || user.email}!`);
      } else {
        Alert.alert("Error", "Could not fetch user profile. Please try again.");
        clearAuthInfo(); // Clear partial login
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      Alert.alert("Error", "Could not fetch user profile. Please try again.");
      clearAuthInfo(); // Clear partial login
    }
  };

  // --- Existing functions from your SettingsScreen.js ---

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

      {/* Google Sign-In Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Account Integration</Text>
        {loadingAuth ? (
          <View style={styles.authStatus}>
            <ActivityIndicator size="small" color="#0000ff" />
            <Text style={styles.authText}>Loading account info...</Text>
          </View>
        ) : userInfo ? (
          <View style={styles.loggedInContainer}>
            {userInfo.picture && (
              <Image source={{ uri: userInfo.picture }} style={styles.profilePicture} />
            )}
            <Text style={styles.loggedInText}>
              Logged in as: <Text style={styles.loggedInEmail}>{userInfo.email}</Text>
            </Text>
            <Button title="Sign Out" onPress={clearAuthInfo} color="#dc3545" />
          </View>
        ) : (
          <View style={styles.loggedOutContainer}>
            <Text style={styles.sectionDescription}>
              Log in with your Google account to enable features like saving data to Google Sheets.
            </Text>
            <Button
              title="Sign in with Google"
              onPress={() => promptAsync()}
              disabled={!request} // Button disabled if request isn't ready
            />
            {!request && (
              <Text style={styles.warningText}>
                Google Sign-In is not configured. Please ensure client IDs are set up correctly.
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Existing sections */}
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

      {(copyingRaw || updatingMasterData || (response?.type === 'loading')) && (
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
  },
  // --- New styles for Google Sign-In ---
  loggedInContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  loggedInText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  loggedInEmail: {
    fontWeight: 'bold',
  },
  loggedOutContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  authStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  authText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#555',
  },
  warningText: {
    color: 'orange',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
  },
});

export default SettingsScreen;
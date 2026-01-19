// src/utils/googleSheetsAuth.js
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

// !! IMPORTANT: Replace with your actual Client ID from GCP (Web Application type) !!
const GOOGLE_CLIENT_ID_ANDROID = "482619125423-vesjmv9c64h9nvb21ua9fcpn4nqtccvp.apps.googleusercontent.com"; // e.g., "1234567890-abcdefg.apps.googleusercontent.com"

// The scope for writing to Google Sheets
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email', // Optional, to get user email
];

// This dynamically creates the redirect URI based on your app's scheme or Expo proxy
// useProxy: true is required for Expo Go client to handle the redirect properly
// const REDIRECT_URI = AuthSession.makeRedirectUri({
//   useProxy: true,
//   // scheme: 'spiritislandtracker' // Only uncomment and use if building a standalone app and not using the proxy
// });
// const REDIRECT_URI = 'https://auth.expo.io';
// For Expo Go development, the most reliable redirect URI is Expo's proxy.
// This URI MUST be registered as an "Authorized redirect URI" in your Google Cloud Project
// for a "Web application" client type.
// const REDIRECT_URI = 'https://auth.expo.io';

// If you were building a standalone app (not Expo Go), you would use:
// const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'spiritislandtracker' });
// and you would likely use an "iOS" or "Android" OAuth client ID in GCP, registering
// 'spiritislandtracker://' (for iOS) or 'spiritislandtracker://oauthredirect' (for Android)
// as the authorized redirect URI.

// --- CRITICAL CHANGE: Use your custom scheme for deep linking ---
// This uses your custom scheme from app.json: `spiritislandtracker://`
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'spiritislandtracker' });
// For Android, this typically results in: "com.yourname.spiritislandtracker:/oauthredirect"
// For iOS, this typically results in: "spiritislandtracker://"

const DISCOVERY_DOCUMENT = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

// Keys for storing tokens securely
const ACCESS_TOKEN_KEY = 'google_sheets_access_token';
const REFRESH_TOKEN_KEY = 'google_sheets_refresh_token';
const EXPIRES_IN_KEY = 'google_sheets_expires_in';

// Global variables to hold tokens in memory
let accessToken = null;
let refreshToken = null;
let expiresAt = null;

// Needed for web browser integration on Android and iOS
WebBrowser.maybeCompleteAuthSession();

/**
* Attempts to get a new access token using the refresh token.
* @returns {Promise<string|null>} The new access token or null if refresh fails.
*/
const refreshAccessToken = async () => {
  console.log('Attempting to refresh Google Sheets access token...');
  const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

  if (!storedRefreshToken) {
    console.warn('No refresh token found to refresh Google Sheets access token.');
    return null;
  }

  try {
    const response = await fetch(DISCOVERY_DOCUMENT.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID_ANDROID,
        refresh_token: storedRefreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to refresh Google Sheets token:', errorData);
      throw new Error(`Failed to refresh Google Sheets access token: ${errorData.error_description || errorData.error}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // Google might not always return a new refresh token, so keep the old one if not
    refreshToken = data.refresh_token || storedRefreshToken;
    expiresAt = Date.now() + (data.expires_in * 1000); // expiresIn is in seconds

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    await SecureStore.setItemAsync(EXPIRES_IN_KEY, String(expiresAt));

    console.log('Google Sheets access token refreshed successfully.');
    return accessToken;
  } catch (error) {
    console.error('Error refreshing Google Sheets access token:', error);
    // Clear stored tokens if refresh fails, forcing re-authentication
    await logoutGoogleSheets(false); // don't show alert here
    Alert.alert("Google Sheets Auth Expired", "Your Google Sheets authentication has expired. Please connect again in Settings.");
    return null;
  }
};

/**
* Initializes the authentication process or retrieves existing valid tokens.
* @returns {Promise<string|null>} The valid access token or null.
*/
export const getGoogleSheetsAccessToken = async () => {
  // 1. Check if token is in memory and still valid
  if (accessToken && expiresAt && expiresAt > Date.now()) {
    console.log('Using in-memory Google Sheets access token.');
    return accessToken;
  }

  // 2. Try to load from secure store
  const storedAccessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const storedExpiresAt = await SecureStore.getItemAsync(EXPIRES_IN_KEY);

  if (storedAccessToken && storedExpiresAt) {
    const expiresTimestamp = parseInt(storedExpiresAt, 10);
    if (expiresTimestamp > Date.now()) {
      accessToken = storedAccessToken;
      expiresAt = expiresTimestamp;
      console.log('Using stored Google Sheets access token from SecureStore.');
      return accessToken;
    } else {
      // Stored access token expired, try to refresh
      console.log('Stored Google Sheets access token expired, attempting refresh...');
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        return refreshedToken;
      }
    }
  }

  // 3. If no valid token and refresh failed, initiate new auth flow
  console.log('No valid Google Sheets tokens, initiating new authentication flow...');
  try {
    const authRequestOptions = {
      clientId: GOOGLE_CLIENT_ID_ANDROID,
      redirectUri: REDIRECT_URI,
      scopes: GOOGLE_SCOPES,
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        access_type: 'offline', // Request refresh token
        prompt: 'consent',     // Always ask for consent (good for first time or after revoke)
      },
      useProxy: false,
    };

    const authRequest = new AuthSession.AuthRequest(authRequestOptions);
    const authResult = await authRequest.promptAsync(DISCOVERY_DOCUMENT);

    if (authResult.type === 'success' && authResult.authentication?.code) {
      console.log('Google Sheets authorization successful, exchanging code for tokens...');
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          code: authResult.authentication.code,
          clientId: GOOGLE_CLIENT_ID_ANDROID,
          redirectUri: REDIRECT_URI,
        },
        DISCOVERY_DOCUMENT
      );

      if (tokenResponse.accessToken) {
        accessToken = tokenResponse.accessToken;
        refreshToken = tokenResponse.refreshToken;
        expiresAt = Date.now() + (tokenResponse.expiresIn * 1000);

        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        await SecureStore.setItemAsync(EXPIRES_IN_KEY, String(expiresAt));

        console.log('New Google Sheets access token obtained and stored.');
        return accessToken;
      } else {
        console.error('No access token received from exchange:', tokenResponse);
        Alert.alert("Google Sheets Authentication Error", "Failed to get access token after authorization.");
        return null;
      }
    } else if (authResult.type === 'cancel') {
      console.log('Google Sheets authentication cancelled by user.');
      // No alert needed for a user cancellation, it's expected.
      return null;
    } else if (authResult.type === 'error') {
      console.error('Google Sheets authentication error:', authResult.error);
      Alert.alert("Google Sheets Authentication Error", `Google sign-in failed: ${authResult.error}. Please check your internet connection and try again.`);
      return null;
    } else {
      console.warn('Unhandled Google Sheets authentication result type:', authResult.type);
      Alert.alert("Google Sheets Authentication Failed", "Something went wrong during Google sign-in. Please try again.");
      return null;
    }
  } catch (error) {
    console.error('Error during Google Sheets authentication flow:', error);
    Alert.alert("Google Sheets Authentication Error", `An unexpected error occurred during Google sign-in: ${error.message}`);
    return null;
  }
};

/**
* Clears all stored authentication tokens.
* @param {boolean} showAlert - Whether to show an alert to the user.
*/
export const logoutGoogleSheets = async (showAlert = true) => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(EXPIRES_IN_KEY);
    accessToken = null;
    refreshToken = null;
    expiresAt = null;
    console.log('Google Sheets authentication tokens cleared.');
    if (showAlert) {
      Alert.alert("Logged Out", "You have been logged out from Google Sheets.");
    }
  } catch (error) {
    console.error('Error clearing Google Sheets tokens:', error);
    if (showAlert) {
      Alert.alert("Error", "Could not clear authentication tokens.");
    }
  }
};
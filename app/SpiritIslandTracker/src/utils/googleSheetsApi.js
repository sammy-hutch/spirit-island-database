// src/utils/googleSheetsApi.js
import { getGoogleSheetsAccessToken } from './googleSheetsAuth';
import { Alert } from 'react-native';

// !! IMPORTANT: Replace with your actual Google Spreadsheet ID !!
// Find this in the URL of your Google Sheet: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
const SPREADSHEET_ID = "1C70xeEQENKQtgXYDvYhtDY05PvUKJhwwE9KtcH-I6u8";

/**
* Writes game data to a Google Sheet.
* @param {Array<Array<any>>} values - An array of arrays, where each inner array is a row of data.
* @param {string} range - The A1 notation of the range to append to (e.g., "Sheet1!A:Z").
* @returns {Promise<boolean>} True if successful, false otherwise.
*/
export const writeToGoogleSheet = async (values, range = "Game Data!A:Z") => {
  const accessToken = await getGoogleSheetsAccessToken();

  if (!accessToken) {
    // getGoogleSheetsAccessToken already shows an alert if it failed to get a token
    return false;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to write to Google Sheet:', errorData);
      let errorMessage = `Failed to write to Google Sheet: ${errorData.error?.message || response.statusText}`;
      if (errorData.error?.status === 'UNAUTHENTICATED' || errorData.error?.status === 'INVALID_CREDENTIALS') {
        errorMessage += "\nAuthentication may be invalid. Please try re-authenticating in Settings.";
      }
      Alert.alert("Google Sheets Write Error", errorMessage);
      return false;
    }

    console.log('Successfully wrote to Google Sheet:', await response.json());
    return true;
  } catch (error) {
    console.error('Error writing to Google Sheet:', error);
    Alert.alert("Google Sheets Write Error", `An error occurred while writing to Google Sheet: ${error.message}`);
    return false;
  }
};
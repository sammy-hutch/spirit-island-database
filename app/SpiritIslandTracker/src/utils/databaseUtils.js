// src/utils/databaseUtils.js
import { Alert } from 'react-native';

const googleSheetUrls = {
  spirit: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=1094958888&single=true&output=csv",
  adversary: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=610878563&single=true&output=csv",
  scenario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=1993883548&single=true&output=csv",
  aspect: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=101851110&single=true&output=csv",
};

/**
* Updates master data tables (spirits, aspects, adversaries, scenarios) from Google Sheets.
* @param {object} databaseInstance The Expo-SQLite database instance.
* @param {boolean} forceUpdate If true, updates regardless of existing data. If false, only updates if table is empty.
* @returns {Promise<boolean>} True if successful, throws an error otherwise.
*/
export const updateAllMasterData = async (databaseInstance, forceUpdate = false) => {
  if (!databaseInstance) {
    console.error("Database instance not provided for master data update.");
    throw new Error("Database not initialized.");
  }

  try {
    await databaseInstance.execAsync('BEGIN TRANSACTION;');

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
        default:
          console.warn(`Skipping unknown master data type: ${type}`);
          continue;
      }

      if (!url || url.includes("YOUR_")) {
        console.warn(`Skipping update for type '${type}': URL is missing or placeholder.`);
        continue;
      }

      // --- NEW LOGIC: Check if table is empty and if forceUpdate is false ---
      const countResult = await databaseInstance.getFirstAsync(`SELECT COUNT(*) as count FROM ${table};`);
      const rowCount = countResult?.count || 0;

      if (!forceUpdate && rowCount > 0) {
        console.log(`Table '${table}' already contains ${rowCount} rows. Skipping initial update for '${type}'.`);
        continue; // Skip fetching and updating this specific table
      }
      // --- END NEW LOGIC ---

      console.log(`${forceUpdate ? "Force-updating" : (rowCount === 0 ? "Initial fetch for" : "Updating")} ${type} data from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${type} data.`);
      }
      const csvString = await response.text();
      const rows = csvString.split('\n').map(row => row.trim()).filter(Boolean);

      if (rows.length <= 1) { // <=1 because 1st row is headers
        console.warn(`No data or only headers found in CSV for ${type}. Skipping update for this table.`);
        continue;
      }

      const headers = rows[0].split(',').map(h => h.trim());
      const dataRows = rows.slice(1);

      // Clear existing data (only if we proceed with update, which the above logic handles)
      const delete_statement = `DELETE FROM ${table};`;
      await databaseInstance.runAsync(delete_statement);
      console.log(`Deleted old '${type}' data.`);

      for (const row of dataRows) {
        const values = row.split(',').map(v => v.trim());

        if (values.length !== headers.length) {
          console.warn(`Skipping row due to column count mismatch for ${type}: "${row}". Expected ${headers.length}, got ${values.length}.`);
          continue;
        }

        const placeholders = values.map(() => '?').join(', ');
        const columnNames = headers.join(', ');
        const insert_statement = `INSERT OR IGNORE INTO ${table} (${columnNames}) VALUES (${placeholders});`;

        await databaseInstance.runAsync(insert_statement, values);
      }
      console.log(`Inserted ${dataRows.length} '${type}' records.`);
    }

    await databaseInstance.execAsync('COMMIT;');
    console.log("Master data update process completed.");
    return true;
  } catch (error) {
    await databaseInstance.execAsync('ROLLBACK;');
    console.error("Error updating master data (ROLLBACK issued):", error);
    throw error;
  }
};
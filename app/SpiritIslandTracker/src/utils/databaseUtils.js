// src/utils/databaseUtils.js
import { Alert } from 'react-native';

const googleSheetUrls = {
  spirit: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=1094958888&single=true&output=csv",
  adversary: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=610878563&single=true&output=csv",
  scenario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=1993883548&single=true&output=csv",
  aspect: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=101851110&single=true&output=csv",
  game: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=214184365&single=true&output=csv",
  event: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmauLev0j_IiP22IosD2M0zWZbNiHq_Rmd6Si9tbV5gvet_OZkhP0wuL60ukPHJ8ysoAjHTNaqlug-/pub?gid=1202804639&single=true&output=csv",
};

/**
* Parses a single CSV line, correctly handling commas within double-quoted fields
* and escaped double quotes ("").
* @param {string} line The CSV line to parse.
* @returns {string[]} An array of parsed field values.
*/
const parseCsvLine = (line) => {
  const values = [];
  let inQuote = false;
  let currentField = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped double quotes (e.g., "" inside a quoted field)
      if (inQuote && line[i + 1] === '"') {
        currentField += '"';
        i++; // Skip the second quote in the pair
      } else {
        // Toggle inQuote status. Don't add the quote char itself to the field.
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      // End of a field (comma encountered outside quotes)
      values.push(currentField.trim());
      currentField = '';
    } else {
      // Regular character
      currentField += char;
    }
  }
  values.push(currentField.trim()); // Add the last field

  return values;
};

/**
* Updates master data tables from Google Sheets.
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
      let nullableIntegerFields = []; // Fields that should be NULL if empty
      switch (type) {
        case "spirit":
          table = "spirits_dim";
          // No nullable INTEGER fields in spirits_dim from CSV that are not PK
          break;
        case "adversary":
          table = "adversaries_dim";
          // No nullable INTEGER fields in adversaries_dim from CSV that are not PK
          break;
        case "scenario":
          table = "scenarios_dim";
          // scenario_difficulty is INTEGER, but if empty, 0 might be desired, not NULL
          // If you want NULL for empty difficulty, add 'scenario_difficulty' here.
          break;
        case "aspect":
          table = "aspects_dim";
          // spirit_id is INTEGER, but typically required for aspects
          break;
        case "game":
          table = "games_fact";
          // These are INTEGER columns in games_fact that are optional and should be NULL if empty
          nullableIntegerFields = ['game_island_health', 'game_mobile', 'game_playtest', 'game_terror_level'];
          break;
        case "event":
          table = "events_fact";
          // These are INTEGER FKs in events_fact that are optional and should be NULL if empty
          // spirit_id is NOT NULL in schema, so not included.
          nullableIntegerFields = ['aspect_id', 'adversary_id', 'scenario_id', 'adversary_level']; // adversary_level can also be null if adversary is null
          break;
        default:
          console.warn(`Skipping unknown master data type: ${type}`);
          continue;
      }

      const countResult = await databaseInstance.getFirstAsync(`SELECT COUNT(*) as count FROM ${table};`);
      const rowCount = countResult?.count || 0;

      if (!forceUpdate && rowCount > 0) {
        console.log(`Table '${table}' already contains ${rowCount} rows. Skipping initial update for '${type}'.`);
        continue;
      }

      console.log(`${forceUpdate ? "Force-updating" : (rowCount === 0 ? "Initial fetch for" : "Updating")} ${type} data from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${type} data.`);
      }
      const csvString = await response.text();
      const rows = csvString.split('\n').map(row => row.trim()).filter(Boolean);

      if (rows.length <= 1) {
        console.warn(`No data or only headers found in CSV for ${type}. Skipping update for this table.`);
        continue;
      }

      const headers = parseCsvLine(rows[0]);
      const dataRows = rows.slice(1);

      const delete_statement = `DELETE FROM ${table};`;
      await databaseInstance.runAsync(delete_statement);
      console.log(`Deleted old '${type}' data.`);

      for (const row of dataRows) {
        const values = parseCsvLine(row);

        if (values.length !== headers.length) {
          console.warn(`Skipping row due to column count mismatch for ${type}: "${row}". Expected ${headers.length}, got ${values.length}.`);
          continue;
        }

        // --- IMPORTANT: New logic to process values for NULLABLE INTEGER fields ---
        const processedValues = values.map((val, index) => {
          const header = headers[index];
          if (val === '' && nullableIntegerFields.includes(header)) {
            return null; // Explicitly return null for empty values in specified integer columns
          }
          return val; // Otherwise, keep the value as is
        });
        // --- End of new logic ---

        const placeholders = processedValues.map(() => '?').join(', ');
        const columnNames = headers.join(', ');
        const insert_statement = `INSERT OR IGNORE INTO ${table} (${columnNames}) VALUES (${placeholders});`;

        await databaseInstance.runAsync(insert_statement, processedValues); // Use processedValues
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
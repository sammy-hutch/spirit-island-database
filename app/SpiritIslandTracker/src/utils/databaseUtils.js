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
  values.push(currentField.trim());

  return values;
};

/**
* Fetches CSV data from a given URL and parses it.
* @param {string} url The URL to fetch the CSV from.
* @returns {Promise<{headers: string[], data: string[][]}>} An object containing headers and an array of data rows.
* @throws {Error} If the network request fails or CSV is empty.
*/
const fetchAndParseCsv = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} for URL: ${url}.`);
  }
  const csvString = await response.text();
  const rows = csvString.split('\n').map(row => row.trim()).filter(Boolean);

  if (rows.length <= 1) {
    console.warn(`No data or only headers found in CSV from ${url}.`);
    return { headers: [], data: [] };
  }

  const headers = parseCsvLine(rows[0]);
  const dataRows = rows.slice(1).map(row => parseCsvLine(row));
  return { headers, data: dataRows };
};

/**
* Checks if critical dimension tables (spirits, adversaries, scenarios) have any data.
* This helps determine if an initial online load is necessary or if the app can rely on existing local data.
* @param {object} databaseInstance The Expo-SQLite database instance.
* @returns {Promise<boolean>} True if at least one critical dimension table has data, false otherwise.
*/
export const checkDimensionTablesPopulated = async (databaseInstance) => {
  try {
    const criticalTables = ["spirits_dim", "adversaries_dim", "scenarios_dim"];
    for (const table of criticalTables) {
      const countResult = await databaseInstance.getFirstAsync(`SELECT COUNT(*) as count FROM ${table};`);
      if (countResult?.count > 0) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking dimension tables population:", error);
    return false;
  }
};

/**
* Attempts to populate dimension tables (spirits, adversaries, scenarios, aspects) from online sources.
* This function is designed for initial startup when tables are empty and should handle network failures gracefully.
* Fact tables (games_fact, events_fact) are NOT updated by this function, as they can be empty initially.
* @param {object} databaseInstance The Expo-SQLite database instance.
* @returns {Promise<void>} Resolves if successful (even if some data could not be fetched due to network), rejects if a database error occurs.
*/
export const initialPopulateDimensionTables = async (databaseInstance) => {
  if (!databaseInstance) {
    console.error("Database instance not provided for initial dimension data populate.");
    throw new Error("Database not initialized.");
  }

  const dimensionTablesToPopulate = {
    spirit: "spirits_dim",
    adversary: "adversaries_dim",
    scenario: "scenarios_dim",
    aspect: "aspects_dim",
  };

  try {
    await databaseInstance.execAsync('BEGIN TRANSACTION;');

    for (const type in dimensionTablesToPopulate) {
      const table = dimensionTablesToPopulate[type];
      const url = googleSheetUrls[type];

      try {
        console.log(`Attempting initial fetch for ${type} data from: ${url}`);
        const { headers, data: dataRows } = await fetchAndParseCsv(url);

        if (dataRows.length === 0) {
          console.warn(`No data found in CSV for ${type} during initial populate. Skipping.`);
          continue;
        }

        await databaseInstance.runAsync(`DELETE FROM ${table};`);
        console.log(`Cleared old data from '${table}' before initial insert.`);

        let nullableIntegerFields = [];

        for (const rowValues of dataRows) {
          if (rowValues.length !== headers.length) {
            console.warn(`Skipping row due to column count mismatch for ${type}: "${rowValues.join(',')}". Expected ${headers.length}, got ${rowValues.length}.`);
            continue;
          }

          const processedValues = rowValues.map((val, index) => {
            const header = headers[index];
            if (val === '' && nullableIntegerFields.includes(header)) {
              return null;
            }
            return val;
          });

          const finalColumnNames = headers.join(', ');
          const placeholders = processedValues.map(() => '?').join(', ');
          const insert_statement = `INSERT OR IGNORE INTO ${table} (${finalColumnNames}) VALUES (${placeholders});`;

          await databaseInstance.runAsync(insert_statement, processedValues);
        }
        console.log(`Inserted ${dataRows.length} initial '${type}' records.`);

      } catch (networkError) {
        console.warn(`Could not fetch or parse data for ${type} from online source during initial load. Skipping this table. Error:`, networkError.message);
      }
    }

    await databaseInstance.execAsync('COMMIT;');
    console.log("Initial dimension data population process completed (network errors gracefully handled).");
  } catch (dbError) {
    await databaseInstance.execAsync('ROLLBACK;');
    console.error("Error during initial dimension data population (ROLLBACK issued):", dbError);
    throw dbError;
  }
};

/**
* Updates master data tables from Google Sheets.
* This function performs a full update (deleting existing and re-inserting) for all specified tables.
* It is intended for manual, user-triggered updates.
* @param {object} databaseInstance The Expo-SQLite database instance.
* @returns {Promise<boolean>} True if successful, throws an error otherwise.
*/
export const updateAllMasterData = async (databaseInstance) => {
  if (!databaseInstance) {
    console.error("Database instance not provided for master data update.");
    throw new Error("Database not initialized.");
  }

  try {
    await databaseInstance.execAsync('BEGIN TRANSACTION;');

    for (const type in googleSheetUrls) {
      const url = googleSheetUrls[type];

      let table = null;
      let nullableIntegerFields = [];
      let isFactTable = false;

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
        case "game":
          table = "games_fact";
          isFactTable = true;
          nullableIntegerFields = ['game_island_health', 'game_mobile', 'game_playtest', 'game_terror_level'];
          break;
        case "event":
          table = "events_fact";
          isFactTable = true;
          nullableIntegerFields = ['aspect_id', 'adversary_id', 'scenario_id', 'adversary_level'];
          break;
        default:
          console.warn(`Skipping unknown master data type: ${type}`);
          continue;
      }

      console.log(`Updating ${isFactTable ? "external" : ""} ${type} data from: ${url}`);

      const { headers, data: dataRows } = await fetchAndParseCsv(url);

      if (dataRows.length === 0) {
        console.warn(`No data found in CSV for ${type}. Skipping update for this table.`);
        continue;
      }

      // Delete existing records
      const delete_statement = `DELETE FROM ${table};`;
      await databaseInstance.runAsync(delete_statement);
      console.log(`Deleted old '${type}' data.`);

      // Prepare for insertion
      let additionalColumns = [];
      let additionalValues = [];
      if (isFactTable) {
        additionalColumns = ['is_external'];
        additionalValues = [1]; // Mark records from external source as true
      }

      for (const rowValues of dataRows) {
        if (rowValues.length !== headers.length) {
          console.warn(`Skipping row due to column count mismatch for ${type}: "${rowValues.join(',')}". Expected ${headers.length}, got ${rowValues.length}.`);
          continue;
        }

        // Process values
        const processedValues = rowValues.map((val, index) => {
          const header = headers[index];
          if (val === '' && nullableIntegerFields.includes(header)) {
            return null;
          }
          return val;
        });

        const finalColumnNames = [...headers, ...additionalColumns].join(', ');
        const placeholders = [...processedValues.map(() => '?'), ...additionalValues.map(() => '?')].join(', ');
        const insert_statement = `INSERT OR IGNORE INTO ${table} (${finalColumnNames}) VALUES (${placeholders});`;

        await databaseInstance.runAsync(insert_statement, [...processedValues, ...additionalValues]);
      }
      console.log(`Inserted ${dataRows.length} ${isFactTable ? 'external ' : ''}'${type}' records.`);
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
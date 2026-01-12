// App.js
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack'; // No longer needed for main navigation
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // <-- NEW IMPORT
import * as SQLite from 'expo-sqlite';

// Import your screen components
import AddGameScreen from './src/screens/AddGameScreen';     // <-- NEW IMPORT
import ViewResultsScreen from './src/screens/ViewResultsScreen'; // <-- NEW IMPORT

// --- REMOVE Placeholder Screens from App.js ---
// function AddGameScreen({ navigation }) { ... }
// function ViewResultsScreen({ navigation }) { ... }
// -------------------------------------------------------------------

// const Stack = createNativeStackNavigator(); // No longer needed
const Tab = createBottomTabNavigator(); // <-- NEW: Initialize Tab Navigator

// Declare db globally but assign it after opening async
let db = null;

// --- Database Initialization Logic (UNCHANGED) ---
const initializeDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync("spiritIslandTracker.db");
    console.log("Database opened successfully!");

    // Set PRAGMA for better performance (Write-Ahead Logging)
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    console.log("WAL mode enabled.");

    // Create games_dim table
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS games_dim (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      mobile_game BOOLEAN,
      notes TEXT,
      difficulty INTEGER,
      win_loss TEXT, -- 'Win' or 'Loss'
      invader_cards INTEGER,
      dahan_spirit INTEGER,
      blight_spirit INTEGER,
      total_score INTEGER,
      adversary_1_name TEXT,
      adversary_1_level INTEGER,
      adversary_2_name TEXT,
      adversary_2_level INTEGER,
      scenario_1_name TEXT,
      scenario_2_name TEXT
    );`
    );
    console.log("games_dim table created successfully or already exists.");

    // Create events_dim table (for spirits and aspects, one row per spirit per game)
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS events_dim (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER,
      spirit_name TEXT NOT NULL,
      aspect_name TEXT,
      FOREIGN KEY (game_id) REFERENCES games_dim(id) ON DELETE CASCADE
    );`
    );
    console.log("events_dim table created successfully or already exists.");

    // Create master_data table (for dynamic lists: spirits, adversaries, aspects, scenarios)
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS master_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- e.g., 'spirit', 'adversary', 'scenario', 'aspect'
      name TEXT NOT NULL UNIQUE,
      related_spirit TEXT -- For aspects, indicates which spirit it belongs to
    );`
    );
    console.log("master_data table created successfully or already exists.");

  } catch (error) {
    console.error("Error initializing database:", error);
    throw error; // Re-throw to be caught by the useEffect's catch block
  }
};

// --- Initial Hardcoded Master Data Insertion (UNCHANGED) ---
const populateMasterData = async () => {
  if (!db) {
    console.error("Database not initialized, cannot populate master data.");
    return;
  }

  try {
    // Spirits
    await db.runAsync(`INSERT OR IGNORE INTO master_data (type, name) VALUES ('spirit', 'Aching Blood'), ('spirit', 'Aerie of the Raucous Skies'), ('spirit', 'Bringer of Dreams and Nightmares'), ('spirit', 'Downpour Drenches the World');`);
    // Adversaries
    await db.runAsync(`INSERT OR IGNORE INTO master_data (type, name) VALUES ('adversary', 'Brandenburg-Prussia'), ('adversary', 'England'), ('adversary', 'France');`);
    // Scenarios
    await db.runAsync(`INSERT OR IGNORE INTO master_data (type, name) VALUES ('scenario', 'Blitz'), ('scenario', 'Dahan Insurrection'), ('scenario', 'Varied Terrains');`);
    // Aspects (example: 'Sun-Bright Whirlwind' for 'Sharp Fangs Behind the Leaves')
    // Note: 'related_spirit' links an aspect to a specific spirit.
    await db.runAsync(`INSERT OR IGNORE INTO master_data (type, name, related_spirit) VALUES ('aspect', 'Terrifying', 'Bringer of Dreams and Nightmares');`);
    await db.runAsync(`INSERT OR IGNORE INTO master_data (type, name, related_spirit) VALUES ('aspect', 'Numinous', 'Bringer of Dreams and Nightmares');`);
    await db.runAsync(`INSERT OR IGNORE INTO master_data (type, name, related_spirit) VALUES ('aspect', 'Locus', 'Downpour Drenches the World');`);
    await db.runAsync(`INSERT OR IGNORE INTO master_data (type, name, related_spirit) VALUES ('aspect', 'Tsunami', 'Downpour Drenches the World');`);

    // Additional sample aspects for other spirits to make dynamic filtering more obvious
    await db.runAsync(`INSERT OR IGNORE INTO master_data (type, name, related_spirit) VALUES ('aspect', 'Resilient', 'Aching Blood');`);
    await db.runAsync(`INSERT OR IGNORE INTO master_data (type, name, related_spirit) VALUES ('aspect', 'Vengeful', 'Aching Blood');`);

    console.log("Master data populated (or already exists).");
  } catch (error) {
    console.error("Master data transaction error:", error);
    throw error;
  }
};

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
        await populateMasterData(); // Populate initial hardcoded data
        setDbInitialized(true);
      } catch (e) {
        console.error("Failed to initialize database:", e);
        setError("Failed to initialize database. Please restart the app.");
      }
    };

    setupDatabase();
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading application data...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="AddGameTab" // Set the initial tab
        screenOptions={({ route }) => ({
          headerShown: true, // Show header for each screen in the tab navigator
          tabBarIcon: ({ focused, color, size }) => {
            // You can use a library like 'react-native-vector-icons' for actual icons,
            // or simple text for now.
            let iconName;

            if (route.name === 'AddGameTab') {
              iconName = focused ? '📝' : '🗒️'; // Emoji as placeholder icons
            } else if (route.name === 'ViewResultsTab') {
              iconName = focused ? '📊' : '📈'; // Emoji as placeholder icons
            }

            // You can return any component that you like here!
            return <Text style={{ color, fontSize: size }}>{iconName}</Text>;
          },
          tabBarActiveTintColor: 'tomato', // Color for active tab icon/label
          tabBarInactiveTintColor: 'gray',  // Color for inactive tab icon/label
          tabBarStyle: { height: 60, paddingBottom: 5 }, // Adjust tab bar style
          tabBarLabelStyle: { fontSize: 12 },
        })}
      >
        <Tab.Screen
          name="AddGameTab"
          component={AddGameScreen}
          options={{
            title: 'Record Game', // Header title for this screen
            tabBarLabel: 'Record Game', // Label on the tab bar
          }}
        />
        <Tab.Screen
          name="ViewResultsTab"
          component={ViewResultsScreen}
          options={{
            title: 'View Results', // Header title for this screen
            tabBarLabel: 'View Results', // Label on the tab bar
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffdddd',
    padding: 20,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 18,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

// Export the db object so other modules can import and use it
export { db };
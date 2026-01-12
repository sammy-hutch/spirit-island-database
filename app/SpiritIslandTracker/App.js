// App.js
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import * as SQLite from 'expo-sqlite';

// Import your screen components
import AddGameScreen from './src/screens/AddGameScreen';
import ViewResultsScreen from './src/screens/ViewResultsScreen';

const Tab = createBottomTabNavigator();

// Declare db globally but assign it after opening async
let db = null;

// --- Database Initialization Logic (UNCHANGED) ---
const initializeDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync("spiritIslandTracker.db");
    console.log("Database opened successfully!");
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    console.log("WAL mode enabled.");

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS games_fact (
        game_id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_difficulty INTEGER,
        game_win INTEGER,
        game_cards INTEGER,
        game_dahan INTEGER,
        game_blight INTEGER,
        game_score INTEGER,
        game_info TEXT
      );`
    );
    console.log("games_fact table created successfully or already exists.");

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS events_fact (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        spirit_id INTEGER NOT NULL,
        aspect_id INTEGER,
        adversary_id INTEGER,
        adversary_level INTEGER,
        scenario_id INTEGER,
        FOREIGN KEY (game_id) REFERENCES games_fact(game_id) ON DELETE CASCADE
      );`
    );
    console.log("events_fact table created successfully or already exists.");

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS spirits_dim (
        spirit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        spirit_name TEXT NOT NULL UNIQUE,
        complexity TEXT,
        spirit_image TEXT,
        nemesis_name TEXT
      );`
    );
    console.log("spirits_dim table created successfully or already exists.");

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS aspects_dim (
        aspect_id INTEGER PRIMARY KEY AUTOINCREMENT,
        aspect_name TEXT NOT NULL UNIQUE,
        spirit_id INTEGER,
        aspect_image TEXT
      );`
    );
    console.log("aspects_dim table created successfully or already exists.");

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS adversaries_dim (
        adversary_id INTEGER PRIMARY KEY AUTOINCREMENT,
        adversary_name TEXT NOT NULL UNIQUE,
        adversary_image TEXT,
        nemesis_name TEXT
      );`
    );
    console.log("adversaries_dim table created successfully or already exists.");

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS scenarios_dim (
        scenario_id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_name TEXT NOT NULL UNIQUE,
        scenario_difficulty INTEGER,
        scenario_image TEXT
      );`
    );
    console.log("scenarios_dim table created successfully or already exists.");

  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

// --- Initial Hardcoded Master Data Insertion (UNCHANGED) ---
// const populateMasterData = async () => {
//   if (!db) {
//     console.error("Database not initialized, cannot populate master data.");
//     return;
//   }

//   try {
//     // Spirits
//     await db.runAsync(`INSERT OR IGNORE INTO spirits_dim (spirit_id, spirit_name, complexity, spirit_image, nemesis_name) VALUES (1, "Lightning's Swift Strike", "Low", "https://spiritislandwiki.com/images/thumb/c/c2/Lightning%27s_Swift_Strike.png/250px-Lightning%27s_Swift_Strike.png", "Thundercaps");`);
//     // Adversaries
//     await db.runAsync(`INSERT OR IGNORE INTO adversaries_dim (type, name) VALUES ('adversary', 'Brandenburg-Prussia'), ('adversary', 'England'), ('adversary', 'France');`);
//     // Scenarios
//     await db.runAsync(`INSERT OR IGNORE INTO scenarios_dim (type, name) VALUES ('scenario', 'Blitz'), ('scenario', 'Dahan Insurrection'), ('scenario', 'Varied Terrains');`);
//     // Aspects (example: 'Sun-Bright Whirlwind' for 'Sharp Fangs Behind the Leaves')
//     // Note: 'related_spirit' links an aspect to a specific spirit.
//     await db.runAsync(`INSERT OR IGNORE INTO aspects_dim (type, name, related_spirit) VALUES ('aspect', 'Terrifying', 'Bringer of Dreams and Nightmares');`);
//     await db.runAsync(`INSERT OR IGNORE INTO aspects_dim (type, name, related_spirit) VALUES ('aspect', 'Numinous', 'Bringer of Dreams and Nightmares');`);
//     await db.runAsync(`INSERT OR IGNORE INTO aspects_dim (type, name, related_spirit) VALUES ('aspect', 'Locus', 'Downpour Drenches the World');`);
//     await db.runAsync(`INSERT OR IGNORE INTO aspects_dim (type, name, related_spirit) VALUES ('aspect', 'Tsunami', 'Downpour Drenches the World');`);

//     // Additional sample aspects for other spirits to make dynamic filtering more obvious
//     await db.runAsync(`INSERT OR IGNORE INTO aspects_dim (type, name, related_spirit) VALUES ('aspect', 'Resilient', 'Aching Blood');`);
//     await db.runAsync(`INSERT OR IGNORE INTO aspects_dim (type, name, related_spirit) VALUES ('aspect', 'Vengeful', 'Aching Blood');`);
//     console.log("Master data populated (or already exists).");
//   } catch (error) {
//     console.error("Master data transaction error:", error);
//     throw error;
//   }
// };

// AppContent component
function AppContent() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
        // await populateMasterData();
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
        initialRouteName="AddGameTab"
        screenOptions={({ route }) => ({
          headerShown: true,
          headerTitle: 'Spirit Island Game Tracker',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
            color: '#333',
          },
          // ------------------------------------
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'AddGameTab') {
              iconName = focused ? '📝' : '🗒️';
            } else if (route.name === 'ViewResultsTab') {
              iconName = focused ? '📊' : '📈';
            }
            return <Text style={{ color, fontSize: size }}>{iconName}</Text>;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarLabelStyle: { fontSize: 12 },
        })}
      >
        <Tab.Screen
          name="AddGameTab"
          component={AddGameScreen}
          options={{
            tabBarLabel: 'Record Game',
          }}
        />
        <Tab.Screen
          name="ViewResultsTab"
          component={ViewResultsScreen}
          options={{
            tabBarLabel: 'View Results',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Original App Component now wraps AppContent with SafeAreaProvider
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
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

export { db };
// App.js
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SQLite from 'expo-sqlite';

// --- NEW IMPORTS ---
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

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
    throw error;
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

// --- New AppContent Component ---
// This component will be wrapped by SafeAreaProvider in App()
// It allows us to use useSafeAreaInsets hook correctly.
function AppContent() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets(); // <-- Use the hook here!

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
        await populateMasterData();
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
            // Adjust height to account for safe area and base height
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom, // <-- IMPORTANT: Apply safe area padding here
          },
          tabBarLabelStyle: { fontSize: 12 },
        })}
      >
        <Tab.Screen
          name="AddGameTab"
          component={AddGameScreen}
          options={{
            title: 'Record Game',
            tabBarLabel: 'Record Game',
          }}
        />
        <Tab.Screen
          name="ViewResultsTab"
          component={ViewResultsScreen}
          options={{
            title: 'View Results',
            tabBarLabel: 'View Results',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// --- Original App Component now wraps AppContent with SafeAreaProvider ---
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
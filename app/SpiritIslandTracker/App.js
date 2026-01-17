// App.js
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import * as SQLite from "expo-sqlite";

// Import screen components
import AddGameScreen from "./src/screens/AddGameScreen";
import ViewResultsScreen from "./src/screens/ViewResultsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

// Import the new utility for master data update
import { updateAllMasterData } from "./src/utils/databaseUtils"; // <--- NEW IMPORT

const Tab = createBottomTabNavigator();

// Declare db globally but assign it after opening async
let db = null;

const initializeDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync("spiritIslandTracker.db");
    console.log("Database opened successfully!");
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    console.log("WAL mode enabled.");

    // Define table creation statements as an array for cleaner execution
    const tableCreations = [
      `CREATE TABLE IF NOT EXISTS games_fact (
      game_id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_difficulty INTEGER,
      game_win INTEGER,
      game_cards INTEGER,
      game_dahan INTEGER,
      game_blight INTEGER,
      game_score INTEGER,
      game_info TEXT
    );`,
      `CREATE TABLE IF NOT EXISTS events_fact (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      spirit_id INTEGER NOT NULL,
      aspect_id INTEGER,
      adversary_id INTEGER,
      adversary_level INTEGER,
      scenario_id INTEGER,
      FOREIGN KEY (game_id) REFERENCES games_fact(game_id) ON DELETE CASCADE
    );`,
      `CREATE TABLE IF NOT EXISTS spirits_dim (
      spirit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      spirit_name TEXT NOT NULL UNIQUE,
      complexity TEXT,
      spirit_image TEXT,
      nemesis_name TEXT
    );`,
      `CREATE TABLE IF NOT EXISTS aspects_dim (
      aspect_id INTEGER PRIMARY KEY AUTOINCREMENT,
      aspect_name TEXT NOT NULL UNIQUE,
      spirit_id INTEGER,
      aspect_image TEXT
    );`,
      `CREATE TABLE IF NOT EXISTS adversaries_dim (
      adversary_id INTEGER PRIMARY KEY AUTOINCREMENT,
      adversary_name TEXT NOT NULL UNIQUE,
      adversary_image TEXT,
      nemesis_name TEXT
    );`,
      `CREATE TABLE IF NOT EXISTS scenarios_dim (
      scenario_id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_name TEXT NOT NULL UNIQUE,
      scenario_difficulty INTEGER,
      scenario_image TEXT
    );`,
    ];

    for (const statement of tableCreations) {
      await db.execAsync(statement);
      // Extract table name from CREATE TABLE IF NOT EXISTS TableName ( ...
      const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      if (match && match[1]) {
        console.log(`Table '${match[1]}' created successfully or already exists.`);
      } else {
        console.log(`Executed table creation statement.`);
      }
    }

  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

// AppContent component
function AppContent() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initializing database..."); // <--- NEW state for loading message
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const setupDatabaseAndData = async () => { // Renamed for clarity
      try {
        await initializeDatabase();
        setLoadingMessage("Fetching latest game data..."); // <--- Update message
        await updateAllMasterData(db); // <--- CALL THE NEW UTILITY FUNCTION
        setDbInitialized(true);
      } catch (e) {
        console.error("Failed to load application data:", e);
        setError(`Failed to load application data. Please restart the app. Error: ${e.message}`);
      }
    };

    setupDatabaseAndData();
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
        <Text>{loadingMessage}</Text> {/* Use loadingMessage state */}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="AddGameTab"
        screenOptions={({ route }) => ({
          headerShown: true,
          headerTitle: "Spirit Island Game Tracker",
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 20,
            color: "#333",
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === "AddGameTab") {
              iconName = focused ? "📝" : "🗒️";
            } else if (route.name === "ViewResultsTab") {
              iconName = focused ? "📊" : "📈";
            } else if (route.name === "SettingsTab") {
              iconName = focused ? "⚙️" : "🔧";
            }
            return <Text style={{ color, fontSize: size }}>{iconName}</Text>;
          },
          tabBarActiveTintColor: "tomato",
          tabBarInactiveTintColor: "gray",
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
            tabBarLabel: "Record Game",
          }}
        />
        <Tab.Screen
          name="ViewResultsTab"
          component={ViewResultsScreen}
          options={{
            tabBarLabel: "View Results",
          }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={{
            tabBarLabel: "Settings",
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

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
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffdddd",
    padding: 20,
  },
  errorText: {
    color: "#cc0000",
    fontSize: 18,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});

export { db };
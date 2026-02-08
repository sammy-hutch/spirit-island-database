// App.js
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator, ImageBackground } from "react-native"; // Added ImageBackground
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
import { updateAllMasterData } from "./src/utils/databaseUtils";

// Import Colors from its dedicated file
import Colors from './src/constants/Colors'; // <--- UPDATED IMPORT

const Tab = createBottomTabNavigator();

// Declare db globally but assign it after opening async
let db = null;

const initializeDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync("spiritIslandTracker.db");
    console.log("Database opened successfully!");
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    console.log("WAL mode enabled.");

    const tableCreations = [
      `CREATE TABLE IF NOT EXISTS games_fact (
     game_id INTEGER PRIMARY KEY AUTOINCREMENT,
     game_difficulty INTEGER,
     game_win INTEGER,
     game_cards INTEGER,
     game_dahan INTEGER,
     game_blight INTEGER,
     game_score INTEGER,
     game_info TEXT,
     game_date TEXT,
     game_island_health INTEGER,
     game_terror_level INTEGER,
     game_mobile INTEGER,
     game_playtest INTEGER
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
  const [loadingMessage, setLoadingMessage] = useState("Initializing database...");
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const setupDatabaseAndData = async () => {
      try {
        await initializeDatabase();
        setLoadingMessage("Checking for master data updates..."); // Refined message
        // Call without forceUpdate, so it only updates if tables are empty
        await updateAllMasterData(db, false); // Explicitly pass false, or omit for default
        setLoadingMessage("Application data loaded!");
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
        <ActivityIndicator size="large" color={Colors.accentGreen} />
        <Text style={{ color: Colors.primaryText }}>{loadingMessage}</Text>
      </View>
    );
  }

  return (
    // Wrapped NavigationContainer in ImageBackground
    // IMPORTANT: Replace './assets/backgrounds/main_bg.png' with your actual image path
    // If you don't have a background image, you can remove ImageBackground and set backgroundColor in styles.container
    <ImageBackground
      source={require('./assets/backgrounds/main_bg.png')} // Example background image
      style={styles.backgroundImage}
      resizeMode="cover" // or 'repeat', 'stretch'
    >
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="AddGameTab"
          screenOptions={({ route }) => ({
            headerShown: true,
            headerTitle: "Spirit Island Game Tracker",
            headerTitleStyle: {
              fontWeight: "bold",
              fontSize: 20,
              color: Colors.headerTitle, // Updated color
            },
            headerStyle: {
              backgroundColor: Colors.headerBackground, // Updated header background
            },
            headerTitleAlign: 'center',
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === "AddGameTab") {
                iconName = focused ? "🌱" : "🌿"; // Organic symbols
              } else if (route.name === "ViewResultsTab") {
                iconName = focused ? "🏞️" : "🌲"; // Organic symbols
              } else if (route.name === "SettingsTab") {
                iconName = focused ? "⚙️" : "⚙️"; // Settings gear, kept as is but will inherit color
              }
              return <Text style={{ color, fontSize: size + 2 }}>{iconName}</Text>; // Slightly larger for emojis
            },
            tabBarActiveTintColor: Colors.activeTintColor, // Updated color
            tabBarInactiveTintColor: Colors.inactiveTintColor, // Updated color
            tabBarStyle: {
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom,
              backgroundColor: Colors.secondaryBackground, // Earthy background for tab bar
              borderTopWidth: 1,
              borderTopColor: Colors.borderColorLight, // Soft border
            },
            tabBarLabelStyle: { fontSize: 12, fontWeight: '500' }, // Added weight
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
    </ImageBackground>
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
  backgroundImage: { // New style for ImageBackground
    flex: 1,
    width: '100%',
    height: '100%',
  },
  // container is no longer directly styling the main background due to ImageBackground
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Make sure it's transparent if using ImageBackground
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primaryBackground, // Updated background
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.accentRed, // Updated background for error
    padding: 20,
  },
  errorText: {
    color: Colors.cardBackground, // Light text on dark error background
    fontSize: 18,
    textAlign: "center",
  },
  title: { // This style is for the loading screen title, not the header title
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: Colors.primaryText, // Updated color
  },
});

export { db, Colors }; // Export Colors for use in other screens
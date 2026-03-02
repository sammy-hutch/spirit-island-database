// App.js
import React, { useEffect, useState, createContext } from "react";
import { StyleSheet, Text, View, ActivityIndicator, ImageBackground, Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import * as SQLite from "expo-sqlite";

import AddGameScreen from "./src/screens/AddGameScreen";
import ViewResultsScreen from "./src/screens/ViewResultsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import {
  updateAllMasterData,
  checkDimensionTablesPopulated,
  initialPopulateDimensionTables
} from "./src/utils/databaseUtils";
import Colors from './src/constants/Colors';

const Tab = createBottomTabNavigator();

export const AppContext = createContext(null);
let db = null;

const initializeDatabase = async () => {
  try {
    const openedDb = await SQLite.openDatabaseAsync("spiritIslandTracker.db");
    console.log("Database opened successfully!");
    await openedDb.execAsync(`PRAGMA journal_mode = WAL;`);
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
    game_playtest INTEGER,
    is_external INTEGER DEFAULT 0
  );`,
      `CREATE TABLE IF NOT EXISTS events_fact (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    spirit_id INTEGER NOT NULL,
    aspect_id INTEGER,
    adversary_id INTEGER,
    adversary_level INTEGER,
    scenario_id INTEGER,
    is_external INTEGER DEFAULT 0,
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
      await openedDb.execAsync(statement);
      const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      if (match && match[1]) {
        console.log(`Table '${match[1]}' created successfully or already exists.`);
      } else {
        console.log(`Executed table creation statement.`);
      }
    }
    return openedDb;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

function AppContent() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initializing database...");
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  const handleManualDataUpdate = async () => {
    setLoadingMessage("Updating master data from online sources...");
    try {
      if (!db) {
        throw new Error("Database not available. Please restart the app.");
      }
      await updateAllMasterData(db);
      Alert.alert("Success", "Master data updated successfully!");
    } catch (e) {
      console.error("Failed to update master data:", e);
      Alert.alert(
        "Update Failed",
        `Failed to update data: ${e.message}\nPlease check your internet connection or try again later.`,
        [{ text: "OK" }]
      );
    } finally {
      setLoadingMessage("Application data ready!");
    }
  };

  useEffect(() => {
    const setupDatabaseAndData = async () => {
      try {
        const openedDb = await initializeDatabase();
        if (!openedDb) {
          throw new Error("Database could not be initialized.");
        }
        db = openedDb;

        setLoadingMessage("Checking for local data...");
        const hasInitialData = await checkDimensionTablesPopulated(db);

        if (!hasInitialData) {
          setLoadingMessage("Local data empty. Attempting initial online load for critical data...");
          try {
            await initialPopulateDimensionTables(db);
            console.log("Initial dimension tables populated successfully from online (if available).");
          } catch (e) {
            console.warn("Failed to perform initial online populate for dimension tables:", e.message);
            Alert.alert(
              "Offline Start / No Initial Data",
              "Could not load initial application data from online sources. Please ensure you have an internet connection and try updating data from the settings screen.",
              [{ text: "OK" }]
            );
          }
        } else {
          console.log("Dimension tables already populated locally. Skipping initial online fetch.");
        }

        setLoadingMessage("Application data ready!");
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
        <Text style={{ color: Colors.primaryText, marginTop: 10 }}>{loadingMessage}</Text>
      </View>
    );
  }

  return (
    <AppContext.Provider value={{ db, updateMasterData: handleManualDataUpdate }}>
      <ImageBackground
        source={require('./assets/backgrounds/main_bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
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
                color: Colors.headerTitle,
              },
              headerStyle: {
                backgroundColor: Colors.headerBackground,
              },
              headerTitleAlign: 'center',
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === "AddGameTab") {
                  iconName = focused ? "🌱" : "🌿";
                } else if (route.name === "ViewResultsTab") {
                  iconName = focused ? "🏞️" : "🌲";
                } else if (route.name === "SettingsTab") {
                  iconName = focused ? "⚙️" : "⚙️";
                }
                return <Text style={{ color, fontSize: size + 2 }}>{iconName}</Text>;
              },
              tabBarActiveTintColor: Colors.activeTintColor,
              tabBarInactiveTintColor: Colors.inactiveTintColor,
              tabBarStyle: {
                height: 60 + insets.bottom,
                paddingBottom: insets.bottom,
                backgroundColor: Colors.secondaryBackground,
                borderTopWidth: 1,
                borderTopColor: Colors.borderColorLight,
              },
              tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
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
    </AppContext.Provider>
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
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primaryBackground,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.accentRed,
    padding: 20,
  },
  errorText: {
    color: Colors.cardBackground,
    fontSize: 18,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: Colors.primaryText,
  },
});
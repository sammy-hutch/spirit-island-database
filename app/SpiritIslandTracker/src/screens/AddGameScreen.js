import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { db } from '../../App';

function AddGameScreen({ navigation }) {
  const [spirits, setSpirits] = useState([]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        if (!db) {
          console.warn("Database not ready yet in AddGameScreen.");
          return;
        }
        // Example: Fetch all spirit names from master_data
        const allSpirits = await db.getAllAsync(`SELECT name FROM master_data WHERE type = 'spirit';`);
        setSpirits(allSpirits.map(row => row.name));
      } catch (error) {
        console.error("Error loading spirits:", error);
        Alert.alert("Error", "Could not load spirit data.");
      }
    };
    loadMasterData();
  }, []); // Empty dependency array means this runs once on component mount

  const handleSaveGame = async () => {
    try {
      if (!db) {
        Alert.alert("Error", "Database not initialized. Please restart app.");
        return;
      }
      // Example: Insert a new game (you'll have full form data here)
      const result = await db.runAsync(
        `INSERT INTO games_dim (mobile_game, notes, difficulty, win_loss) VALUES (?, ?, ?, ?);`,
        [true, 'Test notes from AddGameScreen', 5, 'Win']
      );
      console.log('Game inserted with ID:', result.lastInsertId);

      // And then insert into events_dim using result.lastInsertId
      await db.runAsync(
        `INSERT INTO events_dim (game_id, spirit_name) VALUES (?, ?);`,
        [result.lastInsertId, 'Aching Blood']
      );
      console.log('Spirit event inserted.');

      Alert.alert("Success", "Game saved!");
      navigation.goBack(); // Or navigate to ViewResults
    } catch (error) {
      console.error("Error saving game:", error);
      Alert.alert("Error", "Failed to save game.");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Spirits loaded: {spirits.join(', ')}</Text>
      {/* ... your actual form elements will go here ... */}
      <Button title="Save Game" onPress={handleSaveGame} />
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

export default AddGameScreen;
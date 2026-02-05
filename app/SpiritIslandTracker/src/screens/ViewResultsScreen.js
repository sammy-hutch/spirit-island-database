// src/screens/ViewResultsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// Removed FileSystem, Sharing, Clipboard imports as they are no longer needed here
import { db } from '../../App';

const GameItem = ({ game }) => {
  // Helper to convert 0/1 to Yes/No
  const formatBoolean = (value) => (value === 1 ? 'Yes' : 'No');
  const formatWinLoss = (value) => (value === 10 ? 'Win' : 'Loss');

  return (
    <View style={styles.gameItemContainer}>
      <Text style={styles.gameItemTitle}>Game: {game.game_id} - {game.game_date}</Text>
      <Text>Outcome: {formatWinLoss(game.game_win)} | Difficulty: {game.game_difficulty} | Score: {game.game_score}</Text>

      {game.spirits && game.spirits.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>Spirits:</Text>
          {game.spirits.map((s, idx) => (
            <Text key={idx} style={styles.detailText}>
              • {s.spirit_name} {s.aspect_name ? `(${s.aspect_name})` : ''}
            </Text>
          ))}
        </View>
      )}

      {game.adversaries && game.adversaries.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>Adversaries:</Text>
          {game.adversaries.map((a, idx) => (
            <Text key={idx} style={styles.detailText}>
              • {a.adversary_name} (Level {a.adversary_level})
            </Text>
          ))}
        </View>
      )}

      {game.scenarios && game.scenarios.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>Scenarios:</Text>
          {game.scenarios.map((s, idx) => (
            <Text key={idx} style={styles.detailText}>
              • {s.scenario_name}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.scoreDetails}>
        Invader Cards: {game.game_cards}, Dahan (/spirit): {game.game_dahan}, Blight (/spirit): {game.game_blight}
      </Text>
      <Text style={styles.scoreDetails}>
        Mobile Game: {formatBoolean(game.game_mobile)} |
        Island Healthy: {formatBoolean(game.game_island_health)} |
        Terror Level: {game.game_terror_level} |
        Playtest: {formatBoolean(game.game_playtest)}
      </Text>
      {game.game_info ? <Text>Notes: {game.game_info}</Text> : null}
    </View>
  );
};

function ViewResultsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState([]);
  // Removed 'exporting' state

  const fetchGameData = useCallback(async () => {
    if (!db) {
      Alert.alert("Error", "Database not initialized. Please restart the app.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const games = await db.getAllAsync(
        `SELECT
        game_id, 
        game_difficulty, game_win, game_cards, game_dahan, game_blight, game_score, 
        game_info, game_date, game_island_health, game_terror_level, game_mobile, game_playtest
      FROM games_fact ORDER BY game_id DESC;`
      );

      const combinedData = [];

      for (const game of games) {
        const spirits = await db.getAllAsync(
          `SELECT
          sd.spirit_name,
          ad.aspect_name
        FROM events_fact e
        LEFT JOIN spirits_dim sd ON e.spirit_id = sd.spirit_id
        LEFT JOIN aspects_dim ad ON e.aspect_id = ad.aspect_id
        WHERE e.game_id = ? AND e.spirit_id IS NOT NULL
        GROUP BY sd.spirit_name, ad.aspect_name;`,
          [game.game_id]
        );

        const adversaries = await db.getAllAsync(
          `SELECT
          ad.adversary_name,
          e.adversary_level
        FROM events_fact e
        LEFT JOIN adversaries_dim ad ON e.adversary_id = ad.adversary_id
        WHERE e.game_id = ? AND e.adversary_id IS NOT NULL
        GROUP BY ad.adversary_name, e.adversary_level;`,
          [game.game_id]
        );

        const scenarios = await db.getAllAsync(
          `SELECT
          sd.scenario_name
        FROM events_fact e
        LEFT JOIN scenarios_dim sd ON e.scenario_id = sd.scenario_id
        WHERE e.game_id = ? AND e.scenario_id IS NOT NULL
        GROUP BY sd.scenario_name;`,
          [game.game_id]
        );

        combinedData.push({
          ...game,
          spirits,
          adversaries,
          scenarios,
        });
      }
      setGameData(combinedData);
    } catch (error) {
      console.error("Error fetching game data:", error);
      Alert.alert("Error", "Failed to load game results.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGameData();
      return () => { };
    }, [fetchGameData])
  );

  // Removed generateCombinedGameCSV, exportToCSV, copyCombinedToClipboard

  return (
    <View style={styles.screenContainer}>
      <View style={styles.buttonContainer}>
        <Button
          title="Add New Game"
          onPress={() => navigation.navigate('AddGameTab')}
        />
      </View>

      {gameData.length === 0 ? (
        <View style={styles.centeredContainer}>
          <Text style={styles.noDataText}>No games recorded yet. Add a new game!</Text>
          <Button title="Add First Game" onPress={() => navigation.navigate('AddGameTab')} />
        </View>
      ) : (
        <FlatList
          data={gameData}
          keyExtractor={(item) => item.game_id.toString()}
          renderItem={({ item }) => <GameItem game={item} />}
          contentContainerStyle={styles.listContentContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f4f7',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  buttonContainer: {
    // Adjusted to center the single button or allow for future additions
    flexDirection: 'row',
    justifyContent: 'center', // Changed from 'space-around'
    marginBottom: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  gameItemContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  gameItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#34495e',
  },
  detailSection: {
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
    paddingLeft: 10,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  scoreDetails: {
    fontSize: 13,
    color: '#777',
    marginTop: 10,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  }
});

export default ViewResultsScreen;
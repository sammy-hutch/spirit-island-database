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
  ImageBackground, // Added ImageBackground
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { db } from '../../App';
import Colors from '../constants/Colors';

const GameItem = ({ game }) => {
  // Helper to convert 0/1 to Yes/No, and null to an empty string or 'N/A'
  const formatBoolean = (value) => {
    if (value === 1) return 'Yes';
    if (value === 0) return 'No';
    return 'Unknown';
  };
  const formatWinLoss = (value) => (value === 10 ? 'Win' : 'Loss');
  const winColor = game.game_win === 10 ? Colors.accentGreen : Colors.accentRed;

  return (
    <View style={styles.gameItemContainer}>
      <Text style={styles.gameItemTitle}>
        Game: {game.game_id}
        {game.game_date ? <Text style={styles.gameItemDate}> - {game.game_date}</Text> : null}
      </Text>
      <Text style={[styles.gameOutcome, { color: winColor }]}>
        Outcome: {formatWinLoss(game.game_win)}
      </Text>
      <Text style={styles.gameSummary}>
        Difficulty: {game.game_difficulty} | Score: {game.game_score}
      </Text>

      <Text style={styles.scoreDetails}>
        Invader Cards: {game.game_cards}, Dahan (/s): {game.game_dahan}, Blight (/s): {game.game_blight}
      </Text>

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

      {/* IMPORTANT: Add filter for non-null names before checking length and mapping */}
      {game.adversaries && game.adversaries.filter(a => a.adversary_name).length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>Adversaries:</Text>
          {game.adversaries.filter(a => a.adversary_name).map((a, idx) => (
            <Text key={idx} style={styles.detailText}>
              • {a.adversary_name} (Level {a.adversary_level})
            </Text>
          ))}
        </View>
      )}

      {/* IMPORTANT: Add filter for non-null names before checking length and mapping */}
      {game.scenarios && game.scenarios.filter(s => s.scenario_name).length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>Scenarios:</Text>
          {game.scenarios.filter(s => s.scenario_name).map((s, idx) => (
            <Text key={idx} style={styles.detailText}>
              • {s.scenario_name}
            </Text>
          ))}
        </View>
      )}
      <View style={styles.infoChipsContainer}>
        {game.game_mobile !== null ? <Text style={styles.infoChip}>Mobile Game: {formatBoolean(game.game_mobile)}</Text> : null}
        {game.game_island_health !== null ? <Text style={styles.infoChip}>Island Healthy: {formatBoolean(game.game_island_health)}</Text> : null}
        {game.game_mobile !== null ? <Text style={styles.infoChip}>Terror Level: {game.game_terror_level}</Text> : null}
      </View>
      {game.game_info ? <Text style={styles.notesText}>Notes: {game.game_info}</Text> : null}
      {game.game_playtest ? <Text style={styles.playtestText}>Playtest</Text> : null}
    </View>
  );
};

function ViewResultsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState([]);

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

  return (
    <ImageBackground
      source={require('../../assets/backgrounds/main_bg.png')} // Example background image
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.screenContent}>
        <View style={styles.buttonContainer}>
          <Button
            title="Add New Game"
            onPress={() => navigation.navigate('AddGameTab')}
            color={Colors.accentBrown} // Updated button color
          />
        </View>

        {gameData.length === 0 ? (
          <View style={styles.centeredContainer}>
            <Text style={styles.noDataText}>No games recorded yet. Add a new game!</Text>
            <Button title="Add First Game" onPress={() => navigation.navigate('AddGameTab')} color={Colors.accentGreen} />
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  screenContent: { // Wrapper to sit on top of ImageBackground
    flex: 1,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Slightly transparent overlay
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent card
    borderRadius: 15,
    margin: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent button area
    borderRadius: 10,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listContentContainer: {
    paddingBottom: 20,
    paddingHorizontal: 5,
  },
  gameItemContainer: {
    backgroundColor: Colors.cardBackground, // Use the card background color
    borderRadius: 15, // More rounded corners
    padding: 18, // More padding
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderColorLight, // Softer border
    shadowColor: "#000", // Stronger shadow for "floating" effect
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  gameItemTitle: {
    fontSize: 20, // Slightly larger
    fontWeight: 'bold',
    marginBottom: 5,
    color: Colors.primaryText, // Updated color
    fontFamily: Platform.OS === 'ios' ? 'Gill Sans' : 'serif',
  },
  gameItemDate: {
    fontSize: 16,
    fontWeight: 'normal',
    color: Colors.secondaryText,
  },
  gameOutcome: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    // Color set dynamically based on win/loss
  },
  gameSummary: {
    fontSize: 15,
    color: Colors.secondaryText,
    marginBottom: 10,
  },
  detailSection: {
    marginTop: 10,
    borderLeftWidth: 4, // Thicker left border
    borderLeftColor: Colors.accentBrown, // Earthy brown accent
    paddingLeft: 12, // More padding
    backgroundColor: 'rgba(0,0,0,0.03)', // Very subtle background for the section
    borderRadius: 5,
    paddingVertical: 5,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryText, // Updated color
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: Colors.secondaryText, // Updated color
  },
  scoreDetails: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginTop: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)', // Subtle background
    paddingVertical: 5,
    borderRadius: 8,
  },
  infoChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  infoChip: {
    backgroundColor: Colors.secondaryBackground,
    color: Colors.primaryText,
    fontSize: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginHorizontal: 3,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: Colors.borderColorLight,
  },
  notesText: {
    fontSize: 14,
    color: Colors.primaryText,
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 10,
    borderRadius: 10,
  },
  playtestText: {
    fontSize: 12,
    color: Colors.accentBrown,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 5,
  },
  noDataText: {
    fontSize: 18,
    color: Colors.primaryText,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Gill Sans' : 'serif',
  }
});

export default ViewResultsScreen;
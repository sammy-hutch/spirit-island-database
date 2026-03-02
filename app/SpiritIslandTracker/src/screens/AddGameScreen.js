// src/screens/AddGameScreen.js
import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  Button,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { AppContext } from '../../App';
import Colors from '../constants/Colors';

const SpiritEntry = ({
  index,
  spiritOptions,
  allAspectsMap,
  selectedSpirit,
  selectedAspect,
  onSpiritChange,
  onAspectChange,
  onRemove,
  canRemove,
}) => {
  const availableAspects = selectedSpirit
    ? allAspectsMap[selectedSpirit] || []
    : [];

  return (
    <View style={styles.entryContainer}>
      <Text style={styles.entryLabel}>Spirit {index + 1}:</Text>
      <RNPickerSelect
        onValueChange={(value) => onSpiritChange(index, value)}
        items={spiritOptions}
        value={selectedSpirit}
        placeholder={{ label: 'Select Spirit...', value: null }}
        style={pickerSelectStyles}
      />

      <Text style={styles.entryLabel}>Aspect {index + 1} (optional):</Text>
      <RNPickerSelect
        onValueChange={(value) => onAspectChange(index, value)}
        items={availableAspects}
        value={selectedAspect}
        placeholder={{ label: 'Select Aspect...', value: null }}
        style={pickerSelectStyles}
        disabled={!selectedSpirit}
      />
      {canRemove && (
        <Button
          title="Remove Spirit"
          onPress={() => onRemove(index)}
          color={Colors.accentRed}
        />
      )}
    </View>
  );
};

const AdversaryEntry = ({
  index,
  adversaryOptions,
  selectedAdversary,
  selectedLevel,
  onAdversaryChange,
  onLevelChange,
  onRemove,
  canRemove,
}) => {
  const levelOptions = Array.from({ length: 7 }, (_, i) => ({
    label: `Level ${i}`,
    value: i,
  }));

  return (
    <View style={styles.entryContainer}>
      <Text style={styles.entryLabel}>Adversary {index + 1}:</Text>
      <RNPickerSelect
        onValueChange={(value) => onAdversaryChange(index, value)}
        items={adversaryOptions}
        value={selectedAdversary}
        placeholder={{ label: 'Select Adversary...', value: null }}
        style={pickerSelectStyles}
      />
      {selectedAdversary && (
        <>
          <Text style={styles.entryLabel}>Adversary Level:</Text>
          <RNPickerSelect
            onValueChange={(value) => onLevelChange(index, value)}
            items={levelOptions}
            value={selectedLevel}
            placeholder={{ label: 'Select Level...', value: null }}
            style={pickerSelectStyles}
          />
        </>
      )}
      {canRemove && (
        <Button
          title="Remove Adversary"
          onPress={() => onRemove(index)}
          color={Colors.accentRed}
        />
      )}
    </View>
  );
};

const ScenarioEntry = ({
  index,
  scenarioOptions,
  selectedScenario,
  onScenarioChange,
  onRemove,
  canRemove,
}) => {
  return (
    <View style={styles.entryContainer}>
      <Text style={styles.entryLabel}>Scenario {index + 1}:</Text>
      <RNPickerSelect
        onValueChange={(value) => onScenarioChange(index, value)}
        items={scenarioOptions}
        value={selectedScenario}
        placeholder={{ label: 'Select Scenario...', value: null }}
        style={pickerSelectStyles}
      />
      {canRemove && (
        <Button
          title="Remove Scenario"
          onPress={() => onRemove(index)}
          color={Colors.accentRed}
        />
      )}
    </View>
  );
};

function AddGameScreen({ navigation }) {
  const { db } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState({
    spiritOptions: [],
    adversaryOptions: [],
    scenarioOptions: [],
    allAspectsMap: {},
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize formData with new fields and their default values
  const [formData, setFormData] = useState({
    mobileGame: false,
    playtest: false,
    gameDate: new Date(),
    islandHealthy: true,
    terrorLevel: 1,
    notes: '',
    difficulty: '',
    winLoss: null,
    invaderCards: '',
    dahanPerSpirit: '',
    blightPerSpirit: '',
    spirits: [{ name: null, id: null, aspect: null, aspect_id: null }],
    adversaries: [],
    scenarios: [],
  });

  const totalScore = useCallback(() => {
    const d = parseInt(formData.difficulty || 0);
    const wl = formData.winLoss === 'Win' ? 10 : 0;
    const ic = parseInt(formData.invaderCards || 0);
    // const ic = formData.winLoss === 'Win' ? parseInt(formData.invaderCards || 0) * 2 : parseInt(formData.invaderCards || 0) * 1; -- old calc, if wanting to add the actual number of cards, use this
    const ds = parseInt(formData.dahanPerSpirit || 0);
    const bs = parseInt(formData.blightPerSpirit || 0);
    return d + wl + ic + ds - bs;
  }, [formData.difficulty, formData.invaderCards, formData.dahanPerSpirit, formData.blightPerSpirit, formData.winLoss]);

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    try {
      if (!db) {
        Alert.alert("Error", "Database not initialized. Please restart the app.");
        setLoading(false);
        return;
      }

      const spiritsResult = await db.getAllAsync(`SELECT spirit_name, spirit_id FROM spirits_dim ORDER BY spirit_name ASC;`);
      const spiritOptions = spiritsResult.map(row => ({
        label: row.spirit_name,
        value: row.spirit_name,
        id: row.spirit_id
      }));

      const adversariesResult = await db.getAllAsync(`SELECT adversary_name, adversary_id FROM adversaries_dim ORDER BY adversary_name ASC;`);
      const adversaryOptions = adversariesResult.map(row => ({
        label: row.adversary_name,
        value: row.adversary_name,
        id: row.adversary_id
      }));

      const scenariosResult = await db.getAllAsync(`SELECT scenario_name, scenario_id FROM scenarios_dim ORDER BY scenario_name ASC;`);
      const scenarioOptions = scenariosResult.map(row => ({
        label: row.scenario_name,
        value: row.scenario_name,
        id: row.scenario_id
      }));

      const aspectsResult = await db.getAllAsync(`SELECT aspect_name, aspect_id, spirit_name FROM aspects_dim a LEFT JOIN spirits_dim s ON a.spirit_id = s.spirit_id;`);
      const allAspectsMap = aspectsResult.reduce((acc, row) => {
        if (row.spirit_name) {
          if (!acc[row.spirit_name]) {
            acc[row.spirit_name] = [];
          }
          acc[row.spirit_name].push({
            label: row.aspect_name,
            value: row.aspect_name,
            id: row.aspect_id
          });
        }
        return acc;
      }, {});

      setMasterData({
        spiritOptions,
        adversaryOptions,
        scenarioOptions,
        allAspectsMap,
      });
    } catch (error) {
      console.error("Error fetching master data:", error);
      Alert.alert("Error", "Could not load game setup data.");
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      fetchMasterData();
      return () => { };
    }, [fetchMasterData])
  );

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || formData.gameDate;
    setShowDatePicker(Platform.OS === 'ios');
    setFormData(prev => ({ ...prev, gameDate: currentDate }));
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const addSpiritEntry = () => {
    if (formData.spirits.length < 6) {
      setFormData(prev => ({
        ...prev,
        spirits: [...prev.spirits, { name: null, id: null, aspect: null, aspect_id: null }],
      }));
    }
  };

  const removeSpiritEntry = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      spirits: prev.spirits.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSpiritChange = (index, value) => {
    setFormData(prev => {
      const newSpirits = [...prev.spirits];
      const selectedSpiritOption = masterData.spiritOptions.find(option => option.value === value);
      const spiritId = selectedSpiritOption ? selectedSpiritOption.id : null;
      newSpirits[index] = {
        ...newSpirits[index],
        name: value,
        id: spiritId,
        aspect: null,
        aspect_id: null
      };
      return { ...prev, spirits: newSpirits };
    });
  };

  const handleAspectChange = (index, value) => {
    setFormData(prev => {
      const newSpirits = [...prev.spirits];

      const currentSpiritEntry = newSpirits[index];
      const selectedSpiritName = currentSpiritEntry.name;
      let aspectId = null;

      if (selectedSpiritName && masterData.allAspectsMap[selectedSpiritName]) {
        const aspectsForThisSpirit = masterData.allAspectsMap[selectedSpiritName];
        const selectedAspectOption = aspectsForThisSpirit.find(option => option.value === value);

        if (selectedAspectOption) {
          aspectId = selectedAspectOption.id;
        }
      }

      newSpirits[index] = {
        ...currentSpiritEntry,
        aspect: value,
        aspect_id: aspectId,
      };

      return { ...prev, spirits: newSpirits };
    });
  };

  const addAdversaryEntry = () => {
    if (formData.adversaries.length < 2) {
      setFormData(prev => ({
        ...prev,
        adversaries: [...prev.adversaries, { name: null, level: null }],
      }));
    }
  };

  const removeAdversaryEntry = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      adversaries: prev.adversaries.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleAdversaryChange = (index, value) => {
    setFormData(prev => {
      const newAdversaries = [...prev.adversaries];
      const selectedAdversaryOption = masterData.adversaryOptions.find(option => option.value === value);
      const adversaryId = selectedAdversaryOption ? selectedAdversaryOption.id : null;
      newAdversaries[index] = {
        ...newAdversaries[index],
        name: value,
        id: adversaryId,
        level: null
      };
      return { ...prev, adversaries: newAdversaries };
    });
  };

  const handleAdversaryLevelChange = (index, value) => {
    setFormData(prev => {
      const newAdversaries = [...prev.adversaries];
      newAdversaries[index].level = value;
      return { ...prev, adversaries: newAdversaries };
    });
  };

  const addScenarioEntry = () => {
    if (formData.scenarios.length < 2) {
      setFormData(prev => ({
        ...prev,
        scenarios: [...prev.scenarios, { name: null, id: null }],
      }));
    }
  };

  const removeScenarioEntry = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      scenarios: prev.scenarios.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleScenarioChange = (index, value) => {
    setFormData(prev => {
      const newScenarios = [...prev.scenarios];
      const selectedScenarioOption = masterData.scenarioOptions.find(option => option.value === value);
      const scenarioId = selectedScenarioOption ? selectedScenarioOption.id : null;
      newScenarios[index] = {
        ...newScenarios[index],
        name: value,
        id: scenarioId
      };
      return { ...prev, scenarios: newScenarios };
    });
  };

  const handleSaveGame = async () => {
    if (!db) {
      Alert.alert("Error", "Database not initialized. Please restart the app.");
      return;
    }

    if (!formData.winLoss) {
      Alert.alert("Validation Error", "Please select Win or Loss.");
      return;
    }
    if (!formData.spirits.some(s => s.name !== null)) {
      Alert.alert("Validation Error", "Please add at least one spirit.");
      return;
    }
    for (const adv of formData.adversaries) {
      if (adv.name && adv.level === null) {
        Alert.alert("Validation Error", `Please select a level for ${adv.name}.`);
        return;
      }
    }
    if (!formData.gameDate) {
      Alert.alert("Validation Error", "Please select the date the game was played.");
      return;
    }
    if (formData.terrorLevel === null) {
      Alert.alert("Validation Error", "Please select a terror level.");
      return;
    }

    try {
      // log game data
      const calculatedScore = totalScore();
      const game_score = formData.winLoss === 'Win' ? 10 : 0;
      const formattedGameDate = formData.gameDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const blightValue = parseInt(formData.blightPerSpirit || 0) * -1;

      const gameInsertResult = await db.runAsync(
        `INSERT INTO games_fact (
      game_difficulty, game_win, game_cards, game_dahan, game_blight, game_score, 
      game_info, game_date, game_island_health, game_terror_level, game_mobile, game_playtest
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          parseInt(formData.difficulty || 0),
          game_score,
          parseInt(formData.invaderCards || 0),
          parseInt(formData.dahanPerSpirit || 0),
          blightValue,
          calculatedScore,
          formData.notes,
          formattedGameDate,
          formData.islandHealthy ? 1 : 0,
          formData.terrorLevel,
          formData.mobileGame ? 1 : 0,
          formData.playtest ? 1 : 0,
        ]
      );

      const game_id = gameInsertResult.lastInsertRowId;

      if (!game_id) {
        throw new Error("Failed to retrieve a valid game ID after inserting into games_fact.");
      }

      console.log('Game inserted into games_fact with ID:', game_id);

      // log events data
      const selectedSpirits = formData.spirits.filter(s => s.name);

      const validAdversaries = formData.adversaries.filter(a => a.name);
      const adversariesToProcess = validAdversaries.length > 0 ? validAdversaries : [{ id: null, level: null }];

      const validScenarios = formData.scenarios.filter(s => s.name);
      const scenariosToProcess = validScenarios.length > 0 ? validScenarios : [{ id: null }];

      for (const spiritEntry of selectedSpirits) {
        for (const adversaryEntry of adversariesToProcess) {
          for (const scenarioEntry of scenariosToProcess) {
            await db.runAsync(
              `INSERT INTO events_fact (game_id, spirit_id, aspect_id, adversary_id, adversary_level, scenario_id) VALUES (?, ?, ?, ?, ?, ?);`,
              [game_id, spiritEntry.id, spiritEntry.aspect_id, adversaryEntry.id, adversaryEntry.level, scenarioEntry.id]
            );
            console.log(`Inserted combination for game ID: ${game_id}, Spirit: "${spiritEntry.name}" (Adversary: ${adversaryEntry.id || 'None'}, Scenario: ${scenarioEntry.id || 'None'})`);
          }
        }
      }
      console.log('All events processed for game ID:', game_id);

      Alert.alert("Success", "Game results saved successfully!");
      // Reset form data after successful save
      setFormData({
        mobileGame: false,
        playtest: false,
        gameDate: new Date(),
        islandHealthy: true,
        terrorLevel: 1,
        notes: '',
        difficulty: '',
        winLoss: null,
        invaderCards: '',
        dahanPerSpirit: '',
        blightPerSpirit: '',
        spirits: [{ name: null, id: null, aspect: null, aspect_id: null }], adversaries: [], scenarios: []
      });

    } catch (error) {
      console.error("Error saving game results:", error);
      Alert.alert("Error", `Failed to save game results: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accentGreen} />
        <Text style={{ color: Colors.primaryText }}>Loading game options...</Text>
      </View>
    );
  }

  const terrorLevelOptions = Array.from({ length: 4 }, (_, i) => ({
    label: `Level ${i + 1}`,
    value: i + 1,
  }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ImageBackground
        source={require('../../assets/backgrounds/main_bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Record New Game</Text>

          {/* Date Played */}
          <Text style={styles.label}>Date Played:</Text>
          <Button onPress={showDatepicker} title="Select Date" color={Colors.accentBrown} />
          <TextInput
            style={styles.input}
            value={formData.gameDate.toLocaleDateString()}
            editable={false}
            pointerEvents="none"
          />
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={formData.gameDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onChangeDate}
            />
          )}

          {/* Game Score Data */}
          <Text style={styles.sectionTitle}>Game Score Data:</Text>

          <Text style={styles.label}>Difficulty:</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(formData.difficulty)}
            onChangeText={(text) => handleFormChange('difficulty', text)}
            placeholder="e.g., 5"
            placeholderTextColor={Colors.secondaryText}
          />

          <Text style={styles.label}>Win/Loss:</Text>
          <RNPickerSelect
            onValueChange={(value) => handleFormChange('winLoss', value)}
            items={[
              { label: 'Win', value: 'Win' },
              { label: 'Loss', value: 'Loss' },
            ]}
            value={formData.winLoss}
            placeholder={{ label: 'Select Win/Loss...', value: null }}
            style={pickerSelectStyles}
          />

          <Text style={styles.label}>Invader Cards:</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(formData.invaderCards)}
            onChangeText={(text) => handleFormChange('invaderCards', text)}
            placeholder="e.g., 2"
            placeholderTextColor={Colors.secondaryText}
          />

          <Text style={styles.label}>Dahan on Island (per Spirit):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(formData.dahanPerSpirit)}
            onChangeText={(text) => handleFormChange('dahanPerSpirit', text)}
            placeholder="e.g., 5"
            placeholderTextColor={Colors.secondaryText}
          />

          <Text style={styles.label}>Blight on Island (per Spirit):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(formData.blightPerSpirit)}
            onChangeText={(text) => handleFormChange('blightPerSpirit', text)}
            placeholder="e.g., 0"
            placeholderTextColor={Colors.secondaryText}
          />

          <Text style={styles.totalScore}>Calculated Total Score: {totalScore()}</Text>

          {/* Spirits Section */}
          <Text style={styles.sectionTitle}>Spirits Played ({formData.spirits.length} selected):</Text>
          {formData.spirits.map((spiritEntry, index) => (
            <SpiritEntry
              key={index}
              index={index}
              spiritOptions={masterData.spiritOptions}
              allAspectsMap={masterData.allAspectsMap}
              selectedSpirit={spiritEntry.name}
              selectedAspect={spiritEntry.aspect}
              onSpiritChange={handleSpiritChange}
              onAspectChange={handleAspectChange}
              onRemove={removeSpiritEntry}
              canRemove={formData.spirits.length > 1}
            />
          ))}
          {formData.spirits.length < 6 && (
            <Button title="Add Another Spirit" onPress={addSpiritEntry} color={Colors.accentGreen} />
          )}

          {/* Adversaries Section */}
          <Text style={styles.sectionTitle}>Adversaries ({formData.adversaries.length} selected):</Text>
          {formData.adversaries.map((adversaryEntry, index) => (
            <AdversaryEntry
              key={index}
              index={index}
              adversaryOptions={masterData.adversaryOptions}
              selectedAdversary={adversaryEntry.name}
              selectedLevel={adversaryEntry.level}
              onAdversaryChange={handleAdversaryChange}
              onLevelChange={handleAdversaryLevelChange}
              onRemove={removeAdversaryEntry}
              canRemove={formData.adversaries.length > 0}
            />
          ))}
          {formData.adversaries.length < 2 && (
            <Button title="Add Adversary" onPress={addAdversaryEntry} color={Colors.accentGreen} />
          )}

          {/* Scenarios Section */}
          <Text style={styles.sectionTitle}>Scenarios ({formData.scenarios.length} selected):</Text>
          {formData.scenarios.map((scenarioName, index) => (
            <ScenarioEntry
              key={index}
              index={index}
              scenarioOptions={masterData.scenarioOptions}
              selectedScenario={scenarioName.name}
              onScenarioChange={handleScenarioChange}
              onRemove={removeScenarioEntry}
              canRemove={formData.scenarios.length > 0}
            />
          ))}
          {formData.scenarios.length < 2 && (
            <Button title="Add Scenario" onPress={addScenarioEntry} color={Colors.accentGreen} />
          )}

          {/* Game Details Section */}
          <Text style={styles.sectionTitle}>Game Details:</Text>

          {/* Mobile Game Flag */}
          <View style={styles.row}>
            <Text style={styles.label}>Played on Mobile:</Text>
            <Switch
              value={formData.mobileGame}
              onValueChange={(value) => handleFormChange('mobileGame', value)}
              trackColor={{ false: Colors.borderColorLight, true: Colors.accentGreen }} // Organic switch colors
              thumbColor={formData.mobileGame ? Colors.cardBackground : Colors.cardBackground}
            />
          </View>

          {/* Playtest Flag */}
          <View style={styles.row}>
            <Text style={styles.label}>Playtest:</Text>
            <Switch
              value={formData.playtest}
              onValueChange={(value) => handleFormChange('playtest', value)}
              trackColor={{ false: Colors.borderColorLight, true: Colors.accentGreen }}
              thumbColor={formData.playtest ? Colors.cardBackground : Colors.cardBackground}
            />
          </View>

          {/* Island Healthy Toggle */}
          <View style={styles.row}>
            <Text style={styles.label}>Island Healthy:</Text>
            <Switch
              value={formData.islandHealthy}
              onValueChange={(value) => handleFormChange('islandHealthy', value)}
              trackColor={{ false: Colors.accentRed, true: Colors.accentGreen }}
              thumbColor={formData.islandHealthy ? Colors.cardBackground : Colors.cardBackground}
            />
          </View>

          {/* Terror Level Picker */}
          <Text style={styles.label}>Terror Level:</Text>
          <RNPickerSelect
            onValueChange={(value) => handleFormChange('terrorLevel', value)}
            items={terrorLevelOptions}
            value={formData.terrorLevel}
            placeholder={{ label: 'Select Terror Level...', value: null }}
            style={pickerSelectStyles}
          />

          {/* Notes */}
          <Text style={styles.label}>Notes:</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={formData.notes}
            onChangeText={(text) => handleFormChange('notes', text)}
            placeholder="Any additional notes about the game..."
            placeholderTextColor={Colors.secondaryText}
          />

          <View style={styles.saveButtonContainer}>
            <Button title="Save Game Results" onPress={handleSaveGame} color={Colors.accentBrown} />
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 15,
    margin: 10,
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryBackground,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.primaryText,
    fontFamily: Platform.OS === 'ios' ? 'Gill Sans' : 'serif',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 15,
    color: Colors.secondaryText,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColorLight,
    paddingBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Gill Sans' : 'serif',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: Colors.cardBackground,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderColorLight,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
    color: Colors.primaryText,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderColorMedium,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: Colors.cardBackground,
    color: Colors.primaryText,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.borderColorMedium,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: Colors.cardBackground,
    color: Colors.primaryText,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  totalScore: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 25,
    textAlign: 'center',
    color: Colors.accentGreen,
    fontFamily: Platform.OS === 'ios' ? 'Gill Sans' : 'serif',
  },
  entryContainer: {
    backgroundColor: Colors.cardBackground,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderColorLight,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  entryLabel: {
    fontSize: 15,
    marginBottom: 5,
    fontWeight: '500',
    color: Colors.primaryText,
  },
  saveButtonContainer: {
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  }
});

// Styles for react-native-picker-select
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.borderColorMedium,
    borderRadius: 10,
    color: Colors.primaryText,
    paddingRight: 30,
    backgroundColor: Colors.cardBackground,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderColorMedium,
    borderRadius: 10,
    color: Colors.primaryText,
    paddingRight: 30,
    backgroundColor: Colors.cardBackground,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  placeholder: {
    color: Colors.secondaryText,
  },
});

export default AddGameScreen;
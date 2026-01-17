// src/screens/AddGameScreen.js
import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useFocusEffect } from '@react-navigation/native';

import { db } from '../../App';

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
          color="#FF6347"
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
          color="#FF6347"
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
          color="#FF6347"
        />
      )}
    </View>
  );
};


function AddGameScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState({
    spiritOptions: [],
    adversaryOptions: [],
    scenarioOptions: [],
    allAspectsMap: {},
  });

  const [formData, setFormData] = useState({
    mobileGame: false,
    notes: '',
    difficulty: '',
    winLoss: null,
    invaderCards: '',
    dahanSpirit: '',
    blightSpirit: '',
    spirits: [{ name: null, id: null, aspect: null, aspect_id: null }],
    adversaries: [],
    scenarios: [],
  });

  const totalScore = useCallback(() => {
    const d = parseInt(formData.difficulty || 0);
    const ic = parseInt(formData.invaderCards || 0);
    const ds = parseInt(formData.dahanSpirit || 0);
    const bs = parseInt(formData.blightSpirit || 0);
    return d + ic + ds + bs;
  }, [formData.difficulty, formData.invaderCards, formData.dahanSpirit, formData.blightSpirit]);

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMasterData();
      // Optional cleanup
      return () => { };
    }, [fetchMasterData])
  );

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        level: null };
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

    try {
      // log game data
      const calculatedScore = totalScore();

      const gameInsertResult = await db.runAsync(
        `INSERT INTO games_fact (
        game_difficulty, game_win, game_cards, game_dahan, game_blight, game_score, game_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          //formData.mobileGame ? 1 : 0,
          parseInt(formData.difficulty || 0),
          formData.winLoss,
          parseInt(formData.invaderCards || 0),
          parseInt(formData.dahanSpirit || 0),
          parseInt(formData.blightSpirit || 0),
          calculatedScore,
          formData.notes,
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
      setFormData({
        mobileGame: false, notes: '', difficulty: '', winLoss: null,
        invaderCards: '', dahanSpirit: '', blightSpirit: '',
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
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading game options...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Record New Game</Text>

        {/* Mobile Game Flag */}
        <View style={styles.row}>
          <Text style={styles.label}>Played on Mobile:</Text>
          <Switch
            value={formData.mobileGame}
            onValueChange={(value) => handleFormChange('mobileGame', value)}
          />
        </View>

        {/* Notes */}
        <Text style={styles.label}>Notes:</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          value={formData.notes}
          onChangeText={(text) => handleFormChange('notes', text)}
          placeholder="Any additional notes about the game..."
        />

        {/* Game Score Data */}
        <Text style={styles.sectionTitle}>Game Score Data:</Text>

        <Text style={styles.label}>Difficulty:</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(formData.difficulty)}
          onChangeText={(text) => handleFormChange('difficulty', text)}
          placeholder="e.g., 5"
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

        <Text style={styles.label}>Invader Cards (remaining):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(formData.invaderCards)}
          onChangeText={(text) => handleFormChange('invaderCards', text)}
          placeholder="e.g., 2"
        />

        <Text style={styles.label}>Dahan Health (remaining):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(formData.dahanSpirit)}
          onChangeText={(text) => handleFormChange('dahanSpirit', text)}
          placeholder="e.g., 5"
        />

        <Text style={styles.label}>Blight on Spirit Boards:</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(formData.blightSpirit)}
          onChangeText={(text) => handleFormChange('blightSpirit', text)}
          placeholder="e.g., 0"
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
          <Button title="Add Another Spirit" onPress={addSpiritEntry} />
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
          <Button title="Add Adversary" onPress={addAdversaryEntry} />
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
          <Button title="Add Scenario" onPress={addScenarioEntry} />
        )}

        <View style={styles.saveButtonContainer}>
          <Button title="Save Game Results" onPress={handleSaveGame} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    paddingBottom: 50, // Give some space at the bottom for scrolling
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 15,
    color: '#444',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    minHeight: 100, // Make text area taller
    textAlignVertical: 'top', // For Android
    backgroundColor: '#fff',
    color: '#333',
  },
  totalScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
    color: '#006600',
  },
  entryContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  entryLabel: {
    fontSize: 15,
    marginBottom: 5,
    fontWeight: '500',
    color: '#666',
  },
  saveButtonContainer: {
    marginTop: 30,
    marginBottom: 20,
  }
});

// Styles for react-native-picker-select
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  placeholder: {
    color: '#999', // Placeholder text color
  },
});

export default AddGameScreen;
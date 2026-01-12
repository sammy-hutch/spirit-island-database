
import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { db } from '../../App';

// Helper component for a single Spirit/Aspect entry
const SpiritEntry = ({
  index,
  spiritOptions,
  allAspectsMap, // Map: { 'SpiritName': [{label, value}, ...] }
  selectedSpirit,
  selectedAspect,
  onSpiritChange,
  onAspectChange,
  onRemove,
  canRemove,
}) => {
  // Filter aspects based on the currently selected spirit for this entry
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
        disabled={!selectedSpirit} // Disable aspect picker if no spirit is selected
      />
      {canRemove && (
        <Button
          title="Remove Spirit"
          onPress={() => onRemove(index)}
          color="#FF6347" // Tomato color for remove button
        />
      )}
    </View>
  );
};

// Helper component for a single Adversary/Level entry
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
      {selectedAdversary && ( // Only show level if an adversary is selected
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

// Helper component for a single Scenario entry
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
    allAspectsMap: {}, // Map: { 'SpiritName': [{label, value}, ...] }
  });

  const [formData, setFormData] = useState({
    mobileGame: false,
    notes: '',
    difficulty: '',
    winLoss: null, // 'Win' or 'Loss'
    invaderCards: '',
    dahanSpirit: '',
    blightSpirit: '',
    spirits: [{ name: null, aspect: null }], // Start with one spirit entry
    adversaries: [], // Start with no adversaries
    scenarios: [], // Start with no scenarios
  });

  // Calculate Total Score (memoized to avoid re-calculation on every render)
  const totalScore = useCallback(() => {
    const d = parseInt(formData.difficulty || 0);
    const ic = parseInt(formData.invaderCards || 0);
    const ds = parseInt(formData.dahanSpirit || 0);
    const bs = parseInt(formData.blightSpirit || 0);
    return d + ic + ds + bs;
  }, [formData.difficulty, formData.invaderCards, formData.dahanSpirit, formData.blightSpirit]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        if (!db) {
          Alert.alert("Error", "Database not initialized. Please restart the app.");
          setLoading(false);
          return;
        }

        // Fetch Spirits
        const spiritsResult = await db.getAllAsync(`SELECT name FROM master_data WHERE type = 'spirit' ORDER BY name ASC;`);
        const spiritOptions = spiritsResult.map(row => ({ label: row.name, value: row.name }));

        // Fetch Adversaries
        const adversariesResult = await db.getAllAsync(`SELECT name FROM master_data WHERE type = 'adversary' ORDER BY name ASC;`);
        const adversaryOptions = adversariesResult.map(row => ({ label: row.name, value: row.name }));

        // Fetch Scenarios
        const scenariosResult = await db.getAllAsync(`SELECT name FROM master_data WHERE type = 'scenario' ORDER BY name ASC;`);
        const scenarioOptions = scenariosResult.map(row => ({ label: row.name, value: row.name }));

        // Fetch Aspects and map them to spirits
        const aspectsResult = await db.getAllAsync(`SELECT name, related_spirit FROM master_data WHERE type = 'aspect';`);
        const allAspectsMap = aspectsResult.reduce((acc, row) => {
          if (!acc[row.related_spirit]) {
            acc[row.related_spirit] = [];
          }
          acc[row.related_spirit].push({ label: row.name, value: row.name });
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
    };
    fetchMasterData();
  }, []);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSpiritEntry = () => {
    if (formData.spirits.length < 6) {
      setFormData(prev => ({
        ...prev,
        spirits: [...prev.spirits, { name: null, aspect: null }],
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
      newSpirits[index] = { name: value, aspect: null }; // Reset aspect when spirit changes
      return { ...prev, spirits: newSpirits };
    });
  };

  const handleAspectChange = (index, value) => {
    setFormData(prev => {
      const newSpirits = [...prev.spirits];
      newSpirits[index].aspect = value;
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
      newAdversaries[index] = { name: value, level: null }; // Reset level when adversary changes
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
        scenarios: [...prev.scenarios, null], // Store just the name
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
      newScenarios[index] = value;
      return { ...prev, scenarios: newScenarios };
    });
  };

  const handleSaveGame = async () => {
    if (!db) {
      Alert.alert("Error", "Database not initialized. Please restart the app.");
      return;
    }

    // Basic Validation
    if (!formData.winLoss) {
      Alert.alert("Validation Error", "Please select Win or Loss.");
      return;
    }
    if (!formData.spirits.some(s => s.name !== null)) {
      Alert.alert("Validation Error", "Please add at least one spirit.");
      return;
    }
    // Check that all selected adversaries have a level if selected
    for (const adv of formData.adversaries) {
      if (adv.name && adv.level === null) {
        Alert.alert("Validation Error", `Please select a level for ${adv.name}.`);
        return;
      }
    }

    try {
      const calculatedScore = totalScore();

      // 1. Insert into games_dim
      const gameInsertResult = await db.runAsync(
        `INSERT INTO games_dim (
        mobile_game, notes, difficulty, win_loss, invader_cards, dahan_spirit, blight_spirit, total_score,
        adversary_1_name, adversary_1_level, adversary_2_name, adversary_2_level,
        scenario_1_name, scenario_2_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          formData.mobileGame ? 1 : 0, // SQLite stores BOOLEAN as INTEGER (0 or 1)
          formData.notes,
          parseInt(formData.difficulty || 0),
          formData.winLoss,
          parseInt(formData.invaderCards || 0),
          parseInt(formData.dahanSpirit || 0),
          parseInt(formData.blightSpirit || 0),
          calculatedScore,
          formData.adversaries[0]?.name || null,
          formData.adversaries[0]?.level || null,
          formData.adversaries[1]?.name || null,
          formData.adversaries[1]?.level || null,
          formData.scenarios[0] || null,
          formData.scenarios[1] || null,
        ]
      );

      const game_id = gameInsertResult.lastInsertId;
      console.log('Game inserted with ID:', game_id);

      // 2. Insert into events_dim for each spirit
      for (const spiritEntry of formData.spirits) {
        if (spiritEntry.name) { // Only insert if a spirit is actually selected
          await db.runAsync(
            `INSERT INTO events_dim (game_id, spirit_name, aspect_name) VALUES (?, ?, ?);`,
            [game_id, spiritEntry.name, spiritEntry.aspect]
          );
        }
      }
      console.log('Spirit events inserted.');

      Alert.alert("Success", "Game results saved successfully!");
      // Optionally navigate away or reset form
      //navigation.goBack(); // Example: go back to previous screen
      // Or reset form:
      setFormData({
        mobileGame: false, notes: '', difficulty: '', winLoss: null,
        invaderCards: '', dahanSpirit: '', blightSpirit: '',
        spirits: [{ name: null, aspect: null }], adversaries: [], scenarios: []
      });

    } catch (error) {
      console.error("Error saving game results:", error);
      Alert.alert("Error", "Failed to save game results. " + error.message);
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
            key={index} // Using index as key is okay here since elements are not reordered often
            index={index}
            spiritOptions={masterData.spiritOptions}
            allAspectsMap={masterData.allAspectsMap}
            selectedSpirit={spiritEntry.name}
            selectedAspect={spiritEntry.aspect}
            onSpiritChange={handleSpiritChange}
            onAspectChange={handleAspectChange}
            onRemove={removeSpiritEntry}
            canRemove={formData.spirits.length > 1} // Can only remove if more than one spirit
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
            canRemove={formData.adversaries.length > 0} // Can always remove if present
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
            selectedScenario={scenarioName}
            onScenarioChange={handleScenarioChange}
            onRemove={removeScenarioEntry}
            canRemove={formData.scenarios.length > 0} // Can always remove if present
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
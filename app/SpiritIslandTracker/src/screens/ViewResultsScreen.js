import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { db } from '../../App';

function ViewResultsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>View & Export Results</Text>
      <Text>This is where your saved games will appear.</Text>
      <Button title="Add New Game" onPress={() => navigation.navigate('AddGame')} />
    </View>
  );
}

export default ViewResultsScreen;
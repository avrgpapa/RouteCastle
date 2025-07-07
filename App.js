import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function App() {
  const [stops, setStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [extraNote, setExtraNote] = useState("");

  const handleLongPress = async (event) => {
    const newStop = {
      id: uuidv4(),
      coordinate: event.nativeEvent.coordinate,
      status: 'active',
      notes: []
    };
    const updatedStops = [...stops, newStop];
    setStops(updatedStops);
    await AsyncStorage.setItem('stops', JSON.stringify(updatedStops));
  };

  const selectStop = (stop) => {
    setSelectedStop(stop);
    setExtraNote("");
  };

  const updateStop = async (updatedStop) => {
    const updatedStops = stops.map((s) => (s.id === updatedStop.id ? updatedStop : s));
    setStops(updatedStops);
    await AsyncStorage.setItem('stops', JSON.stringify(updatedStops));
    setSelectedStop(null);
  };

  const cancelStop = () => {
    const updatedStop = { ...selectedStop, status: 'canceled' };
    updateStop(updatedStop);
  };

  const suspendStop = () => {
    const updatedStop = { ...selectedStop, status: 'suspended' };
    updateStop(updatedStop);
  };

  const addExtraNote = () => {
    const updatedStop = { ...selectedStop, notes: [...selectedStop.notes, extraNote] };
    updateStop(updatedStop);
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} onLongPress={handleLongPress}>
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={stop.coordinate}
            pinColor={stop.status === 'active' ? 'green' : stop.status === 'canceled' ? 'red' : 'orange'}
            onPress={() => selectStop(stop)}
          />
        ))}
      </MapView>
      {selectedStop && (
        <View style={styles.panel}>
          <Text>Status: {selectedStop.status}</Text>
          <FlatList
            data={selectedStop.notes}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => <Text>- {item}</Text>}
          />
          <TextInput
            style={styles.input}
            placeholder="Add Note..."
            value={extraNote}
            onChangeText={setExtraNote}
          />
          <Button title="Add Note" onPress={addExtraNote} />
          <Button title="Suspend Stop" onPress={suspendStop} />
          <Button title="Cancel Stop" onPress={cancelStop} />
          <Button title="Close" onPress={() => setSelectedStop(null)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    flex: 1
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 10
  },
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    padding: 5,
    marginVertical: 5
  }
});
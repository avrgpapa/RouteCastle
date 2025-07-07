import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { parseRouteSheet } from './utils/parseRouteSheet';

export default function App() {
  const [image, setImage] = useState(null);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.uri);
      // Simulate OCR result for now
      const fakeText = "123 Main St Active Leave at door\n456 Oak Dr Suspended Customer request";
      const stops = parseRouteSheet(fakeText);
      Alert.alert("Parsed Stops", JSON.stringify(stops, null, 2));
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="📸 Scan Route Sheet" onPress={handlePickImage} />
    </View>
  );
}
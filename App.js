import React, { useState } from 'react';
import { View, Button, Alert, Text, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { parseRouteSheet } from './utils/parseRouteSheet';

export default function App() {
  const [image, setImage] = useState(null);
  const [stops, setStops] = useState([]);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri || result.uri; // Supports newer SDKs
      setImage(uri);

      // Simulated OCR result (replace with real OCR output later)
      const fakeText =
        "123 Main St Active Leave at door\n456 Oak Dr Suspended Customer request";

      const parsedStops = parseRouteSheet(fakeText) || [];
      setStops(parsedStops);

      Alert.alert("Parsed Stops", JSON.stringify(parsedStops, null, 2));
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <Text style={{ marginBottom: 20, fontSize: 18, fontWeight: 'bold' }}>
        RouteCastle
      </Text>

      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: 200, height: 300, resizeMode: 'contain', marginBottom: 20 }}
        />
      )}

      <Button title="📸 Scan Route Sheet" onPress={handlePickImage} />

      <Text style={{ marginTop: 20 }}>
        {stops.length > 0
          ? `✅ ${stops.length} stops loaded`
          : `No route sheet uploaded yet.`}
      </Text>
    </View>
  );
}

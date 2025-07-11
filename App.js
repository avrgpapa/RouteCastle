import React, { useState } from 'react';
import { View, Button, Alert, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import Tesseract from 'tesseract.js';
import { parseRouteSheet } from './utils/parseRouteSheet';
// Import PROVIDER_OSMDROID specifically for OpenStreetMap
import MapView, { Marker, UrlTile, PROVIDER_OSMDROID } from 'react-native-maps';

export default function App() {
  const [image, setImage] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);

  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${Constants.expoConfig?.extra?.opencageApiKey || 'YOUR_OPENCAGE_API_KEY_HERE'}`
      );
      const data = await response.json();
      if (data.results?.length > 0) {
        return data.results[0].geometry;
      }
    } catch (error) {
      console.warn('Geocoding error:', error);
    }
    return null;
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant access to your photo library to select an image.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setLoading(true);
        processImageForOCR(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick an image.');
      setLoading(false);
    }
  };

  const processImageForOCR = async (imageUri) => {
    try {
      const { data: { text } } = await Tesseract.recognize(
        imageUri,
        'eng',
        {
          logger: m => console.log(m)
        }
      );
      console.log('OCR Result:', text);
      const parsedStops = parseRouteSheet(text, true, true);
      console.log('Parsed Stops:', parsedStops);

      const geocodedStops = [];
      for (const stop of parsedStops) {
        const geo = await geocodeAddress(stop.address);
        if (geo) {
          geocodedStops.push({ ...stop, latitude: geo.lat, longitude: geo.lng });
        } else {
          console.warn(`Could not geocode address: ${stop.address}`);
        }
      }
      setStops(geocodedStops);

    } catch (error) {
      console.error('OCR or parsing error:', error);
      Alert.alert('Error', 'Failed to process image or parse route sheet.');
    } finally {
      setLoading(false);
    }
  };

  const getPinColor = (status) => {
    switch (status) {
      case 'active': return 'blue';
      case 'completed': return 'green';
      case 'pending': return 'orange';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Castle</Text>
      <Button title="📸 Scan Route Sheet" onPress={handlePickImage} />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Processing...</Text>
        </View>
      )}

      {image && (
        <Image source={{ uri: image }} style={styles.previewImage} />
      )}

      <MapView
        style={styles.map}
        provider={PROVIDER_OSMDROID} 
        initialRegion={{
          latitude: 37.7749, // Default center
          longitude: -122.4194, // Default center
          latitudeDelta: 0.0922, // Zoom level
          longitudeDelta: 0.0421, // Zoom level
        }}
      >
        {/* UrlTile will now overlay on the OSMDroid base map */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
        {stops.map((stop, index) => (
          <Marker
            key={`stop-${index}`}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
          >
            <View style={[
              styles.marker,
              { backgroundColor: getPinColor(stop.status) }
            ]} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  map: {
    flex: 1,
    marginTop: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginVertical: 10,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
});
